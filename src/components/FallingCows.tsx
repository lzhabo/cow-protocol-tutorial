"use client";

import { useEffect, useState } from "react";
import styles from "./FallingCows.module.css";

const COWS = [
  { left: "8%",  delay: "0s",    duration: "1.1s", size: 36, rotate: -15 },
  { left: "19%", delay: "0.15s", duration: "0.95s", size: 28, rotate: 20  },
  { left: "31%", delay: "0.05s", duration: "1.2s",  size: 42, rotate: -8  },
  { left: "44%", delay: "0.3s",  duration: "1.0s",  size: 32, rotate: 12  },
  { left: "57%", delay: "0.1s",  duration: "1.15s", size: 38, rotate: -20 },
  { left: "68%", delay: "0.25s", duration: "0.9s",  size: 26, rotate: 5   },
  { left: "79%", delay: "0.2s",  duration: "1.05s", size: 44, rotate: -10 },
  { left: "90%", delay: "0.35s", duration: "1.1s",  size: 30, rotate: 18  },
];

export default function FallingCows() {
  const [visible, setVisible] = useState(true);

  // Remove from DOM after all animations finish (longest = 0.35 + 1.2 ≈ 1.6s + bounce settle)
  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 2400);
    return () => clearTimeout(t);
  }, []);

  if (!visible) return null;

  return (
    <div className={styles.container} aria-hidden="true">
      {COWS.map((cow, i) => (
        <span
          key={i}
          className={styles.cow}
          style={{
            left:           cow.left,
            animationDelay: cow.delay,
            animationDuration: cow.duration,
            fontSize:       cow.size,
            "--rotate":     `${cow.rotate}deg`,
          } as React.CSSProperties}
        >
          🐄
        </span>
      ))}
    </div>
  );
}
