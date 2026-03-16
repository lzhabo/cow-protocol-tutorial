/**
 * lib/cow.ts
 *
 * CoW Protocol integration layer.
 * Runs server-side only (inside Next.js API routes) — the SDK makes
 * direct HTTP requests to the CoW order book API.
 */

import {
  OrderBookApi,
  OrderQuoteRequest,
  OrderQuoteSideKindSell,
  OrderQuoteSideKindBuy,
  SupportedChainId,
} from "@cowprotocol/cow-sdk";

// ── Supported networks ────────────────────────────────────────────────────────

export const NETWORKS: Record<string, { chainId: SupportedChainId; label: string; env: "prod" | "staging" }> = {
  sepolia:  { chainId: SupportedChainId.SEPOLIA,      label: "Sepolia (testnet)", env: "staging" },
  mainnet:  { chainId: SupportedChainId.MAINNET,      label: "Ethereum Mainnet",  env: "prod"    },
  gnosis:   { chainId: SupportedChainId.GNOSIS_CHAIN, label: "Gnosis Chain",      env: "prod"    },
  arbitrum: { chainId: SupportedChainId.ARBITRUM_ONE, label: "Arbitrum One",      env: "prod"    },
};

// ── Token registry ────────────────────────────────────────────────────────────

export type TokenInfo = { address: `0x${string}`; decimals: number; symbol: string };

export const TOKENS: Record<string, Record<string, TokenInfo>> = {
  sepolia: {
    WETH: { address: "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14", decimals: 18, symbol: "WETH" },
    USDC: { address: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238", decimals: 6,  symbol: "USDC" },
    COW:  { address: "0x0625aFB445C3B6B7B929342a04A22599fd5dBB59", decimals: 18, symbol: "COW"  },
  },
  gnosis: {
    WXDAI: { address: "0xe91D153E0b41518A2Ce8Dd3D7944Fa863463a97d", decimals: 18, symbol: "WXDAI" },
    USDC:  { address: "0xDDAfbb505ad214D7b80b1f830fcCc89B60fb7A83", decimals: 6,  symbol: "USDC"  },
    COW:   { address: "0x177127622c4A00F3d409B75571e12cB3c8973d3c", decimals: 18, symbol: "COW"   },
    WETH:  { address: "0x6A023CCd1ff6F2045C3309768eAd9E68F978f6e1", decimals: 18, symbol: "WETH"  },
  },
  mainnet: {
    WETH: { address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", decimals: 18, symbol: "WETH" },
    USDC: { address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", decimals: 6,  symbol: "USDC" },
    COW:  { address: "0xDEf1CA1fb7FBcDC777520aa7f396b4E015F497aB", decimals: 18, symbol: "COW"  },
    DAI:  { address: "0x6B175474E89094C44Da98b954EedeAC495271d0F", decimals: 18, symbol: "DAI"  },
  },
  arbitrum: {
    WETH: { address: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", decimals: 18, symbol: "WETH" },
    USDC: { address: "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8", decimals: 6,  symbol: "USDC" },
    COW:  { address: "0xcb8b5CD20BdCaea9a010aC1F8d835824F5C87A05", decimals: 18, symbol: "COW"  },
  },
};

// ── Types ─────────────────────────────────────────────────────────────────────

export interface QuoteInput {
  network: string;
  sellSymbol: string;
  buySymbol: string;
  sellAmount: string; // human-readable, e.g. "1.5"
}

export interface QuoteResult {
  sellToken:    TokenInfo;
  buyToken:     TokenInfo;
  network:      string;
  networkLabel: string;
  sellAmount:   string; // raw wei string (net of fee)
  buyAmount:    string; // raw wei string
  feeAmount:    string; // raw wei string
  quoteId:      number;
  validTo:      number; // unix timestamp
  signingScheme: string;
  // Formatted for display
  sellAmountFormatted: string;
  buyAmountFormatted:  string;
  feeAmountFormatted:  string;
  effectivePrice:      string; // buyToken per sellToken
}

// ── Main function ─────────────────────────────────────────────────────────────

export async function fetchQuote(input: QuoteInput): Promise<QuoteResult> {
  const net = NETWORKS[input.network];
  if (!net) throw new Error(`Unknown network: ${input.network}`);

  const tokens = TOKENS[input.network];
  const sellToken = tokens?.[input.sellSymbol.toUpperCase()];
  const buyToken  = tokens?.[input.buySymbol.toUpperCase()];

  if (!sellToken) throw new Error(`Token "${input.sellSymbol}" not found on ${input.network}`);
  if (!buyToken)  throw new Error(`Token "${input.buySymbol}" not found on ${input.network}`);
  if (sellToken.address === buyToken.address) throw new Error("Sell and buy tokens must be different");

  const sellAmountRaw = toRawAmount(input.sellAmount, sellToken.decimals);

  const orderBookApi = new OrderBookApi({ chainId: net.chainId, env: net.env });

  const validTo = Math.floor(Date.now() / 1000) + 30 * 60;

  const quoteRequest: OrderQuoteRequest = {
    sellToken:           sellToken.address,
    buyToken:            buyToken.address,
    // Neutral demo address — no funds needed for a quote fetch
    from:                "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
    sellAmountBeforeFee: sellAmountRaw.toString(),
    kind:                OrderQuoteSideKindSell.SELL,
    validTo,
  };

  const { quote, id: quoteId } = await orderBookApi.getQuote(quoteRequest);

  const sellNet = BigInt(quote.sellAmount);
  const buyAmt  = BigInt(quote.buyAmount);
  const feeAmt  = BigInt(quote.feeAmount ?? "0");

  // Price: how many buyToken units per 1 sellToken
  const price = Number(buyAmt * BigInt(10 ** sellToken.decimals)) /
                Number(sellNet * BigInt(10 ** buyToken.decimals));

  return {
    sellToken,
    buyToken,
    network:      input.network,
    networkLabel: net.label,
    sellAmount:   quote.sellAmount,
    buyAmount:    quote.buyAmount,
    feeAmount:    quote.feeAmount ?? "0",
    quoteId:      quoteId ?? 0,
    validTo:      Number(quote.validTo),
    signingScheme: quote.signingScheme ?? "eip712",
    sellAmountFormatted: formatAmount(sellNet, sellToken.decimals),
    buyAmountFormatted:  formatAmount(buyAmt,  buyToken.decimals),
    feeAmountFormatted:  formatAmount(feeAmt,  sellToken.decimals),
    effectivePrice: price.toLocaleString("en-US", { maximumFractionDigits: 6 }),
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function toRawAmount(human: string, decimals: number): bigint {
  if (!/^\d+(\.\d+)?$/.test(human.trim())) {
    throw new Error(`Invalid amount "${human}". Use a number like "1.5"`);
  }
  const [whole, frac = ""] = human.trim().split(".");
  return BigInt(whole + frac.slice(0, decimals).padEnd(decimals, "0"));
}

function formatAmount(raw: bigint, decimals: number): string {
  const divisor = BigInt(10 ** decimals);
  const whole = raw / divisor;
  const frac  = raw % divisor;
  const fracStr = frac.toString().padStart(decimals, "0").slice(0, 6).replace(/0+$/, "") || "0";
  return `${whole.toLocaleString("en-US")}.${fracStr}`;
}

// Re-export for use in components
export { OrderQuoteSideKindBuy };
