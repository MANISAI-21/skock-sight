const express = require('express');
const router = express.Router();
const { getQuote, getHistoricalData, searchStocks, getOrderBookData } = require('../controllers/stockController');

// Helper wrapper for async error handling
const asyncWrapper = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// @route   GET /api/stocks/search?q=:query
// @desc    Search for stock tickers
router.get('/search', asyncWrapper(searchStocks));

// @route   GET /api/stocks/quote/:ticker
// @desc    Get real-time/delayed quote for a specific ticker
router.get('/quote/:ticker', asyncWrapper(getQuote));

// @route   GET /api/stocks/history/:ticker
// @desc    Get historical price data for charting
router.get('/history/:ticker', asyncWrapper(getHistoricalData));

// @route   GET /api/stocks/orderbook/:ticker
// @desc    Get real-time simulated order book with liquidity analysis
router.get('/orderbook/:ticker', asyncWrapper(getOrderBookData));

module.exports = router;
