// Espone solo il CLIENT_ID (pubblico) e il REDIRECT_URI al frontend.
// Il CLIENT_SECRET resta server-side.
export default function handler(req, res) {
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.status(200).json({
    client_id:    process.env.GARMIN_CLIENT_ID || '',
    redirect_uri: process.env.GARMIN_REDIRECT_URI || '',
  });
}
