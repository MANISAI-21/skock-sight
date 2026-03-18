import React, { useRef, useEffect, useMemo, useState } from 'react';
import { Flame } from 'lucide-react';
import type { OrderBookSnapshot } from '../services/marketDataStream';

interface LiquidityHeatmapProps {
  snapshots: OrderBookSnapshot[];
  isLoading?: boolean;
}

const CANVAS_HEIGHT = 280;
const Y_BUCKETS = 60;
const LABEL_W = 60;
const TIME_LABEL_H = 28;

/**
 * LiquidityHeatmap — Enhanced Canvas Heatmap
 * ─────────────────────────────────────────────────────────────────
 * Improvements over v1:
 *  • HSL colour mapping (blue → cyan → green for bids, pink → orange → red for asks)
 *  • Per-column intensity blending (bids and asks overlap in the same bucket)
 *  • Mid-price trace line (white dashed)
 *  • Volume-weighted glow on high-intensity cells
 *  • Time grid every 10 snapshots
 *  • Tooltip on hover showing price + time + volume
 */
const LiquidityHeatmap: React.FC<LiquidityHeatmapProps> = ({ snapshots, isLoading }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);

  // ── Price range ──────────────────────────────────────────────────
  const { minPrice, maxPrice } = useMemo(() => {
    let min = Infinity, max = -Infinity;
    for (const snap of snapshots) {
      for (const b of snap.bids) { if (b.price < min) min = b.price; if (b.price > max) max = b.price; }
      for (const a of snap.asks) { if (a.price < min) min = a.price; if (a.price > max) max = a.price; }
    }
    if (!isFinite(min)) return { minPrice: 0, maxPrice: 1 };
    const pad = (max - min) * 0.08 || 2;
    return { minPrice: min - pad, maxPrice: max + pad };
  }, [snapshots]);

  // ── Draw ─────────────────────────────────────────────────────────
  useEffect(() => {
    console.log("Heatmap rendering snapshots:", snapshots.length);
    const canvas = canvasRef.current;
    if (!canvas || snapshots.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const cssW = canvas.offsetWidth;
    const cssH = CANVAS_HEIGHT;
    canvas.width = cssW * dpr;
    canvas.height = cssH * dpr;
    ctx.scale(dpr, dpr);

    const drawW = cssW - LABEL_W;
    const drawH = cssH - TIME_LABEL_H;
    const priceRange = maxPrice - minPrice || 1;
    const bucketH = drawH / Y_BUCKETS;
    const colW = drawW / Math.max(snapshots.length, 1);

    // ── Background gradient ─────────────────────────────────────
    const bgGrad = ctx.createLinearGradient(0, 0, 0, cssH);
    bgGrad.addColorStop(0, '#0a0d18');
    bgGrad.addColorStop(1, '#0f111a');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, cssW, cssH);

    // ── Draw area background ─────────────────────────────────────
    ctx.fillStyle = 'rgba(15,17,30,0.6)';
    ctx.fillRect(LABEL_W, 0, drawW, drawH);

    // ── Find global max volume ───────────────────────────────────
    let maxBidVol = 0, maxAskVol = 0;
    for (const snap of snapshots) {
      for (const b of snap.bids) if (b.volume > maxBidVol) maxBidVol = b.volume;
      for (const a of snap.asks) if (a.volume > maxAskVol) maxAskVol = a.volume;
    }
    if (maxBidVol === 0) maxBidVol = 1;
    if (maxAskVol === 0) maxAskVol = 1;

    // ── Helper: price → bucket (0=top=max price) ─────────────────
    const priceToBucket = (price: number) => {
      const norm = (price - minPrice) / priceRange;
      return Math.min(Y_BUCKETS - 1, Math.floor((1 - norm) * Y_BUCKETS));
    };

    // Build per-column bucket arrays for smooth blending
    snapshots.forEach((snap, xi) => {
      const x = LABEL_W + xi * colW;
      const buckets = new Array(Y_BUCKETS).fill(null).map(() => ({ bid: 0, ask: 0 }));

      for (const b of snap.bids) {
        const bi = priceToBucket(b.price);
        buckets[bi].bid = Math.max(buckets[bi].bid, b.volume);
      }
      for (const a of snap.asks) {
        const bi = priceToBucket(a.price);
        buckets[bi].ask = Math.max(buckets[bi].ask, a.volume);
      }

      for (let bi = 0; bi < Y_BUCKETS; bi++) {
        const y = bi * bucketH;
        const { bid, ask } = buckets[bi];

        if (bid === 0 && ask === 0) continue;

        const bidAlpha = Math.pow(bid / maxBidVol, 0.45);
        const askAlpha = Math.pow(ask / maxAskVol, 0.45);

        // ── Bid cell: deep teal → bright cyan-green ──────────────
        if (bid > 0) {
          // HSL: hue 155→175 (teal to cyan-green) based on intensity
          const hue = 155 + bidAlpha * 20;
          const sat = 60 + bidAlpha * 40;
          const lit = 25 + bidAlpha * 40;
          ctx.fillStyle = `hsla(${hue},${sat}%,${lit}%,${(bidAlpha * 0.9).toFixed(3)})`;
          ctx.fillRect(x, y, Math.ceil(colW), Math.ceil(bucketH));

          // Inner glow for hot cells
          if (bidAlpha > 0.7) {
            const grd = ctx.createRadialGradient(
              x + colW / 2, y + bucketH / 2, 0,
              x + colW / 2, y + bucketH / 2, colW
            );
            grd.addColorStop(0, `rgba(0,255,170,${(bidAlpha * 0.25).toFixed(3)})`);
            grd.addColorStop(1, 'transparent');
            ctx.fillStyle = grd;
            ctx.fillRect(x, y, Math.ceil(colW), Math.ceil(bucketH));
          }
        }

        // ── Ask cell: deep magenta → bright red-orange ───────────
        if (ask > 0) {
          const hue = 0 + askAlpha * (-15); // 0 to -15 (red → orange-red)
          const sat = 65 + askAlpha * 35;
          const lit = 25 + askAlpha * 38;
          ctx.fillStyle = `hsla(${(hue + 360) % 360},${sat}%,${lit}%,${(askAlpha * 0.9).toFixed(3)})`;
          ctx.fillRect(x, y, Math.ceil(colW), Math.ceil(bucketH));

          if (askAlpha > 0.7) {
            const grd = ctx.createRadialGradient(
              x + colW / 2, y + bucketH / 2, 0,
              x + colW / 2, y + bucketH / 2, colW
            );
            grd.addColorStop(0, `rgba(255,80,50,${(askAlpha * 0.25).toFixed(3)})`);
            grd.addColorStop(1, 'transparent');
            ctx.fillStyle = grd;
            ctx.fillRect(x, y, Math.ceil(colW), Math.ceil(bucketH));
          }
        }
      }
    });

    // ── Mid-price trace line ─────────────────────────────────────
    if (snapshots.length > 1) {
      ctx.beginPath();
      ctx.setLineDash([3, 5]);
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.lineWidth = 1.5;
      let started = false;
      snapshots.forEach((snap, xi) => {
        const mid = snap.currentPrice
          ?? ((snap.bids[0]?.price ?? 0) + (snap.asks[0]?.price ?? 0)) / 2;
        if (mid === 0) return;
        const bucket = priceToBucket(mid);
        const x = LABEL_W + xi * colW + colW / 2;
        const y = bucket * bucketH + bucketH / 2;
        if (!started) { ctx.moveTo(x, y); started = true; }
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // ── Time grid lines (every 10 snapshots) ────────────────────
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    for (let xi = 0; xi < snapshots.length; xi += 10) {
      const x = LABEL_W + xi * colW;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, drawH); ctx.stroke();
    }

    // ── Y-axis price labels (6 labels) ──────────────────────────
    ctx.fillStyle = '#94a3b8';
    ctx.font = `bold 10px Inter, sans-serif`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let i = 0; i <= 5; i++) {
      const price = maxPrice - (i / 5) * priceRange;
      const y = (i / 5) * drawH;
      // tick mark
      ctx.strokeStyle = 'rgba(148,163,184,0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(LABEL_W - 4, y); ctx.lineTo(LABEL_W, y); ctx.stroke();
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(`₹${price.toFixed(0)}`, LABEL_W - 6, y);
    }

    // ── X-axis time labels ───────────────────────────────────────
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#64748b';
    ctx.font = '9px Inter, sans-serif';
    const timeFmt = (ts: number) =>
      new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });

    if (snapshots.length > 0) {
      ctx.fillText(timeFmt(snapshots[0].timestamp), LABEL_W + colW / 2, drawH + 4);
    }
    if (snapshots.length > 1) {
      ctx.fillText(timeFmt(snapshots[snapshots.length - 1].timestamp), cssW - colW / 2, drawH + 4);
    }
    // Middle label
    if (snapshots.length > 4) {
      const mi = Math.floor(snapshots.length / 2);
      ctx.fillText(timeFmt(snapshots[mi].timestamp), LABEL_W + mi * colW + colW / 2, drawH + 4);
    }

    // ── Axis lines ───────────────────────────────────────────────
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(LABEL_W, 0); ctx.lineTo(LABEL_W, drawH); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(LABEL_W, drawH); ctx.lineTo(cssW, drawH); ctx.stroke();
  }, [snapshots, minPrice, maxPrice]);

  // ── Hover tooltip ────────────────────────────────────────────────
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || snapshots.length === 0) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const drawW = rect.width - LABEL_W;
    const drawH = CANVAS_HEIGHT - TIME_LABEL_H;

    if (mx < LABEL_W || my > drawH) { setTooltip(null); return; }

    const xi = Math.min(snapshots.length - 1, Math.floor(((mx - LABEL_W) / drawW) * snapshots.length));
    const priceRange = maxPrice - minPrice || 1;
    const price = maxPrice - (my / drawH) * priceRange;
    const snap = snapshots[xi];
    const ts = new Date(snap.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Kolkata' });

    setTooltip({
      x: e.clientX - rect.left + 12,
      y: e.clientY - rect.top - 8,
      text: `₹${price.toFixed(1)} · ${ts} IST`,
    });
  };

  const intensityPercent = snapshots.length > 0
    ? Math.min(100, Math.round((snapshots.length / 60) * 100))
    : 0;

  return (
    <div className="chart-container glass-panel fade-in slide-up delay-2 heatmap-container" style={{ minHeight: CANVAS_HEIGHT + 60 }}>
      <div className="chart-header">
        <h3><Flame size={18} className="icon-inline" />Liquidity Heatmap</h3>
        <div className="heatmap-header-right">
          <div className="heatmap-legend">
            <span className="heatmap-legend-item heatmap-legend-bid">◆ Bids</span>
            <span className="heatmap-legend-item heatmap-legend-mid">── Mid-price</span>
            <span className="heatmap-legend-item heatmap-legend-ask">◆ Asks</span>
          </div>
          {snapshots.length > 0 && (
            <div className="heatmap-accumulation">
              <div className="heatmap-accum-bar">
                <div className="heatmap-accum-fill" style={{ width: `${intensityPercent}%` }} />
              </div>
              <span className="chart-meta">{snapshots.length}/60 snapshots</span>
            </div>
          )}
        </div>
      </div>

      <div style={{ position: 'relative', width: '100%' }}>
        {isLoading && snapshots.length === 0 ? (
          <div className="chart-loader" style={{ height: CANVAS_HEIGHT }}>
            <div className="loader" /><p>Accumulating order book data…</p>
          </div>
        ) : snapshots.length === 0 ? (
          <div className="chart-empty" style={{ height: CANVAS_HEIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
            <Flame size={28} style={{ opacity: 0.3 }} />
            <span>Waiting for order book snapshots…</span>
            <span style={{ fontSize: 12, opacity: 0.5 }}>Heatmap builds over time (every 3s)</span>
          </div>
        ) : (
          <>
            <canvas
              ref={canvasRef}
              style={{ width: '100%', height: CANVAS_HEIGHT, display: 'block', borderRadius: 8, cursor: 'crosshair' }}
              onMouseMove={handleMouseMove}
              onMouseLeave={() => setTooltip(null)}
            />
            {tooltip && (
              <div
                className="ui-tooltip"
                style={{ left: tooltip.x, top: tooltip.y, pointerEvents: 'none', position: 'absolute' }}
              >
                {tooltip.text}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default LiquidityHeatmap;
