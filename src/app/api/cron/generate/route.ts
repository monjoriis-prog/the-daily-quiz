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

// ─── Repeat prevention: load recent headlines ───
async function getRecentHeadlines(category: string): Promise<string[]> {
  try {
    const raw = await redis.get('recent-headlines:' + category);
    if (!raw) return [];
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (Array.isArray(parsed)) return parsed;
    return [];
  } catch {
    return [];
  }
}

async function saveHeadlines(category: string, newHeadlines: string[]) {
  try {
    const existing = await getRecentHeadlines(category);
    const combined = [...newHeadlines, ...existing].slice(0, 42);
    await redis.set('recent-headlines:' + category, JSON.stringify(combined), { ex: 604800 });
  } catch {}
}

// ─── Robust JSON parser: tries multiple strategies ───
function extractQuizJSON(rawText: string): any[] | null {
  const cleaned = rawText.replace(/```json|```/g, '').trim();

  // Strategy 1: Direct JSON.parse
  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) return parsed;
  } catch {}

  // Strategy 2: Regex extract array
  const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    try {
      return JSON.parse(arrayMatch[0]);
    } catch {}
  }

  // Strategy 3: Bracket matching
  const bracketIdx = cleaned.indexOf('[');
  if (bracketIdx >= 0) {
    let depth = 0;
    for (let i = bracketIdx; i < cleaned.length; i++) {
      if (cleaned[i] === '[') depth++;
      if (cleaned[i] === ']') depth--;
      if (depth === 0) {
        try {
          return JSON.parse(cleaned.substring(bracketIdx, i + 1));
        } catch {}
        break;
      }
    }

    // Strategy 3b: If bracket matching failed, try truncating at the last complete object
    const lastGoodClose = cleaned.lastIndexOf('}');
    if (lastGoodClose > bracketIdx) {
      try {
        return JSON.parse(cleaned.substring(bracketIdx, lastGoodClose + 1) + ']');
      } catch {}
    }
  }

  // Strategy 4: Extract individual objects
  const objectMatches = cleaned.matchAll(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g);
  const objects: any[] = [];
  for (const match of objectMatches) {
    try {
      const obj = JSON.parse(match[0]);
      if (obj.question && obj.options) objects.push(obj);
    } catch {}
  }
  if (objects.length >= 3) return objects;

  return null;
}

// ─── Quality rules added to prompt ───
const QUALITY_RULES = `
QUALITY CHECKS (critical — follow these strictly):
- Every geographic detail in the question MUST match the correct answer. If the answer is Cuba, do NOT say "Middle East" in the question. If the answer is a European country, do NOT say "Asian nation."
- All 4 answer options must be plausible and from the SAME category. If the answer is a country, all options must be countries. If the answer is a person, all options must be people in similar roles.
- The question must have exactly ONE correct answer. Do not write ambiguous questions where multiple options could be correct.
- After writing each question, re-read it and verify: does the question text actually match the correct answer? If not, fix it.
- Do NOT use misleading or trick wording. The quiz should test knowledge, not reading comprehension traps.
- Keep questions accessible — a person who follows the news casually should be able to answer most of them.`;

async function generateQuiz(category: string) {
  const isPolitics = category.startsWith('politics:');
  const countryName = isPolitics ? POLITICS_LABELS[category] : null;

  // Get recent headlines to avoid repeats
  const recentHeadlines = await getRecentHeadlines(category);
  const avoidSection = recentHeadlines.length > 0
    ? '\n\nDo NOT repeat these recent topics — find DIFFERENT stories or ask about a DIFFERENT angle if the same story is still ongoing:\n' + recentHeadlines.map(h => '- ' + h).join('\n')
    : '';

  const prompt = isPolitics
    ? 'Search for the latest ' + countryName + ' politics news from today or in the last 24 hours. Focus specifically on ' + countryName + ' domestic politics, government, elections, legislation, and political figures.\n\nCreate exactly 6 quiz questions based on REAL current ' + countryName + ' political news stories. Focus on MAJOR stories that most people following ' + countryName + ' politics would have heard about.\n\nRULES:\n- Questions about verifiable public facts, NOT opinions\n- Write everything in YOUR OWN words\n- Do NOT name any news outlet\n- Keep explanations to 1 sentence\n- Add a "perspective" field: one sentence on how this story is viewed differently by different political sides or internationally\n- Add a "context" field: 2-3 sentences of background\n- Add a "funFact" field: one surprising or little-known fact related to the topic that most people would not know\n- The "headline" must NEVER reveal the correct answer\n- Do NOT include any HTML tags, citation tags, or markup\n' + QUALITY_RULES + avoidSection + '\n\nReturn ONLY a JSON array. Each item:\n{"question":"...","options":["A","B","C","D"],"correct":0,"explanation":"1 sentence","headline":"Short topic label","perspective":"1 sentence","context":"2-3 sentences","funFact":"1 surprising fact"}\n\nIMPORTANT: Return ONLY the JSON array. No markdown, no backticks, no HTML tags, no text before or after the array.'
    : 'Search for the latest ' + category + ' news from today or in the last 24 hours. Stories MUST reflect the most current status. Use DIVERSE international sources: CNN, BBC, Al Jazeera, Reuters, AP, France 24, Deutsche Welle, NHK, The Guardian, and others.\n\nCreate exactly 6 quiz questions based on REAL current news stories. Focus on MAJOR stories that most people would have heard about — avoid obscure or overly technical details. Questions should test general awareness, not insider knowledge.\n\nRULES:\n- Questions about verifiable public facts, NOT opinions\n- Write everything in YOUR OWN words\n- Do NOT name any news outlet\n- Keep explanations to 1 sentence\n- Mix stories from different world regions\n- Add a "perspective" field: one sentence on how coverage differs across regions\n- Add a "context" field: 2-3 sentences of background\n- Add a "funFact" field: one surprising or little-known fact related to the topic that most people would not know\n- The "headline" must NEVER reveal the correct answer\n- Do NOT include any HTML tags, citation tags, or markup\n' + QUALITY_RULES + avoidSection + '\n\nReturn ONLY a JSON array. Each item:\n{"question":"...","options":["A","B","C","D"],"correct":0,"explanation":"1 sentence","headline":"Short topic label","perspective":"1 sentence","context":"2-3 sentences","funFact":"1 surprising fact"}\n\nIMPORTANT: Return ONLY the JSON array. No markdown, no backticks, no HTML tags, no text before or after the array.';

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  const data = await response.json();
  if (data.error) throw new Error('[API Error] ' + data.error.message);

  const textBlocks = data.content?.filter((b: any) => b.type === 'text') || [];
  const text = textBlocks.map((b: any) => b.text).join('');

  if (!text || text.trim().length === 0) {
    throw new Error('[Empty Response] No text content returned from API');
  }

  // Use robust parser instead of single regex
  const parsed = extractQuizJSON(text);
  if (!parsed) {
    console.error('[generate] Failed to parse JSON for ' + category + '. Raw (first 500): ' + text.substring(0, 500));
    throw new Error('[Parse Error] Could not extract quiz JSON from response');
  }

  const validated = parsed
    .filter((q: any) =>
      q.question &&
      Array.isArray(q.options) &&
      q.options.length === 4 &&
      typeof q.correct === 'number' &&
      q.correct >= 0 &&
      q.correct <= 3
    )
    .map((q: any) => ({
      ...q,
      question: stripCitations(q.question),
      explanation: stripCitations(q.explanation || ''),
      headline: stripCitations(q.headline || 'News Quiz'),
      perspective: stripCitations(q.perspective || ''),
      context: stripCitations(q.context || ''),
      funFact: stripCitations(q.funFact || ''),
      options: q.options.map((o: string) => stripCitations(o)),
    }));

  if (validated.length < 3) {
    throw new Error('[Validation Error] Only ' + validated.length + ' valid questions (need at least 3)');
  }

  return validated;
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
  const statusKey = 'gen-status:' + today + ':' + cat.toLowerCase();

  try {
    await redis.set(statusKey, JSON.stringify({ status: 'generating', startedAt: new Date().toISOString() }), { ex: 604800 });
    const questions = await generateQuiz(cat);
    await redis.set('pending:' + today + ':' + cat.toLowerCase(), JSON.stringify(questions), { ex: 604800 });
    await redis.set(statusKey, JSON.stringify({ status: 'success', questionCount: questions.length, generatedAt: new Date().toISOString() }), { ex: 604800 });

    // Save headlines for repeat prevention
    const headlines = questions.map((q: any) => q.headline).filter((h: string) => h);
    await saveHeadlines(cat.toLowerCase(), headlines);

    return NextResponse.json({ success: true, category: cat, questionsGenerated: questions.length });
  } catch (e: any) {
    await redis.set(statusKey, JSON.stringify({ status: 'failed', error: e.message, failedAt: new Date().toISOString() }), { ex: 604800 }).catch(() => {});
    return NextResponse.json({ success: false, category: cat, error: e.message });
  }
}
