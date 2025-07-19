// /api/checkout.js
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { itemName, itemDescription, amount, email, phone, studentName, productId, SPF_number } = req.body;

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'brl',
            product_data: {
              name: itemName,
              description: itemDescription,
            },
            unit_amount: parseInt(amount),
          },
          quantity: 1,
        },
      ],
      success_url: `https://draft-416890.sendpulse.website/?success=true&email=${email}&phone=${phone}&product_name=${encodeURIComponent(itemName)}&product_price=${amount}&product_id=${productId}&order_date=${new Date().toISOString().slice(0, 10)}&studant_name=${encodeURIComponent(studentName)}&SPF_number=${SPF_number}`,
      cancel_url: 'https://draft-416890.sendpulse.website/',
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Stripe error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
