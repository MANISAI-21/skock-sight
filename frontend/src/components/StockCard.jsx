import React from 'react';
import { TrendingUp, TrendingDown, HelpCircle } from 'lucide-react';

const StockCard = ({ quote }) => {
    if (!quote) return null;

    const isPositive = quote.regularMarketChange >= 0;
    const changeColorClass = isPositive ? 'text-success' : 'text-danger';

    const formatCurrency = (val) => {
        if (!val && val !== 0) return 'N/A';
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: quote.currency || 'INR' }).format(val);
    };

    const formatNumber = (val) => {
        if (!val) return 'N/A';
        if (val > 1e12) return (val / 1e12).toFixed(2) + 'T';
        if (val > 1e9) return (val / 1e9).toFixed(2) + 'B';
        if (val > 1e6) return (val / 1e6).toFixed(2) + 'M';
        return new Intl.NumberFormat('en-US').format(val);
    };

    // Calculate basic sentiment for beginners
    let sentimentStr = "Neutral";
    let sentimentClass = "sentiment-neutral";
    if (quote.regularMarketChangePercent > 1) {
        sentimentStr = "Bullish (Good)";
        sentimentClass = "sentiment-bullish";
    } else if (quote.regularMarketChangePercent < -1) {
        sentimentStr = "Bearish (Bad)";
        sentimentClass = "sentiment-bearish";
    }

    return (
        <div className="stock-card glass-panel fade-in slide-up">
            <div className="card-header">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <h2 className="stock-title">{quote.shortName || quote.symbol}</h2>
                        <span className="stock-badge">{quote.symbol}</span>
                        <span className="exchange-badge">{quote.fullExchangeName}</span>
                    </div>
                    <div className={`sentiment-badge ${sentimentClass}`}>
                        {sentimentStr}
                    </div>
                </div>
                <div className="price-container">
                    <div className="current-price">{formatCurrency(quote.regularMarketPrice)}</div>
                    <div className={`price-change ${changeColorClass}`}>
                        {isPositive ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                        <span>
                            {isPositive ? '+' : ''}{quote.regularMarketChange?.toFixed(2)} ({isPositive ? '+' : ''}{quote.regularMarketChangePercent?.toFixed(2)}%)
                        </span>
                    </div>
                </div>
            </div>

            <div className="stats-grid">
                <div className="stat-box">
                    <span className="stat-label">
                        Previous Close
                        <span className="tooltip-container">
                            <HelpCircle size={14} className="info-icon" />
                            <span className="educational-tooltip">The price this stock ended at on the last trading day.</span>
                        </span>
                    </span>
                    <span className="stat-value">{formatCurrency(quote.regularMarketPreviousClose)}</span>
                </div>
                <div className="stat-box">
                    <span className="stat-label">
                        Open Price
                        <span className="tooltip-container">
                            <HelpCircle size={14} className="info-icon" />
                            <span className="educational-tooltip">The price this stock started at when the market opened today.</span>
                        </span>
                    </span>
                    <span className="stat-value">{formatCurrency(quote.regularMarketOpen)}</span>
                </div>
                <div className="stat-box">
                    <span className="stat-label">
                        Today's Range
                        <span className="tooltip-container">
                            <HelpCircle size={14} className="info-icon" />
                            <span className="educational-tooltip">The lowest and highest prices the stock hit today.</span>
                        </span>
                    </span>
                    <span className="stat-value">{quote.regularMarketDayLow?.toFixed(2)} - {quote.regularMarketDayHigh?.toFixed(2)}</span>
                </div>
                <div className="stat-box">
                    <span className="stat-label">
                        52-Week Range
                        <span className="tooltip-container">
                            <HelpCircle size={14} className="info-icon" />
                            <span className="educational-tooltip">The lowest and highest prices over the entire past year.</span>
                        </span>
                    </span>
                    <span className="stat-value">{quote.fiftyTwoWeekLow ? quote.fiftyTwoWeekLow.toFixed(2) : 'N/A'} - {quote.fiftyTwoWeekHigh ? quote.fiftyTwoWeekHigh.toFixed(2) : 'N/A'}</span>
                </div>
                <div className="stat-box">
                    <span className="stat-label">
                        Trading Volume
                        <span className="tooltip-container">
                            <HelpCircle size={14} className="info-icon" />
                            <span className="educational-tooltip">The total number of shares that were bought and sold today. Higher volume means more activity.</span>
                        </span>
                    </span>
                    <span className="stat-value">{formatNumber(quote.regularMarketVolume)}</span>
                </div>
                <div className="stat-box">
                    <span className="stat-label">
                        Market Size (Cap)
                        <span className="tooltip-container">
                            <HelpCircle size={14} className="info-icon" />
                            <span className="educational-tooltip">The total value of the entire company, calculated by multiplying price by total shares.</span>
                        </span>
                    </span>
                    <span className="stat-value">{formatNumber(quote.marketCap)}</span>
                </div>
            </div>
        </div>
    );
};

export default StockCard;
