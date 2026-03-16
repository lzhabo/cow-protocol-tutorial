# CoW Swap Explorer

A Next.js app that fetches real swap quotes from [CoW Protocol](https://cow.fi) — built as a DevRel / integration portfolio project.

---

## What this demonstrates

- Integrating `@cowprotocol/cow-sdk` in a Next.js App Router project
- Fetching live swap quotes from the CoW order book API (no wallet required)
- Calling the CoW API server-side via a Next.js Route Handler to avoid CORS
- Multi-network support: Sepolia, Ethereum Mainnet, Gnosis Chain, Arbitrum One
- Clean, dark-mode UI with CSS Modules — zero external UI libraries

---

## CoW Protocol in plain English

CoW Protocol is a **batch-auction DEX** that collects off-chain signed orders, then has professional solvers compete to find the best settlement every ~30 seconds. When two orders complement each other (a "Coincidence of Wants"), they're matched peer-to-peer — no AMM fees.

Users get **MEV protection**, **gas efficiency** (failed trades cost nothing), and often a **better price** than any single DEX.

---

## Prerequisites

- Node.js ≥ 20
- npm ≥ 9

No wallet or testnet funds required.

---

## Local development

```bash
git clone https://github.com/lzhabo/cow-protocol-tutorial.git
cd cow-swap-explorer

npm install
cp .env.example .env.local

npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Deploy to Vercel

```bash
npm i -g vercel
vercel
```

Or connect the GitHub repo in the Vercel dashboard — it auto-detects Next.js.

No environment variables are required for the default setup (Sepolia quotes use the public staging API).

---

## Project structure

```
src/
├── app/
│   ├── page.tsx              Main page — hero, form, explainer
│   ├── page.module.css
│   ├── layout.tsx
│   ├── globals.css
│   └── api/quote/
│       └── route.ts          Server-side CoW API proxy
├── components/
│   ├── QuoteForm.tsx          Client component — form + result card
│   └── QuoteForm.module.css
└── lib/
    └── cow.ts                 CoW SDK integration, token registry
```

---

## How the integration works

1. User fills in the form (sell token, buy token, amount, network).
2. The client POSTs to `/api/quote` (Next.js Route Handler).
3. The route handler calls `OrderBookApi.getQuote()` from `@cowprotocol/cow-sdk`.
4. The SDK sends `POST https://barn.api.cow.fi/mainnet/api/v1/quote` (or the prod equivalent).
5. The quote result is returned to the client and rendered.

Running the CoW SDK on the server avoids CORS issues and keeps the integration logic out of the browser bundle.

---

## Adding order signing (next step)

To go beyond quotes and actually submit orders:

```typescript
import { TradingSdk, SupportedChainId, OrderKind } from "@cowprotocol/cow-sdk";
import { ViemAdapter } from "@cowprotocol/sdk-viem-adapter";

const adapter = new ViemAdapter({ provider: publicClient, walletClient });
const sdk = new TradingSdk({ chainId: SupportedChainId.SEPOLIA, appCode: "my-app" }, {}, adapter);

const { postSwapOrderFromQuote } = await sdk.getQuote({ ... });
await sdk.approveCowProtocol({ amount });          // ERC-20 approval
const { orderId } = await postSwapOrderFromQuote(); // EIP-712 sign + submit
```

See [docs.cow.fi](https://docs.cow.fi) for the full flow.

---

## License

MIT
