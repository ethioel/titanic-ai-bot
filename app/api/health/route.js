import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET() {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '3.0.0',
    env: process.env.VERCEL_ENV || 'development',
    features: {
      model_loaded: !!process.env.MODEL_PATH,
      redis: !!process.env.UPSTASH_REDIS_REST_URL,
      analytics: !!process.env.VERCEL_ANALYTICS_ID,
    },
  };
  
  return NextResponse.json(health, {
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}
