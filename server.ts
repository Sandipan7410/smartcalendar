import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { runAssistant, runAnalyzeSchedule, runWeather } from './api/_lib/core.js';
import { verifyFirebaseRequest } from './api/_lib/auth.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

app.use(express.json({ limit: '1mb' }));

// Same routes as the Vercel functions in /api, backed by the same shared code.
// The Gemini key is only read on the server (api/_lib/core.ts).
async function requireFirebaseUser(req: Request, res: Response): Promise<boolean> {
  const auth = await verifyFirebaseRequest(req.headers.authorization);
  if (!auth.ok) {
    res.status(401).json({ error: auth.error });
    return false;
  }
  return true;
}

app.post('/api/gemini/assistant', async (req: Request, res: Response) => {
  if (!(await requireFirebaseUser(req, res))) return;
  const result = await runAssistant(req.body);
  res.status(result.status).json(result.body);
});

app.post('/api/gemini/analyze-schedule', async (req: Request, res: Response) => {
  if (!(await requireFirebaseUser(req, res))) return;
  const result = await runAnalyzeSchedule(req.body);
  res.status(result.status).json(result.body);
});

app.get('/api/weather', async (req: Request, res: Response) => {
  const result = await runWeather(req.query as Record<string, any>);
  res.status(result.status).json(result.body);
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: '0.0.0.0',
        port: 3000,
        hmr: process.env.DISABLE_HMR !== 'true',
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Server startup failed:', err);
  process.exit(1);
});
