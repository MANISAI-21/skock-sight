/**
 * vwapCalculator.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Computes Volume-Weighted Average Price (VWAP) from a stream of trades and
 * returns a time series compatible with the existing StockChart price history
 * format { date, vwap }.
 *
 * Formula:
 *   VWAP(t) = Σ(price_i × volume_i) / Σ(volume_i)   where i ∈ [0, t]
 *
 * The returned array can be fed directly as a second <Line> or <Area> overlay
 * inside StockChart by the parent without touching the chart component.
 */

export interface TradePoint {
  price: number;
  volume: number;
  timestamp: number; // Unix ms
}

export interface VWAPPoint {
  /** ISO-string or ms timestamp — matches `chartData[n].date` format */
  date: number;
  vwap: number;
}

/**
 * Compute a cumulative VWAP series from an array of trade points.
 *
 * @param trades Ordered (oldest → newest) trade data
 * @returns      Time series of { date, vwap } — one entry per input trade
 */
export function computeVWAP(trades: TradePoint[]): VWAPPoint[] {
  if (!trades || trades.length === 0) return [];

  let cumulativePV = 0; // Σ(price × volume)
  let cumulativeV = 0;  // Σ(volume)

  return trades.map((trade) => {
    cumulativePV += trade.price * trade.volume;
    cumulativeV += trade.volume;
    return {
      date: trade.timestamp,
      vwap: cumulativeV === 0 ? trade.price : cumulativePV / cumulativeV,
    };
  });
}

/**
 * Compute a single current VWAP scalar from accumulated trades.
 * Useful for displaying a live number without keeping the full series.
 */
export function computeCurrentVWAP(trades: TradePoint[]): number {
  if (!trades || trades.length === 0) return 0;
  let pv = 0;
  let v = 0;
  for (const t of trades) {
    pv += t.price * t.volume;
    v += t.volume;
  }
  return v === 0 ? 0 : pv / v;
}

/**
 * Merge a VWAP series into an existing price history array as an overlay field.
 * Returns a NEW array — original data is unchanged.
 *
 * @param priceHistory  Existing chart data      [{ date, close, volume }]
 * @param vwapSeries    VWAP time series         [{ date, vwap }]
 */
export function mergeVWAPOverlay<T extends { date: number | string }>(
  priceHistory: T[],
  vwapSeries: VWAPPoint[]
): (T & { vwap?: number })[] {
  if (vwapSeries.length === 0) return priceHistory.map((p) => ({ ...p }));

  // Build a quick lookup by nearest timestamp
  const sorted = [...vwapSeries].sort((a, b) => a.date - b.date);

  return priceHistory.map((point) => {
    const t = typeof point.date === 'string' ? new Date(point.date).getTime() : point.date;
    // Binary search for the closest VWAP point at or before t
    let lo = 0, hi = sorted.length - 1, best = sorted[0];
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (sorted[mid].date <= t) { best = sorted[mid]; lo = mid + 1; }
      else { hi = mid - 1; }
    }
    return { ...point, vwap: best.vwap };
  });
}
