import { NextResponse } from 'next/server';
import { getTokenBySymbol } from '@/app/near-intent/types/tokens';
import { convertAmountToDecimals } from '@/app/near-intent/types/tokens';
import { getNearNep141StorageBalance } from '@/app/near-intent/utils/deposit';
import { createBatchDepositNearNep141Transaction } from '@/app/near-intent/utils/deposit';
import { createBatchDepositNearNativeTransaction } from '@/app/near-intent/utils/deposit'; 
import { getDefuseAssetId } from '@/app/near-intent/types/tokens';
import { getAllSupportedTokens } from '@/app/near-intent/types/tokens';
import { Transaction } from '@/app/near-intent/types/deposit';
import { transactions } from 'near-api-js';
import { FT_DEPOSIT_GAS } from '@/app/near-intent/utils/deposit';
import { settings } from '@/app/config';
import { connect } from "near-api-js";
import {deposit as zecDeposit} from "@/app/near-intent/actions/zec"

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

    return new Set(result);
}

const FT_MINIMUM_STORAGE_BALANCE_LARGE = "1250000000000000000000";
                  
function convertBigIntToString(jsonArray:any) {
    return JSON.parse(JSON.stringify(jsonArray, (_, value) =>
        typeof value === "bigint" ? value.toString() : value
    ));
}

const depositIntoDefuse = async (tokenIds: string[], amount: bigint, accountId: string) : Promise<Transaction["NEAR"][]> => {
    const contractId = tokenIds[0].replace('nep141:', '');

    const nep141balance = await getNearNep141StorageBalance({
        contractId,
        accountId: accountId
    });

    var transaction: Transaction["NEAR"][];
    if(contractId === "wrap.near")
    {
        transaction = createBatchDepositNearNativeTransaction(contractId, amount, !(nep141balance >= BigInt(FT_MINIMUM_STORAGE_BALANCE_LARGE)), BigInt(FT_MINIMUM_STORAGE_BALANCE_LARGE), amount > 0n, amount);
    }
    else
    {
        transaction = createBatchDepositNearNep141Transaction(contractId, amount, !(nep141balance >= BigInt(FT_MINIMUM_STORAGE_BALANCE_LARGE)), BigInt(FT_MINIMUM_STORAGE_BALANCE_LARGE));
    }

    return transaction;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tokenInName = searchParams.get('tokenIn');
    const amount = searchParams.get('amount');
    const accountId = searchParams.get('accountId');

    if (tokenInName === null || amount === null) {
        return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    if (!accountId) {
        throw new Error("NEAR_ADDRESS not configured");
    }

    console.log("Looking up tokens:", { tokenIn: tokenInName, });

    const defuseTokenIn = getTokenBySymbol(tokenInName);

    
    console.log("Found tokens:", {
        defuseTokenIn,
    });

     if (!defuseTokenIn) {
        const supportedTokens = getAllSupportedTokens();
        throw new Error(`Token ${tokenInName} is not found. Supported tokens: ${supportedTokens.join(', ')}`);
    }
    
    const defuseAssetIdIn = getDefuseAssetId(defuseTokenIn);
    console.log("Defuse asset IDs:", {
        defuseAssetIdIn,
    });

    if (!defuseTokenIn) {
        return NextResponse.json({ error: 'Token not found' }, { status: 400 });
    }

    const amountInBigInt = convertAmountToDecimals(amount, defuseTokenIn);

    if (tokenInName.toUpperCase() == "ZEC")
    {
        return await zecDeposit(accountId, settings.zcashaddr, Number(amountInBigInt));
    }
    
    var transactions: Transaction["NEAR"][] = await depositIntoDefuse([defuseAssetIdIn], amountInBigInt, accountId);
    transactions = await convertBigIntToString(transactions);

    return NextResponse.json({ transactions });

    
  } catch (error) {
    console.error('Error generating NEAR transaction payload:', error);
    return NextResponse.json({ error: 'Failed to generate NEAR transaction payload' }, { status: 500 });
  }
}
