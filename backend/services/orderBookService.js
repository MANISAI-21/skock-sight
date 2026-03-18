const stockAPI = require('./stockAPI');

/**
 * Module 1 & 2: Market Data Acquisition & Order Book Reconstruction
 * Generates realistic Level 2 order book data around the current market price.
 */
exports.getOrderBook = async (ticker) => {
    try {
        // Fetch real-time price as the mid-price anchor
        const quote = await stockAPI.fetchQuote(ticker);
        const currentPrice = quote.regularMarketPrice;
        
        if (!currentPrice) {
            throw new Error('Current price unavailable for order book generation');
        }

        // Configuration for simulation
        const isCrypto = currentPrice < 10;
        const tickSize = isCrypto ? 0.01 : (currentPrice > 100 ? 0.05 : 0.02);
        const spread = tickSize * (Math.floor(Math.random() * 3) + 1); // 1 to 3 ticks
        
        const highestBid = currentPrice - spread / 2;
        const lowestAsk = currentPrice + spread / 2;
        
        const bids = [];
        const asks = [];
        const levels = 50; // Number of price levels on each side
        
        // Base volume scaler based on stock typical volume
        const avgVolume = quote.regularMarketVolume || 1000000;
        const volumeMultiplier = Math.max(10, Math.floor(avgVolume / 100000));

        // Generate Bids (Buy Orders)
        for (let i = 0; i < levels; i++) {
            const price = highestBid - (i * tickSize);
            // Non-linear volume distribution (more volume closer to mid price, with occasional spikes)
            let volume = Math.floor(Math.random() * volumeMultiplier * 100) + 10;
            
            // Simulate a "Buy Wall" occasionally
            if (i % 15 === 0 && Math.random() > 0.5) {
                volume *= (Math.random() * 5 + 5); // 5x to 10x normal volume
            }

            bids.push({
                price: parseFloat(price.toFixed(2)),
                size: Math.floor(volume),
                total: 0 // Will be calculated during aggregation
            });
        }

        // Generate Asks (Sell Orders)
        for (let i = 0; i < levels; i++) {
            const price = lowestAsk + (i * tickSize);
            let volume = Math.floor(Math.random() * volumeMultiplier * 100) + 10;
            
            // Simulate a "Sell Wall" occasionally
            if (i % 12 === 0 && Math.random() > 0.5) {
                volume *= (Math.random() * 5 + 5);
            }

            asks.push({
                price: parseFloat(price.toFixed(2)),
                size: Math.floor(volume),
                total: 0
            });
        }

        return {
            symbol: ticker,
            timestamp: new Date().toISOString(),
            currentPrice,
            bids,
            asks
        };
    } catch (error) {
        console.error(`Error generating order book for ${ticker}:`, error.message);
        throw new Error(`Failed to generate order book for ${ticker}`);
    }
};
