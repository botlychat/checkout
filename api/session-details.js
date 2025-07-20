import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { session_id } = req.query;

  if (!session_id) {
    return res.status(400).json({ error: 'Missing session_id parameter' });
  }

  try {
    // Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(session_id);
    
    // Return the session data (metadata contains our custom data)
    return res.status(200).json({
      id: session.id,
      payment_status: session.payment_status,
      metadata: session.metadata,
      customer_details: session.customer_details
    });
  } catch (err) {
    console.error('Error retrieving session:', err);
    return res.status(500).json({ error: 'Unable to retrieve session details' });
  }
}
