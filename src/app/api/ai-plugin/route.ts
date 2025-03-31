import { ACCOUNT_ID, PLUGIN_URL, settings } from "@/app/config";
import { NextResponse } from "next/server";
import tokenData from "@/app/near-intent/config/tokens.json";

export async function GET() {

    const coinsArray = [
        // From unified_tokens
        { symbol: "USDC", name: "USD Coin", decimals: 6},
        { symbol: "ETH", name: "ETH", decimals: 18},
        { symbol: "AURORA", name: "Aurora", decimals: 18},
        { symbol: "TURBO", name: "Turbo", decimals: 18},
        
        // From single_chain_tokens
        { symbol: "NEAR", name: "Near", decimals: 24},
        { symbol: "BTC", name: "Bitcoin", decimals: 8},
        { symbol: "SOL", name: "Solana", decimals: 9},
        { symbol: "DOGE", name: "Dogecoin", decimals: 8},
        { symbol: "XRP", name: "XRP", decimals: 6},
        { symbol: "PEPE", name: "Pepe", decimals: 18},
        { symbol: "SHIB", name: "Shiba Inu", decimals: 18},
        { symbol: "LINK", name: "Chainlink", decimals: 18},
        { symbol: "UNI", name: "Uniswap", decimals: 18},
        { symbol: "ARB", name: "Arbitrum", decimals: 18},
        { symbol: "AAVE", name: "Aave", decimals: 18},
        { symbol: "GMX", name: "GMX", decimals: 18},
        { symbol: "MOG", name: "Mog Coin", decimals: 18},
        { symbol: "BRETT", name: "Brett", decimals: 18},
        { symbol: "SWEAT", name: "Sweat Economy", decimals: 18},
        { symbol: "WIF", name: "dogwifhat", decimals: 6},
        { symbol: "BOME", name: "BOOK OF MEME", decimals: 6},
        { symbol: "ZEC", name: "ZCash", decimals: 8}
      ];

    const pluginData = {
        openapi: "3.1.0",
        info: {
            title: "ZEC Intents Agent",
            description: "Agent that can help you manage ZEC, BTC, ETH, NEAR, and many other tokens using near intents. Just say what you need.",
            version: "1.0.0",
        },
        servers: [
            {
                url: PLUGIN_URL,
            },
        ],
        "x-mb": {
            "account-id": ACCOUNT_ID,
            assistant: {
                name: "ZEC Intents Agent",
                description: "A blockchain assistant that provides information, retrieves the user's account ID, creates NEAR transaction payloads, and helps with crypto swaps with tree different apis: deposit, swap and withdraw.",

                instructions: `You assist with NEAR transactions, blockchain queries, account retrieval, and crypto swaps. You are a cross chain agent, and you can handle cross chain swaps using Near Intents. You are ZEC and BTC specialist too. You can handle ZEC deposits, swaps and withdraaw. You can also handle BTC deposits, swaps and withdraw. And inf fact you can do this for most tokens.

                You only connect users NEAR ACCOUNT, and you have the details of user's ZEC account. For Bitcoin, you find the derived address of user Near Wallet, and you do near multichain signature to support bitcoin operations.

                You only support the cryptocurrencies mentioned in ${JSON.stringify(coinsArray)}. If a user asks for an operation on a cryptocurrency which is not mentioned in ${JSON.stringify(coinsArray)}, please deny all such operations. THIS IS IMPORTANT
                Dont change the units yourself. Decimals for each token token will be taken care of, and you dont need to change the currencies yourselves. 

                When you see a new user or a new session, first make sure he is registered using the register-pubkey api.
                Make sure to check if the user is registered before swap or withdraw or even complete swap. If not registered, use the register-pubkey api.

                For Retrieval of Account Details:
                1. Use /api/tools/get-account-details to get the whole account details of the user.
                2. Whole balance is composed of 2 parts, one is the balance of different tokens in the wallet, and another is the balance of the tokens of the user in defuse of near-intents. 
                
                For blockchain transactions:
                1. Generate a transaction payload using "/api/tools/create-near-transaction".
                2. Use the 'generate-transaction' tool to execute the transaction.
                
                For Depositing Crypto into defuse or Near Intents:
                1. For all cryptocurrencies in ${JSON.stringify(coinsArray)} other than bitcoin, Generate a transaction payload using "/api/tools/defuse-deposit".
                2. If the crytocurrency to deposit in defuse or near intents is bitcoin or satoshi, then use "/api/tools/btc-defuse-deposit" to genrate transaction payload which is then relayed through "/api/tools/relay-transaction"
                3. If the crytocurrency to deposit in defuse or near intents is zcash or zatoshi, then use "/api/tools/zec-defuse-deposit"
                
                For Swapping Crypto in Defuse or Near Intents:
                1. Retrieve the swap intent message using "/api/tools/defuse-swap".
                2. Sign the intent using the 'sign-message' tool.
                3. Publish the signed intent using "/api/tools/publish-intent", Take the public key from the return values of sign-message.
                Both retrieval and publishing steps are required to complete a swap.
                
                For Withdrawing Crypto from Defuse or Near Intents:
                1. Retrieve the swap intent message using "/api/tools/defuse-withdraw".
                2. Sign the intent using the 'sign-message' tool.
                3. Publish the signed intent using "/api/tools/publish-intent, Take the public key from the return values of sign-message".
                Both retrieval and publishing steps are required to complete a withdrawal.

                For Bitcoin Transfers:
                1. Retrieve the transfer intent message using "/api/tools/transfer-bitcoin".
                2. Create a link to https://wallet.bitte.ai/sign-transaction/ after putting in the data in the url. Make sure to add the call back url to the link along with payload and the data.

                For ZCash Transfers:
                1. Retrieve the transfer intent message using "/api/tools/transfer-zec".

                Important Rules:
                
                1. sign-message takes in transaction payload which can optionally contain url. Dont miss out on the url.
                2. Whenever you take in the amount related to any currency for any purpose, ensure that it is in the same denomination as mentioned in ${JSON.stringify(coinsArray)}. For example, If the cryptocurrency is BTC, then the amount should be in BTC, not satoshi.
                3. If a user asks any operation to be done on a cryptocurrency which is not mentioned in ${JSON.stringify(coinsArray)}, please deny all such operations. We only support the cryptocurrencies mentioned in ${JSON.stringify(coinsArray)}.

                Until and unless the user says complete swap, it is always as swap in intents / defuse.

                When Doing Complete Swap Process, it is always done by a single link.
                When performing a complete cryptocurrency swap:
                a link is generated using the /api/tools/swap api. This one link is sufficient for all the three steps of the complete swap.

                `,
                tools: [{ type: "generate-transaction" }, { type: "generate-evm-tx" }, { type: "sign-message" }, { type: "get-token-metadata" }],
                image: `${PLUGIN_URL}/coolfi.svg`,
                categories: ["defi"],
            },
            image: `${PLUGIN_URL}/coolfi.svg`,
        },
        paths: {
            "/api/tools/register-pubkey": {
                get: {
                    operationId: "registerPublicKey",
                    summary: "function call for registering a new user.",
                    description: `When a user comes for first, we need to register him. do sign the payload using generate-transaction. You can also use this before publishing an intent to make sure it wont fail. Can also be used if this is a new session. This method has to be called without fail before any other action.
                    `,
                    parameters: [
                        {
                            name: "accountId",
                            in: "query",
                            required: true,
                            schema: {
                                type: "string"
                            },
                            description: "The NEAR account ID of the user"
                        },
                    ],
                    responses: {
                        "200": {
                            description: "Successful response",
                            content: {
                                "application/json": {
                                    schema: {
                                        type: "object",
                                        properties: {
                                            receiverId: {
                                                type: "string",
                                                description: "The receiver's NEAR account ID"
                                            },
                                            actions: {
                                                type: "array",
                                                items: {
                                                    type: "object",
                                                    properties: {
                                                        type: {
                                                            type: "string",
                                                            description: "The type of action (e.g., 'Transfer')"
                                                        },
                                                        params: {
                                                            type: "object",
                                                            additionalProperties: true,
                                                        }
                                                    }
                                                }
                                            },
                                        },
                                    },
                                },
                            },
                        },
                        "201": {
                            description: "Already Registered",
                            content: {
                                "application/json": {
                                    schema: {
                                        type: "object",
                                        properties: {
                                            info: {
                                                type: "string",
                                                description: "Info message"
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        "400": {
                            description: "Bad request",
                            content: {
                                "application/json": {
                                    schema: {
                                        type: "object",
                                        properties: {
                                            error: {
                                                type: "string",
                                                description: "Error message"
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        "500": {
                            description: "Server error",
                            content: {
                                "application/json": {
                                    schema: {
                                        type: "object",
                                        properties: {
                                            error: {
                                                type: "string",
                                                description: "Error message"
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },
                },
            },
            
            "/api/tools/swap": {
                get: {
                    operationId: "SwapCrypto",
                    summary: "Provides the user a single link for the complete swap process.",
                    description: `This will generate a single link, which is capable enough of the complete swap process, starting at depositing into defuse, then swapping inside defuse or intents, and finally withdrawing the amount to user wallet. This method should not be called if the swap has to be made inside defuse. Make sure to double check the details including where to withdraw the funds.`,
                    parameters: [
                        {
                            name: "accountId",
                            in: "query",
                            required: true,
                            schema: {
                                type: "string"
                            },
                            description: `Near account ID of the user`
                        },
                        {
                            name: "receiverId",
                            in: "query",
                            required: true,
                            schema: {
                                type: "string"
                            },
                            description: "The NEAR account ID of the receiver of funds. This can be the user himself or if specified then someone else."
                        },
                        {
                            name: "tokenIn",
                            in: "query",
                            required: true,
                            schema: {
                                type: "string"
                            },
                            description: `The token user wants to deposit. If possible understand and fill on your own. Do ask if obsecure. This must be one of the tokens from ${tokenData}. This is only the name of the token.`
                        },
                        {
                            name: "amount",
                            in: "query",
                            required: true,
                            schema: {
                                type: "string"
                            },
                            description: "the amount to deposit into defuse or near intents."
                        },
                    ],
                    responses: {
                        "200": {
                            description: "Returns the link for the swap",
                            content: {
                                "application/json": {
                                    schema: {
                                        type: "object",
                                        properties: {
                                            link: {
                                                type: "string",
                                                description: "The link to send to the user"
                                            },
                                        },
                                    }
                                }
                            }
                        },
                        "400": {
                            description: "Bad request",
                            content: {
                                "application/json": {
                                    schema: {
                                        type: "object",
                                        properties: {
                                            error: {
                                                type: "string",
                                                description: "Error message"
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        "500": {
                            description: "Error response",
                            content: {
                                "application/json": {
                                    schema: {
                                        type: "object",
                                        properties: {
                                            error: {
                                                type: "string",
                                                description: "Error message"
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            
            
            "/api/tools/defuse-deposit": {
                get: {
                    operationId: "depositIntoDefuse",
                    summary: "function call for depositing crypto into defuse or near intents.",
                    description: `Generates transaction to allow users to deposit their currency into defuse or near intents. Take the crypto currency to be deposited from the user. Also ask for the amount to be deposited. Whenever you take in the amount related to any currency, ensure that it is in the same denomination as mentioned in ${coinsArray}. For example, If the cryptocurrency is BTC, then the amount should be in BTC, not satoshi. If a user asks for done on a cryptocurrency which is not mentioned in coinsArray given in the instructions, please deny all such operations.
                    `,
                    parameters: [
                        {
                            name: "accountId",
                            in: "query",
                            required: true,
                            schema: {
                                type: "string"
                            },
                            description: "The NEAR account ID of the user"
                        },
                        {
                            name: "tokenIn",
                            in: "query",
                            required: true,
                            schema: {
                                type: "string"
                            },
                            description: `The token user wants to deposit. If possible understand and fill on your own. Do ask if obsecure. This is only the name of the token.`
                        },
                        {
                            name: "amount",
                            in: "query",
                            required: true,
                            schema: {
                                type: "string"
                            },
                            description: "the amount to deposit into defuse or near intents."
                        },
                    ],
                    responses: {
                        "200": {
                            description: "Successful response",
                            content: {
                                "application/json": {
                                    schema: {
                                        type: "object",
                                        properties: {
                                            receiverId: {
                                                type: "string",
                                                description: "The receiver's NEAR account ID"
                                            },
                                            actions: {
                                                type: "array",
                                                items: {
                                                    type: "object",
                                                    properties: {
                                                        type: {
                                                            type: "string",
                                                            description: "The type of action (e.g., 'Transfer')"
                                                        },
                                                        params: {
                                                            type: "object",
                                                            additionalProperties: true,
                                                        }
                                                    }
                                                }
                                            },
                                        },
                                    },
                                },
                            },
                        },
                        "400": {
                            description: "Bad request",
                            content: {
                                "application/json": {
                                    schema: {
                                        type: "object",
                                        properties: {
                                            error: {
                                                type: "string",
                                                description: "Error message"
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        "500": {
                            description: "Server error",
                            content: {
                                "application/json": {
                                    schema: {
                                        type: "object",
                                        properties: {
                                            error: {
                                                type: "string",
                                                description: "Error message"
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },
                },
            },
            
            "/api/tools/defuse-swap": {
                get: {
                    operationId: "swapCryptoInDefuse",
                    summary: "Retrieve a message to swap cryptocurrency.",
                    description: `Generates an intent message for swapping crypto based on user input. This message must be signed and then published (using publish-intent) to complete the swap. Show the signature and publicKey obtained after this method call to the user. Whenever you take in the amount related to any currency, ensure that it is in the same denomination as mentioned in coinsArray given in instructions. For example, If the cryptocurrency is BTC, then the amount should be in BTC, not satoshi. Donot add callbackurl by yourself. This method should be called only if the swap is told to be made inside defuse. Otherwise, the swap-crypto method should be used.`,
                    parameters: [
                        {
                            name: "accountId",
                            in: "query",
                            required: true,
                            schema: {
                                type: "string"
                            },
                            description: "The NEAR account ID of the user"
                        },
                        {
                            name: "amountIn",
                            in: "query",
                            required: true,
                            schema: {
                                type: "string"
                            },
                            description: "The amount of input crypto which user wants to swap"
                        },
                        {   
                            name: "tokenIn",
                            in: "query",
                            required: true,
                            schema: {
                                type: "string"
                            },
                            description: "The type of cryptocurrency the user is swapping from."
                        },
                        {   
                            name: "tokenOut",
                            in: "query",
                            required: true,
                            schema: {
                                type: "string"
                            },
                            description: "The type of cryptocurrency the user is swapping to."
                        },
                    ],
                    responses: {
                        "200": {
                            description: "Returns the swap intent message.",
                            content: {
                                "application/json": {
                                    schema: {
                                        type: "object",
                                        properties: {
                                            transactionPayload: {
                                                type: "object",
                                                description: "The payload to sign and publish. To take in everything in here, even the callbackUrl",
                                                properties: {
                                                    message: {
                                                        type: "string",
                                                        description: "The message to sign before publishing."
                                                    },
                                                    receiverId: {
                                                        type: "string",
                                                        description: "The contract's near id"
                                                    },
                                                    nonce: {
                                                        type: "string",
                                                        description: "The unique identifier for the transaction. This is a base64 string. ",
                                                        example1 : "HXRpqKa9xCGMpB37KpfQjSinMVQKuN1WF2Au72Pqg9Y=",
                                                        example2: "zanFCPTWKvvV5oBhL1JnZj4p7cUkqt1+PPff4j6GwLA="
                                                    },
                                                }
                                            },
                                            netReturns: {
                                                type: "object",
                                                additionalProperties: true,
                                                description: "The net returns of the swap. Show this to user before they sign the message."
                                            },
                                            quote_hash: {
                                                type: "string",
                                                description: "quote hash of the best quote index."
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        "400": {
                            description: "Bad request",
                            content: {
                                "application/json": {
                                    schema: {
                                        type: "object",
                                        properties: {
                                            error: {
                                                type: "string",
                                                description: "Error message"
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        "500": {
                            description: "Error response",
                            content: {
                                "application/json": {
                                    schema: {
                                        type: "object",
                                        properties: {
                                            error: {
                                                type: "string",
                                                description: "Error message"
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
            },
            
            "/api/tools/defuse-withdraw": {
                get: {
                    operationId: "defuseWithdraw",
                    summary: "Withdraws crypto from defuse or near intents.",
                    description: `Generates an intent message for withdrawing crypto from near intents or defuse based on user input. This message must be signed and then published (using publish-intent) to complete the swap. Whenever you take in the amount related to any currency, ensure that it is in the same denomination as mentioned in coinsArray given in instructions. For example, If the cryptocurrency is BTC, then the amount should be in BTC, not satoshi. Make sure to double check the details including where to withdraw the funds.`,
                    parameters: [
                        {
                            name: "accountId",
                            in: "query",
                            required: true,
                            schema: {
                                type: "string"
                            },
                            description: "The NEAR account ID of the user."
                        },
                        {
                            name: "receiverId",
                            in: "query",
                            required: true,
                            schema: {
                                type: "string"
                            },
                            description: `The acount ID of the receiver of funds. This can be the user himself or if specified then someone else. If the withdraw if of Zcash/ ZEC, then this is by default ${settings.zcashaddr}. Otherwise near account id of he user is the default.`
                        },
                        {
                            name: "exact_amount_in",
                            in: "query",
                            required: true,
                            schema: {
                                type: "string"
                            },
                            description: "The amount of crypto which user wants to withdraw"
                        },
                        {   
                            name: "defuse_asset_identifier_in",
                            in: "query",
                            required: true,
                            schema: {
                                type: "string"
                            },
                            description: "The type of cryptocurrency the user is withdrawing."
                        },
                        {   
                            name: "blockchain",
                            in: "query",
                            required: true,
                            schema: {
                                type: "string"
                            },
                            description: "the blockchain on which the address resides. it can be near, eth, sol, arb, base, etc."
                        },
                        // {
                        //     name: "callbackUrl",
                        //     in: "query",
                        //     // value: "/api/tools/publish-intent",
                        //     required: true,
                        //     schema: {
                        //         type: "string",
                        //         default: "/api/tools/publish-intent"
                        //     },
                        //     description: "The URL to send the signature and publicKey of signed intent along with the intent message itself and the receiverId and nonce"
                        // },
                    ],
                    responses: {
                        "200": {
                            description: "Returns the withdraw intent message.",
                            content: {
                                "application/json": {
                                    schema: {
                                        type: "object",
                                        properties: {
                                            message: {
                                                type: "string",
                                                description: "The message to sign before publishing."
                                            },
                                            receiverId: {
                                                type: "string",
                                                description: "The contract's near id"
                                            },
                                            nonce: {
                                                type: "string",
                                                description: "The unique identifier for the transaction. This is a base64 string. ",
                                                example1 : "HXRpqKa9xCGMpB37KpfQjSinMVQKuN1WF2Au72Pqg9Y=",
                                                example2: "zanFCPTWKvvV5oBhL1JnZj4p7cUkqt1+PPff4j6GwLA="
                                            },
                                        }
                                    }
                                }
                            }
                        },
                        "400": {
                            description: "Bad request",
                            content: {
                                "application/json": {
                                    schema: {
                                        type: "object",
                                        properties: {
                                            error: {
                                                type: "string",
                                                description: "Error message"
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        "500": {
                            description: "Error response",
                            content: {
                                "application/json": {
                                    schema: {
                                        type: "object",
                                        properties: {
                                            error: {
                                                type: "string",
                                                description: "Error message"
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
            },
            
            "/api/tools/publish-intent": {
                get: {
                    operationId: "publishIntent",
                    summary: "Publish a signed crypto swap intent.",
                    description: "Finalizes the crypto swap by submitting the signed intent message. The public key should be automatically extracted from the signing result - typically available in the response from the signing process as 'signResult.publicKey'. Get the quote hash from the best quote. This is required for swapping, not for withdrawals.",
                    parameters: [
                        {
                            name: "accountId",
                            in: "query",
                            required: true,
                            schema: {
                                type: "string"
                            },
                            description: "The NEAR account ID of the user"
                        },
                        {
                            name: "signature",
                            in: "query",
                            required: true,
                            schema: {
                                type: "string"
                            },
                            description: "The cryptographic signature generated for the intent message in the form of a hexadecimal string. This is available after signing from the return params of sign-message - no need to ask the user. Do not encode or decode any thing by your own."
                        },
                        {
                            name: "publicKey",
                            in: "query",
                            required: true,
                            schema: {
                                type: "string"
                            },
                            description: "The ed25519 public key from the signing result. Example format: 'ed25519:HeaBJ...'. Do not encode or decode any thing by your own. Take this value from the result of sign-message. Do not default to some example given or user wallet. This is basically the public key for the NEAR account of the user who signed the message."
                        },
                        {
                            name: "message",
                            in: "query",
                            required: true,
                            schema: {
                                type: "string"
                            },
                            description: "The intent message that was signed. This should be the exact message obtained from the swap API and used in the signing process."
                        },
                        {
                            name: "receiverId",
                            in: "query",
                            required: true,
                            schema: {
                                type: "string"
                            },
                            description: "The  NEAR contract ID where the intent will be published (typically 'intents.near')"
                        },
                        {
                            name: "nonce",
                            in: "query",
                            required: true,
                            schema: {
                                type: "string",
                            },
                            description: "The unique nonce value from the intent message. This must match the nonce used in the signing process. This is already a base64 encoded string. Do Not encode it again into base64."
                        },
                        {
                            name: "quote_hash",
                            in: "query",
                            required: false,
                            schema: {
                                type: "string"
                            },
                            description: "quote hash of the best qoute. Required for swapping, not for withdrawals."
                        }
                    ],
                    responses: {
                        "200": {
                            description: "Intent successfully published.",
                            content: {
                                "application/json": {
                                    schema: {
                                        type: "object",
                                        properties: {
                                            accountDetails: {
                                                type: "string",
                                                description: "The user's account details",
                                            },
                                        },
                                    },
                                },
                            },
                        },
                        "400": {
                            description: "Bad request",
                            content: {
                                "application/json": {
                                    schema: {
                                        type: "object",
                                        properties: {
                                            error: {
                                                type: "string",
                                                description: "Error message"
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        "500": {
                            description: "Server error",
                            content: {
                                "application/json": {
                                    schema: {
                                        type: "object",
                                        properties: {
                                            error: {
                                                type: "string",
                                                description: "Error message"
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },
                },
            },
            
            "/api/tools/get-account-details": {
                get: {
                    operationId: "getAcountDetails",
                    summary: "get user wallet details",
                    description: "Respond with user wallet details. The account details consist of two parts, user wallet details and the balance of the tokens deposited in defuse or near intents. Show their information separately to the users.",
                    parameters: [
                        {
                            name: "accountId",
                            in: "query",
                            required: true,
                            schema: {
                                type: "string"
                            },
                            description: "The NEAR account ID of the user"
                        },
                    ],
                    responses: {
                        "200": {
                            description: "Successful response",
                            content: {
                                "application/json": {
                                    schema: {
                                        type: "object",
                                        properties: {
                                            ttoken_balance_wallet: {
                                                type: "string",
                                                description: "The user's account details. This contains the details of the amount of different tokens present in user wallet.",
                                            },
                                            satoshi: {
                                                type: "string",
                                                description: "The user's number of satoshi details in the user wallet",
                                            },
                                            zec: {
                                                type: "string",
                                                description: "The user's number of zec in the user wallet. This is the balance in zec. Donot change the number by yourself.",
                                            },
                                            token_balance_defuse: {
                                                type: "string",
                                                description: "This is the amount of different tokens deposited into in defuse or near intents. This is different from the wallet balance.",
                                            }
                                        },
                                    },
                                },
                            },
                        },
                        "400": {
                            description: "Bad request",
                            content: {
                                "application/json": {
                                    schema: {
                                        type: "object",
                                        properties: {
                                            error: {
                                                type: "string",
                                                description: "Error message"
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        "500": {
                            description: "Server error",
                            content: {
                                "application/json": {
                                    schema: {
                                        type: "object",
                                        properties: {
                                            error: {
                                                type: "string",
                                                description: "Error message"
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },
                },
            },
            
            "/api/tools/transfer-bitcoin": {
                get: {
                    operationId: "transferBitcoin",
                    summary: "transfer bitcoin",
                    description: "Generates transaction to transfer bitcoin to another account, the amount should be in satoshi. After getting the response: 1) Make a link to https://wallet.bitte.ai/sign-transaction endpoint (I want you to make me sign the transaction using this endpoint instead of generate-transaction). Do fill in :transactionData with the data coming in response. Take the amount in BTC, and not in satoshi from the users. If the user gives the amount in satoshi, convert it to BTC and then proceed.",
                    parameters: [
                        {
                            name: "accountId",
                            in: "query",
                            required: true,
                            schema: {
                                type: "string"
                            },
                            description: "The NEAR account ID of the user"
                        },
                        {
                            name: "receiverId",
                            in: "query",
                            required: true,
                            schema: {
                                type: "string"
                            },
                            description: "This receiverId can be bitcoin address or it can be NEAR account ID of the recepient."
                        },
                        {
                            name: "isReceiverIdNearAccount",
                            in: "query",
                            required: true,
                            schema: {
                                type: "string"
                            },
                            description: "'true' if receiverId is NEAR account ID, 'false' if receiverId is bitcoin address. If possible understand and fill on your own. (eg for near account is user.near)"
                        },
                        {
                            name: "amount",
                            in: "query",
                            required: true,
                            schema: {
                                type: "string"
                            },
                            description: "amount to transfer. This can be either in bitcoin or satoshi. If possible understand and fill on your own."
                        },
                        {
                            name: "isAmountInBitcoin",
                            in: "query",
                            required: true,
                            schema: {
                                type: "string"
                            },
                            description: "'true' if amount is in bitcoin, 'false' if amount is in NEAR/satoshi. This is very important. But try to fill it on your own."
                        },
                        // {
                        //     name: "callbackUrl",
                        //     in: "query",
                        //     required: true,
                        //     schema: {
                        //         type: "string"
                        //     },
                        //     description: `call https://wallet.bitte.ai/sign-transaction?transactions_data=:transactionPayload&callback_url=http://${PLUGIN_URL}/api/tools/relay-transaction?data=:transactionData . Do fill in transactionData and transactionPayload with all the required params.`
                        // },
                    ],
                    responses: {
                        "200": {
                            description: "Successful response",
                            content: {
                                "application/json": {
                                    schema: {
                                        type: "object",
                                        properties: {
                                            link: {
                                                type: "string",
                                                description: "The user needs to open this link. Make sure to give him this link."
                                            },
                                        },
                                    },
                                },
                            },
                        },
                        "400": {
                            description: "Bad request",
                            content: {
                                "application/json": {
                                    schema: {
                                        type: "object",
                                        properties: {
                                            error: {
                                                type: "string",
                                                description: "Error message"
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        "500": {
                            description: "Server error",
                            content: {
                                "application/json": {
                                    schema: {
                                        type: "object",
                                        properties: {
                                            error: {
                                                type: "string",
                                                description: "Error message"
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },
                },
            },
            
            "/api/tools/relay-transaction": {
                get: {
                    operationId: "relayTransaction",
                    summary: "relay the transactions sent",
                    description: "This will take the transaction payload and relay it to the bitcoin network. The data and the transaction hash are neccesary and should be given.",
                    parameters: [
                        {
                            name: "accountId",
                            in: "query",
                            required: true,
                            schema: {
                                type: "string"
                            },
                            description: "account id of the user who has signed the transaction."
                        },
                        {
                            name: "data",
                            in: "query",
                            required: true,
                            schema: {
                                type: "string"
                            },
                            description: "data should be taken from the api which got the payload."
                        },
                        {
                            name: "transactionHashes",
                            in: "query", 
                            required: true,
                            schema: {
                                type: "string"
                            },
                            description: "The transaction hash got from signing the transaction. This is something which you will get on sign-transaction endpoint."
                        }
                    ],
                    responses: {
                        "200": {
                            description: "Successful response",
                            content: {
                                "application/json": {
                                    schema: {
                                        type: "object",
                                        properties: {
                                            transactionHash: {
                                                type: "string",
                                                description: "The transaction hash of the relayed transaction",
                                            },
                                        },
                                    },
                                },
                            },
                        },
                        "400": {
                            description: "Bad request",
                            content: {
                                "application/json": {
                                    schema: {
                                        type: "object",
                                        properties: {
                                            error: {
                                                type: "string",
                                                description: "Error message"
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        "500": {
                            description: "Server error",
                            content: {
                                "application/json": {
                                    schema: {
                                        type: "object",
                                        properties: {
                                            error: {
                                                type: "string",
                                                description: "Error message"
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },
                },
            },
            
            "/api/tools/btc-defuse-deposit": {
                get: {
                    operationId: "btcDefuseDeposit",
                    summary: "Deposits bitcoin into defuse",
                    description: "Generates transaction to deposit bitcoin into defuse or near intents. Take the amount in BTC, and not in satoshi from the users. After getting the response: 1) Make a link to https://wallet.bitte.ai/sign-transaction endpoint (I want you to make me sign the transaction using this endpoint instead of generate-transaction). Do fill in :transactionData with the data coming in response.",
                    parameters: [
                        {
                            name: "accountId",
                            in: "query",
                            required: true,
                            schema: {
                                type: "string"
                            },
                            description: "The NEAR account ID of the user"
                        },
                        {
                            name: "amount",
                            in: "query",
                            required: true,
                            schema: {
                                type: "string"
                            },
                            description: "amount to transfer. This can be either in bitcoin or satoshi. If possible understand and fill on your own."
                        },
                        {
                            name: "isAmountInBitcoin",
                            in: "query",
                            required: true,
                            schema: {
                                type: "string"
                            },
                            description: "'true' if amount is in bitcoin, 'false' if amount is in NEAR. This is very important. But try to fill it on your own."
                        },

                    ],
                    responses: {
                        "200": {
                            description: "Successful response",
                            content: {
                                "application/json": {
                                    schema: {
                                        type: "object",
                                        properties: {
                                            link: {
                                                type: "string",
                                                description: "The user needs to open this link. Make sure to give him this link.",
                                            },
                                        },
                                    },
                                },
                            },
                        },
                        "400": {
                            description: "Bad request",
                            content: {
                                "application/json": {
                                    schema: {
                                        type: "object",
                                        properties: {
                                            error: {
                                                type: "string",
                                                description: "Error message"
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        "500": {
                            description: "Server error",
                            content: {
                                "application/json": {
                                    schema: {
                                        type: "object",
                                        properties: {
                                            error: {
                                                type: "string",
                                                description: "Error message"
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },
                },
            },

           
            "/api/tools/create-near-transaction": {
                get: {
                    operationId: "createNearTransaction",
                    summary: "Create a NEAR transaction payload",
                    description: "Generates a NEAR transaction payload for transferring tokens to be used directly in the generate-tx tool.",
                    parameters: [
                        {
                            name: "receiverId",
                            in: "query",
                            required: true,
                            schema: {
                                type: "string"
                            },
                            description: "The NEAR account ID of the receiver"
                        },
                        {
                            name: "amount",
                            in: "query",
                            required: true,
                            schema: {
                                type: "string"
                            },
                            description: "The amount of NEAR tokens to transfer"
                        }
                    ],
                    responses: {
                        "200": {
                            description: "Successful response",
                            content: {
                                "application/json": {
                                    schema: {
                                        type: "object",
                                        properties: {
                                            transactionPayload: {
                                                type: "object",
                                                properties: {
                                                    receiverId: {
                                                        type: "string",
                                                        description: "The receiver's NEAR account ID"
                                                    },
                                                    actions: {
                                                        type: "array",
                                                        items: {
                                                            type: "object",
                                                            properties: {
                                                                type: {
                                                                    type: "string",
                                                                    description: "The type of action (e.g., 'Transfer')"
                                                                },
                                                                params: {
                                                                    type: "object",
                                                                    properties: {
                                                                        deposit: {
                                                                            type: "string",
                                                                            description: "The amount to transfer in yoctoNEAR"
                                                                        }
                                                                    }
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        "400": {
                            description: "Bad request",
                            content: {
                                "application/json": {
                                    schema: {
                                        type: "object",
                                        properties: {
                                            error: {
                                                type: "string",
                                                description: "Error message"
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        "500": {
                            description: "Error response",
                            content: {
                                "application/json": {
                                    schema: {
                                        type: "object",
                                        properties: {
                                            error: {
                                                type: "string",
                                                description: "Error message"
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
        },
    };

    return NextResponse.json(pluginData);
}