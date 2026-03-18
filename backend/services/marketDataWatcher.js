const stockAPI = require('./stockAPI');
const orderBookService = require('./orderBookService');

class MarketDataWatcher {
    constructor(io) {
        this.io = io;
        this.activeTickers = new Map(); // ticker -> intervalHandle
        this.updateInterval = 2000; // 2 seconds for "live" feel
    }

    startWatching(ticker) {
        if (this.activeTickers.has(ticker)) return;

        console.log(`Starting watch for ${ticker}`);
        
        const fetchAndUpdate = async () => {
            try {
                // Fetch latest data
                const [quote, orderBook] = await Promise.all([
                    stockAPI.fetchQuote(ticker),
                    orderBookService.getOrderBook(ticker)
                ]);

                console.log(`[Watcher] Emitting update for ${ticker}. Bids: ${orderBook.bids.length}, Asks: ${orderBook.asks.length}`);

                // Emit to all clients subscribed to this ticker
                console.log(`Emitting update for ${ticker}: Price ${quote.regularMarketPrice}, Bids: ${orderBook.bids.length}`);
                this.io.to(ticker).emit('orderBookUpdate', {
                    ticker,
                    quote,
                    orderBook,
                    timestamp: Date.now()
                });
                
                // Also synthesise some trades for the live feel
                const trades = this.synthesiseTrades(ticker, quote.regularMarketPrice);
                this.io.to(ticker).emit('tradesUpdate', {
                    ticker,
                    trades,
                    timestamp: Date.now()
                });

            } catch (error) {
                console.error(`Error in watcher for ${ticker}:`, error.message);
            }
        };

        // Initial fetch
        fetchAndUpdate();
        
        // Setup interval
        const handle = setInterval(fetchAndUpdate, this.updateInterval);
        this.activeTickers.set(ticker, handle);
    }

    stopWatching(ticker) {
        if (this.activeTickers.has(ticker)) {
            console.log(`Stopping watch for ${ticker}`);
            clearInterval(this.activeTickers.get(ticker));
            this.activeTickers.delete(ticker);
        }
    }

    synthesiseTrades(ticker, currentPrice) {
        const count = Math.floor(Math.random() * 3) + 1;
        const trades = [];
        for (let i = 0; i < count; i++) {
            const spread = currentPrice * 0.0005;
            const price = currentPrice + (Math.random() - 0.5) * spread;
            const size = Math.floor(Math.random() * 100) + 1;
            const side = Math.random() > 0.5 ? 'buy' : 'sell';
            trades.push({ price, size, side, timestamp: Date.now() });
        }
        return trades;
    }

    handleConnection(socket) {
        socket.on('subscribe', (ticker) => {
            socket.join(ticker);
            this.startWatching(ticker);
        });

        socket.on('unsubscribe', (ticker) => {
            socket.leave(ticker);
            // Check if anyone else is still watching this ticker
            const clients = this.io.sockets.adapter.rooms.get(ticker);
            if (!clients || clients.size === 0) {
                this.stopWatching(ticker);
            }
        });

        socket.on('disconnecting', () => {
            for (const room of socket.rooms) {
                if (room !== socket.id) {
                    const clients = this.io.sockets.adapter.rooms.get(room);
                    if (clients && clients.size === 1) { // Only this client
                        this.stopWatching(room);
                    }
                }
            }
        });
    }
}

module.exports = MarketDataWatcher;
