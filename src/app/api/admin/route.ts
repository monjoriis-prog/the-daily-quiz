import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.KV_REST_API_URL || process.env.STORAGE_URL || '',
  token: process.env.KV_REST_API_TOKEN || process.env.STORAGE_REST_API_TOKEN || '',
});

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'dailyquiz2026';
const CATS = ['world', 'tech', 'science', 'business', 'sports', 'culture', 'politics'];

function getToday() {
return new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
}

// GET: Fetch all pending questions for review
export async function GET(request: NextRequest) {
  const pw = request.nextUrl.searchParams.get('pw');
  if (pw !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const today = getToday();
  const data: any = {};

  for (const cat of CATEGORIES) {
    const pending = await redis.get(`pending:${today}:${cat}`);
    const approved = await redis.get(`approved:${today}:${cat}`);
    const live = await redis.get(`quiz:${today}:${cat}`);
    data[cat] = {
      pending: pending || null,
      approved: !!approved,
      live: !!live,
    };
  }

  const review = await redis.get(`review:${today}`);

  return NextResponse.json({ date: today, categories: data, review });
}

// POST: Approve or edit questions
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { pw, category, action, questions } = body;

  if (pw !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const today = getToday();

  if (action === 'approve') {
    // Approve pending questions as-is
    const pending = await redis.get(`pending:${today}:${category}`);
    if (pending) {
      await redis.set(`approved:${today}:${category}`, typeof pending === 'string' ? pending : JSON.stringify(pending), { ex: 86400 });
      return NextResponse.json({ success: true, message: `${category} approved` });
    }
    return NextResponse.json({ error: 'No pending questions found' }, { status: 404 });
  }

  if (action === 'approve-edited') {
    // Save edited questions
    await redis.set(`approved:${today}:${category}`, JSON.stringify(questions), { ex: 86400 });
    return NextResponse.json({ success: true, message: `${category} approved with edits` });
  }

  if (action === 'approve-all') {
    // Approve all pending categories
    for (const cat of CATEGORIES) {
      const pending = await redis.get(`pending:${today}:${cat}`);
      if (pending) {
        await redis.set(`approved:${today}:${cat}`, typeof pending === 'string' ? pending : JSON.stringify(pending), { ex: 86400 });
      }
    }
    return NextResponse.json({ success: true, message: 'All categories approved' });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}