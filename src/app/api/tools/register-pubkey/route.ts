import { NextResponse } from 'next/server';
import { Near, transactions } from "near-api-js"
import { Transaction } from '@/app/near-intent/types/deposit';
import { FT_DEPOSIT_GAS } from '@/app/near-intent/utils/deposit';
import { convertBigIntToString } from '@/app/near-intent/actions/crossChainSwap';
import { connect } from "near-api-js";
import { settings } from "@/app/config";

import fetch from "node-fetch";

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

    return new Set(result);
}

export async function GET(request: Request) {
    try {
      const { searchParams } = new URL(request.url);
      const accountId = searchParams.get('accountId');
        if (!accountId)
        {
            return NextResponse.json({ error: 'Missing account id' }, { status: 500 });
        }

        const existingKeys = await getPublicKeysOf(accountId);
        
        var act:any = [];
        const keys = await getNearPublicKeys(accountId);
        for (var key of keys)
        {
            if (existingKeys.has(key))
            {
                continue;
            }
                
            console.log(key);
            act.push(
                {
                    "contractId": "intents.near",
                    "methodName": "add_public_key",
                    "args": {
                        "public_key": key.toString(),
                    },
                    "gas": FT_DEPOSIT_GAS,
                    "deposit":"1"
                }
            )
        }

        var tx = await convertBigIntToString(act);
        return NextResponse.json({ tx }, { status: 200 });

  } catch (error) {
    console.error('Error generating register key transaction:', error);
    return NextResponse.json({ error: 'Failed to generate NEAR account details' }, { status: 500 });
  }
}