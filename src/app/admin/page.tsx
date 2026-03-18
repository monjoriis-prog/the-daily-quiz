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

const SHORT_NAMES: Record<string, string> = {
  'world': 'WRL',
  'tech': 'TEC',
  'science': 'SCI',
  'business': 'BIZ',
  'sports': 'SPT',
  'culture': 'CUL',
  'politics:us': '🇺🇸',
  'politics:ca': '🇨🇦',
  'politics:uk': '🇬🇧',
  'politics:au': '🇦🇺',
};

function getStatusInfo(catData: any) {
  if (!catData) return { color: '#9CA3AF', label: 'No data', icon: '—' };
  const gs = catData.genStatus;
  const status = typeof gs === 'string' ? JSON.parse(gs) : gs;

  if (catData.live) return { color: '#059669', label: 'Live', icon: '✓' };
  if (catData.approved) return { color: '#2563EB', label: 'Approved', icon: '✓' };
  if (status?.status === 'success') return { color: '#16A34A', label: status.questionCount + ' Qs', icon: '✓' };
  if (status?.status === 'generating') return { color: '#D97706', label: 'Generating...', icon: '⏳' };
  if (status?.status === 'failed') return { color: '#DC2626', label: 'FAILED', icon: '✗' };
  if (catData.pending) return { color: '#16A34A', label: 'Pending', icon: '✓' };
  return { color: '#9CA3AF', label: 'Waiting', icon: '—' };
}

export default function AdminPage() {
  const [pw, setPw] = useState('');
  const [loggedIn, setLoggedIn] = useState(false);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [editQuestions, setEditQuestions] = useState<any[]>([]);

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

  const startEdit = (cat: string, questions: any[]) => {
    setEditing(cat);
    setEditQuestions(JSON.parse(JSON.stringify(questions)));
  };

  const cancelEdit = () => {
    setEditing(null);
    setEditQuestions([]);
  };

  const updateQuestion = (qIdx: number, field: string, value: any) => {
    const updated = [...editQuestions];
    updated[qIdx] = { ...updated[qIdx], [field]: value };
    setEditQuestions(updated);
  };

  const updateOption = (qIdx: number, optIdx: number, value: string) => {
    const updated = [...editQuestions];
    const opts = [...updated[qIdx].options];
    opts[optIdx] = value;
    updated[qIdx] = { ...updated[qIdx], options: opts };
    setEditQuestions(updated);
  };

  const saveEdits = async () => {
    if (!editing) return;
    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pw, category: editing, action: 'approve-edited', questions: editQuestions }),
    });
    const d = await res.json();
    setMessage(d.message || d.error);
    setEditing(null);
    setEditQuestions([]);
    fetchData();
  };

  const allOk = data && CATS.every(cat => {
    const s = getStatusInfo(data.categories?.[cat]);
    return s.icon === '✓';
  });

  const anyFailed = data && CATS.some(cat => {
    const s = getStatusInfo(data.categories?.[cat]);
    return s.icon === '✗';
  });

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

        {/* STATUS DASHBOARD */}
        <div className={'mb-6 p-4 rounded-xl border-2 ' + (anyFailed ? 'border-red-300 bg-red-50' : allOk ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-gray-50')}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold font-sans">
              {anyFailed ? '🚨 Generation failed — check red categories below' : allOk ? '✅ All categories ready' : '⏳ Generation in progress...'}
            </p>
            <button onClick={fetchData} className="text-xs font-sans text-gray-400 hover:text-gray-600">↻ Refresh</button>
          </div>
          <div className="grid grid-cols-10 gap-1.5">
            {CATS.map(cat => {
              const info = getStatusInfo(data?.categories?.[cat]);
              return (
                <div key={cat} className="text-center">
                  <div className="w-full aspect-square rounded-lg flex items-center justify-center text-white text-xs font-bold font-sans"
                    style={{ background: info.color }}>
                    {info.icon}
                  </div>
                  <p className="text-[9px] text-gray-500 font-sans mt-1 leading-tight">{SHORT_NAMES[cat]}</p>
                </div>
              );
            })}
          </div>
          {anyFailed && (
            <div className="mt-3 pt-3 border-t border-red-200">
              {CATS.filter(cat => getStatusInfo(data?.categories?.[cat]).icon === '✗').map(cat => {
                const gs = data?.categories?.[cat]?.genStatus;
                const status = typeof gs === 'string' ? JSON.parse(gs) : gs;
                return (
                  <p key={cat} className="text-xs text-red-700 font-sans mb-1">
                    <span className="font-semibold">{DISPLAY_NAMES[cat]}:</span> {status?.error || 'Unknown error'} — {status?.failedAt ? new Date(status.failedAt).toLocaleTimeString() : ''}
                  </p>
                );
              })}
            </div>
          )}
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
          const isEditing = editing === cat;

          return (
            <div key={cat} className="mb-6 border border-gray-200 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between p-4 bg-gray-50 border-b border-gray-200">
                <div>
                  <h2 className="font-bold text-lg" style={{ fontFamily: "'Georgia', serif" }}>{DISPLAY_NAMES[cat] || cat}</h2>
                  <p className="text-xs font-sans text-gray-400">
                    {catData.approved ? '✅ Approved' : catData.live ? '🟢 Live' : getStatusInfo(catData).icon === '✗' ? '🔴 Generation failed' : '⏳ Pending review'}
                  </p>
                </div>
                <div className="flex gap-2">
                  {!isEditing && questions.length > 0 && (
                    <button onClick={() => startEdit(cat, questions)} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-sans font-semibold text-xs">
                      Edit
                    </button>
                  )}
                  {!isEditing && !catData.approved && questions.length > 0 && (
                    <button onClick={() => approve(cat)} className="px-4 py-2 bg-green-600 text-white rounded-lg font-sans font-semibold text-xs">
                      Approve
                    </button>
                  )}
                  {isEditing && (
                    <>
                      <button onClick={cancelEdit} className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg font-sans font-semibold text-xs">
                        Cancel
                      </button>
                      <button onClick={saveEdits} className="px-4 py-2 bg-green-600 text-white rounded-lg font-sans font-semibold text-xs">
                        Save & Approve
                      </button>
                    </>
                  )}
                </div>
              </div>

              {isEditing ? (
                <div className="divide-y divide-gray-100">
                  {editQuestions.map((q: any, i: number) => (
                    <div key={i} className="p-4 bg-blue-50">
                      <p className="text-xs text-blue-600 font-sans font-semibold mb-2">Editing Q{i + 1}</p>
                      <div className="mb-2">
                        <label className="text-[10px] font-semibold text-gray-400 uppercase font-sans">Headline</label>
                        <input
                          value={q.headline}
                          onChange={e => updateQuestion(i, 'headline', e.target.value)}
                          className="w-full p-2 border border-gray-200 rounded text-sm font-sans mt-1"
                        />
                      </div>
                      <div className="mb-2">
                        <label className="text-[10px] font-semibold text-gray-400 uppercase font-sans">Question</label>
                        <textarea
                          value={q.question}
                          onChange={e => updateQuestion(i, 'question', e.target.value)}
                          className="w-full p-2 border border-gray-200 rounded text-sm font-sans mt-1"
                          rows={2}
                        />
                      </div>
                      <div className="mb-2">
                        <label className="text-[10px] font-semibold text-gray-400 uppercase font-sans">Options (click radio to set correct answer)</label>
                        {q.options.map((opt: string, j: number) => (
                          <div key={j} className="flex items-center gap-2 mt-1">
                            <input
                              type="radio"
                              name={'correct-' + cat + '-' + i}
                              checked={q.correct === j}
                              onChange={() => updateQuestion(i, 'correct', j)}
                            />
                            <span className="text-xs font-semibold font-sans w-4">{String.fromCharCode(65 + j)}.</span>
                            <input
                              value={opt}
                              onChange={e => updateOption(i, j, e.target.value)}
                              className={'flex-1 p-2 border rounded text-sm font-sans ' + (q.correct === j ? 'border-green-400 bg-green-50' : 'border-gray-200')}
                            />
                          </div>
                        ))}
                      </div>
                      <div className="mb-2">
                        <label className="text-[10px] font-semibold text-gray-400 uppercase font-sans">Explanation</label>
                        <input
                          value={q.explanation}
                          onChange={e => updateQuestion(i, 'explanation', e.target.value)}
                          className="w-full p-2 border border-gray-200 rounded text-sm font-sans mt-1"
                        />
                      </div>
                      <div className="mb-2">
                        <label className="text-[10px] font-semibold text-gray-400 uppercase font-sans">Context</label>
                        <textarea
                          value={q.context || ''}
                          onChange={e => updateQuestion(i, 'context', e.target.value)}
                          className="w-full p-2 border border-gray-200 rounded text-sm font-sans mt-1"
                          rows={2}
                        />
                      </div>
                      <div className="mb-2">
                        <label className="text-[10px] font-semibold text-gray-400 uppercase font-sans">Perspective</label>
                        <input
                          value={q.perspective || ''}
                          onChange={e => updateQuestion(i, 'perspective', e.target.value)}
                          className="w-full p-2 border border-gray-200 rounded text-sm font-sans mt-1"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : questions.length > 0 ? (
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
                <div className="p-4 text-center text-sm text-gray-400 font-sans">
                  {getStatusInfo(catData).icon === '✗' ? '🔴 Generation failed — see error above' : 'No questions generated yet'}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
