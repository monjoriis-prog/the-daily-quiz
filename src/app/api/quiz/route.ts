import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.KV_REST_API_URL || process.env.STORAGE_URL || '',
  token: process.env.KV_REST_API_TOKEN || process.env.STORAGE_REST_API_TOKEN || '',
});

function getToday() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
}

export async function GET(request: NextRequest) {
  const category = request.nextUrl.searchParams.get('category');

  if (!category) {
    return NextResponse.json({ error: 'Category required' }, { status: 400 });
  }

  const today = getToday();
  const cacheKey = `quiz:${today}:${category.toLowerCase()}`;

  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      return NextResponse.json({
        questions: cached,
        generatedAt: today,
        cached: true,
      });
    }
  } catch (e) {
    console.error('Cache read failed:', e);
  }

  return NextResponse.json({
    error: "Today's quiz isn't ready yet. Check back soon!",
  }, { status: 404 });
}