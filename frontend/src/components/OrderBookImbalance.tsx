import React, { useMemo } from 'react';
import { Activity } from 'lucide-react';

interface OrderEntry {
  price: number;
  volume: number;
}

interface OrderBookImbalanceProps {
  bids: OrderEntry[];
  asks: OrderEntry[];
}

const OrderBookImbalance: React.FC<OrderBookImbalanceProps> = ({ bids, asks }) => {
  const { obi, totalBid, totalAsk } = useMemo(() => {
    const totalBid = bids.reduce((sum, b) => sum + (Number(b.volume) || Number(b.size) || 0), 0);
    const totalAsk = asks.reduce((sum, a) => sum + (Number(a.volume) || Number(a.size) || 0), 0);
    const total = totalBid + totalAsk;
    const obi = total === 0 ? 0 : (totalBid - totalAsk) / total;
    return { obi, totalBid, totalAsk };
  }, [bids, asks]);

  // OBI ranges from -1 to +1; map to 0–100% for the gauge
  const gaugePercent = ((obi + 1) / 2) * 100; // 0% = -1, 50% = 0, 100% = +1

  const isPositive = obi > 0.02;
  const isNegative = obi < -0.02;

  const accentColor = isPositive
    ? '#10b981'   // success green
    : isNegative
    ? '#ef4444'   // danger red
    : '#64748b';  // neutral gray

  const glowColor = isPositive
    ? 'rgba(16, 185, 129, 0.35)'
    : isNegative
    ? 'rgba(239, 68, 68, 0.35)'
    : 'rgba(100, 116, 139, 0.25)';

  const label = isPositive ? 'Buy Pressure' : isNegative ? 'Sell Pressure' : 'Balanced';

  const sentimentClass = isPositive
    ? 'sentiment-bullish'
    : isNegative
    ? 'sentiment-bearish'
    : 'sentiment-neutral';

  return (
    <div className="glass-panel obi-panel fade-in slide-up delay-3">
      {/* Header */}
      <div className="obi-header">
        <h3 className="obi-title">
          <Activity size={18} className="icon-inline" />
          Order Book Imbalance
        </h3>
        <span className={`sentiment-badge small ${sentimentClass}`}>{label}</span>
      </div>

      {/* OBI numeric value */}
      <div className="obi-value-row">
        <span className="obi-value" style={{ color: accentColor }}>
          {obi >= 0 ? '+' : ''}
          {obi.toFixed(4)}
        </span>
        <span className="obi-subtitle">OBI Score</span>
      </div>

      {/* Gauge bar */}
      <div className="obi-gauge-wrapper">
        {/* Scale labels */}
        <div className="obi-scale-labels">
          <span>−1</span>
          <span>0</span>
          <span>+1</span>
        </div>

        {/* Track */}
        <div className="obi-track">
          {/* Filled portion from left up to the midpoint (negative side) or from mid to right (positive side) */}
          {isPositive || (!isPositive && !isNegative) ? (
            // Green fill from center rightward OR no fill at center
            <>
              <div
                className="obi-fill"
                style={{
                  left: '50%',
                  width: `${Math.max(0, gaugePercent - 50)}%`,
                  background: accentColor,
                  boxShadow: `0 0 10px ${glowColor}`,
                }}
              />
            </>
          ) : (
            // Red fill from current position to center
            <div
              className="obi-fill"
              style={{
                left: `${gaugePercent}%`,
                width: `${50 - gaugePercent}%`,
                background: accentColor,
                boxShadow: `0 0 10px ${glowColor}`,
              }}
            />
          )}

          {/* Center tick */}
          <div className="obi-center-tick" />

          {/* Thumb indicator */}
          <div
            className="obi-thumb"
            style={{
              left: `${gaugePercent}%`,
              transition: 'left 0.3s ease-out, background 0.3s ease-out',
              background: accentColor,
              boxShadow: `0 0 8px ${glowColor}`,
            }}
          />
        </div>
      </div>

      {/* Volume breakdown */}
      <div className="obi-vol-row">
        <div className="obi-vol-item">
          <span className="obi-vol-label">Total Bid Vol</span>
          <span className="obi-vol-value text-success">
            {totalBid.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </span>
        </div>
        <div className="obi-vol-divider" />
        <div className="obi-vol-item obi-vol-item--right">
          <span className="obi-vol-label">Total Ask Vol</span>
          <span className="obi-vol-value text-danger">
            {totalAsk.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>
    </div>
  );
};

export default OrderBookImbalance;
