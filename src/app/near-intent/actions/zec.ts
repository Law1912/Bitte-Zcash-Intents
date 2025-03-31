import * as fs from 'fs';
import * as https from 'https';
import * as http from 'http';
import path from 'path';
import { settings } from "../../config";
import { CrossChainSwapAndWithdrawParams } from '../types/intents';
import { getTokenBySymbol } from '../types/tokens';
import { getBalances } from './crossChainSwap';
import { connect } from "near-api-js";
// import { getAllBalances } from './crossChainSwap';
// import { withdrawFromDefuse } from './crossChainSwap'; 
import { getDepositedBalances, TokenBalances } from "../utils/deposit";
import { NextResponse } from 'next/server';

const nodeUrl = settings.zcashwallet;
const rpcUrl = "https://bridge.chaindefuser.com/rpc";
export const zcashFees = 0.0002;
let zcashAccount: number | null = null;

export interface ZcashResponse {
    result: any;
    error?: any;
}


interface OperationResult {
    status: string;
    result?: {
        txid: string;
        [key: string]: any;
    };
    [key: string]: any;
}

export async function createAccount(): Promise<number> {
    const username = settings.zcashusr;
    const password = settings.zcashpass;

    const headers = {"Content-Type": "text/plain"};
    const payload = {
        "jsonrpc": "1.0",
        "id": "curltest",
        "method": "z_getnewaccount",
        "params": []
    };

    console.log(payload);
    // Note: In TypeScript/Node.js, we don't have direct input() like Python
    // You might need to use a library like 'readline' or 'prompts' for user input

    try {
        const response = await postRequest(nodeUrl, payload, headers, username, password) as ZcashResponse;
        console.log(response.result);

        if (response.result?.account) {
            return parseInt(response.result.account);
        }
    } catch (error) {
        console.error("Error creating account:", error);
    }

    console.log("Unable to make an account for zcash node for app usage.");
    return -1;
}


export async function getAddressForAccount(account: number): Promise<string> {
    const username = settings.zcashusr;
    const password = settings.zcashpass;
    
    const headers = {"Content-Type": "text/plain"};
    const payload = {
        "jsonrpc": "1.0",
        "id": "curltest",
        "method": "z_listaccounts",
        "params": []
    };
    console.log("line131");
    
    try {
        let response = await postRequest(nodeUrl, payload, headers, username, password) as ZcashResponse;
        console.log(response);
        console.log(response.error);
        console.log("line137");
        if (response.result && (response.result[account].addresses).length !== 0) {
            console.log("---------------------------------------");
            console.log(response.result[account].addresses[0]);
            console.log(response.result[account].addresses[0].ua);
            console.log((response.result[account].addresses[0]).ua);
            console.log("---------------------------------------");
            return response.result[account].addresses[0].ua;
        }
        console.log("line141");
        const payload1 = {
            "jsonrpc": "1.0",
            "id": "curltest",
            "method": "z_getaddressforaccount",
            "params": [account]
        };
        
        console.log(payload1);
        // input() - removed for TypeScript
        
        response = await postRequest(nodeUrl, payload1, headers, username, password) as ZcashResponse;
        console.log(response.result);
        
        if (response.result?.address) {
            return response.result.address;
        }
    } catch (error) {
        console.log("line159");
        console.error("Error getting address for account:", error);
    }
    console.log("line162");
    
    console.log(`Unable to make an address for the account ${account} for app usage.`);
    return "";
}

export async function getAccountForAddress( address: string): Promise<number> {
    const username = settings.zcashusr;
    const password = settings.zcashpass;
    const node_url = settings.zcashwallet; // Replace with your node URL


    if (!username || !password) {
        console.error("Missing Zcash credentials");
        return -1;
    }

    const headers = { "Content-Type": "text/plain" };
    const payload = {
        jsonrpc: "1.0",
        id: "curltest",
        method: "listaddresses",
        params: [] as any[],
    };

    try {
        const response = await postRequest(node_url, payload, headers, username, password) as ZcashResponse;
        if (response.error) {
            throw new Error(`HTTP error: ${response.error}`);
        }
        console.dir(response.result, {depth:null, colors:true});

        if (!response.result) {
            throw new Error("Invalid response: missing 'result' key");
        }

        const list_addresses = response.result;

        for (const wallet of list_addresses) {
            if (!wallet.unified) continue;

            for (const account_info of wallet.unified) {
                if (!account_info.addresses || !Array.isArray(account_info.addresses)) continue;

                for (const addr of account_info.addresses) {
                    if (addr.address == address || addr.address == address.toString()) {
                        return account_info.account;
                    }
                }
            }
        }
        return -1; // Address not found
    } catch (error) {
        console.error("Error in getAccountForAddress:", error instanceof Error ? error.message : error);
        return -1;
    }
}

export async function getZcashAccount(): Promise<number> {
    try {
        const dir = path.dirname(settings.zcashexportdir);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        // Check if file exists before reading
        if (!fs.existsSync(settings.zcashexportdir)) {
            const newAccount = await createAccount();
            fs.writeFileSync(settings.zcashexportdir, newAccount.toString());
            return newAccount;
        }

        // Read existing account
        const account = fs.readFileSync(settings.zcashexportdir, "utf-8");
        zcashAccount = parseInt(account);
        return zcashAccount;
    } catch (error) {
        console.error("Error handling Zcash account:", error);
        return -1;
    }
}

export async function validate_zcash_address(address: string): Promise<[boolean, string]> {
    const username = settings.zcashusr;
    const password = settings.zcashpass;

    const headers = {"Content-Type": "text/plain"};
    const payload = {
        "jsonrpc": "1.0",
        "id": "curltest",
        "method": "z_validateaddress",
        "params": [address]
    };

    console.log(payload);

    try {
        const response = await postRequest(nodeUrl, payload, headers, username, password) as ZcashResponse;
        console.log(response.result);
        return [response.result.isvalid, response.result.address_type];
    } catch (error) {
        console.error("Error validating address:", error);
        return [false, ""];
    }
}

export async function wallet_balance(): Promise<[number, number]> {
    const username = settings.zcashusr;
    const password = settings.zcashpass;

    const headers = {"Content-Type": "text/plain"};
    const payload = {
        "jsonrpc": "1.0",
        "id": "curltest",
        "method": "getwalletinfo",
        "params": []
    };

    console.log(payload);

    try {
        const response = await postRequest(nodeUrl, payload, headers, username, password) as ZcashResponse;
        console.log(response.result);
        return [parseFloat(response.result.balance), parseFloat(response.result.shielded_balance)];
    } catch (error) {
        console.error("Error getting wallet balance:", error);
        return [0, 0];
    }
}

export async function account_balance(account: number): Promise<[number, number]> {
    const username = settings.zcashusr;
    const password = settings.zcashpass;

    const tokenData = getTokenBySymbol("ZEC");
    if (!tokenData) {
        throw new Error("ZEC token data not found in config");
    }

    const headers = {"Content-Type": "text/plain"};
    const payload = {
        "jsonrpc": "1.0",
        "id": "curltest",
        "method": "z_getbalanceforaccount",
        "params": [account]
    };

    const response = await postRequest(nodeUrl, payload, headers, username, password) as ZcashResponse;

    let balanceTransparent = 0;
    let balanceShielded = 0;

    if (response.result) {
        const pools = response.result.pools;
        const decimals = tokenData.decimals;
        const divisor = (10 ** decimals);

        if (pools?.transparent?.valueZat) {
            balanceTransparent = (pools.transparent.valueZat / divisor);
        }

        if (pools?.sapling?.valueZat) {
            balanceShielded = (pools.sapling.valueZat / divisor);
        }

        if (pools?.orchard?.valueZat) {
            balanceShielded = balanceShielded + (pools.orchard.valueZat / divisor);
        }
    }

    return [balanceTransparent, balanceShielded];
}

export async function transfer(
    sender: string,
    amount: number,
    recipient: string,
    args: any[]
): Promise<string | null> {
    const username = settings.zcashusr;
    const password = settings.zcashpass;

    // const account = await getAccountForAddress(parseInt(sender)) || "";
    // if (account === ""){
    //     return null;
    // }

    const headers = {"Content-Type": "text/plain"};
    const payload: any = {
        "jsonrpc": "1.0",
        "id": "curltest",
        "method": "z_sendmany",
        "params": [
            sender,
            [
                {
                    "address": recipient,
                    "amount": amount - zcashFees
                }
            ],
            args[0],
            args[1],
            args[2]
        ]
    };

    console.log(payload);
    console.log(recipient);
    console.log(amount - zcashFees);

    try {
        let response = await postRequest(nodeUrl, payload, headers, username, password) as ZcashResponse;
        console.log("205");
        console.log(response.result);
        const opid = response.result;

        const listPayload = {
            "jsonrpc": "1.0",
            "id": "curltest",
            "method": "z_listoperationids",
            "params": []
        };

        response = await postRequest(nodeUrl, listPayload, headers, username, password) as ZcashResponse;
        console.log("217");
        console.log(response.result);
        if (!response.result.includes(opid)) {
            return opid;
        }

        const statusPayload = {
            "jsonrpc": "1.0",
            "id": "curltest",
            "method": "z_getoperationstatus",
            "params": [[opid]]
        };

        const startTime = Date.now();
        const timeout = 900000; // 5 minutes in milliseconds

        while (true) {
            response = await postRequest(nodeUrl, statusPayload, headers, username, password) as ZcashResponse;
            if (response.result && response.result[0]) {
                const result = response.result[0] as OperationResult;
                if (result.status === "success") {
                    console.log(result);
                    console.log(result.result?.txid);
                    return result.result?.txid || null;
                } else if (result.status === "failed") {
                    console.log(result);
                    return null;
                }
            }

            if (Date.now() - startTime > timeout) {
                console.error("Timeout: Operation did not complete within 2 minutes");
                return null;
            }

            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    } catch (error) {
        console.error("Error during transfer:", error);
        return null;
    }
}

export async function deposit(accountId:string, sender: string, amount: number): Promise<any> {
    const userAccountId = accountId;
    const username = settings.zcashusr;
    const password = settings.zcashpass;
    amount = amount / 100000000;
    const headers = {"Content-Type": "text/plain"};

    const account = await getAccountForAddress((sender));
    if (account === -1) {
        console.error("Unable to find account for address:", sender);
        return NextResponse.json({ error: 'Unable to find account for address' }, { status: 500 });
    }

    const [balanceTransparent, balanceShielded] = await account_balance((account));
    const tokenData = getTokenBySymbol("ZEC");
    if (!tokenData) {
         console.error("ZEC token data not found in config");
         return NextResponse.json({ error: 'ZEC token data not found in config' }, { status: 500 });
    }

    var depositAmount = amount + zcashFees;
    const totalBalance = balanceShielded + balanceTransparent;

    if (depositAmount > totalBalance) {
        console.log(`You have insufficient balance of ${totalBalance}. Cannot deposit ${depositAmount}`);
        return NextResponse.json(`You have insufficient balance of ${totalBalance}. Cannot deposit ${depositAmount}`);
    }

    // If amount is greater than shielded balance but less than total balance
    if ((depositAmount > balanceShielded) && (depositAmount < totalBalance)) {
        const args = [
            1,
            zcashFees.toString(),
            "AllowRevealedSenders"
        ];

        var depositAmount = amount + zcashFees;

        const txid = await transfer(sender, depositAmount, sender, args);
        if (!txid) {
            return NextResponse.json({ error: 'Transfer Failed.' }, { status: 500 });
        }

        console.log("Transaction Id:", txid);
        
        const startTime = Date.now();
        const timeout = 900000; // 5 minutes in milliseconds
        
        while (true) {
            const [_, newShielded] = await account_balance((account));
            if ( newShielded > depositAmount) {
                break;
            }
            
            if (Date.now() - startTime > timeout) {
                console.error("Timeout: Operation did not complete within 5 minutes");
                return NextResponse.json({ error: 'Transfer Failed.' }, { status: 500 });
            }

            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }

    // Get deposit address
    const depositPayload = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "deposit_address",
        "params": [{
            "account_id": userAccountId,
            "chain": "zec:mainnet"
        }]
    };

    try {
        const statusResponse = await fetch(rpcUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(depositPayload),
        });
        
        const depositResponse = await statusResponse.json();
        console.log(depositResponse);
        const depositAddress = depositResponse.result.address;

        const transferArgs = [
            1,
            zcashFees.toString(),
            "NoPrivacy"
        ];

        const finalTxid = await transfer(sender, depositAmount, depositAddress, transferArgs);
        console.log("Transaction Id:", finalTxid);
        
        if (!finalTxid) {
            return NextResponse.json({ error: 'Transfer Failed.' }, { status: 500 });
        }

        // Wait for the amount to be confirmed on intents
        const startTime = Date.now();
        const timeout = 900000; // 10 minutes in milliseconds
        
        const args = {
            "account_id": userAccountId,
            "token_ids": ["nep141:zec.omft.near"],
        };

        while (true) {
            // Note: You'll need to implement the NearAccount view function equivalent in TypeScript
            // This is a placeholder for the NEAR view call
            const nearConnection = await connect({
                    networkId: settings.networkId,
                    nodeUrl: settings.nodeUrl,
                });

            const account = await nearConnection.account(userAccountId);
            const te = await getDepositedBalances(userAccountId, [tokenData], nearConnection.connection.provider, "zec");
            const tr = te["nep141:zec.omft.near"]
            
            const zecBalance = Number(tr) / (10 ** tokenData.decimals);
            
            if (zecBalance >= (depositAmount - zcashFees)) {
                break;
            }
            
            if (Date.now() - startTime > timeout) {
                return NextResponse.json({ error: `Operation Timed Out:", ${finalTxid}` }, { status: 500 });
            }
            
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        return NextResponse.json({ result: `Transaction Successful.:", ${finalTxid}` }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: `Error during deposit process:", ${error}` }, { status: 500 });
    }
}


export async function withdraw(
    amount: number,
    recipient: string,
    withdrawal_hash: string
): Promise<any> {

    const username = settings.zcashusr;
    const password = settings.zcashpass;
    const headers = {"Content-Type": "text/plain"};
    const token = "ZEC";

    const tokendata = getTokenBySymbol(token);
    if (!tokendata) {
        return NextResponse.json({ error: 'Cannot find token data' }, { status: 500 });
    }

    const account = await getZcashAccount();
    if (account == -1) {
        return NextResponse.json({ error: 'Cannot find Zcash Account' }, { status: 500 });
    }

    console.log(`account no. from file ${account}`);
    console.log("line386");
    
    const unifiedAddress = await getAddressForAccount(account);
    if (!unifiedAddress) {
        return NextResponse.json({ error: 'Cannot find unified address' }, { status: 500 });
    }

    try {

        // Check withdrawal status
        const statusPayload = {
            "jsonrpc": "2.0",
            "id": "dontcare",
            "method": "withdrawal_status",
            "params": [{
                "withdrawal_hash": withdrawal_hash 
            }]
        };

        const startTime = Date.now();
        const timeout = 900000; 
        let transferTxHash: string | null = null;
        let attempts = 3;

        while (true) {
            const statusResponse = await fetch(rpcUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(statusPayload),
            });
            
            const data = await statusResponse.json();
            console.log(data);
            if (data.result) {
                if(data.result.withdrawals){
                    console.log(data.result.withdrawals)
                    const withdrawal = data.result.withdrawals[0];
                    transferTxHash = withdrawal.data.transfer_tx_hash;
                    
                    if (withdrawal.status !== "PENDING") {
                        break;
                    }
                    
                    if (transferTxHash) {
                        console.log("Transaction Hash:", transferTxHash);
                    }
                }
            } else if (attempts < 0) {
                attempts = attempts - 1;
                break;
            }

            if (Date.now() - startTime > timeout) {
                console.error("Timeout: Operation did not complete within 50 minutes");
                return null;
            }

            await new Promise(resolve => setTimeout(resolve, 5000));
        }

        // Wait for balance to be available
        const balancePayload = {
            "jsonrpc": "1.0",
            "id": "curltest",
            "method": "z_getbalanceforaccount",
            "params": [account]
        };

        const amountWithFees = amount + zcashFees;
        const decimals = tokendata.decimals;
        const requiredAmount = amountWithFees * (10 ** decimals);

        while (true) {
            const balanceResponse = await postRequest(nodeUrl, balancePayload, headers, username, password) as ZcashResponse;
            const pools = balanceResponse.result?.pools;

            if (pools?.transparent?.valueZat) {
                const transparentBalance = Number(pools.transparent.valueZat);
                if (transparentBalance >= requiredAmount) {
                    break;
                }
            }

            if (Date.now() - startTime > timeout) {
                console.error("Timeout: Balance not available within 5 minutes");
                return NextResponse.json({ error: 'Timeout: Balance not available within 5 minutes' }, { status: 500 });
            }

            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        // Final transfer to recipient
        const args = [
            1,
            zcashFees.toString(),
            "AllowRevealedSenders"
        ];

        const txid = await transfer(unifiedAddress, amount, recipient, args);
        console.log("Final Transaction Hash:", txid);
        return NextResponse.json({ TransactionId: txid }, { status: 500 });

    } catch (error) {
        console.error("Error during withdrawal process:", error);
        return NextResponse.json({ error: 'Error during withdrawal process' }, { status: 500 });
    }
}

export async function postRequest(
    url: string,
    payload: any,
    headers?: any,
    username?: string,
    password?: string
): Promise<any> {
    return new Promise((resolve, reject) => {
        const parsedUrl = new URL(url);
        const options: http.RequestOptions = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port,
            path: parsedUrl.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...headers
            }
        };

        if (username && password) {
            options.auth = `${username}:${password}`;
        }

        const protocol = parsedUrl.protocol === 'https:' ? https : http;
        const req = protocol.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (error) {
                    reject(error);
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.write(JSON.stringify(payload));
        req.end();
    });
}