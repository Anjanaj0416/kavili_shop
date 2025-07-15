import mongoose from "mongoose";

const orderScheme = new mongoose.Schema({
    orderId: {
        type: String,
        unique: true
    },
    phone: {
        type: String,
        required: true,
        // Removed unique constraint since customers don't have accounts
        // Multiple orders can have same phone number
    },
    
    orderedItems: [{
        name: {
            type: String,
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
        image: {
            type: String,
            required: false
        },
        productId: {
            type: String,
            required: true  // This is essential for tracking totalOrdered
        }
    }],
    date: {
        type: Date,
        default: Date.now
    },
    paymentId: {
        type: String,  
    },
    status: {
        type: String,
        enum: ["preparing", "shipped", "delivered", "cancelled"],
        default: "preparing"
    },
    notes: {
        type: String,  
    },
    name: {
        type: String,
        required: true
    },
    address: {
        type: String,
        required: true
    },
    // New fields for delivery options
    deliveryOption: {
        type: String,
        enum: ["pickup", "delivery"],
        required: true,
        default: "pickup"
    },
    whatsappNumber: {
        type: String,
        required: true
    },
    preferredTime: {
        type: String,
        required: true
    },
    preferredDay: {
        type: String,
        required: true
    },
    nearestTownOrCity: {
        type: String,
        required: function() {
            return this.deliveryOption === "delivery";
        }
    },
    email: {
        type: String,
        required: false
    }
});

const Order = mongoose.model("orders", orderScheme);
export default Order;