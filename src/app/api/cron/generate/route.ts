import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.KV_REST_API_URL || process.env.STORAGE_URL || '',
  token: process.env.KV_REST_API_TOKEN || process.env.STORAGE_REST_API_TOKEN || '',
});

const CATEGORIES = ['World', 'Tech', 'Science', 'Business', 'Sports', 'Culture'];
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

function getToday() {
  return new Date().toISOString().split('T')[0];
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
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      messages: [{
        role: 'user',
        content: `Search for the latest ${category} news from today or in the last 24 hours. Stories MUST reflect the most current status — if a deal fell through, a policy was reversed, or a situation changed, use the LATEST update, not the original story. Use DIVERSE international sources: CNN, BBC, Al Jazeera, Reuters, AP, France 24, Deutsche Welle, NHK, The Guardian, and others.

Create exactly 6 quiz questions based on REAL current news stories.

RULES:
- Questions about verifiable public facts, NOT opinions
- Write everything in YOUR OWN words
- Do NOT name any news outlet
- Keep explanations to 1 sentence
- Mix stories from different world regions
- Add a "perspective" field: one sentence on how coverage or prominence differs across world regions
- Add a "context" field: 2-3 sentences of background for someone unfamiliar with the topic
- The "headline" must NEVER reveal or hint at the correct answer
- Do NOT include any HTML tags, citation tags, or markup

Return ONLY a JSON array. Each item:
{"question":"...","options":["A","B","C","D"],"correct":0,"explanation":"1 sentence","headline":"Short topic label","perspective":"1 sentence on regional coverage","context":"2-3 sentences of background"}

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
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const today = getToday();
  const results: string[] = [];

  for (const category of CATEGORIES) {
    try {
      const questions = await generateQuiz(category);
      // Save as pending — not live yet
      await redis.set(`pending:${today}:${category.toLowerCase()}`, JSON.stringify(questions), { ex: 86400 });
      results.push(`${category}: ${questions.length} questions generated (pending)`);
    } catch (e: any) {
      results.push(`${category}: failed - ${e.message}`);
    }
  }

  // Save review status
  await redis.set(`review:${today}`, JSON.stringify({ status: 'pending', generatedAt: new Date().toISOString(), categories: CATEGORIES }), { ex: 86400 });

  // TODO: Send email notification here

  return NextResponse.json({ success: true, date: today, results });
}