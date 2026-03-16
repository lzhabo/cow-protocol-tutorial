import QuoteForm from "@/components/QuoteForm";
import FallingCows from "@/components/FallingCows";
import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.main}>
      <FallingCows />
      {/* ── Header ─────────────────────────────────────── */}
      <header className={styles.header}>
        <div className={styles.logo}>
          <span className={styles.logoIcon}>🐄</span>
          <span className={styles.logoText}>CoW Swap Explorer</span>
        </div>
        <nav className={styles.nav}>
          <a href="https://docs.cow.fi" target="_blank" rel="noopener noreferrer">Docs</a>
          <a href="https://explorer.cow.fi" target="_blank" rel="noopener noreferrer">Explorer</a>
          <a
            href="https://github.com/lzhabo/cow-protocol-tutorial"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.githubLink}
          >
            GitHub
          </a>
        </nav>
      </header>

      {/* ── Hero ───────────────────────────────────────── */}
      <section className={styles.hero}>
        <h1 className={styles.title}>
          Get a real CoW Protocol swap quote
        </h1>
        <p className={styles.subtitle}>
          Fetch live price quotes from the CoW order book — no wallet needed.
          <br />
          Queries the same API used by{" "}
          <a href="https://swap.cow.fi" target="_blank" rel="noopener noreferrer">
            CoW Swap
          </a>
          .
        </p>
      </section>

      {/* ── Quote form ─────────────────────────────────── */}
      <div className={styles.formContainer}>
        <QuoteForm />
      </div>

      {/* ── How it works ───────────────────────────────── */}
      <section className={styles.howItWorks}>
        <h2 className={styles.sectionTitle}>How CoW Protocol works</h2>
        <div className={styles.steps}>
          <Step n={1} title="Collect orders">
            Users sign orders off-chain. No gas until settlement — failed
            trades cost nothing.
          </Step>
          <Step n={2} title="Batch auction">
            Every ~30 seconds, solvers compete to find the best settlement
            for all pending orders simultaneously.
          </Step>
          <Step n={3} title="CoW matching">
            If two orders complement each other, they're matched peer-to-peer
            (Coincidence of Wants) — zero AMM fees.
          </Step>
          <Step n={4} title="Surplus to user">
            Any price improvement beyond your quoted minimum is returned to you
            as surplus.
          </Step>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────── */}
      <footer className={styles.footer}>
        Built with{" "}
        <a href="https://www.npmjs.com/package/@cowprotocol/cow-sdk" target="_blank" rel="noopener noreferrer">
          @cowprotocol/cow-sdk
        </a>{" "}
        · Quotes are read-only — no transactions are submitted ·{" "}
        <a href="https://docs.cow.fi" target="_blank" rel="noopener noreferrer">
          CoW Protocol docs
        </a>
      </footer>
    </main>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className={styles.step}>
      <div className={styles.stepNumber}>{n}</div>
      <div>
        <h3 className={styles.stepTitle}>{title}</h3>
        <p className={styles.stepBody}>{children}</p>
      </div>
    </div>
  );
}
