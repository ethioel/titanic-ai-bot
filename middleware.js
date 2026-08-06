import { NextResponse } from 'next/server';

export const config = {
  matcher: '/api/bot/:path*',
};

// Simple in-memory rate limit (resets on cold start)
const requests = new Map();

export function middleware(request) {
  const ip = request.ip ?? '127.0.0.1';
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const max = 20;

  const record = requests.get(ip) || { count: 0, resetTime: now + windowMs };
  
  if (now > record.resetTime) {
    record.count = 0;
    record.resetTime = now + windowMs;
  }

  record.count++;
  requests.set(ip, record);

  if (record.count > max) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  return NextResponse.next();
}
