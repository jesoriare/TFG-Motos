export default async function handler(req: any, res: any) {
  const key = process.env.ORS_API_KEY;
  if (!key) { res.status(500).json({ error: 'ORS_API_KEY no configurada' }); return; }

  const r = await fetch('https://api.heigit.org/openrouteservice/v2/directions/cycling-road', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: key },
    body: JSON.stringify({ coordinates: [[-6.05, 37.55], [-5.99, 37.38]] }),
  });
  const bodyText = await r.text();
  res.status(200).json({ orsStatus: r.status, bodyPreview: bodyText.slice(0, 200) });
}
