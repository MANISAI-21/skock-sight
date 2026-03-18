import React from 'react';
import { Clock, ArrowUpRight, ArrowDownRight } from 'lucide-react';

const TradeHistory = ({ trades }) => {
    // Take the last 20 trades
    const recentTrades = [...trades].reverse().slice(0, 25);

    return (
        <div className="glass-panel trade-history-container slide-up delay-3" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', height: '100%', minHeight: '500px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ fontSize: '15px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Clock size={18} className="text-accent" />
                    Live Trade Stream
                </h3>
                <div className="market-dot-live"></div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', padding: '0 8px 8px', borderBottom: '1px solid var(--border-color)', fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase' }}>
                    <span>Price</span>
                    <span style={{ textAlign: 'right' }}>Size</span>
                    <span style={{ textAlign: 'right' }}>Time</span>
                </div>
                
                {recentTrades.length === 0 ? (
                    <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
                        Waiting for trades...
                    </div>
                ) : (
                    recentTrades.map((trade, idx) => (
                        <div 
                            key={`${trade.timestamp}-${idx}`}
                            style={{ 
                                display: 'grid', 
                                gridTemplateColumns: '1fr 1fr 1fr', 
                                padding: '8px', 
                                borderRadius: '6px',
                                background: idx % 2 === 0 ? 'rgba(255, 255, 255, 0.02)' : 'transparent',
                                fontSize: '13px',
                                transition: 'background 0.2s'
                            }}
                        >
                            <span style={{ 
                                color: trade.side === 'buy' ? 'var(--success-color)' : 'var(--danger-color)',
                                fontWeight: '700',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                            }}>
                                {trade.side === 'buy' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                                {trade.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                            <span style={{ textAlign: 'right', fontWeight: '500', color: 'var(--text-primary)' }}>
                                {trade.size.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                            </span>
                            <span style={{ textAlign: 'right', color: 'var(--text-secondary)', fontSize: '11px' }}>
                                {new Date(trade.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default TradeHistory;
