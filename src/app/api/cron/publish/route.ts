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
  if (authHeader !== 'Bearer ' + process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const today = getToday();
  const results: string[] = [];

  for (const category of CATEGORIES) {
    try {
      const approved = await redis.get('approved:' + today + ':' + category);
      const pending = approved || await redis.get('pending:' + today + ':' + category);

      if (pending) {
        const data = typeof pending === 'string' ? pending : JSON.stringify(pending);
        await redis.set('quiz:' + today + ':' + category, data, { ex: 86400 });
        await redis.set('quiz:latest:' + category, data);
        results.push(category + ': published ' + (approved ? '(approved)' : '(auto-published)'));
      } else {
        results.push(category + ': no pending questions found');
      }
    } catch (e: any) {
      results.push(category + ': failed - ' + e.message);
    }
  }

  for (const country of POLITICS_COUNTRIES) {
    const key = 'politics:' + country;
    try {
      const approved = await redis.get('approved:' + today + ':' + key);
      const pending = approved || await redis.get('pending:' + today + ':' + key);

      if (pending) {
        const data = typeof pending === 'string' ? pending : JSON.stringify(pending);
        await redis.set('quiz:' + today + ':' + key, data, { ex: 86400 });
        await redis.set('quiz:latest:' + key, data);
        results.push(key + ': published ' + (approved ? '(approved)' : '(auto-published)'));
      } else {
        results.push(key + ': no pending questions found');
      }
    } catch (e: any) {
      results.push(key + ': failed - ' + e.message);
    }
  }

  await redis.set('review:' + today, JSON.stringify({ status: 'published', publishedAt: new Date().toISOString() }), { ex: 86400 });

  return NextResponse.json({ success: true, date: today, results });
}
