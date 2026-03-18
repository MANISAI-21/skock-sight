/**
 * liquidityWallDetector.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Detects significant liquidity walls in an order book snapshot.
 *
 * A "wall" is any price level whose volume exceeds 3× the average depth across
 * all levels on that side of the book.
 *
 * Pure function — no side-effects. Can be safely memoised.
 */

export interface OrderEntry {
  price: number;
  volume: number;
}

export interface LiquidityWall {
  price: number;
  volume: number;
  type: 'buy_wall' | 'sell_wall';
  /** How many multiples of the average depth this wall represents */
  strengthMultiple: number;
}

export interface OrderBookSnapshot {
  bids: OrderEntry[];
  asks: OrderEntry[];
}

const WALL_THRESHOLD_MULTIPLIER = 3;

function detectSideWalls(
  levels: OrderEntry[],
  type: 'buy_wall' | 'sell_wall'
): LiquidityWall[] {
  if (!levels || levels.length === 0) return [];

  const totalVolume = levels.reduce((sum, l) => sum + l.volume, 0);
  const avgVolume = totalVolume / levels.length;

  if (avgVolume === 0) return [];

  return levels
    .filter((l) => l.volume > avgVolume * WALL_THRESHOLD_MULTIPLIER)
    .map((l) => ({
      price: l.price,
      volume: l.volume,
      type,
      strengthMultiple: l.volume / avgVolume,
    }))
    .sort((a, b) => b.strengthMultiple - a.strengthMultiple);
}

/**
 * Detect all liquidity walls in an order book snapshot.
 *
 * @param snapshot  Order book with bids and asks arrays
 * @returns         Array of detected walls, sorted by strength (strongest first)
 */
export function detectWalls(snapshot: OrderBookSnapshot): LiquidityWall[] {
  const buyWalls = detectSideWalls(snapshot.bids, 'buy_wall');
  const sellWalls = detectSideWalls(snapshot.asks, 'sell_wall');

  // Interleave by strength so callers get the most impactful walls first
  return [...buyWalls, ...sellWalls].sort(
    (a, b) => b.strengthMultiple - a.strengthMultiple
  );
}

/**
 * Convenience: return only the single strongest wall on each side.
 */
export function detectStrongestWalls(snapshot: OrderBookSnapshot): {
  strongestBuyWall: LiquidityWall | null;
  strongestSellWall: LiquidityWall | null;
} {
  const buyWalls = detectSideWalls(snapshot.bids, 'buy_wall');
  const sellWalls = detectSideWalls(snapshot.asks, 'sell_wall');
  return {
    strongestBuyWall: buyWalls[0] ?? null,
    strongestSellWall: sellWalls[0] ?? null,
  };
}
