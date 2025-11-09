import mongoose from 'mongoose';

const bidSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

const itemSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    category: {
        type: String,
        default: 'General',
        trim: true
    },
    start_price: {
        type: Number,
        required: true,
        min: 0
    },
    current_bid: {
        type: Number,
        required: true,
        min: 0
    },
    bids: [bidSchema],
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    end_time: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        enum: ['active', 'sold'],
        default: 'active'
    }
});

export default mongoose.model('Item', itemSchema);
