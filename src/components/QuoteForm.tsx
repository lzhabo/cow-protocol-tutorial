"use client";

import { useState, FormEvent } from "react";
import type { QuoteResult } from "@/lib/cow";
import { TOKENS, NETWORKS } from "@/lib/cow";
import styles from "./QuoteForm.module.css";

export default function QuoteForm() {
  const [network,     setNetwork]    = useState("gnosis");
  const [sellSymbol,  setSellSymbol] = useState("WXDAI");
  const [buySymbol,   setBuySymbol]  = useState("USDC");
  const [sellAmount,  setSellAmount] = useState("1.0");
  const [loading,     setLoading]    = useState(false);
  const [result,      setResult]     = useState<QuoteResult | null>(null);
  const [error,       setError]      = useState<string | null>(null);

  const tokenList = Object.keys(TOKENS[network] ?? {});

  // When network changes, reset tokens to valid defaults for that network
  function handleNetworkChange(net: string) {
    setNetwork(net);
    setResult(null);
    setError(null);
    const tokens = Object.keys(TOKENS[net] ?? {});
    setSellSymbol(tokens[0] ?? "");
    setBuySymbol(tokens[1] ?? "");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const res = await fetch("/api/quote", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ network, sellSymbol, buySymbol, sellAmount }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      setResult(data as QuoteResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.wrapper}>
      {/* ── Form ─────────────────────────────────────────── */}
      <form onSubmit={handleSubmit} className={styles.form}>
        {/* Network */}
        <div className={styles.field}>
          <label className={styles.label}>Network</label>
          <select
            className={styles.select}
            value={network}
            onChange={e => handleNetworkChange(e.target.value)}
          >
            {Object.entries(NETWORKS).map(([key, n]) => (
              <option key={key} value={key}>{n.label}</option>
            ))}
          </select>
        </div>

        {/* Token row */}
        <div className={styles.tokenRow}>
          <div className={styles.field}>
            <label className={styles.label}>Sell</label>
            <select
              className={styles.select}
              value={sellSymbol}
              onChange={e => { setSellSymbol(e.target.value); setResult(null); }}
            >
              {tokenList.map(t => (
                <option key={t} value={t} disabled={t === buySymbol}>{t}</option>
              ))}
            </select>
          </div>

          <span className={styles.arrow}>→</span>

          <div className={styles.field}>
            <label className={styles.label}>Buy</label>
            <select
              className={styles.select}
              value={buySymbol}
              onChange={e => { setBuySymbol(e.target.value); setResult(null); }}
            >
              {tokenList.map(t => (
                <option key={t} value={t} disabled={t === sellSymbol}>{t}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Amount */}
        <div className={styles.field}>
          <label className={styles.label}>Sell amount</label>
          <input
            className={styles.input}
            type="number"
            min="0.000001"
            step="any"
            value={sellAmount}
            onChange={e => { setSellAmount(e.target.value); setResult(null); }}
            required
          />
        </div>

        <button className={styles.btn} type="submit" disabled={loading}>
          {loading ? (
            <span className={styles.spinner} aria-label="Loading" />
          ) : (
            "Get Quote"
          )}
        </button>
      </form>

      {/* ── Error ────────────────────────────────────────── */}
      {error && (
        <div className={styles.error}>
          <span className={styles.errorIcon}>⚠</span>
          <span>{error}</span>
        </div>
      )}

      {/* ── Result ───────────────────────────────────────── */}
      {result && <QuoteCard result={result} />}
    </div>
  );
}

// ── Quote result card ──────────────────────────────────────────────────────────

function QuoteCard({ result }: { result: QuoteResult }) {
  // CoW Explorer URL per network:
  // mainnet  → https://explorer.cow.fi/
  // gnosis   → https://explorer.cow.fi/gc/
  // arbitrum → https://explorer.cow.fi/arbitrum/
  // sepolia  → https://explorer.cow.fi/sepolia/
  const explorerBase =
    result.network === "gnosis"   ? "https://explorer.cow.fi/gc" :
    result.network === "arbitrum" ? "https://explorer.cow.fi/arbitrum" :
    result.network === "sepolia"  ? "https://explorer.cow.fi/sepolia" :
    "https://explorer.cow.fi";

  return (
    <div className={styles.card}>
      {/* Header */}
      <div className={styles.cardHeader}>
        <span className={styles.badge}>{result.networkLabel}</span>
        <span className={styles.quoteId}>Quote #{result.quoteId}</span>
      </div>

      {/* Main swap display */}
      <div className={styles.swapDisplay}>
        <div className={styles.swapSide}>
          <span className={styles.swapLabel}>You sell</span>
          <span className={styles.swapAmount}>{result.sellAmountFormatted}</span>
          <span className={styles.swapSymbol}>{result.sellToken.symbol}</span>
        </div>
        <div className={styles.swapArrow}>→</div>
        <div className={styles.swapSide}>
          <span className={styles.swapLabel}>You receive</span>
          <span className={styles.swapAmount} style={{ color: "var(--green)" }}>
            {result.buyAmountFormatted}
          </span>
          <span className={styles.swapSymbol}>{result.buyToken.symbol}</span>
        </div>
      </div>

      {/* Details */}
      <div className={styles.details}>
        <Row label="Rate">
          1 {result.sellToken.symbol} = {result.effectivePrice} {result.buyToken.symbol}
        </Row>
        <Row label="Solver fee">
          {result.feeAmountFormatted} {result.sellToken.symbol}
        </Row>
        <Row label="Signing scheme">
          <code>{result.signingScheme}</code>
        </Row>
        <Row label="Valid until">
          {new Date(result.validTo * 1000).toLocaleTimeString()} today
        </Row>
      </div>

      {/* Next steps */}
      <div className={styles.nextSteps}>
        <p className={styles.nextStepsTitle}>What happens next</p>
        <ol className={styles.stepList}>
          <li>Approve CoW Protocol to spend your <strong>{result.sellToken.symbol}</strong></li>
          <li>Sign the order with EIP-712 (no gas yet)</li>
          <li>Submit signed order to the CoW order book</li>
          <li>Solvers compete — best price wins, surplus returned to you</li>
        </ol>
      </div>

      <a
        className={styles.explorerLink}
        href={explorerBase}
        target="_blank"
        rel="noopener noreferrer"
      >
        Open CoW Explorer ↗
      </a>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className={styles.row}>
      <span className={styles.rowLabel}>{label}</span>
      <span className={styles.rowValue}>{children}</span>
    </div>
  );
}
