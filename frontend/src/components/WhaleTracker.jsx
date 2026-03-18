import React, { useMemo } from 'react';
import { Anchor, ArrowUpRight, ArrowDownRight } from 'lucide-react';

const WhaleTracker = ({ trades }) => {
    // Filter the largest trades
    const largeTrades = useMemo(() => {
        if (!trades || trades.length === 0) return [];
        
        // Define "Large" as top sizes. Since our simulation sizes are mostly under 100,
        // we filter for size >= 80 to catch the largest synthetic blocks.
        const whales = trades.filter(t => t.size >= 80).slice(-10).reverse();
        return whales;
    }, [trades]);

    if (!trades || trades.length === 0) {
        return (
            <div className="chart-container glass-panel fade-in slide-up delay-3">
                <div className="chart-header">
                    <h3><Anchor size={18} className="icon-inline text-accent" />Whale Tracker</h3>
                </div>
                <div className="chart-empty" style={{ minHeight: 120 }}>
                    <Anchor size={28} style={{ opacity: 0.3 }} />
                    <span>Monitoring for large block trades...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="chart-container glass-panel fade-in slide-up delay-3" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="chart-header">
                <h3><Anchor size={18} className="icon-inline text-accent" />Whale Tracker <span style={{fontSize:'12px', fontWeight:'normal', color:'var(--text-secondary)'}}>(Large Blocks)</span></h3>
            </div>
            
            <div className="whale-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', flex: 1, paddingRight: '8px' }}>
                {largeTrades.length > 0 ? largeTrades.map((trade, idx) => (
                    <div key={idx} className="whale-item" style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        padding: '14px 16px',
                        background: 'rgba(255,255,255,0.02)',
                        borderRadius: '10px',
                        borderLeft: `4px solid ${trade.side === 'buy' ? 'var(--success-color)' : 'var(--danger-color)'}`,
                        transition: 'transform 0.2s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'translateX(4px)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'translateX(0)'}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                                width: '32px', height: '32px', borderRadius: '50%',
                                background: trade.side === 'buy' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                {trade.side === 'buy' ? 
                                    <ArrowUpRight size={18} className="text-success" /> : 
                                    <ArrowDownRight size={18} className="text-danger" />
                                }
                            </div>
                            <div>
                                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{trade.side}</div>
                                <div style={{ fontWeight: 600, fontSize: '16px', color: 'var(--text-primary)' }}>₹{trade.price.toFixed(2)}</div>
                            </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)' }}>{trade.size.toLocaleString()} <span style={{fontSize:'12px', fontWeight:'normal', color:'var(--text-secondary)'}}>Vol</span></div>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                {new Date(trade.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </div>
                        </div>
                    </div>
                )) : (
                    <div className="chart-empty" style={{ minHeight: 120 }}>
                        <span style={{ opacity: 0.6 }}>No large block trades detected recently.</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default WhaleTracker;
