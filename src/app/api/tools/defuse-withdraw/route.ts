import { NextResponse } from 'next/server';
import { CrossChainSwapAndWithdrawParams} from "@/app/near-intent/types/intents";
import crypto from 'crypto';
import { getTokenBySymbol, getDefuseAssetId } from '@/app/near-intent/types/tokens';
import { convertAmountToDecimals } from '@/app/near-intent/types/tokens';
import { settings } from '@/app/config';
import { getNearNep141StorageBalance } from '@/app/near-intent/utils/deposit';
import type { IntentMessage } from '@/app/near-intent/types/intents';
import { Bitcoin } from '@/app/services/bitcoin';
import { getAddressForAccount, getZcashAccount, postRequest, validate_zcash_address, ZcashResponse } from '@/app/near-intent/actions/zec';

const FT_MINIMUM_STORAGE_BALANCE_LARGE = settings.ft_minimum_storage_balance_large;

async function withdrawFromDefuse(params: CrossChainSwapAndWithdrawParams): Promise<any> {
    try {
        const nonce = new Uint8Array(crypto.randomBytes(32));
        const nonceStr = Buffer.from(nonce).toString("base64");
        const network = params.network || "near";

        const token = getTokenBySymbol(params.defuse_asset_identifier_out);
        console.log("Token:", token);
        if (!token) {
            throw new Error(`Token ${params.defuse_asset_identifier_out} not found`);
        }
        const defuseAssetIdentifierOut = getDefuseAssetId(token);
        const defuseAssetOutAddrs = defuseAssetIdentifierOut.replace('nep141:', '')

        const amountInBigInt = convertAmountToDecimals(params.exact_amount_in, token);

        const nep141balance = await getNearNep141StorageBalance({
            contractId: "wrap.near",
            accountId: params.accountId
        });

        const storage_deposit: bigint = (nep141balance > BigInt(FT_MINIMUM_STORAGE_BALANCE_LARGE)) ? 0n : BigInt(FT_MINIMUM_STORAGE_BALANCE_LARGE);

        // Create intent message
        var intentMessage: IntentMessage;
        if (defuseAssetOutAddrs == "wrap.near") {
            intentMessage = {
                signer_id: params.accountId,
                deadline: new Date(Date.now() + 180000).toISOString(),
                intents: [
                    {
                        intent: "native_withdraw" ,
                        receiver_id: params.destination_address,
                        amount: amountInBigInt.toString()
                    }
                ]
            };
        }
        else if (params.network?.toUpperCase() == "NEAR") {
            intentMessage = {
                signer_id: params.accountId,
                deadline: new Date(Date.now() + 180000).toISOString(),
                intents: [
                    {
                        intent: "ft_withdraw",
                        receiver_id: params.destination_address,
                        token: defuseAssetOutAddrs,
                        amount: amountInBigInt.toString(),
                        deposit: (storage_deposit).toString(),
                        memo: ""
                    }
                ]
            };
        }
        else {
            intentMessage = {
                signer_id: params.accountId,
                deadline: new Date(Date.now() + 180000).toISOString(),
                intents: [
                    {
                        intent: "ft_withdraw",
                        receiver_id: defuseAssetOutAddrs,
                        amount: amountInBigInt.toString(),
                        token: defuseAssetOutAddrs,
                        deposit: (storage_deposit).toString(),
                        memo: `WITHDRAW_TO:${params.destination_address}`
                    }
                ]
            };
        }

        console.log("Intent message:", intentMessage);

        const messageString = JSON.stringify(intentMessage);
        const recipient = "intents.near";
 
        return {
            message: messageString,
            recipient,
            nonce: nonceStr
        }

    } catch (error) {
        console.error("Error in withdrawFromDefuse:", error);
        throw error;
    }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');
    const receiverId = searchParams.get('receiverId');
    const exact_amount_in = searchParams.get('exact_amount_in');
    const defuse_asset_identifier_in = searchParams.get('defuse_asset_identifier_in');
    const network = searchParams.get('blockchain');

    if (!accountId || !exact_amount_in || !defuse_asset_identifier_in || !receiverId || !network) {
      return NextResponse.json({ error: 'some required parameters are missing' }, { status: 400 });
    }
    
    var destination_address = receiverId;

    if (defuse_asset_identifier_in.toUpperCase() == "BTC") {
      const path = "bitcoin-1";
      const BTC = new Bitcoin("mainnet");
      
      const { address, publicKey } = await BTC.deriveAddress(
        receiverId,
        path
      );

      destination_address = address;
    }
    
    var params: CrossChainSwapAndWithdrawParams = {
      accountId: accountId,
      destination_address: receiverId,
      exact_amount_in: exact_amount_in,
      defuse_asset_identifier_in: defuse_asset_identifier_in,
      defuse_asset_identifier_out: defuse_asset_identifier_in,
      network: network
    };

    if (defuse_asset_identifier_in.toUpperCase() == "ZEC") {
        console.log(12345);

        const [isValid, addressType] = await validate_zcash_address(receiverId);
        if (isValid && addressType != "p2pkh" && addressType != "p2sh")
        {
            const zec_username = settings.zcashusr;
            const password = settings.zcashpass;
            const headers = {"Content-Type": "text/plain"};
            const tokendata = getTokenBySymbol("ZEC");
            const nodeUrl = settings.zcashwallet;
    
            const account = await getZcashAccount();
            if (account == -1) {
                return NextResponse.json({ error: 'Failed to get ZCASH - Intent Account details' }, { status: 500 });
            }
        console.log(12345);
            
            console.log(`account no. from file ${account}`);
            console.log("line386");
            
            const unifiedAddress = await getAddressForAccount(account);
            console.log(`unifiedAddress: ${unifiedAddress}`);
            if (!unifiedAddress) {
                return NextResponse.json({ error: 'Failed to get Unified Address' }, { status: 500 });
            }
        
            const payload = {
                "jsonrpc": "1.0",
                "id": "curltest",
                "method": "z_listunifiedreceivers",
                "params": [unifiedAddress]
            };
            
            console.log("line399");
            console.log(payload);
            console.log(account);
            console.log(unifiedAddress);
        
            const response = await postRequest(nodeUrl, payload, headers, zec_username, password) as ZcashResponse;
            console.log(response.result);
            console.log("line408");
    
            const transparentAddress = response.result.p2pkh || response.result.p2sh;
            const shieldedAddress = response.result.sapling || response.result.orchard;
            console.log(transparentAddress);
    
            params.destination_address = transparentAddress;
            params.network = "zec";
        }
    }

    console.log('Params:', params);

    const transactionPayload = await withdrawFromDefuse(params);

    console.log('Transaction payload:', transactionPayload);

    return NextResponse.json(transactionPayload);


  } catch (error) {
  console.error('Error generating NEAR account details:', error);
  return NextResponse.json({ error: 'Failed to generate NEAR account details' }, { status: 500 });
}
}
