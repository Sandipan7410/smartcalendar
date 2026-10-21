// Vercel serverless function: POST /api/gemini/analyze-schedule
import { runAnalyzeSchedule } from '../_lib/core.js';
import { verifyFirebaseRequest } from '../_lib/auth.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const auth = await verifyFirebaseRequest(req.headers.authorization);
  if (!auth.ok) {
    res.status(401).json({ error: auth.error });
    return;
  }
  const result = await runAnalyzeSchedule(req.body);
  res.status(result.status).json(result.body);
}
