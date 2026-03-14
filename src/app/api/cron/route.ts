import { NextResponse } from 'next/server';

const CATEGORIES = ['World', 'Tech', 'Science', 'Business', 'Sports', 'Culture'];
const BASE_URL = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : 'http://localhost:3000';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results: string[] = [];

  for (const category of CATEGORIES) {
    try {
      const res = await fetch(`${BASE_URL}/api/quiz?category=${category}`);
      const data = await res.json();

      if (data.cached) {
        results.push(`${category}: already cached`);
      } else if (data.questions) {
        results.push(`${category}: generated ${data.questions.length} questions`);
      } else {
        results.push(`${category}: failed - ${data.error || 'unknown'}`);
      }
    } catch (e: any) {
      results.push(`${category}: error - ${e.message}`);
    }
  }

  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    results,
  });
}