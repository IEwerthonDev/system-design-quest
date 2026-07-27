import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleJudgeRequest } from '../judge/handle-judge-request';

export const config = {
  maxDuration: 60,
};

function clientIp(req: VercelRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0]!.trim();
  }
  if (Array.isArray(forwarded) && forwarded[0]) {
    return forwarded[0].split(',')[0]!.trim();
  }
  return req.socket?.remoteAddress ?? '0.0.0.0';
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({
      error: 'Method not allowed',
      message: 'Use POST /api/judge',
    });
    return;
  }

  const result = await handleJudgeRequest({
    body: req.body,
    ip: clientIp(req),
    env: process.env,
  });

  if (result.headers) {
    for (const [key, value] of Object.entries(result.headers)) {
      res.setHeader(key, value);
    }
  }

  res.status(result.status).json(result.body);
}
