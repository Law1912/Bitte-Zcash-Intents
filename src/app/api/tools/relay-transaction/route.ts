import { NextResponse } from 'next/server';
import { Bitcoin } from '@/app/services/bitcoin';
import { Wallet } from '@/app/services/near-wallet';
import { MPC_CONTRACT } from '@/app/services/kdf/mpc';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('account_id');
    const data = searchParams.get('data');
    const transactionHash = searchParams.get('transactionHashes');

    if (!data || !transactionHash || !accountId) {
      return NextResponse.json({ error: 'some required parameters are missing' }, { status: 400 });
    }
    console.log("data", data);
    console.log("transactionHash", transactionHash);
    console.log("accountId", accountId);
    console.log(JSON.parse(data));

    const jdata = JSON.parse(data);
    const nutxos = jdata.utxos;

    console.log("nutxos", nutxos);
    
    const utxos =  nutxos;
    const receiverId = jdata.receiverId;
    const amount = jdata.amount;

    const BTC = new Bitcoin("mainnet");
    const path = "bitcoin-1";

    const wallet = new Wallet({networkId: "mainnet", createAccessKeyFor: MPC_CONTRACT});
    const { address, publicKey } = await BTC.deriveAddress(
      accountId,
      path
    );

    const successValue = await wallet.getTransactionResult(transactionHash, accountId);
    const jsonString = Buffer.from(successValue, 'base64').toString('utf-8');

    // Step 2: Parse JSON
    const parsed = JSON.parse(jsonString);
    if (!parsed) {
       return NextResponse.json({ error: 'invalid signature' }, { status: 400 });
    }
    const big_r = parsed.big_r;
    const s = parsed.s;
    const rs = {big_r, s};

    console.log({ nutxos, publicKey, rs, parsed, receiverId, amount});

    const new_pbst = await BTC.reconstructSignedTransactionFromCallback(rs, address, utxos, receiverId, amount, publicKey);
    const txHash = await BTC.broadcastTX(new_pbst);

    return NextResponse.json({ txHash });

  } catch (error) {
    console.error('Error generating NEAR account details:', error);
    return NextResponse.json({ error: 'Failed to generate NEAR account details' }, { status: 500 });
  }
}
