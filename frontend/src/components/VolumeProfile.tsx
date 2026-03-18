import React, { useMemo } from 'react';
import { BarChart2, TrendingUp, TrendingDown, Minus } from 'lucide-react';

export interface VolumeTrade {
  price: number;
  size: number;
  side: 'buy' | 'sell';
}

interface VolumeProfileProps {
  trades: VolumeTrade[];
  buckets?: number;
  height?: number;
}

interface Bucket {
  midPrice: number;
  priceLabel: string;
  buyVol: number;
  sellVol: number;
  total: number;
  dominant: 'buy' | 'sell' | 'neutral';
  isPOC: boolean;
  inValueArea: boolean;
}

const fmt = (v: number) =>
  v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M`
  : v >= 1_000   ? `${(v / 1_000).toFixed(1)}K`
  : v.toFixed(0);

/**
 * VolumeProfile — Redesigned
 * ─────────────────────────────────────────────────────────────────
 * • Point of Control (POC): the price level with the highest volume — highlighted gold
 * • Value Area (VA): price range covering 70% of total volume — shaded region
 * • Split bars: green (buy) + red (sell) side by side per bucket
 * • Stats panel: Total vol, buy%, sell%, POC price, VA High/Low
 * • Clearer labels with formatted volume numbers
 */
const VolumeProfile: React.FC<VolumeProfileProps> = ({
  trades,
  buckets: numBuckets = 24,
  height = 380,
}) => {
  const { bucketData, stats } = useMemo(() => {
    if (!trades || trades.length === 0) return { bucketData: [], stats: null };

    const prices = trades.map((t) => t.price);
    const minP = Math.min(...prices);
    const maxP = Math.max(...prices);
    const range = maxP - minP || 1;
    const step = range / numBuckets;

    const raw: { buy: number; sell: number }[] = Array.from({ length: numBuckets }, () => ({ buy: 0, sell: 0 }));
    for (const t of trades) {
      const idx = Math.min(numBuckets - 1, Math.floor((t.price - minP) / step));
      if (t.side === 'buy') raw[idx].buy += t.size;
      else raw[idx].sell += t.size;
    }

    const totals = raw.map((r) => r.buy + r.sell);
    const grandTotal = totals.reduce((a, b) => a + b, 0) || 1;

    // POC = index with max total
    const pocIdx = totals.indexOf(Math.max(...totals));

    // Value Area: 70% of volume around POC, expanding outward
    const valueAreaTarget = grandTotal * 0.70;
    let vaVol = totals[pocIdx];
    const vaSet = new Set([pocIdx]);
    let lo = pocIdx, hi = pocIdx;
    while (vaVol < valueAreaTarget && (lo > 0 || hi < numBuckets - 1)) {
      const addLo = lo > 0 ? totals[lo - 1] : 0;
      const addHi = hi < numBuckets - 1 ? totals[hi + 1] : 0;
      if (addHi >= addLo && hi < numBuckets - 1) { hi++; vaSet.add(hi); vaVol += addHi; }
      else if (lo > 0) { lo--; vaSet.add(lo); vaVol += addLo; }
      else { hi++; vaSet.add(hi); vaVol += addHi; }
    }

    const totalBuy = raw.reduce((s, r) => s + r.buy, 0);
    const totalSell = raw.reduce((s, r) => s + r.sell, 0);
    const pocPrice = minP + (pocIdx + 0.5) * step;
    const vaLow  = minP + lo * step;
    const vaHigh = minP + (hi + 1) * step;

    // Build from highest price at top → lowest at bottom
    const buckets: Bucket[] = raw
      .map((r, i) => {
        const midPrice = minP + (i + 0.5) * step;
        const total = r.buy + r.sell;
        return {
          midPrice,
          priceLabel: `₹${midPrice.toFixed(2)}`,
          buyVol: r.buy,
          sellVol: r.sell,
          total,
          dominant: (r.buy > r.sell ? 'buy' : r.sell > r.buy ? 'sell' : 'neutral') as 'buy' | 'sell' | 'neutral',
          isPOC: i === pocIdx,
          inValueArea: vaSet.has(i),
        };
      })
      .reverse();

    return {
      bucketData: buckets,
      stats: {
        totalBuy, totalSell, grandTotal,
        buyPct: (totalBuy / grandTotal) * 100,
        sellPct: (totalSell / grandTotal) * 100,
        pocPrice, vaHigh, vaLow,
      },
    };
  }, [trades, numBuckets]);

  const maxTotal = useMemo(
    () => Math.max(...bucketData.map((b) => b.total), 1),
    [bucketData]
  );

  if (!trades || trades.length === 0) {
    return (
      <div className="chart-container glass-panel fade-in slide-up delay-3">
        <div className="chart-header">
          <h3><BarChart2 size={18} className="icon-inline" />Volume Profile</h3>
        </div>
        <div className="chart-empty" style={{ minHeight: 120 }}>
          <BarChart2 size={28} style={{ opacity: 0.3 }} />
          <span>No trade data yet — accumulating…</span>
        </div>
      </div>
    );
  }

  // SVG layout constants
  const LABEL_W      = 72;   // price label column
  const BAR_W        = 180;  // max bar width
  const VOL_LABEL_W  = 54;   // right-side volume text
  const IND_W        = 16;   // left indicator strip (VA / POC)
  const SVG_W        = IND_W + LABEL_W + BAR_W + VOL_LABEL_W;
  const ROW_H        = Math.max(10, height / numBuckets);
  const SVG_H        = ROW_H * numBuckets;

  return (
    <div className="chart-container glass-panel fade-in slide-up delay-3 vp-container">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="chart-header">
        <h3><BarChart2 size={18} className="icon-inline" />Volume Profile</h3>
        <div className="vp-legend">
          <span className="vp-legend-item vp-legend-buy">▮ Buy</span>
          <span className="vp-legend-item vp-legend-sell">▮ Sell</span>
          <span className="vp-legend-item vp-legend-poc">★ POC</span>
          <span className="vp-legend-item vp-legend-va">▓ Value Area</span>
        </div>
      </div>

      {/* ── Stats strip ────────────────────────────────────────── */}
      {stats && (
        <div className="vp-stats-strip">
          <div className="vp-stat">
            <span className="vp-stat-label">POC</span>
            <span className="vp-stat-value" style={{ color: '#f59e0b' }}>₹{stats.pocPrice.toFixed(2)}</span>
          </div>
          <div className="vp-stat">
            <span className="vp-stat-label">VA High</span>
            <span className="vp-stat-value text-success">₹{stats.vaHigh.toFixed(2)}</span>
          </div>
          <div className="vp-stat">
            <span className="vp-stat-label">VA Low</span>
            <span className="vp-stat-value text-danger">₹{stats.vaLow.toFixed(2)}</span>
          </div>
          <div className="vp-stat">
            <TrendingUp size={13} style={{ color: '#10b981' }} />
            <span className="vp-stat-value text-success">{stats.buyPct.toFixed(1)}%</span>
          </div>
          <div className="vp-stat">
            <TrendingDown size={13} style={{ color: '#ef4444' }} />
            <span className="vp-stat-value text-danger">{stats.sellPct.toFixed(1)}%</span>
          </div>
          <div className="vp-stat">
            <span className="vp-stat-label">Total</span>
            <span className="vp-stat-value">{fmt(stats.grandTotal)}</span>
          </div>
        </div>
      )}

      {/* ── Chart ──────────────────────────────────────────────── */}
      <div style={{ overflowY: 'auto', maxHeight: height + 20 }}>
        <svg
          width="100%"
          height={SVG_H}
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ display: 'block' }}
        >
          <defs>
            {/* Value area background */}
            <pattern id="vaPattern" width="4" height="4" patternUnits="userSpaceOnUse">
              <rect width="4" height="4" fill="rgba(59,130,246,0.05)" />
              <line x1="0" y1="4" x2="4" y2="0" stroke="rgba(59,130,246,0.12)" strokeWidth="0.5" />
            </pattern>
          </defs>

          {bucketData.map((b, i) => {
            const y = i * ROW_H;
            const totalBarW = (b.total / maxTotal) * BAR_W;
            const buyBarW = b.total > 0 ? (b.buyVol / b.total) * totalBarW : 0;
            const sellBarW = totalBarW - buyBarW;
            const leftX = IND_W + LABEL_W;
            const rowMid = y + ROW_H / 2;

            return (
              <g key={i}>
                {/* ── Value Area background stripe ─────────────── */}
                {b.inValueArea && !b.isPOC && (
                  <rect
                    x={IND_W}
                    y={y}
                    width={SVG_W - IND_W}
                    height={ROW_H}
                    fill="url(#vaPattern)"
                  />
                )}

                {/* ── POC row highlight ─────────────────────────── */}
                {b.isPOC && (
                  <>
                    <rect x={IND_W} y={y} width={SVG_W - IND_W} height={ROW_H}
                      fill="rgba(245,158,11,0.08)" />
                    <rect x={IND_W} y={y} width={3} height={ROW_H}
                      fill="rgba(245,158,11,0.9)" rx={1} />
                    <rect x={SVG_W - 3} y={y} width={3} height={ROW_H}
                      fill="rgba(245,158,11,0.9)" rx={1} />
                  </>
                )}

                {/* ── Left indicator: VA marker or dot ─────────── */}
                {b.inValueArea && !b.isPOC && (
                  <rect x={0} y={y + 1} width={3} height={ROW_H - 2}
                    fill="rgba(59,130,246,0.6)" rx={1} />
                )}

                {/* ── Price label ───────────────────────────────── */}
                <text
                  x={IND_W + LABEL_W - 5}
                  y={rowMid}
                  dominantBaseline="middle"
                  textAnchor="end"
                  fontSize={Math.min(10, ROW_H * 0.75)}
                  fontWeight={b.isPOC ? 700 : 400}
                  fill={b.isPOC ? '#f59e0b' : b.inValueArea ? '#cbd5e1' : '#64748b'}
                >
                  {b.priceLabel}
                </text>

                {/* ── POC star label ────────────────────────────── */}
                {b.isPOC && (
                  <text
                    x={IND_W + 4} y={rowMid}
                    dominantBaseline="middle"
                    fontSize={Math.min(9, ROW_H * 0.7)}
                    fill="#f59e0b"
                    fontWeight={700}
                  >★</text>
                )}

                {/* ── Buy portion (green, left-to-right) ───────── */}
                {buyBarW > 0.5 && (
                  <rect
                    x={leftX} y={y + 1.5}
                    width={buyBarW} height={ROW_H - 3}
                    fill="#10b981"
                    fillOpacity={b.inValueArea ? 0.75 : 0.5}
                    rx={1.5}
                  />
                )}

                {/* ── Sell portion (red, right of buy) ─────────── */}
                {sellBarW > 0.5 && (
                  <rect
                    x={leftX + buyBarW} y={y + 1.5}
                    width={sellBarW} height={ROW_H - 3}
                    fill="#ef4444"
                    fillOpacity={b.inValueArea ? 0.75 : 0.5}
                    rx={1.5}
                  />
                )}

                {/* ── Volume label right of bar ─────────────────── */}
                {b.total > 0 && ROW_H >= 10 && (
                  <text
                    x={leftX + totalBarW + 5}
                    y={rowMid}
                    dominantBaseline="middle"
                    fontSize={Math.min(9, ROW_H * 0.7)}
                    fill={b.isPOC ? '#f59e0b' : b.dominant === 'buy' ? '#10b981' : b.dominant === 'sell' ? '#ef4444' : '#64748b'}
                    fillOpacity={b.isPOC ? 1 : 0.8}
                    fontWeight={b.isPOC ? 700 : 400}
                  >
                    {fmt(b.total)}
                  </text>
                )}

                {/* ── Row separator ─────────────────────────────── */}
                <line
                  x1={IND_W} y1={y + ROW_H} x2={SVG_W} y2={y + ROW_H}
                  stroke="rgba(255,255,255,0.03)" strokeWidth={0.5}
                />
              </g>
            );
          })}

          {/* ── Y-axis separator ─────────────────────────────────── */}
          <line
            x1={IND_W + LABEL_W} y1={0}
            x2={IND_W + LABEL_W} y2={SVG_H}
            stroke="rgba(255,255,255,0.15)" strokeWidth={1}
          />
        </svg>
      </div>

      {/* ── Bottom legend note ──────────────────────────────────── */}
      <div className="vp-footer-note">
        <span>▓ Value Area = 70% of volume</span>
        <span>★ POC = highest volume level</span>
      </div>
    </div>
  );
};

export default VolumeProfile;
