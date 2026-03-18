import React, { useState, useMemo } from 'react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, ReferenceLine
} from 'recharts';
import { Layers } from 'lucide-react';

/* ─── Helpers ──────────────────────────────────────────────────────────── */

/** Group orders into priceInterval-sized buckets, sum volumes per bucket. */
function aggregateByInterval(levels, interval) {
    if (!levels || levels.length === 0) return [];
    if (!interval || interval <= 0) return levels.map(l => ({ price: l.price, volume: l.total ?? l.volume ?? 0 }));
    const buckets = new Map();
    for (const l of levels) {
        const key = Math.floor(l.price / interval) * interval;
        const vol  = l.total ?? l.volume ?? 0;
        if (buckets.has(key)) buckets.get(key).volume += vol;
        else buckets.set(key, { price: parseFloat(key.toFixed(6)), volume: vol });
    }
    return Array.from(buckets.values());
}

/**
 * Build cumulative depth series.
 * bids  → sort descending  → cumulate from best bid outward
 * asks  → sort ascending   → cumulate from best ask outward
 * Returns { bids: [{price, bidDepth}], asks: [{price, askDepth}] }
 */
function buildCumulativeDepth(rawBids, rawAsk, interval) {
    // Aggregate
    const aggBids = aggregateByInterval(rawBids, interval).sort((a, b) => b.price - a.price);
    const aggAsks = aggregateByInterval(rawAsk,  interval).sort((a, b) => a.price - b.price);

    // Cumulate bids (already desc → cumulate then flip to ascending for chart)
    let cum = 0;
    const bidPoints = aggBids.map(l => { cum += l.volume; return { price: l.price, bidDepth: cum, volume: l.volume }; });
    bidPoints.reverse(); // ascending for X-axis (left = lowest price)

    // Cumulate asks (asc)
    cum = 0;
    const askPoints = aggAsks.map(l => { cum += l.volume; return { price: l.price, askDepth: cum, volume: l.volume }; });

    return { bidPoints, askPoints };
}

/** Detect liquidity walls: levels whose volume > 3× average depth volume. */
function detectWalls(points, key) {
    if (points.length < 3) return new Set();
    const volumes = points.map(p => p.volume);
    const avg = volumes.reduce((a, b) => a + b, 0) / volumes.length;
    const walls = new Set();
    for (const p of points) {
        if (p.volume > avg * 3) walls.add(p.price);
    }
    return walls;
}

const FMT_VOL = (v) => {
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
    if (v >= 1_000)     return `${(v / 1_000).toFixed(1)}K`;
    return v.toFixed(0);
};

const INTERVAL_OPTIONS = [0.05, 0.10, 0.50, 1.00];

/* ─── Component ────────────────────────────────────────────────────────── */
const DepthChart = ({ orderBook, isLoading }) => {
    const [priceInterval, setPriceInterval] = useState(0.5);

    // ── Derive chart data ───────────────────────────────────────────
    const { chartData, midPrice, bidWalls, askWalls, bestBid, bestAsk } = useMemo(() => {
        if (!orderBook || !orderBook.aggregatedBids || !orderBook.aggregatedAsks) {
            return { chartData: [], midPrice: null, bidWalls: new Set(), askWalls: new Set(), bestBid: null, bestAsk: null };
        }

        const { bidPoints, askPoints } = buildCumulativeDepth(
            orderBook.aggregatedBids,
            orderBook.aggregatedAsks,
            priceInterval
        );

        const bidWalls = detectWalls(bidPoints, 'bidDepth');
        const askWalls = detectWalls(askPoints, 'askDepth');

        // bestBid = highest bid price, bestAsk = lowest ask price
        const allBidPrices = bidPoints.map(p => p.price);
        const allAskPrices = askPoints.map(p => p.price);
        const bestBid = allBidPrices.length ? Math.max(...allBidPrices) : null;
        const bestAsk = allAskPrices.length ? Math.min(...allAskPrices) : null;
        const midPrice = bestBid !== null && bestAsk !== null ? (bestBid + bestAsk) / 2 : orderBook.currentPrice ?? null;

        // Merge into one array for AreaChart. Bid points: askDepth=null. Ask points: bidDepth=null.
        const bids = bidPoints.map(p => ({ price: p.price, bidDepth: p.bidDepth, askDepth: null, volume: p.volume, _isBid: true }));
        const asks = askPoints.map(p => ({ price: p.price, bidDepth: null, askDepth: p.askDepth, volume: p.volume, _isBid: false }));

        // Sort combined by price ascending
        const combined = [...bids, ...asks].sort((a, b) => a.price - b.price);

        return { chartData: combined, midPrice, bidWalls, askWalls, bestBid, bestAsk };
    }, [orderBook, priceInterval]);

    // ── Custom Tooltip ──────────────────────────────────────────────
    const CustomTooltip = ({ active, payload, label }) => {
        if (!active || !payload || payload.length === 0) return null;

        const price = parseFloat(label);
        const validPayload = payload.find(p => p.value != null && p.value > 0);
        if (!validPayload) return null;

        const isBid      = validPayload.dataKey === 'bidDepth';
        const depth      = validPayload.value;
        const typeLabel  = isBid ? 'Bid Depth' : 'Ask Depth';
        const typeColor  = isBid ? '#10b981' : '#ef4444';
        const isWall     = isBid ? bidWalls.has(price) : askWalls.has(price);

        let distStr = '';
        if (midPrice) {
            const pct = ((price - midPrice) / midPrice) * 100;
            distStr = `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`;
        }

        return (
            <div style={{
                background: 'rgba(10,13,24,0.95)',
                border: `1px solid ${isWall ? '#f59e0b' : 'rgba(255,255,255,0.12)'}`,
                borderRadius: 10,
                padding: '10px 14px',
                fontSize: 12,
                boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                minWidth: 160,
            }}>
                {isWall && (
                    <p style={{ color: '#f59e0b', fontWeight: 700, marginBottom: 4, fontSize: 11 }}>
                        ⚡ Liquidity Wall
                    </p>
                )}
                <p style={{ color: '#cbd5e1', marginBottom: 4 }}>
                    <span style={{ color: '#64748b' }}>Price </span>
                    <strong>₹{price.toFixed(2)}</strong>
                </p>
                <p style={{ color: typeColor, marginBottom: 4 }}>
                    <span style={{ color: '#64748b' }}>Depth </span>
                    <strong>{FMT_VOL(depth)}</strong>
                </p>
                {distStr && (
                    <p style={{ color: '#94a3b8' }}>
                        <span style={{ color: '#64748b' }}>Distance </span>
                        <strong>{distStr}</strong>
                    </p>
                )}
            </div>
        );
    };

    // ── ReferenceLine label for mid-price ───────────────────────────
    const MidLabel = ({ viewBox }) => {
        if (!viewBox) return null;
        return (
            <g>
                <rect x={viewBox.x - 22} y={viewBox.y - 18} width={44} height={16} rx={4}
                    fill="rgba(203,213,225,0.15)" stroke="rgba(203,213,225,0.3)" />
                <text x={viewBox.x} y={viewBox.y - 7} textAnchor="middle"
                    fill="#cbd5e1" fontSize={9} fontWeight={600}>
                    Mid
                </text>
            </g>
        );
    };

    return (
        <div className="chart-container glass-panel fade-in slide-up delay-2">
            <div className="chart-header">
                <h3><Layers size={18} className="icon-inline" />Market Depth (Order Book)</h3>

                {/* Interval controls */}
                <div className="depth-controls">
                    <span className="depth-interval-label">Interval ₹</span>
                    {INTERVAL_OPTIONS.map(iv => (
                        <button
                            key={iv}
                            className={`depth-interval-btn ${priceInterval === iv ? 'active' : ''}`}
                            onClick={() => setPriceInterval(iv)}
                        >
                            {iv.toFixed(2)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Spread badge */}
            {bestBid !== null && bestAsk !== null && (
                <div className="depth-spread-strip">
                    <span className="depth-best-bid">Bid ₹{bestBid.toFixed(2)}</span>
                    <span className="depth-spread-val">
                        Spread ₹{(bestAsk - bestBid).toFixed(2)}
                    </span>
                    <span className="depth-mid-val">Mid ₹{midPrice?.toFixed(2)}</span>
                    <span className="depth-best-ask">Ask ₹{bestAsk.toFixed(2)}</span>
                </div>
            )}

            <div className="chart-wrapper depth-chart-wrapper">
                {isLoading ? (
                    <div className="chart-loader">
                        <div className="loader" /><p>Loading Depth Data…</p>
                    </div>
                ) : !orderBook ? (
                    <div className="chart-empty">No order book data available.</div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorBid" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%"  stopColor="#10b981" stopOpacity={0.45} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.04} />
                                </linearGradient>
                                <linearGradient id="colorAsk" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.45} />
                                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.04} />
                                </linearGradient>
                            </defs>

                            <CartesianGrid strokeDasharray="3 3" stroke="#1a2035" vertical={false} opacity={0.6} />

                            <XAxis
                                dataKey="price"
                                stroke="#475569"
                                fontSize={11}
                                tickFormatter={(v) => `₹${parseFloat(v).toFixed(1)}`}
                                minTickGap={35}
                            />
                            <YAxis
                                stroke="#475569"
                                fontSize={11}
                                tickFormatter={FMT_VOL}
                                width={54}
                            />

                            <Tooltip content={<CustomTooltip />} />

                            {/* Mid-price reference line */}
                            {midPrice !== null && (
                                <ReferenceLine
                                    x={midPrice}
                                    stroke="rgba(203,213,225,0.8)"
                                    strokeDasharray="5 4"
                                    strokeWidth={1.5}
                                    label={<MidLabel />}
                                />
                            )}

                            {/* Liquidity wall markers on bids */}
                            {[...bidWalls].map(wallPrice => (
                                <ReferenceLine
                                    key={`bwall-${wallPrice}`}
                                    x={wallPrice}
                                    stroke="rgba(245,158,11,0.7)"
                                    strokeDasharray="3 3"
                                    strokeWidth={1.5}
                                />
                            ))}

                            {/* Liquidity wall markers on asks */}
                            {[...askWalls].map(wallPrice => (
                                <ReferenceLine
                                    key={`awall-${wallPrice}`}
                                    x={wallPrice}
                                    stroke="rgba(245,158,11,0.7)"
                                    strokeDasharray="3 3"
                                    strokeWidth={1.5}
                                />
                            ))}

                            {/* Smoothed monotone bid curve */}
                            <Area
                                type="monotone"
                                dataKey="bidDepth"
                                stroke="#10b981"
                                strokeWidth={2.5}
                                fillOpacity={1}
                                fill="url(#colorBid)"
                                isAnimationActive={false}
                                dot={false}
                                connectNulls={false}
                            />

                            {/* Smoothed monotone ask curve */}
                            <Area
                                type="monotone"
                                dataKey="askDepth"
                                stroke="#ef4444"
                                strokeWidth={2.5}
                                fillOpacity={1}
                                fill="url(#colorAsk)"
                                isAnimationActive={false}
                                dot={false}
                                connectNulls={false}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                )}
            </div>

            {/* Wall legend */}
            {(bidWalls.size > 0 || askWalls.size > 0) && (
                <div className="depth-wall-legend">
                    <span className="depth-wall-badge">
                        ⚡ {bidWalls.size + askWalls.size} Liquidity Wall{bidWalls.size + askWalls.size > 1 ? 's' : ''} detected
                    </span>
                </div>
            )}
        </div>
    );
};

export default DepthChart;
