/**
 * orderBookSelectors.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Memoised selector layer for order book data.
 *
 * Prevents recomputing expensive metrics (imbalance, liquidity score, walls,
 * pressure percentages) on every render by caching results keyed on the input
 * snapshot reference.
 *
 * All selectors follow the pattern:
 *   selector(snapshot) → derived value
 * and return the **same object reference** when the input snapshot hasn't changed.
 */

import { computeLiquidityScore, type LiquidityScoreResult } from '../services/liquidityScore';
import { detectWalls, detectStrongestWalls, type LiquidityWall } from '../services/liquidityWallDetector';

/* ── Lightweight reference-equality memoiser ─────────────────────── */
function memoize<TArg, TResult>(fn: (arg: TArg) => TResult): (arg: TArg) => TResult {
  let lastArg: TArg | undefined;
  let lastResult: TResult;
  return (arg: TArg): TResult => {
    if (arg === lastArg) return lastResult;
    lastArg = arg;
    lastResult = fn(arg);
    return lastResult;
  };
}

/* ── Types ───────────────────────────────────────────────────────── */
export interface OrderEntry {
  price: number;
  volume: number;
}

export interface Snapshot {
  bids: OrderEntry[];
  asks: OrderEntry[];
  currentPrice?: number;
  /** Optional spread value; computed from best bid/ask if absent */
  spread?: number;
}

export interface PressurePercents {
  bidPercent: number;
  askPercent: number;
  totalBidVolume: number;
  totalAskVolume: number;
}

export interface ImbalanceResult {
  obi: number;          // –1 … +1
  totalBidVolume: number;
  totalAskVolume: number;
}

/* ── Selectors ───────────────────────────────────────────────────── */

/**
 * Order Book Imbalance  (–1 … +1)
 * Positive = more bid pressure, Negative = more ask pressure
 */
export const selectImbalance = memoize((snapshot: Snapshot): ImbalanceResult => {
  const totalBidVolume = snapshot.bids.reduce((s, b) => s + b.volume, 0);
  const totalAskVolume = snapshot.asks.reduce((s, a) => s + a.volume, 0);
  const total = totalBidVolume + totalAskVolume;
  const obi = total === 0 ? 0 : (totalBidVolume - totalAskVolume) / total;
  return { obi, totalBidVolume, totalAskVolume };
});

/**
 * Bid/Ask pressure as percentages (for pressure bars)
 */
export const selectPressurePercents = memoize((snapshot: Snapshot): PressurePercents => {
  const { totalBidVolume, totalAskVolume } = selectImbalance(snapshot);
  const total = totalBidVolume + totalAskVolume;
  return {
    bidPercent: total > 0 ? (totalBidVolume / total) * 100 : 50,
    askPercent: total > 0 ? (totalAskVolume / total) * 100 : 50,
    totalBidVolume,
    totalAskVolume,
  };
});

/** Best bid-ask spread */
function computeSpread(snapshot: Snapshot): number {
  if (snapshot.spread !== undefined) return snapshot.spread;
  const bestBid = snapshot.bids[0]?.price ?? 0;
  const bestAsk = snapshot.asks[0]?.price ?? 0;
  return bestAsk > bestBid ? bestAsk - bestBid : 0;
}

/**
 * Composite liquidity score (0–100) with classification
 */
export const selectLiquidityScore = memoize((snapshot: Snapshot): LiquidityScoreResult => {
  const { totalBidVolume, totalAskVolume } = selectImbalance(snapshot);
  const depth = totalBidVolume + totalAskVolume;
  const spread = computeSpread(snapshot);
  return computeLiquidityScore({ depth, spread, volume: depth * 0.3 });
});

/**
 * All detected liquidity walls (sorted by strength)
 */
export const selectWalls = memoize((snapshot: Snapshot): LiquidityWall[] =>
  detectWalls(snapshot)
);

/**
 * Strongest buy wall + strongest sell wall
 */
export const selectStrongestWalls = memoize((snapshot: Snapshot) =>
  detectStrongestWalls(snapshot)
);

/**
 * Market pressure ratio (bid volume / ask volume).
 * > 1 = bullish, < 1 = bearish, = 1 = balanced.
 */
export const selectMarketPressure = memoize((snapshot: Snapshot): number => {
  const { totalBidVolume, totalAskVolume } = selectImbalance(snapshot);
  return totalAskVolume === 0 ? 1 : totalBidVolume / totalAskVolume;
});
