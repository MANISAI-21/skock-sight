const mongoose = require('mongoose');

const orderBookSchema = new mongoose.Schema({
    priceLevel: {
        type: Number,
        required: true,
        unique: true
    },
    totalBuyVolume: {
        type: Number,
        default: 0
    },
    totalSellVolume: {
        type: Number,
        default: 0
    }
});

module.exports = mongoose.model('OrderBook', orderBookSchema);
