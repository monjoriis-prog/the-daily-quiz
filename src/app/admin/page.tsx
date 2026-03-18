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

function emptyQuestion() {
  return {
    question: '',
    options: ['', '', '', ''],
    correct: 0,
    explanation: '',
    headline: '',
    perspective: '',
    context: '',
    funFact: '',
  };
}

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

function getTodayStr() {
  return new Date().toLocaleDateString('en-CA');
}

function getDateStr(daysAgo: number) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toLocaleDateString('en-CA');
}

export default function AdminPage() {
  const [pw, setPw] = useState('');
  const [loggedIn, setLoggedIn] = useState(false);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [editQuestions, setEditQuestions] = useState<any[]>([]);
  const [manualCat, setManualCat] = useState<string | null>(null);
  const [manualQuestions, setManualQuestions] = useState<any[]>([]);
  const [viewDate, setViewDate] = useState('');

  const fetchData = async (date?: string) => {
    setLoading(true);
    try {
      let url = '/api/admin?pw=' + pw;
      if (date) url += '&date=' + date;
      const res = await fetch(url);
      const d = await res.json();
      if (d.error) { setMessage(d.error); return; }
      setData(d);
      setViewDate(d.date || '');
      setLoggedIn(true);
    } catch { setMessage('Failed to load'); }
    setLoading(false);
  };

  const goToDate = (date: string) => {
    setEditing(null);
    setManualCat(null);
    fetchData(date);
  };

  const approve = async (category: string) => {
    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pw, category, action: 'approve' }),
    });
    const d = await res.json();
    setMessage(d.message || d.error);
    fetchData(viewDate);
  };

  const approveAll = async () => {
    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pw, action: 'approve-all' }),
    });
    const d = await res.json();
    setMessage(d.message || d.error);
    fetchData(viewDate);
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
    fetchData(viewDate);
  };

  // Manual entry functions
  const startManual = (cat: string) => {
    setManualCat(cat);
    setManualQuestions([emptyQuestion()]);
  };

  const cancelManual = () => {
    setManualCat(null);
    setManualQuestions([]);
  };

  const addManualQuestion = () => {
    setManualQuestions([...manualQuestions, emptyQuestion()]);
  };

  const removeManualQuestion = (idx: number) => {
    if (manualQuestions.length <= 1) return;
    setManualQuestions(manualQuestions.filter((_, i) => i !== idx));
  };

  const updateManualQuestion = (qIdx: number, field: string, value: any) => {
    const updated = [...manualQuestions];
    updated[qIdx] = { ...updated[qIdx], [field]: value };
    setManualQuestions(updated);
  };

  const updateManualOption = (qIdx: number, optIdx: number, value: string) => {
    const updated = [...manualQuestions];
    const opts = [...updated[qIdx].options];
    opts[optIdx] = value;
    updated[qIdx] = { ...updated[qIdx], options: opts };
    setManualQuestions(updated);
  };

  const saveManual = async () => {
    if (!manualCat) return;
    const valid = manualQuestions.filter(q =>
      q.question.trim() &&
      q.options.every((o: string) => o.trim()) &&
      q.headline.trim()
    );
    if (valid.length === 0) {
      setMessage('Please fill in at least one complete question (question, all 4 options, and headline are required)');
      return;
    }
    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pw, category: manualCat, action: 'manual-add', questions: valid }),
    });
    const d = await res.json();
    setMessage(d.message || d.error);
    setManualCat(null);
    setManualQuestions([]);
    fetchData(viewDate);
  };

  // Copy functions
  const copyToToday = async (category: string) => {
    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pw, category, action: 'copy-to-today', sourceDate: viewDate }),
    });
    const d = await res.json();
    setMessage(d.message || d.error);
  };

  const copyAllToToday = async () => {
    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pw, action: 'copy-all-to-today', sourceDate: viewDate }),
    });
    const d = await res.json();
    setMessage(d.message || d.error);
  };

  const isToday = data?.isToday !== false;

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
          <button onClick={() => fetchData()} disabled={loading} className="w-full py-3 bg-gray-900 text-white rounded-lg font-sans font-semibold text-sm">
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
        <div className="flex items-center justify-between mb-4 pb-4 border-b-2 border-gray-900">
          <div>
            <h1 className="text-2xl font-bold" style={{ fontFamily: "'Georgia', serif" }}>Quiz Review</h1>
            <p className="text-sm text-gray-400 font-sans">{data?.date} {isToday ? '(today)' : ''}</p>
          </div>
          {isToday && (
            <button onClick={approveAll} className="px-5 py-2.5 bg-green-600 text-white rounded-lg font-sans font-semibold text-sm">
              ✓ Approve All
            </button>
          )}
        </div>

        {/* DATE NAVIGATION */}
        <div className="mb-4 flex items-center gap-2 flex-wrap">
          <button onClick={() => goToDate(getTodayStr())} className={'px-3 py-1.5 rounded-lg font-sans font-semibold text-xs ' + (isToday ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600')}>
            Today
          </button>
          {[1, 2, 3, 4, 5, 6].map(d => (
            <button key={d} onClick={() => goToDate(getDateStr(d))} className={'px-3 py-1.5 rounded-lg font-sans text-xs ' + (viewDate === getDateStr(d) ? 'bg-gray-900 text-white font-semibold' : 'bg-gray-100 text-gray-600')}>
              {d === 1 ? 'Yesterday' : d + 'd ago'}
            </button>
          ))}
          <input
            type="date"
            value={viewDate}
            onChange={e => goToDate(e.target.value)}
            className="px-2 py-1.5 border border-gray-200 rounded-lg font-sans text-xs"
          />
        </div>

        {/* COPY ALL BANNER - only when viewing a past date */}
        {!isToday && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
            <p className="text-sm font-sans text-blue-700">Viewing <span className="font-semibold">{viewDate}</span> — copy questions to use today</p>
            <button onClick={copyAllToToday} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-sans font-semibold text-xs">
              Copy All to Today
            </button>
          </div>
        )}

        {/* STATUS DASHBOARD */}
        <div className={'mb-6 p-4 rounded-xl border-2 ' + (anyFailed ? 'border-red-300 bg-red-50' : allOk ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-gray-50')}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold font-sans">
              {anyFailed ? '🚨 Generation failed — check red categories below' : allOk ? '✅ All categories ready' : '⏳ Generation in progress...'}
            </p>
            <button onClick={() => fetchData(viewDate)} className="text-xs font-sans text-gray-400 hover:text-gray-600">↻ Refresh</button>
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
          const isManual = manualCat === cat;

          return (
            <div key={cat} className="mb-6 border border-gray-200 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between p-4 bg-gray-50 border-b border-gray-200">
                <div>
                  <h2 className="font-bold text-lg" style={{ fontFamily: "'Georgia', serif" }}>{DISPLAY_NAMES[cat] || cat}</h2>
                  <p className="text-xs font-sans text-gray-400">
                    {catData.approved ? '✅ Approved' : catData.live ? '🟢 Live' : getStatusInfo(catData).icon === '✗' ? '🔴 Generation failed' : questions.length > 0 ? '⏳ Pending review' : 'No data'}
                  </p>
                </div>
                <div className="flex gap-2">
                  {/* Copy to Today button - shown when viewing past date and questions exist */}
                  {!isToday && questions.length > 0 && (
                    <button onClick={() => copyToToday(cat)} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-sans font-semibold text-xs">
                      Copy to Today
                    </button>
                  )}
                  {isToday && !isEditing && !isManual && questions.length > 0 && (
                    <button onClick={() => startEdit(cat, questions)} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-sans font-semibold text-xs">
                      Edit
                    </button>
                  )}
                  {isToday && !isEditing && !isManual && !catData.approved && questions.length > 0 && (
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

              {/* MANUAL ENTRY FORM */}
              {isManual ? (
                <div className="p-4 bg-amber-50">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm font-semibold font-sans text-amber-800">Adding questions manually</p>
                    <div className="flex gap-2">
                      <button onClick={cancelManual} className="px-3 py-1.5 bg-gray-300 text-gray-700 rounded-lg font-sans font-semibold text-xs">
                        Cancel
                      </button>
                      <button onClick={saveManual} className="px-3 py-1.5 bg-green-600 text-white rounded-lg font-sans font-semibold text-xs">
                        Save & Approve
                      </button>
                    </div>
                  </div>
                  {manualQuestions.map((q: any, i: number) => (
                    <div key={i} className="mb-4 p-4 bg-white rounded-lg border border-amber-200">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs text-amber-700 font-sans font-semibold">Question {i + 1}</p>
                        {manualQuestions.length > 1 && (
                          <button onClick={() => removeManualQuestion(i)} className="text-xs text-red-500 font-sans hover:text-red-700">Remove</button>
                        )}
                      </div>
                      <div className="mb-2">
                        <label className="text-[10px] font-semibold text-gray-400 uppercase font-sans">Headline</label>
                        <input
                          value={q.headline}
                          onChange={e => updateManualQuestion(i, 'headline', e.target.value)}
                          placeholder="Short topic label"
                          className="w-full p-2 border border-gray-200 rounded text-sm font-sans mt-1"
                        />
                      </div>
                      <div className="mb-2">
                        <label className="text-[10px] font-semibold text-gray-400 uppercase font-sans">Question</label>
                        <textarea
                          value={q.question}
                          onChange={e => updateManualQuestion(i, 'question', e.target.value)}
                          placeholder="Write the quiz question"
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
                              name={'manual-correct-' + i}
                              checked={q.correct === j}
                              onChange={() => updateManualQuestion(i, 'correct', j)}
                            />
                            <span className="text-xs font-semibold font-sans w-4">{String.fromCharCode(65 + j)}.</span>
                            <input
                              value={opt}
                              onChange={e => updateManualOption(i, j, e.target.value)}
                              placeholder={'Option ' + String.fromCharCode(65 + j)}
                              className={'flex-1 p-2 border rounded text-sm font-sans ' + (q.correct === j ? 'border-green-400 bg-green-50' : 'border-gray-200')}
                            />
                          </div>
                        ))}
                      </div>
                      <div className="mb-2">
                        <label className="text-[10px] font-semibold text-gray-400 uppercase font-sans">Explanation</label>
                        <input
                          value={q.explanation}
                          onChange={e => updateManualQuestion(i, 'explanation', e.target.value)}
                          placeholder="1 sentence explaining the answer"
                          className="w-full p-2 border border-gray-200 rounded text-sm font-sans mt-1"
                        />
                      </div>
                      <div className="mb-2">
                        <label className="text-[10px] font-semibold text-gray-400 uppercase font-sans">Context (optional)</label>
                        <textarea
                          value={q.context}
                          onChange={e => updateManualQuestion(i, 'context', e.target.value)}
                          placeholder="2-3 sentences of background"
                          className="w-full p-2 border border-gray-200 rounded text-sm font-sans mt-1"
                          rows={2}
                        />
                      </div>
                      <div className="mb-2">
                        <label className="text-[10px] font-semibold text-gray-400 uppercase font-sans">Perspective (optional)</label>
                        <input
                          value={q.perspective}
                          onChange={e => updateManualQuestion(i, 'perspective', e.target.value)}
                          placeholder="How this is viewed differently"
                          className="w-full p-2 border border-gray-200 rounded text-sm font-sans mt-1"
                        />
                      </div>
                      <div className="mb-2">
                        <label className="text-[10px] font-semibold text-gray-400 uppercase font-sans">Fun Fact (optional)</label>
                        <input
                          value={q.funFact}
                          onChange={e => updateManualQuestion(i, 'funFact', e.target.value)}
                          placeholder="A surprising related fact"
                          className="w-full p-2 border border-gray-200 rounded text-sm font-sans mt-1"
                        />
                      </div>
                    </div>
                  ))}
                  <button onClick={addManualQuestion} className="w-full py-2.5 rounded-lg border-2 border-dashed border-amber-300 text-amber-700 font-sans font-semibold text-xs hover:bg-amber-100">
                    + Add Another Question
                  </button>
                </div>
              ) : isEditing ? (
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
                <div className="p-4 text-center">
                  <p className="text-sm text-gray-400 font-sans mb-3">
                    {getStatusInfo(catData).icon === '✗' ? '🔴 Generation failed — see error above' : 'No questions generated yet'}
                  </p>
                  {isToday && (
                    <button onClick={() => startManual(cat)} className="px-5 py-2.5 bg-amber-500 text-white rounded-lg font-sans font-semibold text-sm">
                      + Add Questions Manually
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
