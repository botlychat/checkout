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
    // Use the same success URL for all courses (updated to use new success page)
    const successUrl = `https://institutomenteaprendiz.com.br/success?session_id={CHECKOUT_SESSION_ID}`;

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
      success_url: successUrl,
      cancel_url: 'https://www.institutomenteaprendiz.com.br/',
      metadata: {
        studentEmail: studentData.email,
        studentPhone: studentData.phone,
        productName: studentData.product_name,
        productId: studentData.product_id,
        productPrice: studentData.product_price,
        orderDate: studentData.order_date,
        studentName: studentData.studant_name,
        spfNumber: studentData.SPF_number,
        modalidade: studentData.modalidade // Add modalidade to metadata
      }
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Stripe error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
