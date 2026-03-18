const stockAPI = require('../services/stockAPI');
const orderBookService = require('../services/orderBookService');
const liquidityAnalysis = require('../utils/liquidityAnalysis');

exports.getQuote = async (req, res) => {
    const { ticker } = req.params;
    if (!ticker) {
        return res.status(400).json({ success: false, message: 'Ticker is required' });
    }
    
    const quote = await stockAPI.fetchQuote(ticker);
    res.json({ success: true, data: quote });
};

exports.getHistoricalData = async (req, res) => {
    const { ticker } = req.params;
    const { period = '1mo' } = req.query; // e.g. 1d, 5d, 1mo, 3mo, 6mo, 1y, 5y
    
    if (!ticker) {
        return res.status(400).json({ success: false, message: 'Ticker is required' });
    }
    
    // Map periods to start dates and intervals
    const now = new Date();
    let startDate = new Date();
    let interval = '1d';
    
    switch (period) {
        case '1d':
            startDate.setDate(now.getDate() - 1);
            interval = '5m';
            break;
        case '5d':
            startDate.setDate(now.getDate() - 5);
            interval = '15m';
            break;
        case '1mo':
            startDate.setMonth(now.getMonth() - 1);
            interval = '1d';
            break;
        case '3mo':
            startDate.setMonth(now.getMonth() - 3);
            interval = '1d';
            break;
        case '6mo':
            startDate.setMonth(now.getMonth() - 6);
            interval = '1wk';
            break;
        case '1y':
            startDate.setFullYear(now.getFullYear() - 1);
            interval = '1wk';
            break;
        case '5y':
            startDate.setFullYear(now.getFullYear() - 5);
            interval = '1mo';
            break;
        default:
            startDate.setMonth(now.getMonth() - 1); // default 1mo
            interval = '1d';
    }
    
    const history = await stockAPI.fetchHistoricalData(ticker, startDate, now, interval);
    res.json({ success: true, data: history });
};

exports.searchStocks = async (req, res) => {
    const { q } = req.query;
    if (!q) {
        return res.status(400).json({ success: false, message: 'Search query is required' });
    }
    
    const results = await stockAPI.search(q);
    res.json({ success: true, data: results });
};

exports.getOrderBookData = async (req, res) => {
    const { ticker } = req.params;
    if (!ticker) {
        return res.status(400).json({ success: false, message: 'Ticker is required' });
    }

    try {
        // Fetch raw order book (Module 1 & 2)
        const rawOrderBook = await orderBookService.getOrderBook(ticker);
        
        // Aggregate Depth and Analyze Liquidity (Module 3 & 4)
        const processedBook = liquidityAnalysis.processOrderBook(rawOrderBook);

        res.json({ success: true, data: processedBook });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};
