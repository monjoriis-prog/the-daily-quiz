import { NextRequest, NextResponse } from 'next/server';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

export async function GET(request: NextRequest) {
  const category = request.nextUrl.searchParams.get('category');

  if (!category) {
    return NextResponse.json({ error: 'Category required' }, { status: 400 });
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

Create exactly 4 quiz questions based on REAL current news stories.

RULES:
- Questions about verifiable public facts, NOT opinions
- Write everything in YOUR OWN words
- Do NOT name any news outlet
- Keep explanations to 1 sentence
- Mix stories from different world regions
- Add a "perspective" field: one sentence on how coverage or prominence differs across world regions

Return ONLY a JSON array. Each item:
{"question":"...","options":["A","B","C","D"],"correct":0,"explanation":"1 sentence","headline":"Short headline","perspective":"1 sentence on regional coverage differences"}

Keep the ENTIRE response concise. No markdown, no backticks.`,
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

    let parsed = JSON.parse(jsonMatch[0]);
    const valid = parsed.filter(
      (q: any) => q.question && Array.isArray(q.options) && q.options.length === 4 && typeof q.correct === 'number'
    );

    return NextResponse.json({
      questions: valid,
      generatedAt: new Date().toISOString(),
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to generate quiz' },
      { status: 500 }
    );
  }
}