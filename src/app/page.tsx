'use client';

import { useState } from 'react';

const CATEGORIES = [
  { id: 'world', label: 'World', tag: 'GLOBAL AFFAIRS', color: '#1A1A1A' },
  { id: 'tech', label: 'Tech', tag: 'TECHNOLOGY', color: '#2563EB' },
  { id: 'science', label: 'Science', tag: 'SCIENCE', color: '#059669' },
  { id: 'business', label: 'Business', tag: 'MARKETS', color: '#D97706' },
  { id: 'sports', label: 'Sports', tag: 'SPORTS', color: '#DC2626' },
  { id: 'entertainment', label: 'Culture', tag: 'CULTURE', color: '#7C3AED' },
];

export default function Home() {
  const [loading, setLoading] = useState<string | null>(null);
  const [questions, setQuestions] = useState<any[] | null>(null);
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const [roundCorrect, setRoundCorrect] = useState(0);
  const [screen, setScreen] = useState<'home' | 'quiz' | 'results'>('home');
  const [category, setCategory] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  const startQuiz = async (cat: any) => {
    setCategory(cat);
    setLoading(cat.id);
    setError(null);

    try {
      const res = await fetch(`/api/quiz?category=${cat.label}`);
      const data = await res.json();

      if (data.error) throw new Error(data.error);

      setQuestions(data.questions);
      setCurrentQ(0);
      setSelected(null);
      setRevealed(false);
      setScore(0);
      setRoundCorrect(0);
      setScreen('quiz');
    } catch (e: any) {
      setError(e.message || 'Failed to load quiz');
    }
    setLoading(null);
  };

  const handleAnswer = (idx: number) => {
    if (revealed || !questions) return;
    setSelected(idx);
    setRevealed(true);
    if (idx === questions[currentQ].correct) {
      setScore(s => s + 200);
      setRoundCorrect(r => r + 1);
    }
  };

  const nextQuestion = () => {
    if (!questions) return;
    if (currentQ + 1 >= questions.length) {
      setScreen('results');
    } else {
      setCurrentQ(c => c + 1);
      setSelected(null);
      setRevealed(false);
    }
  };

  const goHome = () => {
    setScreen('home');
    setQuestions(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-white text-gray-900" style={{ fontFamily: "'Georgia', serif" }}>
      <div className="max-w-xl mx-auto px-5">

        {screen === 'home' && (
          <div>
            <div className="text-center pt-12 pb-5 border-b-2 border-gray-900">
              <p className="text-xs font-semibold tracking-widest text-gray-400 mb-3 font-sans uppercase">{today}</p>
              <h1 className="text-5xl font-bold mb-1 tracking-tight">The Daily Quiz</h1>
              <p className="text-sm text-gray-400 font-sans">Same questions for everyone · New stories every day</p>
            </div>

            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm font-sans">
                {error}
              </div>
            )}

            <div className="flex flex-col pt-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => startQuiz(cat)}
                  disabled={loading !== null}
                  className="bg-white border-b border-gray-200 py-5 px-1 text-left flex items-center justify-between hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  <div>
                    <p className="text-[10px] font-semibold tracking-widest uppercase font-sans mb-1" style={{ color: cat.color }}>{cat.tag}</p>
                    <p className="text-xl font-semibold">{cat.label}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {loading === cat.id ? (
                      <span className="text-xs text-gray-400 font-sans">Loading…</span>
                    ) : (
                      <span className="text-xs text-gray-300 font-sans">4 questions</span>
                    )}
                    <span className="text-gray-300 text-lg">→</span>
                  </div>
                </button>
              ))}
            </div>

            <p className="text-center py-8 text-xs text-gray-300 font-sans">
              Everyone plays the same quiz · Refreshes daily at midnight
            </p>
          </div>
        )}

        {screen === 'quiz' && questions && (
          <div className="pt-6">
            <div className="flex items-center justify-between pb-3 mb-6 border-b border-gray-200">
              <button onClick={goHome} className="text-sm text-gray-400 font-sans">← Back</button>
              <span className="text-base font-semibold font-mono">{score} pts</span>
            </div>

            <p className="text-[11px] font-semibold tracking-widest uppercase font-sans mb-1" style={{ color: category?.color }}>
              {category?.tag} · {currentQ + 1} of {questions.length}
            </p>

            {questions[currentQ].headline && (
              <div className="text-xs text-gray-400 font-sans mb-3 p-2 bg-gray-50 rounded border-l-[3px]" style={{ borderColor: category?.color }}>
                {questions[currentQ].headline}
              </div>
            )}

            <h2 className="text-[22px] font-semibold mb-6 leading-snug">{questions[currentQ].question}</h2>

            <div className="flex flex-col gap-2">
              {questions[currentQ].options.map((opt: string, i: number) => {
                const isCorrect = i === questions[currentQ].correct;
                const isSelected = i === selected;
                let classes = 'border-gray-200 bg-white text-gray-900';
                if (revealed && isCorrect) classes = 'border-green-300 bg-green-50 text-green-900';
                else if (revealed && isSelected) classes = 'border-red-300 bg-red-50 text-red-900';
                else if (revealed) classes = 'border-gray-100 bg-white text-gray-300';

                return (
                  <button
                    key={i}
                    disabled={revealed}
                    onClick={() => handleAnswer(i)}
                    className={`border-[1.5px] rounded-lg p-4 text-left text-[15px] font-sans font-medium flex items-center gap-3 transition-all ${classes} ${!revealed ? 'hover:bg-gray-50 hover:border-gray-300 cursor-pointer' : 'cursor-default'}`}
                    style={{ opacity: revealed && !isCorrect && !isSelected ? 0.45 : 1 }}
                  >
                    <span className={`w-7 h-7 rounded-md flex items-center justify-center text-xs font-semibold font-mono flex-shrink-0 ${revealed && isCorrect ? 'bg-green-700 text-white' : revealed && isSelected ? 'bg-red-700 text-white' : 'bg-gray-100 text-gray-500'}`}>
                      {revealed && isCorrect ? '✓' : revealed && isSelected ? '✗' : String.fromCharCode(65 + i)}
                    </span>
                    {opt}
                  </button>
                );
              })}
            </div>

            {revealed && (
              <div className="mt-6">
                <div className="bg-gray-50 rounded-lg p-4 mb-3 border border-gray-200">
                  <p className={`text-xs font-semibold uppercase tracking-wide mb-1 font-sans ${selected === questions[currentQ].correct ? 'text-green-600' : 'text-red-600'}`}>
                    {selected === questions[currentQ].correct ? 'Correct' : 'Incorrect'}
                  </p>
                  <p className="text-sm text-gray-500 font-sans leading-relaxed">{questions[currentQ].explanation}</p>
                </div>

                {questions[currentQ].perspective && (
                  <div className="bg-amber-50 rounded-lg p-4 mb-4 border border-amber-200 flex gap-3">
                    <span className="text-lg">🌍</span>
                    <div>
                      <p className="text-[11px] font-semibold text-amber-800 uppercase tracking-wide mb-1 font-sans">Global Perspective</p>
                      <p className="text-[13px] text-amber-900 font-sans leading-relaxed">{questions[currentQ].perspective}</p>
                    </div>
                  </div>
                )}

                <button onClick={nextQuestion} className="w-full py-3.5 rounded-lg bg-gray-900 text-white font-sans font-semibold text-sm hover:opacity-85 transition-opacity">
                  {currentQ + 1 >= questions.length ? 'See Results' : 'Next Question'}
                </button>
              </div>
            )}
          </div>
        )}

        {screen === 'results' && questions && (
          <div className="pt-12">
            <div className="text-center pb-7 border-b-2 border-gray-900 mb-8">
              <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase font-sans mb-3">Round Complete</p>
              <p className="text-6xl font-semibold font-mono">{score}</p>
              <p className="text-sm text-gray-400 font-sans">points earned</p>
            </div>

            <div className="grid grid-cols-2 gap-px bg-gray-200 rounded-lg overflow-hidden mb-8">
              {[
                { label: 'Correct', value: `${roundCorrect}/${questions.length}` },
                { label: 'Category', value: category?.label },
              ].map((s, i) => (
                <div key={i} className="bg-white p-5 text-center">
                  <p className="text-xl font-semibold font-mono mb-1">{s.value}</p>
                  <p className="text-[11px] text-gray-400 uppercase tracking-wide font-sans">{s.label}</p>
                </div>
              ))}
            </div>

            <div className="mb-8">
              <p className="text-[11px] font-semibold tracking-widest uppercase text-gray-400 font-sans mb-3 pb-2 border-b border-gray-200">Stories Covered</p>
              {questions.map((q, i) => (
                <div key={i} className="py-3 border-b border-gray-100 text-[15px] font-medium">
                  {q.headline || q.question}
                </div>
              ))}
            </div>

            <div className="flex gap-3 pb-12">
              <button onClick={goHome} className="flex-1 py-3.5 rounded-lg bg-gray-900 text-white font-sans font-semibold text-sm">New Category</button>
              <button onClick={() => startQuiz(category)} className="flex-1 py-3.5 rounded-lg border-[1.5px] border-gray-200 text-gray-900 font-sans font-semibold text-sm">Replay</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}