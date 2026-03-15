'use client';

import { useState, useEffect, useRef } from 'react';
import { Confetti, GoldConfetti } from '@/components/Confetti';
import { playCorrect, playWrong, playStreak, playComplete, playPerfect, playTick } from '@/lib/sounds';

const CATEGORIES = [
  { id: 'world', label: 'World', tag: 'GLOBAL AFFAIRS', color: '#1A1A1A' },
  { id: 'tech', label: 'Tech', tag: 'TECHNOLOGY', color: '#2563EB' },
  { id: 'science', label: 'Science', tag: 'SCIENCE', color: '#059669' },
  { id: 'business', label: 'Business', tag: 'MARKETS', color: '#D97706' },
  { id: 'sports', label: 'Sports', tag: 'SPORTS', color: '#DC2626' },
  { id: 'entertainment', label: 'Culture', tag: 'CULTURE', color: '#7C3AED' },
];

const MAX_TIME = 12;

export default function Home() {
  const [loading, setLoading] = useState<string | null>(null);
  const [questions, setQuestions] = useState<any[] | null>(null);
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const [roundCorrect, setRoundCorrect] = useState(0);
  const [streak, setStreak] = useState(0);
  const [screen, setScreen] = useState<'home' | 'quiz' | 'results'>('home');
  const [category, setCategory] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [showContext, setShowContext] = useState(false);
  const [copied, setCopied] = useState(false);
  const [timer, setTimer] = useState(MAX_TIME);
  const [confettiTrigger, setConfettiTrigger] = useState(0);
  const [confettiType, setConfettiType] = useState<'normal' | 'big' | 'perfect'>('normal');
  const [goldTrigger, setGoldTrigger] = useState(0);
  const timerRef = useRef<any>(null);

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });
  const shortDate = new Date().toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });

  // Timer
  useEffect(() => {
    if (screen === 'quiz' && !revealed && questions && questions.length > 0) {
      setTimer(MAX_TIME);
      timerRef.current = setInterval(() => {
        setTimer((t) => {
          if (t <= 1) { clearInterval(timerRef.current); return 0; }
          if (t <= 4) { playTick().catch(() => {}); }
          return t - 1;
        });
      }, 1000);
      return () => clearInterval(timerRef.current);
    }
  }, [screen, currentQ, revealed, questions?.length]);

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
      setStreak(0);
      setScreen('quiz');
    } catch (e: any) {
      const msg = e.message || '';
      if (msg.includes('rate limit') || msg.includes('exceed')) {
        setError('The quiz is warming up. Please try again in a moment.');
      } else if (msg.includes('API key')) {
        setError('Something went wrong on our end. Please try again later.');
      } else {
        setError('Couldn\'t load the quiz right now. Try again in a moment.');
      }
    }
    setLoading(null);
  };

  const handleAnswer = (idx: number) => {
    if (revealed || !questions) return;
    clearInterval(timerRef.current);
    setSelected(idx);
    setRevealed(true);
    setShowContext(false);

    const isCorrect = idx === questions[currentQ].correct;

    if (isCorrect) {
      const timeBonus = Math.round(timer * (200 / MAX_TIME) * 0.3);
      const streakBonus = streak >= 2 ? 50 * streak : 0;
      setScore(s => s + 200 + timeBonus + streakBonus);
      setRoundCorrect(r => r + 1);
      setStreak(s => s + 1);

      // Sound + confetti
      const newStreak = streak + 1;
      if (newStreak >= 3) {
        playStreak().catch(() => {});
        setConfettiType('big');
      } else {
        playCorrect().catch(() => {});
        setConfettiType('normal');
      }
      setConfettiTrigger(t => t + 1);
    } else {
      setStreak(0);
      playWrong().catch(() => {});
    }
  };

  const nextQuestion = () => {
    if (!questions) return;
    if (currentQ + 1 >= questions.length) {
      // Quiz complete
      if (roundCorrect === questions.length) {
        playPerfect().catch(() => {});
        setGoldTrigger(t => t + 1);
      } else {
        playComplete().catch(() => {});
      }
      setScreen('results');
    } else {
      setCurrentQ(c => c + 1);
      setSelected(null);
      setRevealed(false);
      setShowContext(false);
    }
  };

  const goHome = () => {
    setScreen('home');
    setQuestions(null);
    setError(null);
    setShowContext(false);
    setCopied(false);
  };

  const shareText = questions && screen === 'results'
    ? `📰 The Daily Quiz — ${category?.label}\n${Array.from({ length: questions.length }, (_, i) => i < roundCorrect ? '🟩' : '⬜').join('')}\nScore: ${score} pts · ${roundCorrect}/${questions.length} correct\n\nCan you beat me? Take today's quiz!\nhttps://the-daily-quiz.vercel.app`
    : '';

  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(shareText); } catch { }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: 'The Daily Quiz', text: shareText }); } catch { }
    }
  };

  const hasNativeShare = typeof navigator !== 'undefined' && !!navigator.share;

  const getResultTitle = () => {
    if (!questions) return '';
    if (roundCorrect === questions.length) return '🏆 Perfect Score!';
    if (roundCorrect >= 3) return '🧠 Certified News Buff';
    if (roundCorrect >= 2) return '📰 Getting There';
    if (roundCorrect >= 1) return '🌱 Room to Grow';
    return '';
  };

  const getResultMessage = () => {
    if (!questions) return '';
    if (roundCorrect === questions.length) return 'Flawless. You\'re officially the most informed person in the room.';
    if (roundCorrect >= 3) return 'Impressive — you clearly know what\'s happening in the world.';
    if (roundCorrect >= 2) return 'Not bad! A few more rounds and you\'ll be a pro.';
    if (roundCorrect >= 1) return 'Hey, one is better than none. Come back tomorrow and level up.';
    return '';
  };

  return (
    <div className="min-h-screen bg-white text-gray-900" style={{ fontFamily: "'Georgia', serif" }}>
      <style jsx global>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes expandDown {
          from { opacity: 0; max-height: 0; }
          to { opacity: 1; max-height: 200px; }
        }
        @keyframes flashGreen {
          0% { background-color: rgba(5, 150, 105, 0.08); }
          100% { background-color: transparent; }
        }
        @keyframes flashRed {
          0% { background-color: rgba(220, 38, 38, 0.06); }
          100% { background-color: transparent; }
        }
        .animate-slide-up { animation: slideUp 0.2s ease-out forwards; }
        .animate-slide-up-delay { opacity: 0; animation: slideUp 0.2s ease-out 0.1s forwards; }
        .animate-slide-up-delay-2 { opacity: 0; animation: slideUp 0.2s ease-out 0.2s forwards; }
        .animate-expand { animation: expandDown 0.2s ease-out forwards; overflow: hidden; }
        .flash-correct { animation: flashGreen 0.4s ease-out; }
        .flash-wrong { animation: flashRed 0.4s ease-out; }
      `}</style>

      <Confetti trigger={confettiTrigger} intensity={confettiType} />
      <GoldConfetti trigger={goldTrigger} />

      <div className="max-w-xl mx-auto px-5">

        {/* ═══ HOME ═══ */}
        {screen === 'home' && (
          <div>
            <div className="text-center pt-12 pb-5 border-b-2 border-gray-900">
              <p className="text-xs font-semibold tracking-widest text-gray-400 mb-3 font-sans uppercase">{today}</p>
              <h1 className="text-5xl font-bold mb-1 tracking-tight">The Daily Quiz</h1>
              <p className="text-sm text-gray-400 font-sans">Play the news.</p>
            </div>

            {error && (
              <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm font-sans">
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
                      <span className="text-xs text-gray-300 font-sans">6 questions</span>
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

        {/* ═══ QUIZ ═══ */}
        {screen === 'quiz' && questions && (
          <div className={`pt-6 ${revealed ? (selected === questions[currentQ].correct ? 'flash-correct' : 'flash-wrong') : ''}`}>
            <div className="flex items-center justify-between pb-3 mb-2 border-b border-gray-200">
              <button onClick={goHome} className="text-sm text-gray-400 font-sans">← Back</button>
              <div className="flex items-center gap-4">
                {streak >= 2 && (
                  <span className="text-xs font-semibold font-mono text-amber-600">{streak}× streak 🔥</span>
                )}
                <span className="text-base font-semibold font-mono">{score} pts</span>
              </div>
            </div>

            {/* Timer bar */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[11px] font-semibold tracking-widest uppercase font-sans" style={{ color: category?.color }}>
                  {category?.tag} · {currentQ + 1} of {questions.length}
                </p>
                <span className={`text-sm font-semibold font-mono ${timer <= 3 ? 'text-red-500' : 'text-gray-400'}`}>
                  {revealed ? '—' : `${timer}s`}
                </span>
              </div>
              <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-1000 ease-linear"
                  style={{
                    width: revealed ? '0%' : `${(timer / MAX_TIME) * 100}%`,
                    backgroundColor: timer <= 3 ? '#DC2626' : category?.color || '#1A1A1A',
                  }}
                />
              </div>
            </div>

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
                    className={`border-[1.5px] rounded-lg p-4 text-left text-[15px] font-sans font-medium flex items-center gap-3 transition-all duration-200 ${classes} ${!revealed ? 'hover:bg-gray-50 hover:border-gray-300 cursor-pointer' : 'cursor-default'}`}
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
                <div className="animate-slide-up bg-gray-50 rounded-lg p-4 mb-3 border border-gray-200">
                  <p className={`text-xs font-semibold uppercase tracking-wide mb-1 font-sans ${selected === questions[currentQ].correct ? 'text-green-600' : 'text-red-600'}`}>
                    {selected === questions[currentQ].correct
                      ? timer > 0 ? 'Correct — nice speed!' : 'Correct'
                      : 'Incorrect'}
                  </p>
                  <p className="text-sm text-gray-500 font-sans leading-relaxed">{questions[currentQ].explanation}</p>

                  {questions[currentQ].context && (
                    <div className="mt-2">
                      {!showContext ? (
                        <button
                          onClick={() => setShowContext(true)}
                          className="text-xs font-sans font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                        >
                          Learn more →
                        </button>
                      ) : (
                        <div className="animate-expand mt-2 pt-2 border-t border-gray-200">
                          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1 font-sans">Background</p>
                          <p className="text-sm text-gray-500 font-sans leading-relaxed">{questions[currentQ].context}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {questions[currentQ].perspective && (
                  <div className="animate-slide-up-delay bg-amber-50 rounded-lg p-4 mb-4 border border-amber-200 flex gap-3">
                    <span className="text-lg">🌍</span>
                    <div>
                      <p className="text-[11px] font-semibold text-amber-800 uppercase tracking-wide mb-1 font-sans">Global Perspective</p>
                      <p className="text-[13px] text-amber-900 font-sans leading-relaxed">{questions[currentQ].perspective}</p>
                    </div>
                  </div>
                )}

                <button onClick={nextQuestion} className="animate-slide-up-delay-2 w-full py-3.5 rounded-lg bg-gray-900 text-white font-sans font-semibold text-sm hover:opacity-85 transition-opacity">
                  {currentQ + 1 >= questions.length ? 'See Results' : 'Next Question'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ═══ RESULTS ═══ */}
        {screen === 'results' && questions && (
          <div className="pt-12">
            {/* Smart header based on score */}
            {roundCorrect === 0 ? (
              /* 0 correct — encouraging, no share pressure */
              <div className="text-center pb-7 border-b-2 border-gray-900 mb-8">
                <p className="text-4xl mb-3">💪</p>
                <h2 className="text-2xl font-bold mb-2">Tough round!</h2>
                <p className="text-sm text-gray-400 font-sans">The news moves fast — come back tomorrow and show it who's boss.</p>
              </div>
            ) : (
              /* 1+ correct — show score with title */
              <div className="text-center pb-7 border-b-2 border-gray-900 mb-8">
                <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase font-sans mb-3">{getResultTitle()}</p>
                <p className="text-6xl font-semibold font-mono">{score}</p>
                <p className="text-sm text-gray-400 font-sans mt-1">{getResultMessage()}</p>
              </div>
            )}

            {/* Stats — always show */}
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

            {/* Share section — different for 0 vs 1+ */}
            {roundCorrect === 0 ? (
              <div className="mb-8 p-5 bg-gray-50 rounded-lg border border-gray-200 text-center">
                <p className="text-sm font-sans text-gray-500 mb-4">Think your friends would do better? Send them the quiz and find out.</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent('Think you know the news? Take today\'s quiz 👉 https://the-daily-quiz.vercel.app')}`, '_blank')}
                    className="flex-1 py-3 rounded-lg text-white font-sans font-semibold text-sm"
                    style={{ background: '#25D366' }}
                  >
                    Send Quiz
                  </button>
                  <button
                    onClick={handleCopy}
                    className="flex-1 py-3 rounded-lg border-[1.5px] border-gray-200 font-sans font-semibold text-sm"
                    style={{ background: copied ? '#059669' : '#FFF', color: copied ? '#FFF' : '#1A1A1A' }}
                  >
                    {copied ? '✓ Copied!' : '📋 Copy Link'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="mb-8">
                <p className="text-[11px] font-semibold tracking-widest uppercase text-gray-400 font-sans mb-4">Challenge Your Friends</p>

                <div className="rounded-xl overflow-hidden mb-4 border border-gray-200" style={{ background: 'linear-gradient(145deg, #0f172a 0%, #1e293b 100%)' }}>
                  <div className="h-1" style={{ background: category?.color || '#1A1A1A' }} />
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <p className="text-[10px] font-sans font-semibold tracking-widest text-slate-400 uppercase">{shortDate}</p>
                        <p className="text-lg font-bold text-white mt-0.5" style={{ fontFamily: "'Georgia', serif" }}>The Daily Quiz</p>
                      </div>
                      <p className="text-[10px] font-sans font-semibold tracking-widest uppercase" style={{ color: category?.color }}>{category?.tag}</p>
                    </div>

                    <div className="text-center mb-6">
                      <p className="text-5xl font-bold font-mono text-white">{score}</p>
                      <p className="text-xs font-sans text-slate-400 mt-1">points</p>
                    </div>

                    <div className="flex justify-center gap-2 mb-6">
                      {Array.from({ length: questions.length }, (_, i) => (
                        <div
                          key={i}
                          className="w-12 h-12 rounded-lg flex items-center justify-center text-lg font-semibold"
                          style={{
                            background: i < roundCorrect ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.15)',
                            border: i < roundCorrect ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(239,68,68,0.2)',
                          }}
                        >
                          {i < roundCorrect ? '✓' : '✗'}
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-center gap-8 text-center">
                      <div>
                        <p className="text-xl font-bold font-mono text-white">{roundCorrect}/{questions.length}</p>
                        <p className="text-[10px] font-sans text-slate-500 uppercase tracking-wide">Correct</p>
                      </div>
                      <div className="w-px bg-slate-700" />
                      <div>
                        <p className="text-xl font-bold font-mono text-white">{Math.round((roundCorrect / questions.length) * 100)}%</p>
                        <p className="text-[10px] font-sans text-slate-500 uppercase tracking-wide">Accuracy</p>
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-700 text-center">
                      <p className="text-xs font-sans text-slate-400">Can you beat my score? → the-daily-quiz.vercel.app</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-2">
                  <button
                    onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`, '_blank')}
                    className="py-3 rounded-lg bg-gray-900 text-white font-sans font-semibold text-sm flex items-center justify-center gap-2"
                  >
                    𝕏 Twitter
                  </button>
                  <button
                    onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank')}
                    className="py-3 rounded-lg text-white font-sans font-semibold text-sm flex items-center justify-center gap-2"
                    style={{ background: '#25D366' }}
                  >
                    💬 WhatsApp
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?quote=${encodeURIComponent(shareText)}`, '_blank')}
                    className="py-3 rounded-lg text-white font-sans font-semibold text-sm flex items-center justify-center gap-2"
                    style={{ background: '#1877F2' }}
                  >
                    f Facebook
                  </button>
                  {hasNativeShare ? (
                    <button
                      onClick={handleNativeShare}
                      className="py-3 rounded-lg border-[1.5px] border-gray-200 text-gray-900 font-sans font-semibold text-sm flex items-center justify-center gap-2"
                    >
                      📤 Share
                    </button>
                  ) : (
                    <button
                      onClick={handleCopy}
                      className="py-3 rounded-lg border-[1.5px] border-gray-200 font-sans font-semibold text-sm flex items-center justify-center gap-2"
                      style={{ background: copied ? '#059669' : '#FFF', color: copied ? '#FFF' : '#1A1A1A' }}
                    >
                      {copied ? '✓ Copied!' : '📋 Copy'}
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="mb-8">
              <p className="text-[11px] font-semibold tracking-widest uppercase text-gray-400 font-sans mb-3 pb-2 border-b border-gray-200">Stories Covered</p>
              {questions.map((q, i) => (
                <div key={i} className="py-3 border-b border-gray-100 text-[15px] font-medium">
                  {q.headline || q.question}
                </div>
              ))}
            </div>

            <div className="flex gap-3 pb-12">
              <button onClick={goHome} className="flex-1 py-3.5 rounded-lg bg-gray-900 text-white font-sans font-semibold text-sm">
                {roundCorrect === 0 ? 'Try Another Category' : 'New Category'}
              </button>
              <button onClick={() => startQuiz(category)} className="flex-1 py-3.5 rounded-lg border-[1.5px] border-gray-200 text-gray-900 font-sans font-semibold text-sm">Replay</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}