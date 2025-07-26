import Stripe from 'stripe';

// Initialize Stripe only if the secret key is provided
export const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-03-31.basil', // Use the latest API version
    })
  : null;

// Helper function to check if Stripe is available
export const isStripeEnabled = () => !!process.env.STRIPE_SECRET_KEY;