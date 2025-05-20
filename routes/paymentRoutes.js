const express = require('express');
const router = express.Router();
const { requireAuth } = require('@clerk/express');
const { createPaymentOrder, verifyPayment } = require('../controllers/paymentController');

// POST /api/payments/create-order
// Logic moved to paymentController.js
router.post('/create-order', requireAuth, createPaymentOrder);

// POST /api/payments/verify-payment
// Logic moved to paymentController.js
router.post('/verify-payment', requireAuth, verifyPayment);

module.exports = router;
