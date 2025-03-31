/** @type {import('next').NextConfig} */
const nextConfig = {
    webpack: (config, { isServer }) => {
      if (isServer) {
        config.externals = config.externals || [];
        config.externals.push("agent-twitter-client");
      }
      return config;
    },
    images: {
      domains: ["pbs.twimg.com", "s2.coinmarketcap.com"], // Allow Twitter-hosted images
    },
    async headers() {
      return [
        {
          source: "/api/:path*",
          headers: [
            { key: "Access-Control-Allow-Origin", value: "*" },
            {
              key: "Access-Control-Allow-Methods",
              value: "GET,POST,PUT,DELETE,OPTIONS",
            },
            { key: "Access-Control-Allow-Headers", value: "Content-Type" },
          ],
        },
      ];
    },
    async rewrites() {
      return [
        {
          source: "/.well-known/ai-plugin.json",
          destination: "/api/ai-plugin",
        },
      ];
    },
  };
  
  export default nextConfig;
  