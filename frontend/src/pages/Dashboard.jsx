import React, { useState, useEffect, useRef, useCallback } from 'react';
import SearchBar from '../components/SearchBar';
import StockCard from '../components/StockCard';
import StockChart from '../components/StockChart';
import DepthChart from '../components/DepthChart';
import LiquidityPanel from '../components/LiquidityPanel';
import LiquidityHeatmap from '../components/LiquidityHeatmap';
import OrderFlowTracker from '../components/OrderFlowTracker';
import VolumeProfile from '../components/VolumeProfile';
import OrderBookImbalance from '../components/OrderBookImbalance';
import Watchlist from '../components/Watchlist';
import TradeHistory from '../components/TradeHistory';
import AuthModal from '../components/AuthModal';
import WhaleTracker from '../components/WhaleTracker';
import { getStockQuote, getHistoricalData, getOrderBook } from '../api/stockApi';
import { subscribeOrderBook, subscribeTrades } from '../services/marketDataStream';
import { TrendingUp, AlertCircle, User } from 'lucide-react';

const MAX_SNAPSHOTS = 60; // rolling heatmap window

const Dashboard = () => {
    const [selectedTicker, setSelectedTicker] = useState('AAPL');
    const [quote, setQuote] = useState(null);
    const [chartData, setChartData] = useState([]);
    const [chartPeriod, setChartPeriod] = useState('1mo');
    const [orderBook, setOrderBook] = useState(null);

    const [isLoadingQuote, setIsLoadingQuote] = useState(false);
    const [isLoadingChart, setIsLoadingChart] = useState(false);
    const [isLoadingOrderBook, setIsLoadingOrderBook] = useState(false);
    const [error, setError] = useState(null);

    // Auth state
    const [user, setUser] = useState(null);
    const [showAuthModal, setShowAuthModal] = useState(false);

    // ── Streaming state (new components) ────────────────────────────
    const [snapshots, setSnapshots] = useState([]);   // LiquidityHeatmap
    const [trades, setTrades]       = useState([]);   // OrderFlowTracker + VolumeProfile
    const unsubOBRef    = useRef(null);
    const unsubTradesRef = useRef(null);

    useEffect(() => {
        const loggedInUser = localStorage.getItem('user');
        if (loggedInUser) setUser(JSON.parse(loggedInUser));
    }, []);

    const fetchQuote = async (ticker) => {
        setIsLoadingQuote(true);
        setError(null);
        try {
            const res = await getStockQuote(ticker);
            if (res.success) setQuote(res.data);
            else setError(res.message || 'Failed to fetch quote');
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'An error occurred fetching the quote');
        } finally {
            setIsLoadingQuote(false);
        }
    };

    const fetchChartData = async (ticker, period) => {
        setIsLoadingChart(true);
        try {
            const res = await getHistoricalData(ticker, period);
            if (res.success && res.data) {
                setChartData(res.data.map(item => ({ date: item.date, close: item.close, volume: item.volume })));
            }
        } catch (err) {
            console.error('Failed to fetch chart data', err);
        } finally {
            setIsLoadingChart(false);
        }
    };

    const fetchOrderBook = async (ticker) => {
        setIsLoadingOrderBook(true);
        try {
            const res = await getOrderBook(ticker);
            if (res.success && res.data) setOrderBook(res.data);
        } catch (err) {
            console.error('Failed to fetch order book data', err);
        } finally {
            setIsLoadingOrderBook(false);
        }
    };

    // ── Subscribe to live streams ────────────────────────────────────
    const startStreams = useCallback((ticker) => {
        // Clean up previous subscriptions
        unsubOBRef.current?.();
        unsubTradesRef.current?.();
        setSnapshots([]);
        setTrades([]);

        unsubOBRef.current = subscribeOrderBook(ticker, (snapshot) => {
            // Update orderBook for OBI and DepthChart
            setOrderBook(prev => ({
                ...prev,
                bids: snapshot.bids,
                asks: snapshot.asks,
                currentPrice: snapshot.currentPrice || prev?.currentPrice,
                timestamp: snapshot.timestamp
            }));

            // Update snapshots for Heatmap
            setSnapshots(prev => {
                const next = [...prev, snapshot];
                return next.length > MAX_SNAPSHOTS ? next.slice(next.length - MAX_SNAPSHOTS) : next;
            });
        });

        unsubTradesRef.current = subscribeTrades(ticker, (newTrades) => {
            setTrades(prev => {
                // Keep last 2000 trades to avoid unbounded growth
                const combined = [...prev, ...newTrades];
                return combined.length > 2000 ? combined.slice(combined.length - 2000) : combined;
            });
        });
    }, []);

    useEffect(() => {
        if (selectedTicker) {
            fetchQuote(selectedTicker);
            fetchChartData(selectedTicker, chartPeriod);
            fetchOrderBook(selectedTicker);
            startStreams(selectedTicker);
        }
        return () => {
            unsubOBRef.current?.();
            unsubTradesRef.current?.();
        };
    }, [selectedTicker]);

    const handlePeriodChange = (period) => {
        setChartPeriod(period);
        fetchChartData(selectedTicker, period);
    };

    return (
        <div className="dashboard-container">
            <header className="dashboard-header glass-panel">
                <div className="logo-container">
                    <TrendingUp className="logo-icon text-accent" size={32} />
                    <h1 className="logo-text">Stock<span className="text-accent">Sight</span></h1>
                </div>
                <div className="search-section">
                    <SearchBar onSelectStock={setSelectedTicker} />
                </div>
                <div className="user-profile" onClick={() => setShowAuthModal(true)} style={{ cursor: 'pointer' }}>
                    {user ? (
                        <div className="avatar logged-in">{user.name.charAt(0).toUpperCase()}</div>
                    ) : (
                        <div className="avatar outline"><User size={18} /></div>
                    )}
                </div>
            </header>

            {showAuthModal && (
                <AuthModal
                    onClose={() => setShowAuthModal(false)}
                    user={user}
                    onUserUpdate={setUser}
                />
            )}

            <main className="dashboard-main">
                {error && (
                    <div className="error-banner fade-in">
                        <AlertCircle size={20} />
                        <span>{error}</span>
                    </div>
                )}

                {isLoadingQuote ? (
                    <div className="quote-loader glass-panel">
                        <div className="loader large"></div>
                        <p>Loading Market Data...</p>
                    </div>
                ) : (
                    <div className="dashboard-content">
                        <div className="left-column">
                            <StockCard quote={quote} />
                            <Watchlist onSelectStock={setSelectedTicker} currentTicker={selectedTicker} />
                            <LiquidityPanel analytics={orderBook?.analytics} isLoading={isLoadingOrderBook} />
                        </div>
                        <div className="right-column">
                            <div className="charts-grid">
                                <StockChart
                                    data={chartData}
                                    period={chartPeriod}
                                    onPeriodChange={handlePeriodChange}
                                    isLoading={isLoadingChart}
                                    onRefresh={() => fetchChartData(selectedTicker, chartPeriod)}
                                />
                                <DepthChart
                                    orderBook={orderBook}
                                    isLoading={isLoadingOrderBook}
                                />
                                <OrderBookImbalance 
                                    bids={orderBook?.bids || []} 
                                    asks={orderBook?.asks || []} 
                                    lastUpdated={orderBook?.timestamp}
                                />
                                <LiquidityHeatmap
                                    snapshots={snapshots}
                                    isLoading={isLoadingOrderBook && snapshots.length === 0}
                                />
                                <VolumeProfile trades={trades} />
                                <OrderFlowTracker trades={trades} />
                                <WhaleTracker trades={trades} />
                            </div>
                        </div>
                        {/* Third column for extra-wide screens */}
                        <div className="extra-column desk-only">
                            <TradeHistory trades={trades} />
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default Dashboard;

