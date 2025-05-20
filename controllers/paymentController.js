const Payment = require('../models/Payment');
const crypto = require('crypto');
const { razorpayInstance } = require('../index.js'); // Import from index.js

const ALUMNI_MEET_AMOUNT_PAISE = 500 * 100;
const LIFETIME_MEMBERSHIP_AMOUNT_PAISE = 5000 * 100;
const MIN_DONATION_PAISE = 10 * 100; // ₹10 in paise

// POST /api/payments/create-order
const createPaymentOrder = async (req, res) => {
  const { paymentType, amount } = req.body; // amount is expected in Rupees for donation
  let finalAmountInPaise;

  if (!paymentType) {
    return res.status(400).json({ error: "Payment type is required." });
  }

  switch (paymentType) {
    case "alumni_meet":
      finalAmountInPaise = ALUMNI_MEET_AMOUNT_PAISE;
      break;
    case "membership":
      finalAmountInPaise = LIFETIME_MEMBERSHIP_AMOUNT_PAISE;
      break;
    case "donation":
      if (typeof amount !== 'number' || amount <= 0) {
        return res.status(400).json({ error: "Valid amount is required for donation." });
      }
      const donationAmountInPaise = Math.round(amount * 100); // Ensure integer, convert to paise
      if (donationAmountInPaise < MIN_DONATION_PAISE) {
        return res.status(400).json({ error: `Donation amount must be at least ₹${MIN_DONATION_PAISE / 100}.` });
      }
      finalAmountInPaise = donationAmountInPaise;
      break;
    default:
      return res.status(400).json({ error: "Invalid payment type." });
  }

  console.log(`Payment Type: ${paymentType}, Final Amount (Paise): ${finalAmountInPaise}, UserID: ${req.auth.userId}`);

  const receiptId = `receipt_order_${Date.now()}`;

  const options = {
    amount: finalAmountInPaise,
    currency: 'INR',
    receipt: receiptId
  };

  try {
    const order = await razorpayInstance.orders.create(options);
    if (!order) {
      console.error("Razorpay order creation failed: Order object is null or undefined.");
      return res.status(500).json({ error: "Could not create Razorpay order", details: "Order creation returned no result." });
    }
    console.log("Razorpay order created successfully:", order);
    res.json({
      order_id: order.id,
      amount: order.amount, // This is in paise
      currency: order.currency,
      name: "MITMAA Payment", // Or your application's name
      key: process.env.RAZORPAY_KEY_ID, // For frontend
      receipt: order.receipt
    });
  } catch (error) {
    console.error("Error creating Razorpay order:", error);
    res.status(500).json({
      error: "Could not create Razorpay order",
      details: error.message
    });
  }
};

// POST /api/payments/verify-payment
const verifyPayment = async (req, res) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    paymentType, // Sent back from frontend
    amountInPaise  // Sent back from frontend (original amount for which order was created)
  } = req.body;

  const userId = req.auth.userId;
  const email = req.auth.claims?.email_address; 

  if (!email) {
    console.warn(`Email not found in req.auth.claims.email_address for userId: ${userId}. Consider fetching via ClerkClient.`);
  }

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ status: 'error', message: 'Missing Razorpay payment details.' });
  }

  if (!paymentType || amountInPaise === undefined || amountInPaise === null) {
    return res.status(400).json({ status: 'error', message: 'Missing paymentType or amountInPaise in request body.' });
  }
  
  const body = razorpay_order_id + "|" + razorpay_payment_id;

  try {
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature === razorpay_signature) {
      console.log(`Payment signature verified successfully for order_id: ${razorpay_order_id}, payment_id: ${razorpay_payment_id}`);
      
      const newPayment = new Payment({
        userId,
        email: email || 'Email not available in claims', 
        type: paymentType,
        amount: amountInPaise / 100, 
        razorpay_order_id,
        razorpay_payment_id,
        status: 'success',
        timestamp: new Date() 
      });

      await newPayment.save();
      console.log(`Payment record saved successfully for order_id: ${razorpay_order_id}, DB ID: ${newPayment._id}`);

      res.json({
        status: 'success',
        message: 'Payment verified and record saved successfully.',
        paymentId: newPayment._id, 
        userId,
        email: newPayment.email, 
        paymentType,
        amount: newPayment.amount, 
        razorpay_order_id,
        razorpay_payment_id,
      });
    } else {
      console.error(`Payment signature verification failed for order_id: ${razorpay_order_id}. Expected: ${expectedSignature}, Got: ${razorpay_signature}`);
      return res.status(400).json({ status: 'error', message: 'Invalid payment signature.' });
    }
  } catch (error) {
    console.error("Error during payment verification:", error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error during payment verification.',
      details: error.message
    });
  }
};

module.exports = {
  createPaymentOrder,
  verifyPayment,
};
