import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.KV_REST_API_URL || process.env.STORAGE_URL || '',
  token: process.env.KV_REST_API_TOKEN || process.env.STORAGE_REST_API_TOKEN || '',
});

const CATEGORIES = ['world', 'tech', 'science', 'business', 'sports', 'culture'];
const POLITICS_COUNTRIES = ['us', 'ca', 'uk', 'au'];

function getToday() {
 return new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const today = getToday();
  const results: string[] = [];

  for (const category of CATEGORIES) {
    try {
      // Check for approved version first
      const approved = await redis.get(`approved:${today}:${category}`);
      // Fall back to pending if not reviewed
      const pending = approved || await redis.get(`pending:${today}:${category}`);

      if (pending) {
        // Publish as live quiz
        const now = new Date();
        const midnight = new Date(now);
        midnight.setHours(24, 0, 0, 0);
        const secondsUntilMidnight = Math.floor((midnight.getTime() - now.getTime()) / 1000);

        await redis.set(`quiz:${today}:${category}`, typeof pending === 'string' ? pending : JSON.stringify(pending), { ex: secondsUntilMidnight });
        results.push(`${category}: published ${approved ? '(approved)' : '(auto-published)'}`);
      } else {
        results.push(`${category}: no pending questions found`);
      }
    } catch (e: any) {
      results.push(`${category}: failed - ${e.message}`);
    }
  }
  // Publish politics countries
  for (const code of POLITICS_COUNTRIES) {
    try {
      const approved = await redis.get(`approved:${today}:politics-${code}`);
      const pending = approved || await redis.get(`pending:${today}:politics-${code}`);
      if (pending) {
        await redis.set(`quiz:${today}:politics-${code}`, typeof pending === 'string' ? pending : JSON.stringify(pending), { ex: 86400 });
        results.push(`politics-${code}: published ${approved ? '(approved)' : '(auto-published)'}`);
      } else {
        results.push(`politics-${code}: no pending questions found`);
      }
    } catch (e: any) {
      results.push(`politics-${code}: failed - ${e.message}`);
    }
  }

  // Update review status
  await redis.set(`review:${today}`, JSON.stringify({ status: 'published', publishedAt: new Date().toISOString() }), { ex: 86400 });

  return NextResponse.json({ success: true, date: today, results });
}