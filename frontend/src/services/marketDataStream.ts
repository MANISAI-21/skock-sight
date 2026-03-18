import { io, Socket } from 'socket.io-client';

/**
 * marketDataStream.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * WebSocket market-data streaming service.
 * Connects to the backend via Socket.io for real-time updates.
 */

type OrderEntry = { price: number; volume: number };

export interface OrderBookSnapshot {
  ticker: string;
  timestamp: number;
  bids: OrderEntry[];
  asks: OrderEntry[];
  currentPrice?: number;
}

export interface Trade {
  price: number;
  size: number;
  side: 'buy' | 'sell';
  timestamp: number;
}

type OrderBookCallback = (snapshot: OrderBookSnapshot) => void;
type TradeCallback = (trades: Trade[]) => void;

/* ── Socket setup ────────────────────────────────────────────────── */
const SOCKET_URL = window.location.hostname === 'localhost' ? 'http://localhost:5000' : '/';
const socket: Socket = io(SOCKET_URL);

socket.on('connect', () => {
    console.log('Connected to market data stream');
});

socket.on('disconnect', () => {
    console.log('Disconnected from market data stream');
});

/* ── Internal event registry ─────────────────────────────────────── */
const obListeners = new Map<string, Set<OrderBookCallback>>();
const tradeListeners = new Map<string, Set<TradeCallback>>();

// Listen for updates from the server
socket.on('orderBookUpdate', (data: any) => {
    const { ticker, orderBook } = data;
    console.log('Received orderBookUpdate:', ticker, orderBook);
    const snapshot: OrderBookSnapshot = {
        ticker,
        timestamp: Date.now(),
        bids: (orderBook.bids || []).map((b: any) => ({
            price: b.price,
            volume: b.size || b.volume || 0,
        })),
        asks: (orderBook.asks || []).map((a: any) => ({
            price: a.price,
            volume: a.size || a.volume || 0,
        })),
        currentPrice: orderBook.currentPrice,
    };
    
    if (obListeners.has(ticker)) {
        obListeners.get(ticker)!.forEach(cb => cb(snapshot));
    }
});

socket.on('tradesUpdate', (data: any) => {
    const { ticker, trades } = data;
    console.log('Received tradesUpdate:', ticker, trades?.length);
    if (tradeListeners.has(ticker)) {
        tradeListeners.get(ticker)!.forEach(cb => cb(trades));
    }
});

/* ── Public API ──────────────────────────────────────────────────── */

/**
 * Subscribe to order book snapshots for a ticker.
 * @returns unsubscribe function
 */
export function subscribeOrderBook(ticker: string, cb: OrderBookCallback): () => void {
    if (!obListeners.has(ticker)) {
        obListeners.set(ticker, new Set());
        socket.emit('subscribe', ticker);
    }
    obListeners.get(ticker)!.add(cb);
    
    return () => {
        const listeners = obListeners.get(ticker);
        if (listeners) {
            listeners.delete(cb);
            if (listeners.size === 0) {
                obListeners.delete(ticker);
                socket.emit('unsubscribe', ticker);
            }
        }
    };
}

/**
 * Subscribe to trade events for a ticker.
 * @returns unsubscribe function
 */
export function subscribeTrades(ticker: string, cb: TradeCallback): () => void {
    if (!tradeListeners.has(ticker)) {
        tradeListeners.set(ticker, new Set());
        socket.emit('subscribe', ticker);
    }
    tradeListeners.get(ticker)!.add(cb);
    
    return () => {
        const listeners = tradeListeners.get(ticker);
        if (listeners) {
            listeners.delete(cb);
            if (listeners.size === 0) {
                tradeListeners.delete(ticker);
                // Only unsubscribe if no order book listeners remain either
                if (!obListeners.has(ticker)) {
                    socket.emit('unsubscribe', ticker);
                }
            }
        }
    };
}
