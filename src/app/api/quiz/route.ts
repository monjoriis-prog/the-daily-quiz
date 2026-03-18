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

function addCorsHeaders(response: NextResponse) {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  return response;
}

export async function OPTIONS() {
  return addCorsHeaders(new NextResponse(null, { status: 204 }));
}

export async function GET(request: NextRequest) {
  const category = request.nextUrl.searchParams.get('category');
  const country = request.nextUrl.searchParams.get('country');

  if (!category) {
    return addCorsHeaders(NextResponse.json({ error: 'Category required' }, { status: 400 }));
  }

  const today = getToday();

  let keySuffix: string;
  if (category.toLowerCase() === 'politics' && country && VALID_COUNTRIES.includes(country)) {
    keySuffix = 'politics:' + country;
  } else if (category.toLowerCase() === 'politics') {
    keySuffix = 'politics:us';
  } else {
    keySuffix = category.toLowerCase();
  }

  try {
    const todayData = await redis.get('quiz:' + today + ':' + keySuffix);
    if (todayData) {
      return addCorsHeaders(NextResponse.json({
        questions: todayData,
        generatedAt: today,
        cached: true,
      }));
    }

    const latestData = await redis.get('quiz:latest:' + keySuffix);
    if (latestData) {
      return addCorsHeaders(NextResponse.json({
        questions: latestData,
        generatedAt: 'latest',
        cached: true,
      }));
    }
  } catch (e) {
    console.error('Cache read failed:', e);
  }

  return addCorsHeaders(NextResponse.json({
    error: "Today's quiz isn't ready yet. Check back soon!",
  }, { status: 404 }));
}
