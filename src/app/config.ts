import { DEPLOYMENT_URL } from "vercel-url";
import "dotenv/config";

interface RuntimeSettings {
    networkId: string;
    nodeUrl: string;
    SLIPPAGE: number;
    defuseContractId: string;
    defuseRPCUrl: string;
    coingeckoUrl: string;
    polling_interval_ms: number;
    max_polling_time_ms: number;
    ft_minimum_storage_balance_large: string;
    bitteApiKey: string;
    bitteApiUrl: string;
    zcashwallet: string;
    zcashexportdir: string;
    zcashusr: string;
    zcashpass: string;
    zcashaddr: string;
    publicKey: string;
}

function getRuntimeSettings(): RuntimeSettings {

    const requiredEnvVars = [
        "BITTE_API_KEY",
        "BITTE_API_URL",
        "ZCASH_PASSD",
        "ZCASH_USER",
        "ZCASH_PASSD",
        "EXPORT_DIR_ZCASH",
        "ZCASH_WALLET",
        "ZCASH_ADDRESS"
    ];

    for (const envVar of requiredEnvVars) {
        if (!process.env[envVar]) {
            console.log(`Missing environment variable: ${envVar}`);
            throw new Error(`Missing environment variable: ${envVar}`);
        }
    }

    return {
        networkId: "mainnet",
        nodeUrl: `https://rpc.mainnet.near.org`,
        polling_interval_ms: Number(process.env.POLLING_INTERVAL_MS) || 2000,
        max_polling_time_ms: Number(process.env.MAX_POLLING_TIME_MS) || 30000,
        ft_minimum_storage_balance_large: process.env.FT_MINIMUM_STORAGE_BALANCE_LARGE || "1250000000000000000000",
        defuseRPCUrl: process.env.DEFUSE_RPC_URL || "https://solver-relay-v2.chaindefuser.com/rpc",
        SLIPPAGE: process.env.NEAR_SLIPPAGE ? parseInt(process.env.NEAR_SLIPPAGE) : 1,
        defuseContractId: process.env.DEFUSE_CONTRACT_ID || "intents.near",
        coingeckoUrl: process.env.COINGECKO_API_URL || "",
        bitteApiKey: process.env.BITTE_API_KEY || "",
        bitteApiUrl: process.env.BITTE_API_URL || "",
        zcashwallet: process.env.ZCASH_WALLET || "",
        zcashexportdir: process.env.EXPORT_DIR_ZCASH || "",
        zcashusr: process.env.ZCASH_USER || "",
        zcashpass: process.env.ZCASH_PASSD || "",
        zcashaddr: process.env.ZCASH_ADDRESS || "",
        publicKey: "",
    };
}

const ACCOUNT_ID = process.env.ACCOUNT_ID;
const settings = getRuntimeSettings();

// Set the plugin url in order of BITTE_CONFIG, env, DEPLOYMENT_URL (used for Vercel deployments)
const PLUGIN_URL = DEPLOYMENT_URL || `${process.env.NEXT_PUBLIC_HOST || 'localhost'}:${process.env.PORT || 3000}`;



if (!PLUGIN_URL) {
  console.error(
    "!!! Plugin URL not found in env, BITTE_CONFIG or DEPLOYMENT_URL !!!"
  );
  process.exit(1);
}


export { ACCOUNT_ID, PLUGIN_URL, settings };
