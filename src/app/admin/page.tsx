'use client';

import { useState } from 'react';

const CATS = ['world', 'tech', 'science', 'business', 'sports', 'culture', 'politics:us', 'politics:ca', 'politics:uk', 'politics:au'];

const DISPLAY_NAMES: Record<string, string> = {
  'world': 'World',
  'tech': 'Tech',
  'science': 'Science',
  'business': 'Business',
  'sports': 'Sports',
  'culture': 'Culture',
  'politics:us': '🇺🇸 US Politics',
  'politics:ca': '🇨🇦 Canada Politics',
  'politics:uk': '🇬🇧 UK Politics',
  'politics:au': '🇦🇺 Australia Politics',
};

export default function AdminPage() {
  const [pw, setPw] = useState('');
  const [loggedIn, setLoggedIn] = useState(false);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin?pw=' + pw);
      const d = await res.json();
      if (d.error) { setMessage(d.error); return; }
      setData(d);
      setLoggedIn(true);
    } catch { setMessage('Failed to load'); }
    setLoading(false);
  };

  const approve = async (category: string) => {
    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pw, category, action: 'approve' }),
    });
    const d = await res.json();
    setMessage(d.message || d.error);
    fetchData();
  };

  const approveAll = async () => {
    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pw, action: 'approve-all' }),
    });
    const d = await res.json();
    setMessage(d.message || d.error);
    fetchData();
  };

  if (!loggedIn) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-5">
        <div className="max-w-sm w-full">
          <h1 className="text-2xl font-bold mb-6 text-center" style={{ fontFamily: "'Georgia', serif" }}>Admin Review</h1>
          <input
            type="password"
            placeholder="Enter password"
            value={pw}
            onChange={e => setPw(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && fetchData()}
            className="w-full p-3 border border-gray-200 rounded-lg mb-3 font-sans text-sm"
          />
          <button onClick={fetchData} disabled={loading} className="w-full py-3 bg-gray-900 text-white rounded-lg font-sans font-semibold text-sm">
            {loading ? 'Loading…' : 'Login'}
          </button>
          {message && <p className="text-red-500 text-sm font-sans mt-3 text-center">{message}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-5">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6 pb-4 border-b-2 border-gray-900">
          <div>
            <h1 className="text-2xl font-bold" style={{ fontFamily: "'Georgia', serif" }}>Quiz Review</h1>
            <p className="text-sm text-gray-400 font-sans">{data?.date}</p>
          </div>
          <button onClick={approveAll} className="px-5 py-2.5 bg-green-600 text-white rounded-lg font-sans font-semibold text-sm">
            ✓ Approve All
          </button>
        </div>

        {message && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm font-sans">
            {message}
          </div>
        )}

        {CATS.map(cat => {
          const catData = data?.categories?.[cat];
          if (!catData) return null;
          const questions = catData.pending ? (typeof catData.pending === 'string' ? JSON.parse(catData.pending) : catData.pending) : [];

          return (
            <div key={cat} className="mb-6 border border-gray-200 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between p-4 bg-gray-50 border-b border-gray-200">
                <div>
                  <h2 className="font-bold text-lg" style={{ fontFamily: "'Georgia', serif" }}>{DISPLAY_NAMES[cat] || cat}</h2>
                  <p className="text-xs font-sans text-gray-400">
                    {catData.approved ? '✅ Approved' : catData.live ? '🟢 Live' : '⏳ Pending review'}
                  </p>
                </div>
                {!catData.approved && questions.length > 0 && (
                  <button onClick={() => approve(cat)} className="px-4 py-2 bg-green-600 text-white rounded-lg font-sans font-semibold text-xs">
                    Approve
                  </button>
                )}
              </div>

              {questions.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {questions.map((q: any, i: number) => (
                    <div key={i} className="p-4">
                      <p className="text-xs text-gray-400 font-sans mb-1">Q{i + 1} · {q.headline}</p>
                      <p className="font-semibold text-sm mb-2" style={{ fontFamily: "'Georgia', serif" }}>{q.question}</p>
                      <div className="grid grid-cols-2 gap-1 mb-2">
                        {q.options.map((opt: string, j: number) => (
                          <p key={j} className={'text-xs font-sans p-1.5 rounded ' + (j === q.correct ? 'bg-green-50 text-green-700 font-semibold' : 'text-gray-500')}>
                            {String.fromCharCode(65 + j)}. {opt}
                          </p>
                        ))}
                      </div>
                      <p className="text-xs text-gray-400 font-sans">{q.explanation}</p>
                      {q.perspective && <p className="text-xs text-amber-700 font-sans mt-1">🌍 {q.perspective}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-sm text-gray-400 font-sans">No questions generated yet</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
