import axios, { type AxiosRequestConfig } from "axios"
import { settings } from "../../config";
const appOriginUrl = "*"

export const getTokenPriceUSD = async (id: string): Promise<number> => {
    const config: AxiosRequestConfig = {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": appOriginUrl,
      },
    };
  
    try {
      const response = await axios.get(
        `${settings.coingeckoUrl}/simple/price?ids=${id}&vs_currencies=usd&precision=full`,
        config
      );
  
      // Extracting price and converting to BigInt safely
      const priceStr = response.data?.[id]?.usd ?? "0";
      return Number(priceStr);
    } catch (error) {
      console.error("Error fetching token price:", error);
      return 0;
    }
  };

