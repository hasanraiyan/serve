const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const bodyParser = require('body-parser');
const helmet = require('helmet');
const connectDB = require('./config/db');
const { clerkMiddleware, requireAuth } = require('@clerk/express');
const Razorpay = require('razorpay');

dotenv.config();

// Connect to database
connectDB();

// Initialize Razorpay
const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

console.log('Razorpay instance initialized:', razorpayInstance ? 'Successfully' : 'Failed');
// TODO: Decide on how to make razorpayInstance available to routes.
// For now, it's defined here. Can be exported or passed via app.locals

const app = express();

// Middleware
app.use(cors());
app.use(helmet());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Clerk Authentication Middleware
// CLERK_SIGN_IN_URL, CLERK_PUBLISHABLE_KEY, and CLERK_SECRET_KEY
// should be set in your .env file
app.use(clerkMiddleware({
  publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
  secretKey: process.env.CLERK_SECRET_KEY,
  // signInUrl: process.env.CLERK_SIGN_IN_URL, // Clerk docs recommend env var for this
}));

const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.json({ message: 'Welcome to MITMAA Backend API' });
});

// Protected test route
app.get('/api/protected-test', requireAuth(), (req, res) => {
  // If requireAuth() passes, req.auth should be populated
  const userId = req.auth.userId;
  res.json({
    message: "Successfully accessed protected route",
    userId: userId
  });
});

// Export Razorpay instance for use in other modules
module.exports.razorpayInstance = razorpayInstance;

// Payment Routes
const paymentRoutes = require('./routes/paymentRoutes');
app.use('/api/payments', paymentRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
