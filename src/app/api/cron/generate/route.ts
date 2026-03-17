import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.KV_REST_API_URL || process.env.STORAGE_URL || '',
  token: process.env.KV_REST_API_TOKEN || process.env.STORAGE_REST_API_TOKEN || '',
});

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

const POLITICS_LABELS: Record<string, string> = {
  'politics:us': 'United States',
  'politics:ca': 'Canada',
  'politics:uk': 'United Kingdom',
  'politics:au': 'Australia',
};

function getToday() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
}

function stripCitations(text: string): string {
  return text.replace(/<\/?cite[^>]*>/g, '').replace(/<\/?antml:cite[^>]*>/g, '');
}

async function generateQuiz(category: string) {
  const isPolitics = category.startsWith('politics:');
  const countryName = isPolitics ? POLITICS_LABELS[category] : null;

  const prompt = isPolitics
    ? 'Search for the latest ' + countryName + ' politics news from today or in the last 24 hours. Focus specifically on ' + countryName + ' domestic politics, government, elections, legislation, and political figures.\n\nCreate exactly 6 quiz questions based on REAL current ' + countryName + ' political news stories. Focus on MAJOR stories that most people following ' + countryName + ' politics would have heard about.\n\nRULES:\n- Questions about verifiable public facts, NOT opinions\n- Write everything in YOUR OWN words\n- Do NOT name any news outlet\n- Keep explanations to 1 sentence\n- Add a "perspective" field: one sentence on how this story is viewed differently by different political sides or internationally\n- Add a "context" field: 2-3 sentences of background\n- The "headline" must NEVER reveal the correct answer\n- Do NOT include any HTML tags, citation tags, or markup\n\nReturn ONLY a JSON array. Each item:\n{"question":"...","options":["A","B","C","D"],"correct":0,"explanation":"1 sentence","headline":"Short topic label","perspective":"1 sentence","context":"2-3 sentences"}\n\nKeep the ENTIRE response concise. No markdown, no backticks, no HTML tags.'
    : 'Search for the latest ' + category + ' news from today or in the last 24 hours. Stories MUST reflect the most current status. Use DIVERSE international sources: CNN, BBC, Al Jazeera, Reuters, AP, France 24, Deutsche Welle, NHK, The Guardian, and others.\n\nCreate exactly 6 quiz questions based on REAL current news stories. Focus on MAJOR stories that most people would have heard about — avoid obscure or overly technical details. Questions should test general awareness, not insider knowledge.\n\nRULES:\n- Questions about verifiable public facts, NOT opinions\n- Write everything in YOUR OWN words\n- Do NOT name any news outlet\n- Keep explanations to 1 sentence\n- Mix stories from different world regions\n- Add a "perspective" field: one sentence on how coverage differs across regions\n- Add a "context" field: 2-3 sentences of background\n- The "headline" must NEVER reveal the correct answer\n- Do NOT include any HTML tags, citation tags, or markup\n\nReturn ONLY a JSON array. Each item:\n{"question":"...","options":["A","B","C","D"],"correct":0,"explanation":"1 sentence","headline":"Short topic label","perspective":"1 sentence","context":"2-3 sentences"}\n\nKeep the ENTIRE response concise. No markdown, no backticks, no HTML tags.';

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
      messages: [{ role: 'user', content: prompt }],
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

export const maxDuration = 60;

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== 'Bearer ' + process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const cat = url.searchParams.get('cat');

  if (!cat) {
    return NextResponse.json({ error: 'Category required' }, { status: 400 });
  }

  const today = getToday();

  try {
    const questions = await generateQuiz(cat);
    await redis.set('pending:' + today + ':' + cat.toLowerCase(), JSON.stringify(questions), { ex: 86400 });
    return NextResponse.json({ success: true, category: cat, questionsGenerated: questions.length });
  } catch (e: any) {
    return NextResponse.json({ success: false, category: cat, error: e.message });
  }
}
