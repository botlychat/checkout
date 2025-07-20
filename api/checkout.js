import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY); // live key

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { name, description, amount, studentData } = req.body;

  if (!name || !description || !amount || !studentData) {
    return res.status(400).json({ error: 'Missing parameters' });
  }

  try {
    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      currency: 'brl',
      line_items: [
        {
          price_data: {
            currency: 'brl',
            product_data: {
              name,
              description,
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      success_url: `https://yourdomain.com/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: 'https://yourdomain.com/cancel',
      metadata: {
        studentEmail: studentData.email,
        studentPhone: studentData.phone,
        productName: studentData.product_name,
        productId: studentData.product_id,
        productPrice: studentData.product_price,
        orderDate: studentData.order_date,
        studentName: studentData.studant_name,
        spfNumber: studentData.SPF_number
      }
    });

    // Send data to SendPulse after creating session
    try {
      await fetch('https://events.sendpulse.com/events/id/e43827f8c49e4932f86af5c63cd81aec/9129528', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(studentData)
      });
    } catch (sendPulseError) {
      console.error('SendPulse error:', sendPulseError);
      // Continue with checkout even if SendPulse fails
    }

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Stripe error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
