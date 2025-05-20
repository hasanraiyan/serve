const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    required: true,
    enum: ["alumni_meet", "membership", "donation"],
  },
  amount: {
    type: Number,
    required: true,
  },
  razorpay_order_id: {
    type: String,
    required: true,
  },
  razorpay_payment_id: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    required: true,
    enum: ["success", "failed"],
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Payment', PaymentSchema);
