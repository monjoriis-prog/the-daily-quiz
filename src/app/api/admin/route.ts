import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.KV_REST_API_URL || process.env.STORAGE_URL || '',
  token: process.env.KV_REST_API_TOKEN || process.env.STORAGE_REST_API_TOKEN || '',
});

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'dailyquiz2026';
const CATEGORIES = ['world', 'tech', 'science', 'business', 'sports', 'culture'];
const POLITICS_COUNTRIES = ['us', 'ca', 'uk', 'au'];
const ALL_KEYS = [...CATEGORIES, ...POLITICS_COUNTRIES.map(c => 'politics:' + c)];

function getToday() {
return new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
}

export async function GET(request: NextRequest) {
  const pw = request.nextUrl.searchParams.get('pw');
  if (pw !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const today = getToday();
  const data: any = {};

  for (const key of ALL_KEYS) {
    const pending = await redis.get('pending:' + today + ':' + key);
    const approved = await redis.get('approved:' + today + ':' + key);
    const live = await redis.get('quiz:' + today + ':' + key);
    const genStatus = await redis.get('gen-status:' + today + ':' + key);
    data[key] = {
      pending: pending || null,
      approved: !!approved,
      live: !!live,
      genStatus: genStatus || null,
    };
  }

  const review = await redis.get('review:' + today);

  return NextResponse.json({ date: today, categories: data, review });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { pw, category, action, questions } = body;

  if (pw !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const today = getToday();

  if (action === 'approve') {
    const pending = await redis.get('pending:' + today + ':' + category);
    if (pending) {
      await redis.set('approved:' + today + ':' + category, typeof pending === 'string' ? pending : JSON.stringify(pending), { ex: 86400 });
      return NextResponse.json({ success: true, message: category + ' approved' });
    }
    return NextResponse.json({ error: 'No pending questions found' }, { status: 404 });
  }

  if (action === 'approve-edited') {
    await redis.set('approved:' + today + ':' + category, JSON.stringify(questions), { ex: 86400 });
    return NextResponse.json({ success: true, message: category + ' approved with edits' });
  }

  if (action === 'approve-all') {
    for (const key of ALL_KEYS) {
      const pending = await redis.get('pending:' + today + ':' + key);
      if (pending) {
        await redis.set('approved:' + today + ':' + key, typeof pending === 'string' ? pending : JSON.stringify(pending), { ex: 86400 });
      }
    }
    return NextResponse.json({ success: true, message: 'All categories approved' });
  }

  if (action === 'manual-add') {
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json({ error: 'No questions provided' }, { status: 400 });
    }
    await redis.set('pending:' + today + ':' + category, JSON.stringify(questions), { ex: 86400 });
    await redis.set('approved:' + today + ':' + category, JSON.stringify(questions), { ex: 86400 });
    return NextResponse.json({ success: true, message: category + ' manually added and approved (' + questions.length + ' questions)' });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
