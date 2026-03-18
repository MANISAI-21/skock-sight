import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Zap } from 'lucide-react';

export interface Trade {
  price: number;
  size: number;
  side: 'buy' | 'sell';
  timestamp: number;
}

interface OrderFlowTrackerProps {
  /** Full trade stream (grows over time) */
  trades: Trade[];
  /** How many ms of trades to aggregate per display window (default 1000) */
  windowMs?: number;
}

/**
 * OrderFlowTracker
 * ─────────────────────────────────────────────────────────────────────────────
 * Shows real-time buy vs. sell pressure as two animated horizontal bars.
 * Aggregates volumes over a rolling 1-second window, refreshed every second.
 */
const OrderFlowTracker: React.FC<OrderFlowTrackerProps> = ({ trades, windowMs = 1000 }) => {
  const [buyVol, setBuyVol]     = useState(0);
  const [sellVol, setSellVol]   = useState(0);
  const [prevBuyVol, setPrevBuyVol]   = useState(0);
  const [prevSellVol, setPrevSellVol] = useState(0);
  const [totalBuy, setTotalBuy]   = useState(0);  // cumulative session totals
  const [totalSell, setTotalSell] = useState(0);
  const tradesRef = useRef(trades);
  tradesRef.current = trades;

  // ── Aggregate last windowMs of trades ────────────────────────────────────
  const aggregate = useCallback(() => {
    const now = Date.now();
    const cutoff = now - windowMs;
    let buy = 0, sell = 0;
    for (const t of tradesRef.current) {
      if (t.timestamp >= cutoff) {
        if (t.side === 'buy') buy += t.size;
        else sell += t.size;
      }
    }
    setPrevBuyVol(bv => { setBuyVol(buy); return buy; });
    setPrevSellVol(sv => { setSellVol(sell); return sell; });
    // Update cumulative session totals from entire trade array
    let cBuy = 0, cSell = 0;
    for (const t of tradesRef.current) {
      if (t.side === 'buy') cBuy += t.size;
      else cSell += t.size;
    }
    setTotalBuy(cBuy);
    setTotalSell(cSell);
  }, [windowMs]);

  useEffect(() => {
    aggregate(); // immediate on mount / trade change
    const id = setInterval(aggregate, 1000);
    return () => clearInterval(id);
  }, [aggregate]);

  const combinedWindow = buyVol + sellVol || 1;
  const buyPct  = (buyVol  / combinedWindow) * 100;
  const sellPct = (sellVol / combinedWindow) * 100;

  const combinedTotal = totalBuy + totalSell || 1;
  const totalBuyPct  = (totalBuy  / combinedTotal) * 100;
  const totalSellPct = (totalSell / combinedTotal) * 100;

  const fmt = (v: number) => {
    if (v >= 1_000_000) return (v / 1_000_000).toFixed(2) + 'M';
    if (v >= 1_000)     return (v / 1_000).toFixed(1) + 'K';
    return v.toFixed(0);
  };

  const dominant = buyVol > sellVol ? 'Buy' : buyVol < sellVol ? 'Sell' : 'Neutral';
  const dominantClass = dominant === 'Buy' ? 'sentiment-bullish' : dominant === 'Sell' ? 'sentiment-bearish' : 'sentiment-neutral';

  return (
    <div className="glass-panel oft-panel fade-in slide-up delay-3">
      {/* Header */}
      <div className="oft-header">
        <h3 className="oft-title"><Zap size={18} className="icon-inline" />Order Flow Tracker</h3>
        <span className={`sentiment-badge small ${dominantClass}`}>{dominant} Dominant</span>
      </div>

      <div className="oft-window-label">Last 1-second window</div>

      {/* Buy bar */}
      <div className="oft-bar-group">
        <div className="oft-bar-label">
          <span className="text-success">▲ Aggressive Buy</span>
          <span className="oft-bar-val text-success">{fmt(buyVol)}</span>
        </div>
        <div className="oft-track">
          <div
            className="oft-fill oft-fill-buy"
            style={{ width: `${buyPct.toFixed(1)}%` }}
          />
        </div>
        <div className="oft-bar-pct">{buyPct.toFixed(1)}%</div>
      </div>

      {/* Sell bar */}
      <div className="oft-bar-group">
        <div className="oft-bar-label">
          <span className="text-danger">▼ Aggressive Sell</span>
          <span className="oft-bar-val text-danger">{fmt(sellVol)}</span>
        </div>
        <div className="oft-track">
          <div
            className="oft-fill oft-fill-sell"
            style={{ width: `${sellPct.toFixed(1)}%` }}
          />
        </div>
        <div className="oft-bar-pct">{sellPct.toFixed(1)}%</div>
      </div>

      {/* Session totals */}
      <div className="oft-session">
        <span className="oft-session-label">Session Totals</span>
        <div className="oft-session-bar">
          <div className="oft-session-fill-buy" style={{ width: `${totalBuyPct.toFixed(1)}%` }} />
          <div className="oft-session-fill-sell" style={{ width: `${totalSellPct.toFixed(1)}%` }} />
        </div>
        <div className="oft-session-labels">
          <span className="text-success text-xs">Buy {fmt(totalBuy)}</span>
          <span className="text-danger text-xs">Sell {fmt(totalSell)}</span>
        </div>
      </div>
    </div>
  );
};

export default OrderFlowTracker;
