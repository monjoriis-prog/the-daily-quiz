import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.KV_REST_API_URL || process.env.STORAGE_URL || '',
  token: process.env.KV_REST_API_TOKEN || process.env.STORAGE_REST_API_TOKEN || '',
});

const VALID_COUNTRIES = ['us', 'ca', 'uk', 'au'];

function getToday() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
}

function getYesterday() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
}

export async function GET(request: NextRequest) {
  const category = request.nextUrl.searchParams.get('category');
  const country = request.nextUrl.searchParams.get('country');

  if (!category) {
    return NextResponse.json({ error: 'Category required' }, { status: 400 });
  }

  const today = getToday();
  const yesterday = getYesterday();

  let keySuffix: string;
  if (category.toLowerCase() === 'politics' && country && VALID_COUNTRIES.includes(country)) {
    keySuffix = 'politics:' + country;
  } else if (category.toLowerCase() === 'politics') {
    keySuffix = 'politics:us';
  } else {
    keySuffix = category.toLowerCase();
  }

  try {
    // Try today's quiz first
    const todayData = await redis.get('quiz:' + today + ':' + keySuffix);
    if (todayData) {
      return NextResponse.json({
        questions: todayData,
        generatedAt: today,
        cached: true,
      });
    }

    // If today's quiz isn't published yet, show yesterday's
    const yesterdayData = await redis.get('quiz:' + yesterday + ':' + keySuffix);
    if (yesterdayData) {
      return NextResponse.json({
        questions: yesterdayData,
        generatedAt: yesterday,
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
