const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'https://prop-iq.com.au';

export default async function handler(req, res) {
  const origin = req.headers.origin || '';
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Payment-Token');
  res.setHeader('Vary', 'Origin');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  /* ── Payment verification ── */
  const paymentToken = req.headers['x-payment-token'];
  if (!paymentToken) return res.status(401).json({ error: 'Payment required.' });

  try {
    const stripe = (await import('stripe')).default;
    const stripeClient = new stripe(process.env.STRIPE_SECRET_KEY);
    const paymentIntent = await stripeClient.paymentIntents.retrieve(paymentToken);
    if (paymentIntent.status !== 'succeeded' || paymentIntent.amount < 1900 || paymentIntent.currency !== 'aud') {
      return res.status(403).json({ error: 'Valid payment required.' });
    }
  } catch (err) {
    return res.status(403).json({ error: 'Payment verification failed.' });
  }

  /* ── Validate and sanitise request body ── */
  const { messages, system } = req.body || {};
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Invalid request.' });
  }

  /* ── Build safe payload — never trust client max_tokens or model ── */
  const safePayload = {
    model: 'claude-sonnet-4-20250514',
    max_tokens: 8000,
    tools: [{ type: 'web_search_20250305', name: 'web_search' }],
    system: system || '',
    messages: messages.slice(0, 1).map(m => ({
      role: 'user',
      content: typeof m.content === 'string' ? m.content.slice(0, 5000) : ''
    }))
  };

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'web-search-2025-03-05'
      },
      body: JSON.stringify(safePayload)
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ error: 'Analysis failed. Please try again.' });
  }
}
