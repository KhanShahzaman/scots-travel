import Stripe from "stripe";

let stripeClient = null;

export function getStripeServer() {
  if (stripeClient) {
    return stripeClient;
  }

  const secretKey = process.env.STRIPE_SECRET_KEY || "sk_test_dummy_replace_me";
  stripeClient = new Stripe(secretKey);
  return stripeClient;
}

