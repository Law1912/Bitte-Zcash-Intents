import { NextResponse } from 'next/server';
import  * as near from "near-api-js"
import {connect} from "near-api-js";
import { CodeResult } from "near-api-js/lib/providers/provider"
import {settings} from "@/app/config";
import assert from 'assert';

import tokens from '@/app/near-intent/config/tokens.json';

export interface TokenAddress {
    address: string;
    defuse_asset_id: string;
    type?: 'native';
}

export interface TokenAddresses {
    [chain: string]: TokenAddress | undefined;
}

export interface SingleChainToken {
    defuseAssetId: string;
    type?: string;
    address: string;
    decimals: number;
    icon: string;
    chainIcon: string;
    chainName: string;
    symbol: string;
    cgId: string;
    name: string;
}

export interface UnifiedToken {
    unifiedAssetId: string;
    decimals: number;
    symbol: string;
    name: string;
    icon: string;
    cgId: string;
    addresses: TokenAddresses;
}

export interface TokenConfig {
    tokens: {
        mainnet: {
            unified_tokens: UnifiedToken[];
            single_chain_tokens: SingleChainToken[];
        }
    }
}

// Import token configuration
const tokenConfig = tokens as TokenConfig;

/**
 * Gets the token details for a given symbol
 */
export function getTokenBySymbol(symbol: string): UnifiedToken | SingleChainToken | undefined {
    const upperSymbol = symbol.toUpperCase();
    console.log("Looking for token with symbol:", upperSymbol);

    // Check unified tokens first
    const unifiedToken = tokenConfig.tokens.mainnet.unified_tokens.find(
        token => token.symbol.toUpperCase() === upperSymbol
    );
    if (unifiedToken) {
        return unifiedToken;
    }

    // Then check single chain tokens
    return tokenConfig.tokens.mainnet.single_chain_tokens.find(
        token => token.symbol.toUpperCase() === upperSymbol
    );
}

/**
 * Gets the token details for a given Defuse asset ID
 */
export function getTokenByDefuseId(defuseId: string): UnifiedToken | SingleChainToken | undefined {
    // Check unified tokens
    for (const token of tokenConfig.tokens.mainnet.unified_tokens) {
        for (const chainToken of Object.values(token.addresses)) {
            if (chainToken?.defuse_asset_id === defuseId) {
                return token;
            }
        }
    }

    // Check single chain tokens
    return tokenConfig.tokens.mainnet.single_chain_tokens.find(token => token.defuseAssetId === defuseId);
}

/**
 * Gets all supported token symbols
 */
export function getAllSupportedTokens(): string[] {
    const tokens = new Set<string>();
    tokenConfig.tokens.mainnet.unified_tokens.forEach(token => tokens.add(token.symbol));
    tokenConfig.tokens.mainnet.single_chain_tokens.forEach(token => tokens.add(token.symbol));
    return Array.from(tokens);
}

/**
 * Gets all supported chain names
 */
export function getAllSupportedChains(): string[] {
    const chains = new Set<string>();
    tokenConfig.tokens.mainnet.unified_tokens.forEach(token => {
        Object.keys(token.addresses).forEach(chain => chains.add(chain));
    });
    tokenConfig.tokens.mainnet.single_chain_tokens.forEach(token => {
        chains.add(token.chainName);
    });
    return Array.from(chains);
}

/**
 * Gets the defuse asset ID for a token
 * If no chain is specified, defaults to 'near'
 */
export function getDefuseAssetId(token: UnifiedToken | SingleChainToken, chain: string = 'near'): string {
    if (isUnifiedToken(token)) {
        const chainToken = token.addresses[chain];
        if (!chainToken) {
            // If the specified chain is not supported and it's not the default 'near' chain, try 'near'
            if (chain !== 'near') {
                const nearToken = token.addresses['near'];
                if (nearToken) {
                    console.log(`Chain ${chain} not found for token ${token.symbol}, using NEAR chain instead`);
                    return nearToken.defuse_asset_id;
                }
            }
            throw new Error(`Chain ${chain} not supported for token ${token.symbol}`);
        }
        return chainToken.defuse_asset_id;
    }
    return token.defuseAssetId;
}

/**
 * Type guard to check if a token is a UnifiedToken
 */
export function isUnifiedToken(token: UnifiedToken | SingleChainToken): token is UnifiedToken {
    return 'addresses' in token && 'unifiedAssetId' in token;
}

/**
 * Type guard to check if a token is a SingleChainToken
 */
export function isSingleChainToken(token: UnifiedToken | SingleChainToken): token is SingleChainToken {
    return 'defuseAssetId' in token && 'chainName' in token;
}

/**
 * Checks if a token is supported based on its symbol
 */
export function isTokenSupported(symbol: string): boolean {
    const upperSymbol = symbol.toUpperCase();
    return Boolean(getTokenBySymbol(upperSymbol));
}


/**
 * Converts a decimal amount string to the correct decimal format for a token
 * @param amount The amount as a decimal string (e.g. "0.1")
 * @param token The token to get decimals from
 * @returns The amount as a bigint with proper decimal places
 */
export function convertAmountToDecimals(amount: string, token: UnifiedToken | SingleChainToken): bigint {
    // Convert decimal string (e.g. "0.1") to integer with proper decimals
    const [whole, decimal = ""] = amount.split(".");
    const decimals = token.decimals;
    const trimmedDecimal = decimal.slice(0, decimals).padEnd(decimals, "0");
    const fullAmount = `${whole}${trimmedDecimal}`;
    return BigInt(fullAmount);
}

export type TokenBalances = {
    [key in string]?: bigint
}

async function getDepositedBalances(
    accountId: string,
    tokens: (UnifiedToken | SingleChainToken)[],
    nearClient: near.providers.Provider,
    network?: string
  ): Promise<TokenBalances> {
    // RPC call
    // Warning: `CodeResult` is not correct type for `call_function`, but it's closest we have.
    const networkId = network || "near";
    // Check if the token is of certain type
    const defuseAssetIds = tokens.map(token => getDefuseAssetId(token, networkId));
    console.log("defuseAssetIds", defuseAssetIds);
    const output = await nearClient.query<CodeResult>({
      request_type: "call_function",
      account_id: settings.defuseContractId || "intents.near",
      method_name: "mt_batch_balance_of",
      args_base64: btoa(
        JSON.stringify({
          account_id: accountId,
          token_ids: defuseAssetIds,
        })
      ),
      finality: "optimistic",
    })

    // Decoding response
    const uint8Array = new Uint8Array(output.result)
    const decoder = new TextDecoder()
    const parsed = JSON.parse(decoder.decode(uint8Array))

    // Validating response
    assert(
      Array.isArray(parsed) && parsed.every((a) => typeof a === "string"),
      "Invalid response"
    )
    assert(parsed.length === defuseAssetIds.length, "Invalid response")


    // Transforming response
    const result: TokenBalances = {}
    for (let i = 0; i < defuseAssetIds.length; i++) {
      // biome-ignore lint/style/noNonNullAssertion: always within bounds
      result[defuseAssetIds[i]!] = BigInt(parsed[i])
    }

    return result
  }


export async function GET(request: Request) {
    try {
    
        const { searchParams } = new URL(request.url);
        const accountId = searchParams.get('accountId');
        if (!accountId) {
            return NextResponse.json({ error: 'accountId are required parameters' }, { status: 400 });
        }

        
        
    }

    catch (error) {
        console.error('Error generating NEAR - Defuse account details:', error);
        return NextResponse.json({ error: 'Failed to generate NEAR - Defuse account details' }, { status: 500 });
    }
  }
  