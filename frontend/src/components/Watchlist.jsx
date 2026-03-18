import React, { useState, useEffect } from 'react';
import { Star, X, Plus, TrendingUp, TrendingDown } from 'lucide-react';

const Watchlist = ({ onSelectStock, currentTicker }) => {
    const [watchlist, setWatchlist] = useState(['AAPL', 'TSLA', 'MSFT', 'NVDA', 'BTC-USD']);
    
    useEffect(() => {
        const savedWatchlist = localStorage.getItem('watchlist');
        if (savedWatchlist) {
            setWatchlist(JSON.parse(savedWatchlist));
        }
    }, []);

    const saveWatchlist = (newList) => {
        setWatchlist(newList);
        localStorage.setItem('watchlist', JSON.stringify(newList));
    };

    const addToWatchlist = (ticker) => {
        if (!watchlist.includes(ticker)) {
            saveWatchlist([...watchlist, ticker]);
        }
    };

    const removeFromWatchlist = (ticker) => {
        saveWatchlist(watchlist.filter(t => t !== ticker));
    };

    return (
        <div className="glass-panel watchlist-container slide-up delay-2" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ fontSize: '15px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Star size={18} className="text-accent" />
                    Market Watchlist
                </h3>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{watchlist.length} Assets</span>
            </div>
            
            <div className="watchlist-items" style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '400px', overflowY: 'auto' }}>
                {watchlist.map(ticker => (
                    <div 
                        key={ticker}
                        className={`watchlist-item ${currentTicker === ticker ? 'active' : ''}`}
                        onClick={() => onSelectStock(ticker)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '12px 16px',
                            borderRadius: '12px',
                            background: currentTicker === ticker ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                            border: `1px solid ${currentTicker === ticker ? 'var(--accent-color)' : 'transparent'}`,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontWeight: '700', fontSize: '14px' }}>{ticker}</span>
                        </div>
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                removeFromWatchlist(ticker);
                            }}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text-secondary)',
                                padding: '4px',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                            className="hover:bg-red-500/10 hover:text-red-500"
                        >
                            <X size={14} />
                        </button>
                    </div>
                ))}
            </div>

            {currentTicker && !watchlist.includes(currentTicker) && (
                <button 
                    onClick={() => addToWatchlist(currentTicker)}
                    style={{
                        marginTop: '8px',
                        padding: '10px',
                        borderRadius: '10px',
                        background: 'rgba(59, 130, 246, 0.1)',
                        border: '1px dashed var(--accent-color)',
                        color: 'var(--accent-color)',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                    }}
                >
                    <Plus size={16} /> Add {currentTicker} to Watchlist
                </button>
            )}
        </div>
    );
};

export default Watchlist;
