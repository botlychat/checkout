const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  // ✅ Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*'); // Replace * with your domain for security
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end(); // CORS preflight support
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { amount } = req.body;

  if (!amount || typeof amount !== 'number' || amount < 50) {
    return res.status(400).json({ error: 'Invalid amount. Must be a number >= 50 cents.' });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Custom Payment',
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      success_url: 'https://your-domain.com/success',
      cancel_url: 'https://your-domain.com/cancel',
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Stripe Error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
