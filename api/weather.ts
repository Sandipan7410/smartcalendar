// Vercel serverless function: GET /api/weather (Open-Meteo needs no key, so no sign-in check)
import { runWeather } from './_lib/core.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const result = await runWeather(req.query);
  res.status(result.status).json(result.body);
}
