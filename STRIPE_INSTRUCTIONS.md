Stripe integration (MVP)

Where to put keys

- Backend (required): set your Stripe SECRET key as an environment variable named `STRIPE_SECRET_KEY` on your server. Use this secret key only on the backend when creating PaymentIntents or interacting with the Stripe API.

- Frontend (optional, publishable key): for client-side Stripe.js usage set `VITE_STRIPE_PUBLISHABLE_KEY` in a `.env` file at the project root of the frontend. Example (frontend/.env):

VITE_STRIPE_PUBLISHABLE_KEY=pk_test_XXXXXXXXXXXXXXXXXXXX

Backend example (Node/Express) — create PaymentIntent endpoint

```js
// Example: routes/payments.js
const express = require('express');
const Stripe = require('stripe');
const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

router.post('/stripe-intent', async (req, res) => {
  const { amount } = req.body; // amount in cents
  if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });
  try {
    const intent = await stripe.paymentIntents.create({
      amount,
      currency: 'usd'
    });
    res.json({ clientSecret: intent.client_secret });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
```

Notes

- Never put your Stripe SECRET key in the frontend or commit it to source control.
- The frontend should call a backend endpoint (like `/api/payments/stripe-intent`) that uses the secret key to create a PaymentIntent, then return the `client_secret` to the frontend to confirm the payment.
- For quick local testing you can use the Stripe test secret key in your local environment and the corresponding publishable key in `VITE_STRIPE_PUBLISHABLE_KEY`.

MVP flow in this repo

- `CartPanel` will POST to `/api/payments/stripe-intent` with `{ amount }` in cents. Implement the backend endpoint using the secret key as shown.
- After the backend returns a `clientSecret` you should complete the Stripe confirmation flow in the frontend (not yet implemented). For MVP this project will accept the presence of `clientSecret` and generate a receipt.
