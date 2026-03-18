import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer
} from 'recharts';
import { Activity, Wifi, WifiOff, RefreshCw } from 'lucide-react';

/* ── Indian Stock Market hours (IST) ─────────────────────────────
   NSE / BSE: Mon–Fri  09:15 → 15:30 IST
──────────────────────────────────────────────────────────────── */
function getMarketStatus() {
    const ist = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const day = ist.getDay();          // 0=Sun, 6=Sat
    const totalMin = ist.getHours() * 60 + ist.getMinutes();

    if (day === 0 || day === 6) {
        return { open: false, label: 'Weekend', nextEvent: 'Opens Mon 09:15 IST' };
    }
    if (totalMin < 9 * 60 + 15) {
        const rem = 9 * 60 + 15 - totalMin;
        return { open: false, label: 'Pre-open', nextEvent: `Opens in ${rem}m` };
    }
    if (totalMin >= 15 * 60 + 30) {
        return { open: false, label: 'Closed', nextEvent: 'Opens tomorrow 09:15 IST' };
    }
    const rem = 15 * 60 + 30 - totalMin;
    return { open: true, label: 'LIVE', nextEvent: `Closes in ${rem}m` };
}

function getRefreshMs(period, marketOpen) {
    if (!marketOpen) return null;
    return (period === '1d' || period === '5d') ? 30_000 : 5 * 60_000;
}

const StockChart = ({ data, period, onPeriodChange, isLoading, onRefresh }) => {
    const [marketStatus, setMarketStatus] = useState(getMarketStatus);
    const [lastRefreshed, setLastRefreshed] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    const intervalRef = useRef(null);

    const periods = [
        { label: '1D', value: '1d' },
        { label: '1W', value: '5d' },
        { label: '1M', value: '1mo' },
        { label: '3M', value: '3mo' },
        { label: '6M', value: '6mo' },
        { label: '1Y', value: '1y' },
        { label: '5Y', value: '5y' },
    ];

    // ── Market status clock – updates every 30 s ──────────────────
    useEffect(() => {
        const id = setInterval(() => setMarketStatus(getMarketStatus()), 30_000);
        return () => clearInterval(id);
    }, []);

    // ── Auto-refresh during market hours ──────────────────────────
    const doRefresh = useCallback(async () => {
        if (!onRefresh) return;
        setRefreshing(true);
        await onRefresh();
        setLastRefreshed(new Date());
        setRefreshing(false);
    }, [onRefresh]);

    useEffect(() => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        const ms = getRefreshMs(period, marketStatus.open);
        if (!ms) return;
        intervalRef.current = setInterval(doRefresh, ms);
        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, [period, marketStatus.open, doRefresh]);

    // ── X-axis tick formatter (IST-aware) ─────────────────────────
    const formatXAxis = (tickItem) => {
        const date = new Date(tickItem);
        if (period === '1d' || period === '5d') {
            return date.toLocaleTimeString('en-IN', {
                hour: '2-digit', minute: '2-digit',
                timeZone: 'Asia/Kolkata'
            });
        }
        return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
    };

    // ── Tooltip ───────────────────────────────────────────────────
    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            const date = new Date(label);
            const dateStr = (period === '1d' || period === '5d')
                ? date.toLocaleString('en-IN', {
                    timeZone: 'Asia/Kolkata',
                    hour: '2-digit', minute: '2-digit',
                    day: 'numeric', month: 'short'
                  })
                : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

            return (
                <div className="custom-tooltip glass-panel">
                    <p className="tooltip-date">{dateStr} IST</p>
                    <p className="tooltip-price">
                        <span className="tooltip-label">Price: </span>
                        ₹{payload[0].value.toFixed(2)}
                    </p>
                    {payload[0].payload.volume && (
                        <p className="tooltip-volume">
                            <span className="tooltip-label">Vol: </span>
                            {(payload[0].payload.volume / 1e6).toFixed(2)}M
                        </p>
                    )}
                </div>
            );
        }
        return null;
    };

    // ── Chart colour ──────────────────────────────────────────────
    let isPositive = true;
    if (data && data.length > 1) {
        isPositive = data[data.length - 1].close >= data[0].close;
    }
    const color = isPositive ? '#10b981' : '#ef4444';

    const fmtTime = (d) =>
        d.toLocaleTimeString('en-IN', {
            hour: '2-digit', minute: '2-digit', second: '2-digit',
            hour12: false, timeZone: 'Asia/Kolkata'
        });

    return (
        <div className="chart-container glass-panel fade-in slide-up delay-1">
            <div className="chart-header">
                {/* Title + live badge */}
                <div className="chart-title-group">
                    <h3><Activity size={18} className="icon-inline" />Price History</h3>
                    <div className={`market-status-badge ${marketStatus.open ? 'market-open' : 'market-closed'}`}>
                        {marketStatus.open ? (
                            <><Wifi size={11} /><span className="market-dot-live" />LIVE · {marketStatus.nextEvent}</>
                        ) : (
                            <><WifiOff size={11} />{marketStatus.label} · {marketStatus.nextEvent}</>
                        )}
                    </div>
                </div>

                {/* Controls: refresh + period selector */}
                <div className="chart-controls">
                    {onRefresh && (
                        <button
                            className={`refresh-btn ${refreshing ? 'refreshing' : ''}`}
                            onClick={doRefresh}
                            disabled={isLoading || refreshing}
                            title="Refresh chart data"
                        >
                            <RefreshCw size={13} />
                        </button>
                    )}
                    <div className="period-selector">
                        {periods.map(p => (
                            <button
                                key={p.value}
                                className={`period-btn ${period === p.value ? 'active' : ''}`}
                                onClick={() => onPeriodChange(p.value)}
                                disabled={isLoading}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Auto-refresh timestamp */}
            {lastRefreshed && marketStatus.open && (period === '1d' || period === '5d') && (
                <div className="chart-refresh-stamp">
                    Auto-updated {fmtTime(lastRefreshed)} IST
                </div>
            )}

            <div className="chart-wrapper">
                {isLoading || refreshing ? (
                    <div className="chart-loader">
                        <div className="loader" />
                        <p>{refreshing ? 'Refreshing live data…' : 'Loading chart data…'}</p>
                    </div>
                ) : !data || data.length === 0 ? (
                    <div className="chart-empty">No historical data available for this period.</div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%"  stopColor={color} stopOpacity={0.35} />
                                    <stop offset="95%" stopColor={color} stopOpacity={0}    />
                                </linearGradient>
                                <filter id="lineGlow">
                                    <feGaussianBlur stdDeviation="2" result="blur" />
                                    <feMerge>
                                        <feMergeNode in="blur" />
                                        <feMergeNode in="SourceGraphic" />
                                    </feMerge>
                                </filter>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e2535" vertical={false} />
                            <XAxis
                                dataKey="date"
                                tickFormatter={formatXAxis}
                                stroke="#475569"
                                fontSize={11}
                                tickMargin={10}
                                minTickGap={30}
                            />
                            <YAxis
                                domain={['auto', 'auto']}
                                stroke="#475569"
                                fontSize={11}
                                tickFormatter={(val) => `₹${val}`}
                                width={64}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Area
                                type="monotone"
                                dataKey="close"
                                stroke={color}
                                strokeWidth={2.5}
                                fillOpacity={1}
                                fill="url(#colorPrice)"
                                isAnimationActive={false}
                                dot={false}
                                filter="url(#lineGlow)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
};

export default StockChart;
