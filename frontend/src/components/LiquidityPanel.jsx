import React from 'react';
import { BarChart2, ShieldAlert, ArrowUpCircle, ArrowDownCircle, Activity } from 'lucide-react';

const LiquidityPanel = ({ analytics, isLoading }) => {
    
    if (isLoading) {
        return (
            <div className="liquidity-panel glass-panel fade-in slide-up delay-3">
                 <div className="chart-loader">
                    <div className="loader small"></div>
                </div>
            </div>
        );
    }

    if (!analytics) return null;

    const { 
        marketPressure, 
        sentiment, 
        strongestBuyWall, 
        strongestSellWall,
        totalBidVolume,
        totalAskVolume
    } = analytics;

    // Helper to format large numbers
    const formatVol = (val) => {
        if (!val) return '0';
        if (val > 1000000) return (val / 1000000).toFixed(2) + 'M';
        if (val > 1000) return (val / 1000).toFixed(2) + 'K';
        return val.toLocaleString();
    };

    const isBullish = marketPressure > 1;
    const pressureColorClass = isBullish ? 'text-success' : 'text-danger';
    
    // Calculate percentages for the pressure bar
    const totalVolume = totalBidVolume + totalAskVolume;
    const bidPercent = totalVolume > 0 ? (totalBidVolume / totalVolume) * 100 : 50;
    const askPercent = totalVolume > 0 ? (totalAskVolume / totalVolume) * 100 : 50;

    return (
        <div className="liquidity-panel glass-panel fade-in slide-up delay-3">
            <div className="card-header border-bottom pb-3 mb-4">
                <h3 className="m-0 flex items-center gap-2">
                    <BarChart2 size={18} className="text-accent"/> Liquidity Insights
                </h3>
            </div>

            <div className="insight-grid">
                {/* Market Pressure Indicator */}
                <div className="insight-card">
                    <div className="insight-title">Market Pressure</div>
                    <div className={`insight-value large ${pressureColorClass}`}>
                        {marketPressure.toFixed(2)}x
                    </div>
                    <div className="pressure-bar-container">
                        <div className="pressure-bar">
                            <div className="bid-bar" style={{ width: `${bidPercent}%` }}></div>
                            <div className="ask-bar" style={{ width: `${askPercent}%` }}></div>
                        </div>
                        <div className="pressure-labels">
                            <span className="text-success text-xs">Bids: {bidPercent.toFixed(0)}%</span>
                            <span className="text-danger text-xs">Asks: {askPercent.toFixed(0)}%</span>
                        </div>
                    </div>
                    <div className="insight-footer flex items-center justify-between mt-2">
                        <span className="text-sm text-gray">Sentiment</span>
                        <span className={`sentiment-badge small ${isBullish ? 'sentiment-bullish' : 'sentiment-bearish'}`}>
                            {sentiment}
                        </span>
                    </div>
                </div>

                {/* Buy Wall Indicator */}
                <div className="insight-card wall-card buy-wall">
                    <div className="insight-title flex items-center justify-between">
                        <span>Strongest Buy Wall</span>
                        <ArrowUpCircle size={16} className="text-success" />
                    </div>
                    {strongestBuyWall && strongestBuyWall.size > 0 ? (
                        <>
                            <div className="insight-value my-2">
                                ₹{strongestBuyWall.price.toFixed(2)}
                            </div>
                            <div className="insight-footer flex items-center gap-2 text-sm text-gray">
                                <ShieldAlert size={14}/> 
                                Block Size: <strong className="text-white">{formatVol(strongestBuyWall.size)}</strong>
                            </div>
                        </>
                    ) : (
                        <div className="text-gray text-sm mt-3">No significant wall detected</div>
                    )}
                </div>

                {/* Sell Wall Indicator */}
                <div className="insight-card wall-card sell-wall">
                    <div className="insight-title flex items-center justify-between">
                        <span>Strongest Sell Wall</span>
                        <ArrowDownCircle size={16} className="text-danger" />
                    </div>
                    {strongestSellWall && strongestSellWall.size > 0 ? (
                        <>
                            <div className="insight-value my-2">
                                ₹{strongestSellWall.price.toFixed(2)}
                            </div>
                            <div className="insight-footer flex items-center gap-2 text-sm text-gray">
                                <ShieldAlert size={14}/> 
                                Block Size: <strong className="text-white">{formatVol(strongestSellWall.size)}</strong>
                            </div>
                        </>
                    ) : (
                        <div className="text-gray text-sm mt-3">No significant wall detected</div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LiquidityPanel;
