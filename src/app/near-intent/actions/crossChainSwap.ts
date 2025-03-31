import { connect } from "near-api-js";
import { KeyPairString } from "near-api-js/lib/utils/key_pair";
import { utils } from "near-api-js";
import { keyStores } from "near-api-js";
import { getDepositedBalances, TokenBalances, FT_DEPOSIT_GAS } from "../utils/deposit";
import { IntentStatus, PublishIntentRequest, PublishIntentResponse, QuoteRequest, QuoteResponse} from "../types/intents";
import { providers } from "near-api-js";
import {SingleChainToken, UnifiedToken } from "../types/tokens";
import { settings } from "../../config";

const DEFUSE_RPC_URL:string = settings.defuseRPCUrl;
const POLLING_INTERVAL_MS = settings.polling_interval_ms;
const MAX_POLLING_TIME_MS = settings.max_polling_time_ms;
export const FT_MINIMUM_STORAGE_BALANCE_LARGE = "1250000000000000000000";


async function makeRPCRequest<T>(method: string, params: any[]): Promise<T> {
    const requestBody = {
        id: 1,
        jsonrpc: "2.0",
        method,
        params,
    };
    console.log("Making RPC request to:", DEFUSE_RPC_URL, method);
    console.log("Request body:", JSON.stringify(requestBody, null, 2));

    const response = await fetch(DEFUSE_RPC_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
        throw new Error(`RPC request failed: ${response.statusText}`);
    }

    const data = await response.json();
    if (data.error) {
        throw new Error(`RPC error: ${data.error.message}`);
    }
    return data.result;
}

export const getQuote = async (params: QuoteRequest): Promise<QuoteResponse> => {
    return makeRPCRequest<QuoteResponse>("quote", [params]);
};

export const publishIntent = async (params: PublishIntentRequest): Promise<PublishIntentResponse> => {
    return makeRPCRequest<PublishIntentResponse>("publish_intent", [params]);
};

export const getIntentStatus = async (intentHash: string): Promise<IntentStatus> => {
    return makeRPCRequest<IntentStatus>("get_status", [{
        intent_hash: intentHash
    }]);
};

export function convertBigIntToString(jsonArray:any) {
    return JSON.parse(JSON.stringify(jsonArray, (_, value) =>
        typeof value === "bigint" ? value.toString() : value
    ));
}

export const getCurrentBlock = async (): Promise<{ blockHeight: number }> => {
    try {
        const networkId = settings.networkId;
        const nodeUrl = settings.nodeUrl;

        const nearConnection = await connect({
            networkId,
            nodeUrl,
            headers: {}
        });

        // Get the latest block using finality: 'final' for the most recent finalized block
        const block = await nearConnection.connection.provider.block({
            finality: 'final'
        });

        return {
            blockHeight: block.header.height
        };
    } catch (error) {
        console.error("Error getting current block:", error);
        throw error;
    }
};

// First check the balance of the user, then deposit the tokens if there are any
export async function getBalances(
    tokens: (UnifiedToken | SingleChainToken)[],
    nearClient: providers.Provider,
    account_id: string,
    network?: string
): Promise<TokenBalances> {

    const tokenBalances = await getDepositedBalances(
        account_id,
        tokens,
        nearClient,
        network
    );
    return tokenBalances;
}

export async function pollIntentStatus(intentHash: string): Promise<IntentStatus> {
    const startTime = Date.now();

    while (Date.now() - startTime < MAX_POLLING_TIME_MS) {
        const status = await getIntentStatus(intentHash);

        if (status.status === "SETTLED" || status.status === "NOT_FOUND_OR_NOT_VALID") {
            return status;
        }

        await new Promise(resolve => setTimeout(resolve, POLLING_INTERVAL_MS));
    }

    throw new Error("Timeout waiting for intent to settle");
}

async function addPublicKeyToIntents(publicKey: string, account_id: string): Promise<void> {

    const nearConnection = await connect({
        networkId: settings.networkId,
        nodeUrl: settings.nodeUrl,
    });

    const account = await nearConnection.account(account_id);

    console.log("Adding public key to intents contract:", publicKey);
    await account.functionCall({
        contractId: "intents.near",
        methodName: "add_public_key",
        args: {
            public_key: publicKey
        },
        gas: BigInt(FT_DEPOSIT_GAS),
        attachedDeposit: BigInt(1)
    });
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

    return new Set(result);
}

export async function ensurePublicKeyRegistered(publicKey: string, account_id: string): Promise<void> {
    const existingKeys = await getPublicKeysOf(account_id);
    if (!existingKeys.has(publicKey)) {
        console.log(`Public key ${publicKey} not found, registering...`);
        await addPublicKeyToIntents(publicKey, account_id);
    } else {
        console.log(`Public key ${publicKey} already registered`);
    }
}
