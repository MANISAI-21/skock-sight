/**
 * largeOrderDetector.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Detects institutionally-significant (large) trades from a trade stream.
 *
 * A trade is considered "large" if its size exceeds the 95th percentile of the
 * most recent N trades (rolling window).  This dynamically adapts to the
 * normal activity level of each stock.
 *
 * Usage:
 *   import { createDetector } from './largeOrderDetector';
 *   const detector = createDetector();
 *   const largeOrders = detector.detect(newTrades);
 */

export interface Trade {
  price: number;
  size: number;
  side: 'buy' | 'sell';
  timestamp: number;
}

export interface LargeOrder {
  price: number;
  size: number;
  side: 'buy' | 'sell';
  timestamp: number;
  /** The 95th-percentile threshold that this trade exceeded */
  threshold: number;
}

const DEFAULT_WINDOW = 200;
const PERCENTILE = 0.95;

/** Compute the Nth percentile of a numeric array (sorted ascending). */
function percentile(sortedValues: number[], p: number): number {
  if (sortedValues.length === 0) return 0;
  const idx = p * (sortedValues.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sortedValues[lo];
  return sortedValues[lo] * (hi - idx) + sortedValues[hi] * (idx - lo);
}

/**
 * Create a stateful large-order detector with its own rolling window.
 * Factory pattern lets you create per-ticker instances.
 */
export function createDetector(windowSize = DEFAULT_WINDOW) {
  const window: number[] = []; // circular buffer of recent trade sizes

  return {
    /**
     * Feed new trades in.  Returns only trades that exceed the 95th-percentile.
     * Also updates the rolling window.
     */
    detect(trades: Trade[]): LargeOrder[] {
      if (!trades || trades.length === 0) return [];

      // Add sizes to the rolling window
      for (const t of trades) {
        window.push(t.size);
        if (window.length > windowSize) window.shift();
      }

      // Need enough history for a meaningful percentile
      if (window.length < 10) return [];

      const sorted = [...window].sort((a, b) => a - b);
      const threshold = percentile(sorted, PERCENTILE);

      return trades
        .filter((t) => t.size > threshold)
        .map((t) => ({ ...t, threshold }));
    },

    /** Reset the rolling window (e.g. on ticker change) */
    reset() {
      window.length = 0;
    },

    /** Current 95th-percentile threshold (for display) */
    currentThreshold(): number {
      if (window.length < 10) return 0;
      const sorted = [...window].sort((a, b) => a - b);
      return percentile(sorted, PERCENTILE);
    },
  };
}

/** Singleton map of per-ticker detectors */
const detectors = new Map<string, ReturnType<typeof createDetector>>();

export function getDetector(ticker: string): ReturnType<typeof createDetector> {
  if (!detectors.has(ticker)) detectors.set(ticker, createDetector());
  return detectors.get(ticker)!;
}
