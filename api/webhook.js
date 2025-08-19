import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Helper function to get raw body
const getRawBody = (req) => {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      resolve(body);
    });
    req.on('error', reject);
  });
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    const rawBody = await getRawBody(req);
    event = stripe.webhooks.constructEvent(rawBody, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the checkout.session.completed event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    
    // Extract metadata from the session
    const metadata = session.metadata;
    
    // Prepare data for SendPulse
    const sendPulseData = {
      email: metadata.studentEmail,
      phone: metadata.studentPhone,
      product_name: metadata.productName,
      product_id: metadata.productId,
      product_price: metadata.productPrice,
      order_date: metadata.orderDate,
      studant_name: metadata.studentName,
      SPF_number: metadata.spfNumber,
      modalidade: metadata.modalidade // Include course category
    };

    // Send data to SendPulse only after successful payment
    try {
      const response = await fetch('https://events.sendpulse.com/events/id/e43827f8c49e4932f86af5c63cd81aec/9129528', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sendPulseData)
      });

      if (response.ok) {
        console.log('SendPulse data sent successfully');
      } else {
        console.error('SendPulse request failed:', response.status, response.statusText);
      }
    } catch (sendPulseError) {
      console.error('SendPulse error:', sendPulseError);
    }

    // Create user account for Sistema MenteAprendiz courses
    if (metadata.modalidade === 'Sistema MenteAprendiz') {
      try {
        console.log('Creating user account for Sistema MenteAprendiz course...');
        console.log('User data:', {
          name: metadata.studentName,
          email: metadata.studentEmail,
          tier: 'MENSAL',
          status: 'PAGO'
        });
        
        const userResponse = await fetch('https://api.institutomenteaprendiz.com/auth/signUp', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer 32148f57801bef2dd06e998557a11dd50e11d9fea10483a082c991cfa011e9a2a84b3a02cbf7a24267d677a25390d087584419ddd8fecdbc4a5838afa2f3d12a'
          },
          body: JSON.stringify({
            name: metadata.studentName,
            email: metadata.studentEmail,
            tier: 'MENSAL',
            status: 'PAGO'
          })
        });

        if (userResponse.ok) {
          const responseData = await userResponse.json();
          console.log('User account API request sent successfully');
          console.log('Response status:', userResponse.status);
          console.log('Response data:', responseData);
        } else {
          const errorData = await userResponse.json();
          console.error('User account API request failed:', userResponse.status, userResponse.statusText);
          console.error('Error response:', errorData);
        }
      } catch (userError) {
        console.error('User account creation error:', userError);
      }
    } else {
      console.log('Course modalidade is not Sistema MenteAprendiz, skipping user account creation');
    }
  }

  res.json({ received: true });
}

// Disable body parsing for webhooks
export const config = {
  api: {
    bodyParser: false,
  },
}
