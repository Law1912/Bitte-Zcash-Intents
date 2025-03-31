import { NextResponse } from 'next/server';
import { ensurePublicKeyRegistered, pollIntentStatus, publishIntent } from "@/app/near-intent/actions/crossChainSwap";
import bs58 from 'bs58';
import {settings} from "@/app/config"
import { validate_zcash_address, withdraw } from '@/app/near-intent/actions/zec';
import { getTokenBySymbol, getDefuseAssetId } from '@/app/near-intent/types/tokens';
import { connect } from "near-api-js";
import { Payload } from '@/app/near-intent/types/intents';

import * as borsh from 'borsh';
import * as naj from 'near-api-js';
import js_sha256 from 'js-sha256';

import fetch from "node-fetch";
import * as readline from 'readline'

import chalk from "chalk";
import symbol from "log-symbols";

const styles = {
  success: (message: string) => console.log(`${chalk.green(symbol.success)} ${chalk.green.bold('SUCCESS:')} ${chalk.green(message)}`),
  error: (message: string) => console.log(`${chalk.red(symbol.error)} ${chalk.red.bold('ERROR:')} ${chalk.red(message)}`),
  info: (message: string) => console.log(`${chalk.blue(symbol.info)} ${chalk.blue.bold('INFO:')} ${chalk.blue(message)}`),
  warning: (message: string) => console.log(`${chalk.yellow(symbol.warning)} ${chalk.yellow.bold('WARNING:')} ${chalk.yellow(message)}`),
  coolcli: (message: string) => console.log(`${chalk.cyan.bold('(COOLCLI)')} ${chalk.white(message)}`),
  menuItem: (number: string, title: string) => console.log(`${chalk.cyan.bold(number)}. ${chalk.white(title)}`),
  highlight: (message: string) => chalk.cyan.bold(message),
  border: (message: string) => console.log(chalk.blue.bold(`\n=== ${message} ===\n`)),
  prompt: (message: string) => chalk.yellow.bold(message)
};

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

const askForInput = (prompt: string): Promise<string> => {
    return new Promise((resolve) => {
      rl.question(styles.prompt(prompt), (answer) => {
        resolve(answer);
      });
    });
  };

async function getNearPublicKeys(accountId: string): Promise<string[]> {
  const url = "https://rpc.mainnet.near.org";
  const requestBody = {
    jsonrpc: "2.0",
    id: "dontcare",
    method: "query",
    params: {
      request_type: "view_access_key_list",
      finality: "final",
      account_id: accountId,
    },
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`Error: ${response.status} ${response.statusText}`);
    }

    const data: any = await response.json();
    return data.result.keys.map((key) => key.public_key);
  } catch (error) {
    console.error("Failed to fetch NEAR public keys:", error);
    return [];
  }
}

async function getPublicKeysOf(accountId: string): Promise<Set<string>> {

    const nearConnection = await connect({
        networkId: settings.networkId,
        nodeUrl: settings.nodeUrl,
    });

    const account = await nearConnection.account(accountId);
    const result = await account.viewFunction({
        contractId: settings.defuseContractId || "intents.near",
        methodName: "public_keys_of",
        args: { account_id: accountId }
    });

    console.log("Public Keys already registered are as follows");
    console.log(result);

    return new (result);
}

const payloadSchema = { struct: { tag: 'u32', message: 'string', nonce: { array: { type: 'u8', len: 32 } }, recipient: 'string', callbackUrl: { option: "string" } } }

function verifySignature({ publicKey, signature, message, recipient, nonce }) {
    nonce = Buffer.from(nonce, 'base64'); 
    // Reconstruct the expected payload to be signed
    const payload = new Payload({tag: 2147484061, message, recipient, nonce });
    const serialized = borsh.serialize(payloadSchema, payload);
    const to_sign = Uint8Array.from(js_sha256.sha256.array(serialized))

    // Reconstruct the signature from the parameter given in the URL
    let real_signature = Buffer.from(signature, 'base64')

    // Use the public Key to verify that the private-counterpart signed the message
    const myPK = naj.utils.PublicKey.from(publicKey)
    return myPK.verify(to_sign, real_signature)
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const signature = searchParams.get('signature');
    const accountId = searchParams.get('accountId');
    var publicKey = searchParams.get('publicKey');
    // const publicKey = "ed25519:DTxNukPxWf3g4NWUdL6oGWeVkh4jdsQHt3MF8UrkgrAH";
    const messageString = searchParams.get('message');
    var recipient = searchParams.get('receiverId');
    const nonce = searchParams.get('nonce');
    const quote_hash = searchParams.get('quote_hash');

    if (!signature || !messageString || !recipient || !nonce || !accountId) {
      console.log('Missing parameters:', { signature, publicKey, messageString, recipient, nonce });
      console.log('Nonce length:', nonce);
      return NextResponse.json({ error: 'some required parameters are missing' }, { status: 400 });
    }

    if (settings.publicKey.length > 0)
    {
        publicKey = settings.publicKey;
    }

    else
    {
        const keys = await getNearPublicKeys(accountId);
        for (var key of keys)
        {
            const check = verifySignature({publicKey: key, signature: signature, message: messageString, recipient: recipient, nonce: nonce});
            console.log(check);
            if (check)
            {
                publicKey = key;
                settings.publicKey = key;
                break;
            }
        }
    }

    if (!publicKey)
    {
        return NextResponse.json({ error: 'some required parameters are missing' }, { status: 400 });
    }

    console.log('Received parameters:', { accountId, signature, publicKey, messageString, recipient, nonce }, nonce.length);

    const nonceStr = nonce;
    // await ensurePublicKeyRegistered(publicKey, accountId);
    const signatureBuffer = bs58.encode(Buffer.from(signature, "base64"));

    const msg = JSON.parse((messageString));
    console.log(msg);
    const messageStr = JSON.stringify(msg);

    console.log(messageStr);


    // Publish intent
    const intent = await publishIntent({
        quote_hashes: !quote_hash ? [] : [quote_hash],
        signed_data: {
            payload: {
                message: messageStr,
                nonce: nonceStr,
                recipient
            },
            standard: "nep413",
            signature: `ed25519:${signatureBuffer}`,
            public_key: `${publicKey}`
        }
    });
    
    console.log('Intent:', intent);

    if (intent.status === "OK") {

        const finalStatus = await pollIntentStatus(intent.intent_hash);
        var token = msg.intents[0].token;
        console.log({token});
        
        askForInput("hello");
        
        if (token != "zec.omft.near")
        {
            return NextResponse.json({finalStatus});
        }
        var rc = msg.intents[0].memo;
        console.log(rc);
        rc = rc.replace("WITHDRAW_TO:", "");

        const [isValid, addressType] = await validate_zcash_address(rc);
        console.log({isValid});
        console.log({addressType});

        if (quote_hash || (!(addressType ===  "p2pkh" || addressType ===  "p2sh")))
        {
            return NextResponse.json({finalStatus});
        }

        if (!isValid)
        {
            recipient = settings.zcashaddr;
        }

        const hash = finalStatus.data?.hash;
        if (!hash)
        {
            return NextResponse.json({finalStatus});
        }

        return await withdraw(msg.intents[0].amount, recipient, hash);
    }
    return NextResponse.json(intent);

  } catch (error) {
    console.error('Error generating NEAR account details:', error);
    return NextResponse.json({ error: 'Failed to generate NEAR account details' }, { status: 500 });
  }
}