export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).json({ key: process.env.GOOGLE_MAPS_KEY });
}
