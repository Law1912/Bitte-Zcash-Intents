# chat-boilerplate

## Read the tutorial:

"dev": "concurrently \"next dev -p 4000\"\"make-agent dev -p 4000\"",

https://docs.bitte.ai/agents/embeddable-chat-component

## Getting Started

This guide will help you set up the project and configure the necessary components to get started.

### Prerequisites

Ensure you have the following installed on your machine:

- Node.js
- pnpm (Node Package Manager)
- Bitte API Key

### GET AN API KEY

https://key.bitte.ai/

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/BitteProtocol/chat-boilerplate.git
   cd chat-boilerplate
   ```
2. Install the dependencies:

   ```bash
   pnpm install
   ```

### Environment Variables

Create a `.env` file in the root directory of your project and add the necessary environment keys. Here is an example of what your `.env` file might look like:

```plaintext
BITTE_API_KEY=your_api_key_here
```

### Configuring `Main.tsx`

The `Main.tsx` component is already set up to use the Bitte AI chat functionality. Ensure that your environment variables are correctly set, as they might be used in the component or other parts of your application.

Here is a brief overview of the `Main.tsx` component:

```typescript
"use client";

import { BitteAiChat } from "@bitte-ai/chat";
import "@bitte-ai/chat/style.css";
import { useBitteWallet, Wallet } from "@bitte-ai/react";
import { useEffect, useState } from "react";
import WelcomeMessage from "./WelcomeMessage";

const bitteAgent = {
  id: "your-agent-id.vercel.app",
  name: "Your Agent Name",
  description:
    "Agent Description",
  image: "/icon.svg",
};

const Main: React.FC = () => {
  const { selector } = useBitteWallet();
  const [wallet, setWallet] = useState<Wallet>();

  useEffect(() => {
    const fetchWallet = async () => {
      const walletInstance = await selector.wallet();
      setWallet(walletInstance);
    };
    if (selector) fetchWallet();
  }, [selector]);

  return (
    <main className="flex flex-col items-center gap-8 max-w-5xl mx-auto my-4 md:my-8">
      <div className="h-[calc(100vh-114px)] lg:h-[calc(100vh-180px)] w-full">
        <BitteAiChat
          options={{ agentImage: bitteAgent.image, agentName: bitteAgent.name }}
          agentId={bitteAgent.id}
          wallet={{ near: { wallet } }}
          apiUrl={"/api/chat"}
          colors={{
            generalBackground: "#18181A",
            messageBackground: "#0A0A0A",
            textColor: "#FAFAFA",
            buttonColor: "#000000",
            borderColor: "#334155",
          }}
          welcomeMessageComponent={<WelcomeMessage />}
        />
      </div>
    </main>
  );
};

export default Main;
```

### Running the Project

To start the project, run the following command:

```bash
pnpm run dev
```

This will start the development server and open the project in your default web browser.

### Additional Configuration

- If you need to configure additional settings, refer to the documentation or comments within the codebase.

## Contributing

If you wish to contribute to this project, please fork the repository and submit a pull request.
