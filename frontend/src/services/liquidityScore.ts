/**
 * liquidityScore.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Computes a composite liquidity score (0–100) from three market microstructure
 * signals: order book depth, bid-ask spread tightness, and recent trade volume.
 *
 * Weights:
 *   Depth          → 40 %
 *   Spread tightness → 40 %
 *   Volume         → 20 %
 *
 * Classifications:
 *   0  – 33  → Low liquidity
 *   34 – 66  → Moderate liquidity
 *   67 – 100 → High liquidity
 */

export type LiquidityClassification = 'Low liquidity' | 'Moderate liquidity' | 'High liquidity';

export interface LiquidityScoreInput {
  /** Total bid + ask volume in the order book */
  depth: number;
  /**
   * Bid-ask spread as an absolute price value.
   * Smaller = tighter = more liquid.
   */
  spread: number;
  /** Recent trade volume (e.g. last N trades summed) */
  volume: number;
}

export interface LiquidityScoreResult {
  score: number;                     // 0 – 100
  classification: LiquidityClassification;
  breakdown: {
    depthScore: number;              // 0 – 100 sub-score
    spreadScore: number;
    volumeScore: number;
  };
}

/* ── Calibration constants (tune to your data distribution) ──── */
const DEPTH_REFERENCE   = 100_000;  // "typical" depth for 100-point score
const VOLUME_REFERENCE  = 50_000;   // "typical" recent volume for 100-point score
const SPREAD_REFERENCE  = 0.05;     // spread that scores 0 (very wide = illiquid)

/** Map a raw value to a 0–100 score using a logarithmic curve */
function logScore(value: number, reference: number): number {
  if (value <= 0 || reference <= 0) return 0;
  const raw = Math.log1p(value) / Math.log1p(reference);
  return Math.min(100, Math.max(0, raw * 100));
}

/**
 * Compute the composite liquidity score.
 */
export function computeLiquidityScore(input: LiquidityScoreInput): LiquidityScoreResult {
  const { depth, spread, volume } = input;

  // --- Depth sub-score (log scale) ---
  const depthScore = logScore(depth, DEPTH_REFERENCE);

  // --- Spread sub-score: tighter spread ↦ higher score ---
  // When spread ≥ SPREAD_REFERENCE, score = 0; when spread = 0, score = 100.
  const normalizedSpread = Math.min(1, Math.max(0, spread / SPREAD_REFERENCE));
  const spreadScore = (1 - normalizedSpread) * 100;

  // --- Volume sub-score (log scale) ---
  const volumeScore = logScore(volume, VOLUME_REFERENCE);

  // --- Composite (weighted) ---
  const score = Math.round(0.4 * depthScore + 0.4 * spreadScore + 0.2 * volumeScore);

  const classification: LiquidityClassification =
    score >= 67 ? 'High liquidity'
    : score >= 34 ? 'Moderate liquidity'
    : 'Low liquidity';

  return {
    score,
    classification,
    breakdown: { depthScore, spreadScore, volumeScore },
  };
}
