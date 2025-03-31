# Bitte-ZCash-Intents

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/Law1912/Bitte-Zcash-Intents.git
   cd Bitte-Zcash-Intents
   ```
2. Install the dependencies:

   ```bash
   pnpm install
   ```

### Environment Variables

Create a `.env` file in the root directory of your project and add the necessary environment keys. Here is an example of what your `.env` file might look like:

```plaintext
BITTE_API_KEY="" # bitte_...
BITTE_API_URL="https://wallet.bitte.ai/api/v1"
ACCOUNT_ID="" # abc.near
NEAR_NETWORK="mainnet"
NEAR_RPC_URL="https://rpc.mainnet.near.org"
NEAR_SLIPPAGE=1
DEFUSE_CONTRACT_ID="intents.near"
COINGECKO_API_URL="https://api.coingecko.com/api/v3"
DEFUSE_RPC_URL="https://solver-relay-v2.chaindefuser.com/rpc"
FT_MINIMUM_STORAGE_BALANCE_LARGE="1250000000000000000000"
MAX_POLLING_TIME_MS=30000
POLLING_INTERVAL_MS=2000

ZCASH_WALLET=""    # http://172.0.0.1:8323
EXPORT_DIR_ZCASH=""   # ~/.zcash/zcash.intent
ZCASH_USER=""    # rpcuser
ZCASH_PASSD=""
ZCASH_ADDRESS=""   # unified address only.
```

### Running the Project

To start the project, run the following command:

```bash
pnpm run dev
```

This will start the development server and open the project in your default web browser.
