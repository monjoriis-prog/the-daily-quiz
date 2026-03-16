import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

const redis = new Redis({
  url: process.env.KV_REST_API_URL || process.env.STORAGE_URL || '',
  token: process.env.KV_REST_API_TOKEN || process.env.STORAGE_REST_API_TOKEN || '',
});

function getToday() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });

function stripCitations(text: string): string {
  return text.replace(/<\/?cite[^>]*>/g, '').replace(/<\/?antml:cite[^>]*>/g, '');
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

  if (!ANTHROPIC_API_KEY || ANTHROPIC_API_KEY === 'your-key-here') {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{
          role: 'user',
          content: `Search for the latest ${category} news from today or this week using DIVERSE international sources: CNN, BBC, Al Jazeera, Reuters, AP, France 24, Deutsche Welle, NHK, The Guardian, and others.

 based on REAL current news stories. Create exactly 6 quiz questions. Focus on MAJOR stories that most people would have heard about — avoid obscure or overly technical details. Questions should test general awareness, not insider knowledge.

RULES:
- Questions about verifiable public facts, NOT opinions
- Write everything in YOUR OWN words
- Do NOT name any news outlet
- Keep explanations to 1 sentence
- Mix stories from different world regions
- Add a "perspective" field: one sentence on how coverage or prominence differs across world regions
- Add a "context" field: 2-3 sentences of background that helps someone understand WHY this story matters — the history, stakes, or implications. Written for someone who has never heard of this topic before.
- The "headline" must NEVER reveal or hint at the correct answer — keep it vague, like a topic label
- Do NOT include any HTML tags, citation tags, or markup in your response

Return ONLY a JSON array. Each item:
{"question":"...","options":["A","B","C","D"],"correct":0,"explanation":"1 sentence","headline":"Short topic label that does NOT spoil the answer","perspective":"1 sentence on regional coverage differences","context":"2-3 sentences of background context"}

Keep the ENTIRE response concise. No markdown, no backticks, no HTML tags.`,
        }],
      }),
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message);
    }

    const text = data.content
      .filter((b: any) => b.type === 'text')
      .map((b: any) => b.text)
      .join('');

    const cleaned = text.replace(/```json|```/g, '').trim();
    const jsonMatch = cleaned.match(/\[[\s\S]*\]/);

    if (!jsonMatch) {
      throw new Error('No quiz data found');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const valid = parsed
      .filter(
        (q: any) => q.question && Array.isArray(q.options) && q.options.length === 4 && typeof q.correct === 'number'
      )
      .map((q: any) => ({
        ...q,
        question: stripCitations(q.question),
        explanation: stripCitations(q.explanation),
        headline: stripCitations(q.headline),
        perspective: stripCitations(q.perspective || ''),
        context: stripCitations(q.context || ''),
        options: q.options.map((o: string) => stripCitations(o)),
      }));

    try {
      await redis.set(cacheKey, JSON.stringify(valid), { ex: 86400 });
    } catch (e) {
      console.error('Cache write failed:', e);
    }

    return NextResponse.json({
      questions: valid,
      generatedAt: new Date().toISOString(),
      cached: false,
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to generate quiz' },
      { status: 500 }
    );
  }
}