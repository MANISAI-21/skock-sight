import axios from 'axios';

const API_BASE_URL = '/api/stocks';

export const searchStocks = async (query) => {
    const response = await axios.get(`${API_BASE_URL}/search`, { params: { q: query } });
    return response.data;
};

export const getStockQuote = async (ticker) => {
    const response = await axios.get(`${API_BASE_URL}/quote/${ticker}`);
    return response.data;
};

export const getHistoricalData = async (ticker, period) => {
    const response = await axios.get(`${API_BASE_URL}/history/${ticker}`, { params: { period } });
    return response.data;
};

export const getOrderBook = async (ticker) => {
    const response = await axios.get(`${API_BASE_URL}/orderbook/${ticker}`);
    return response.data;
};
