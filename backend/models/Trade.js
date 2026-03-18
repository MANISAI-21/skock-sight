const mongoose = require('mongoose');

const tradeSchema = new mongoose.Schema({
    buyOrderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        required: true
    },
    sellOrderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    quantity: {
        type: Number,
        required: true
    },
    tradeTime: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Trade', tradeSchema);
