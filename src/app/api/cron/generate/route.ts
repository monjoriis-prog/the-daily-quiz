import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.KV_REST_API_URL || process.env.STORAGE_URL || '',
  token: process.env.KV_REST_API_TOKEN || process.env.STORAGE_REST_API_TOKEN || '',
});

const CATEGORIES = ['World', 'Tech', 'Science', 'Business', 'Sports', 'Culture'];
const POLITICS_COUNTRIES = [
  { code: 'us', label: 'US', prompt: 'United States political news' },
  { code: 'ca', label: 'Canada', prompt: 'Canadian political news' },
  { code: 'uk', label: 'UK', prompt: 'United Kingdom political news' },
  { code: 'au', label: 'Australia', prompt: 'Australian political news' },
];
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

function getToday() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
}

function stripCitations(text: string): string {
  return text.replace(/<\/?cite[^>]*>/g, '').replace(/<\/?antml:cite[^>]*>/g, '');
}

async function generateQuiz(category: string) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      messages: [{
        role: 'user',
        content: `Search for the latest ${category} news from today or in the last 24 hours. Stories MUST reflect the most current status. Use DIVERSE international sources: CNN, BBC, Al Jazeera, Reuters, AP, France 24, Deutsche Welle, NHK, The Guardian, and others.

Create exactly 6 quiz questions based on REAL current news stories. Focus on MAJOR stories that most people would have heard about — avoid obscure or overly technical details. Questions should test general awareness, not insider knowledge.

RULES:
- Questions about verifiable public facts, NOT opinions
- Write everything in YOUR OWN words
- Do NOT name any news outlet
- Keep explanations to 1 sentence
- Mix stories from different world regions
- Add a "perspective" field: one sentence on how coverage differs across regions
- Add a "context" field: 2-3 sentences of background
- The "headline" must NEVER reveal the correct answer
- Do NOT include any HTML tags, citation tags, or markup

Return ONLY a JSON array. Each item:
{"question":"...","options":["A","B","C","D"],"correct":0,"explanation":"1 sentence","headline":"Short topic label","perspective":"1 sentence","context":"2-3 sentences"}

Keep the ENTIRE response concise. No markdown, no backticks, no HTML tags.`,
      }],
    }),
  });

  const data = await response.json();
  if (data.error) throw new Error(data.error.message);

  const text = data.content.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('');
  const cleaned = text.replace(/```json|```/g, '').trim();
  const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error('No quiz data');

  const parsed = JSON.parse(jsonMatch[0]);
  return parsed
    .filter((q: any) => q.question && Array.isArray(q.options) && q.options.length === 4 && typeof q.correct === 'number')
    .map((q: any) => ({
      ...q,
      question: stripCitations(q.question),
      explanation: stripCitations(q.explanation),
      headline: stripCitations(q.headline),
      perspective: stripCitations(q.perspective || ''),
      context: stripCitations(q.context || ''),
      options: q.options.map((o: string) => stripCitations(o)),
    }));
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const url = new URL(request.url);
  const step = parseInt(url.searchParams.get('step') || '0');

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const today = getToday();

  const totalSteps = CATEGORIES.length + POLITICS_COUNTRIES.length;

  if (step >= totalSteps) {
    await redis.set(`review:${today}`, JSON.stringify({ status: 'pending', generatedAt: new Date().toISOString() }), { ex: 86400 });
    return NextResponse.json({ success: true, message: 'All categories generated', date: today });
  

  // Regular categories (steps 0-5)
  if (step < CATEGORIES.length) {
    const category = CATEGORIES[step];
    try {
      const questions = await generateQuiz(category);
      await redis.set(`pending:${today}:${category.toLowerCase()}`, JSON.stringify(questions), { ex: 86400 });

      const baseUrl = `https://${process.env.VERCEL_URL || 'the-daily-quiz.vercel.app'}`;
      fetch(`${baseUrl}/api/cron/generate?step=${step + 1}`, {
        headers: { 'authorization': `Bearer ${process.env.CRON_SECRET}` },
      }).catch(() => {});

      return NextResponse.json({ success: true, category, step, questionsGenerated: questions.length });
    } catch (e: any) {
      const baseUrl = `https://${process.env.VERCEL_URL || 'the-daily-quiz.vercel.app'}`;
      fetch(`${baseUrl}/api/cron/generate?step=${step + 1}`, {
        headers: { 'authorization': `Bearer ${process.env.CRON_SECRET}` },
      }).catch(() => {});
      return NextResponse.json({ success: false, category, step, error: e.message });
    }
  }

  // Politics countries (steps 6-9)
  const countryIndex = step - CATEGORIES.length;
  const country = POLITICS_COUNTRIES[countryIndex];
  try {
    const questions = await generateQuiz(`${country.prompt} — focus on ${country.label} domestic politics, elections, legislation, and government`);
    await redis.set(`pending:${today}:politics-${country.code}`, JSON.stringify(questions), { ex: 86400 });

    const baseUrl = `https://${process.env.VERCEL_URL || 'the-daily-quiz.vercel.app'}`;
    fetch(`${baseUrl}/api/cron/generate?step=${step + 1}`, {
      headers: { 'authorization': `Bearer ${process.env.CRON_SECRET}` },
    }).catch(() => {});

    return NextResponse.json({ success: true, category: `politics-${country.code}`, step, questionsGenerated: questions.length });
  } catch (e: any) {
    const baseUrl = `https://${process.env.VERCEL_URL || 'the-daily-quiz.vercel.app'}`;
    fetch(`${baseUrl}/api/cron/generate?step=${step + 1}`, {
      headers: { 'authorization': `Bearer ${process.env.CRON_SECRET}` },
    }).catch(() => {});
    return NextResponse.json({ success: false, category: `politics-${country.code}`, step, error: e.message });
  }
}}