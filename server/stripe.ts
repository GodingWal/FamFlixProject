import Stripe from 'stripe';

// Initialize Stripe only if the secret key is provided
export const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      // Using SDK's default API version to avoid type mismatches across SDK updates
    })
  : null;

// Helper function to check if Stripe is available
export const isStripeEnabled = () => !!process.env.STRIPE_SECRET_KEY;