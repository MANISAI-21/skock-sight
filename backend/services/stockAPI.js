const axios = require('axios');

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36';

// Global cache for USD->INR conversion rate to avoid hitting rate limits
let inrConversionRate = null;
let lastRateFetch = 0;

/**
 * Helper to fetch the latest USD to INR conversion rate from Yahoo Finance.
 * Caches the rate for 1 hour.
 */
const getUSDToINRRate = async () => {
    const now = Date.now();
    // Cache for 1 hour = 3600000 ms
    if (inrConversionRate && (now - lastRateFetch < 3600000)) {
        return inrConversionRate;
    }
    try {
        const response = await axios.get(`https://query1.finance.yahoo.com/v8/finance/chart/INR=X`, {
            headers: { 'User-Agent': USER_AGENT }
        });
        const rate = response.data.chart.result[0].meta.regularMarketPrice;
        if (rate) {
            inrConversionRate = rate;
            lastRateFetch = now;
            return rate;
        }
    } catch (error) {
        console.error('Failed to fetch INR conversion rate, falling back to 1:', error.message);
    }
    return 1; // Fallback so app doesn't crash
};

/**
 * Fetch a quote for a specific ticker symbol.
 */
exports.fetchQuote = async (ticker) => {
    try {
        const response = await axios.get(`https://query1.finance.yahoo.com/v8/finance/chart/${ticker}`, {
            headers: { 'User-Agent': USER_AGENT }
        });
        
        const result = response.data.chart.result[0];
        const meta = result.meta;
        
        let multiplier = 1;
        let finalCurrency = meta.currency;
        
        // If the currency isn't INR, convert it
        if (meta.currency !== 'INR') {
            multiplier = await getUSDToINRRate();
            finalCurrency = 'INR';
        }
        
        return {
            symbol: meta.symbol,
            shortName: meta.symbol,
            fullExchangeName: meta.exchangeName,
            currency: finalCurrency,
            regularMarketPrice: meta.regularMarketPrice * multiplier,
            regularMarketChange: (meta.regularMarketPrice - meta.chartPreviousClose) * multiplier,
            regularMarketChangePercent: ((meta.regularMarketPrice - meta.chartPreviousClose) / meta.chartPreviousClose) * 100,
            regularMarketPreviousClose: meta.chartPreviousClose * multiplier,
            regularMarketOpen: meta.regularMarketPrice * multiplier,
            regularMarketDayLow: meta.regularMarketPrice * multiplier, 
            regularMarketDayHigh: meta.regularMarketPrice * multiplier,
            regularMarketVolume: meta.regularMarketVolume || 0,
            marketCap: 0 // Cannot easily deduce from simple chart endpoint without crumb
        };
    } catch (error) {
        console.error(`Error fetching quote for ${ticker}:`, error.message);
        throw new Error(`Failed to fetch quote for ${ticker}`);
    }
};

/**
 * Fetch historical data for charting.
 */
exports.fetchHistoricalData = async (ticker, period1, period2, interval) => {
    try {
        // Yahoo v8 endpoint supports ranges: 1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, ytd, max
        let range = '1mo';
        const diffDays = Math.abs(period2 - period1) / (1000 * 60 * 60 * 24);
        
        if (diffDays <= 1) range = '1d';
        else if (diffDays <= 7) range = '5d';
        else if (diffDays <= 31) range = '1mo';
        else if (diffDays <= 93) range = '3mo';
        else if (diffDays <= 186) range = '6mo';
        else if (diffDays <= 366) range = '1y';
        else if (diffDays > 366) range = '5y';
        
        // Match intervals to Yahoo's supported list: 1m, 2m, 5m, 15m, 30m, 60m, 90m, 1h, 1d, 5d, 1wk, 1mo, 3mo
        let validInterval = interval;
        if (interval === '1wk') validInterval = '1wk';
        else if (interval === '1mo') validInterval = '1mo';
        else if (interval === '1d') validInterval = '1d';
        else if (interval === '15m') validInterval = '15m';
        else if (interval === '5m') validInterval = '5m';
        else validInterval = '1d';

        const response = await axios.get(`https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?range=${range}&interval=${validInterval}`, {
            headers: { 'User-Agent': USER_AGENT }
        });
        
        const result = response.data.chart.result[0];
        const meta = result.meta;
        const timestamps = result.timestamp || [];
        const closes = result.indicators.quote[0].close || [];
        const volumes = result.indicators.quote[0].volume || [];
        
        let multiplier = 1;
        if (meta.currency !== 'INR') {
            multiplier = await getUSDToINRRate();
        }
        
        const formattedData = timestamps.map((ts, index) => ({
            date: new Date(ts * 1000),
            close: (closes[index] || 0) * multiplier,
            volume: volumes[index] || 0
        })).filter(x => x.close !== 0);
        
        return formattedData;
    } catch (error) {
        console.error(`Error fetching history for ${ticker}:`, error.message);
        throw new Error(`Failed to fetch historical data for ${ticker}`);
    }
};

/**
 * Search for ticker symbols by name or symbol.
 */
exports.search = async (query) => {
    try {
        const response = await axios.get(`https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=5`, {
            headers: { 'User-Agent': USER_AGENT }
        });
        return response.data.quotes || [];
    } catch (error) {
        console.error(`Error searching for ${query}:`, error.message);
        throw new Error(`Failed to search for ${query}`);
    }
};
