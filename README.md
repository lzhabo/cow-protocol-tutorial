# CoW Swap Explorer

A Next.js app that fetches real swap quotes from [CoW Protocol](https://cow.fi) — built as a DevRel / integration tutorial.

**Live demo:** https://cow-protocol-tutorial.vercel.app

---

## What is CoW Protocol?

CoW Protocol (Coincidence of Wants) is a **DEX aggregator and batch auction system** running on Ethereum, Gnosis Chain, and Arbitrum.

Unlike a traditional DEX where your trade goes directly into an AMM liquidity pool, CoW Protocol works differently:

```
Your signed order
      ↓
  Order Book (off-chain database)
      ↓
  Batch Auction (~30 sec)
      ↓
  Solvers compete for best settlement
      ↓
  On-chain settlement (one tx for many orders)
```

![How CoW Protocol turns a swap request into best execution](public/cow-protocol-flow.png)

The key insight: by **batching orders together**, solvers can:
- Match buyers and sellers directly (peer-to-peer, zero AMM fees)
- Route across multiple liquidity sources simultaneously
- Return any price improvement back to the user as **surplus**

### Why this matters for developers

| Feature | What it means |
|---|---|
| **MEV protection** | Orders are off-chain until settlement — frontrunners can't see them in the mempool |
| **Gas efficiency** | You pay no gas if your order doesn't fill |
| **Surplus sharing** | If solvers find a better price than quoted, the difference goes to you |
| **ERC-20 native** | Protocol handles WETH wrapping/unwrapping automatically |
| **Open solver network** | Anyone can become a solver and compete |

---

## How the Quote API works

A "quote" is a price estimate that also doubles as a ready-to-sign order payload. You don't need a wallet to fetch one.

### Request

```
POST https://api.cow.fi/mainnet/api/v1/quote
```

```json
{
  "sellToken": "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
  "buyToken":  "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  "sellAmountBeforeFee": "1000000000000000000",
  "kind": "sell",
  "from": "0xYOUR_ADDRESS",
  "validTo": 1720000000
}
```

Key fields:
- `sellAmountBeforeFee` — gross sell amount in wei. The solver fee is deducted from this.
- `kind: "sell"` — you fix the input, output is estimated. Use `"buy"` to fix the output instead.
- `validTo` — Unix timestamp when the order expires (max ~1 hour).

### Response

```json
{
  "quote": {
    "sellAmount": "999812000000000000",
    "buyAmount":  "2201450000",
    "feeAmount":  "188000000000000",
    "validTo":    1720000000,
    "signingScheme": "eip712"
  },
  "id": 482910
}
```

Key fields:
- `sellAmount` — net sell amount after fee deduction
- `buyAmount` — minimum guaranteed output (in buy token's decimals)
- `feeAmount` — solver fee taken from the sell side
- `id` — quote ID, reference this when submitting the final order

### API environments

| Environment | Base URL | Use for |
|---|---|---|
| Production | `https://api.cow.fi` | Mainnet, Gnosis, Arbitrum |
| Staging | `https://barn.api.cow.fi` | Sepolia testnet, testing |

Network paths: `/mainnet`, `/xdai` (Gnosis), `/arbitrum_one`

---

## Full order lifecycle

```
1. QUOTE          POST /api/v1/quote
                  → get price estimate + quoteId

2. APPROVE        User approves CoW Vault Relayer to spend sell token
                  Contract: 0xC92E8bdf79f0507f65a392b0ab4667716BFE0110
                  (standard ERC-20 approve tx)

3. SIGN           EIP-712 typed data signature
                  No gas, no on-chain tx at this step

4. SUBMIT         POST /api/v1/orders
                  → orderId returned

5. AUCTION        Solvers pick up the order within ~30 seconds
                  They compete: best settlement wins

6. SETTLEMENT     Winner submits one batched tx on-chain
                  Your order fills, surplus returned to you

7. TRACK          GET /api/v1/orders/{orderId}
                  Status: open → fulfilled / expired / cancelled
```

This app implements **step 1** (quote fetch). Steps 2–7 require a connected wallet.

---

## Using the SDK

This project uses [`@cowprotocol/cow-sdk`](https://www.npmjs.com/package/@cowprotocol/cow-sdk) — the official TypeScript client.

### Low-level: OrderBookApi (used in this project)

Direct REST wrapper — no wallet required:

```typescript
import { OrderBookApi, OrderQuoteSideKindSell, SupportedChainId } from "@cowprotocol/cow-sdk";

const api = new OrderBookApi({ chainId: SupportedChainId.MAINNET, env: "prod" });

const { quote, id } = await api.getQuote({
  sellToken: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
  buyToken:  "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  sellAmountBeforeFee: "1000000000000000000",
  kind: OrderQuoteSideKindSell.SELL,
  from: "0xYOUR_ADDRESS",
  validTo: Math.floor(Date.now() / 1000) + 1800,
});

console.log("Buy amount:", quote.buyAmount); // raw integer string
console.log("Fee amount:", quote.feeAmount);
```

### High-level: TradingSdk (for full order submission)

Handles quoting + signing + submission in one flow:

```typescript
import { TradingSdk, SupportedChainId, OrderKind } from "@cowprotocol/cow-sdk";
import { ViemAdapter } from "@cowprotocol/sdk-viem-adapter";
import { createWalletClient, createPublicClient, http } from "viem";
import { mainnet } from "viem/chains";

const walletClient = createWalletClient({ ... });
const adapter = new ViemAdapter({
  provider: createPublicClient({ chain: mainnet, transport: http() }),
  walletClient,
});

const sdk = new TradingSdk(
  { chainId: SupportedChainId.MAINNET, appCode: "my-app" },
  {},
  adapter
);

// Step 1 — approve spend
await sdk.approveCowProtocol({ amount: BigInt("1000000000000000000") });

// Step 2 — quote + sign + submit
const { postSwapOrderFromQuote } = await sdk.getQuote({
  kind: OrderKind.SELL,
  sellToken: "0xC02...",
  buyToken:  "0xA0b...",
  sellTokenDecimals: 18,
  buyTokenDecimals:  6,
  amount: "1000000000000000000",
});

const { orderId } = await postSwapOrderFromQuote();
console.log("Tracking:", `https://explorer.cow.fi/orders/${orderId}`);
```

---

## Project structure

```
src/
├── app/
│   ├── page.tsx                 Main page
│   ├── page.module.css
│   ├── layout.tsx
│   ├── globals.css
│   └── api/quote/
│       └── route.ts             Server-side CoW API proxy (avoids CORS)
├── components/
│   ├── QuoteForm.tsx            Quote form + result card
│   ├── QuoteForm.module.css
│   ├── FallingCows.tsx          Landing animation
│   └── FallingCows.module.css
└── lib/
    └── cow.ts                   SDK integration, token registry, formatting
```

The CoW SDK runs **server-side** inside the Next.js Route Handler (`/api/quote`). This avoids CORS issues — the browser never calls `api.cow.fi` directly.

---

## Local development

```bash
git clone https://github.com/lzhabo/cow-protocol-tutorial.git
cd cow-protocol-tutorial

npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Supported networks and tokens

| Network | Chain ID | Tokens |
|---|---|---|
| Gnosis Chain | 100 | WXDAI, USDC, COW, WETH |
| Ethereum Mainnet | 1 | WETH, USDC, COW, DAI |
| Arbitrum One | 42161 | WETH, USDC, COW |
| Sepolia (testnet) | 11155111 | WETH, USDC, COW |

Token addresses are defined in [`src/lib/cow.ts`](src/lib/cow.ts). Adding a new token is one line.

---

## Ideas for extending this project

- **Connect a wallet** — use wagmi + viem to sign and submit orders from the browser
- **Order status tracker** — poll `GET /api/v1/orders/{orderId}` and show live fill progress
- **Price chart** — call the quote endpoint on an interval and plot the price over time
- **Limit orders** — switch `kind` to `BUY` and set `buyAmountAfterFee` to place a limit order
- **Multi-chain price comparison** — fetch the same quote on Mainnet, Gnosis, and Arbitrum side by side

---

## Resources

| | |
|---|---|
| CoW Protocol docs | https://docs.cow.fi |
| Order Book API reference | https://api.cow.fi/docs |
| CoW Explorer | https://explorer.cow.fi |
| SDK on npm | https://www.npmjs.com/package/@cowprotocol/cow-sdk |
| SDK source | https://github.com/cowprotocol/cow-sdk |

---

## License

MIT
