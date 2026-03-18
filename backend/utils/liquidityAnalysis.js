/**
 * Module 3: Market Depth Aggregation Module
 * Groups orders into broader price intervals and calculates cumulative volume.
 */
const aggregateDepth = (orders, interval, isBid) => {
    const aggregated = {};
    let cumulativeVolume = 0;

    orders.forEach(order => {
        // Group by interval
        let levelPrice;
        if (isBid) {
            levelPrice = Math.floor(order.price / interval) * interval;
        } else {
            levelPrice = Math.ceil(order.price / interval) * interval;
        }

        // Use fixed precision to avoid floating point issues as keys
        const key = levelPrice.toFixed(2);

        if (!aggregated[key]) {
            aggregated[key] = {
                price: parseFloat(key),
                size: 0
            };
        }
        aggregated[key].size += order.size;
    });

    // Convert back to array and sort
    // Bids highest to lowest, Asks lowest to highest
    const result = Object.values(aggregated).sort((a, b) => {
        return isBid ? b.price - a.price : a.price - b.price;
    });

    // Calculate cumulative volume (Total)
    result.forEach(level => {
        cumulativeVolume += level.size;
        level.total = cumulativeVolume;
    });

    return result;
};

/**
 * Module 4: Liquidity Analysis Module
 * Analyzes aggregated data for buy/sell walls and calculates market pressure.
 */
const analyzeLiquidity = (bids, asks) => {
    let totalBidVolume = 0;
    let totalAskVolume = 0;
    let strongestBuyWall = { price: 0, size: 0 };
    let strongestSellWall = { price: 0, size: 0 };

    bids.forEach(bid => {
        totalBidVolume += bid.size;
        if (bid.size > strongestBuyWall.size) {
            strongestBuyWall = bid;
        }
    });

    asks.forEach(ask => {
        totalAskVolume += ask.size;
        if (ask.size > strongestSellWall.size) {
            strongestSellWall = ask;
        }
    });

    // Calculate Market Pressure ratio (Bids / Asks)
    // > 1 means more buy pressure (Bullish liquidity)
    // < 1 means more sell pressure (Bearish liquidity)
    const marketPressure = totalAskVolume === 0 ? 1 : totalBidVolume / totalAskVolume;
    
    let sentiment = 'Neutral';
    if (marketPressure > 1.2) sentiment = 'Bullish';
    if (marketPressure < 0.8) sentiment = 'Bearish';
    if (marketPressure > 2.0) sentiment = 'Strongly Bullish';
    if (marketPressure < 0.5) sentiment = 'Strongly Bearish';

    return {
        totalBidVolume,
        totalAskVolume,
        marketPressure: parseFloat(marketPressure.toFixed(2)),
        sentiment,
        strongestBuyWall,
        strongestSellWall
    };
};

/**
 * Main processor function calling both modules
 */
exports.processOrderBook = (rawOrderBook, aggregationInterval = 0.10) => {
    // Determine dynamic interval based on price if not explicitly provided
    // E.g., for a $150 stock use $0.50, for a $10 stock use $0.05
    let interval = aggregationInterval;
    if (rawOrderBook.currentPrice > 100) interval = 0.50;
    if (rawOrderBook.currentPrice > 500) interval = 1.00;
    if (rawOrderBook.currentPrice < 10) interval = 0.05;

    const aggregatedBids = aggregateDepth(rawOrderBook.bids, interval, true);
    const aggregatedAsks = aggregateDepth(rawOrderBook.asks, interval, false);

    const analytics = analyzeLiquidity(aggregatedBids, aggregatedAsks);

    return {
        ...rawOrderBook, // Include raw data for potential granular UI
        intervalUsed: interval,
        aggregatedBids,
        aggregatedAsks,
        analytics
    };
};
