const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'https://prop-iq.com.au';

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Vary', 'Origin');
  res.status(200).json({ key: process.env.GOOGLE_MAPS_KEY });
}
