import { NextResponse } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '1 m'),
  analytics: true,
});

export const config = {
  matcher: ['/api/bot/:path*', '/api/share'],
};

export async function middleware(request) {
  const ip = request.ip ?? '127.0.0.1';
  const { success, limit, remaining, reset } = await ratelimit.limit(ip);

  const response = success 
    ? NextResponse.next()
    : NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  response.headers.set('X-RateLimit-Limit', limit.toString());
  response.headers.set('X-RateLimit-Remaining', remaining.toString());
  response.headers.set('X-RateLimit-Reset', reset.toString());

  return response;
}
