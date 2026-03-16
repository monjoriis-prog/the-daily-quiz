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

const MAX_TIME = 15;
const LOADING_MESSAGES = ['Scanning the headlines…', 'Gathering stories from around the world…', 'Crafting your questions…', 'Almost there…'];

function CountUp({ target, duration = 1200 }: { target: number; duration?: number }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (target === 0) return;
    const steps = 30;
    const increment = target / steps;
    const interval = duration / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) { setCount(target); clearInterval(timer); }
      else { setCount(Math.floor(current)); }
    }, interval);
    return () => clearInterval(timer);
  }, [target]);
  return <>{count.toLocaleString()}</>;
}

export default function Home() {
  const [loading, setLoading] = useState<string | null>(null);
  const [loadingMsg, setLoadingMsg] = useState(0);
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
  const [cardRevealed, setCardRevealed] = useState(false);
  const [lastBonus, setLastBonus] = useState<number | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const timerRef = useRef<any>(null);
  const loadingMsgRef = useRef<any>(null);

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const shortDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  // Timer with auto-timeout
  useEffect(() => {
    if (screen === 'quiz' && !revealed && questions && questions.length > 0) {
      setTimer(MAX_TIME);
      setTimedOut(false);
      timerRef.current = setInterval(() => {
        setTimer((t) => {
          if (t <= 1) {
            clearInterval(timerRef.current);
            // Auto-lock: time's up
            setTimedOut(true);
            setRevealed(true);
            setSelected(-1); // -1 means no answer selected
            setStreak(0);
            setLastBonus(null);
            try { playWrong(); } catch {}
            return 0;
          }
          if (t <= 4) { try { playTick(); } catch {} }
          return t - 1;
        });
      }, 1000);
      return () => clearInterval(timerRef.current);
    }
  }, [screen, currentQ, revealed, questions?.length]);

  useEffect(() => {
    if (loading) {
      setLoadingMsg(0);
      loadingMsgRef.current = setInterval(() => { setLoadingMsg(m => (m + 1) % LOADING_MESSAGES.length); }, 3000);
      return () => clearInterval(loadingMsgRef.current);
    }
  }, [loading]);

  useEffect(() => {
    if (screen === 'results') { setCardRevealed(false); setTimeout(() => setCardRevealed(true), 300); }
  }, [screen]);

  const fetchQuiz = async (cat: any): Promise<any> => {
    const res = await fetch(`/api/quiz?category=${cat.label}`);
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return data;
  };

  const startQuiz = async (cat: any) => {
    setCategory(cat); setLoading(cat.id); setError(null); setScreen('home');
    try {
      const data = await fetchQuiz(cat);
      setQuestions(data.questions); setCurrentQ(0); setSelected(null); setRevealed(false);
      setScore(0); setRoundCorrect(0); setStreak(0); setScreen('quiz'); setTimedOut(false); setLastBonus(null);
    } catch { setError("Couldn't load the quiz right now. Try again in a moment."); }
    setLoading(null);
  };

  const handleAnswer = (idx: number) => {
    if (revealed || !questions) return;
    clearInterval(timerRef.current);
    setSelected(idx);
    setRevealed(true);
    setShowContext(false);
    setTimedOut(false);
    const isCorrect = idx === questions[currentQ].correct;
    if (isCorrect) {
      const speedBonus = Math.round(timer * (200 / MAX_TIME) * 0.3);
      const streakBonus = streak >= 2 ? 50 * streak : 0;
      const totalBonus = speedBonus + streakBonus;
      setScore(s => s + 200 + totalBonus);
      setRoundCorrect(r => r + 1);
      setStreak(s => s + 1);
      setLastBonus(speedBonus > 0 ? speedBonus : null);
      if (streak + 1 >= 3) { try { playStreak(); } catch {} setConfettiType('big'); }
      else { try { playCorrect(); } catch {} setConfettiType('normal'); }
      setConfettiTrigger(t => t + 1);
    } else {
      setStreak(0);
      setLastBonus(null);
      try { playWrong(); } catch {}
    }
  };

  const nextQuestion = () => {
    if (!questions) return;
    if (currentQ + 1 >= questions.length) {
      if (roundCorrect === questions.length) { try { playPerfect(); } catch {} setGoldTrigger(t => t + 1); }
      else { try { playComplete(); } catch {} }
      setScreen('results');
    } else { setCurrentQ(c => c + 1); setSelected(null); setRevealed(false); setShowContext(false); setLastBonus(null); setTimedOut(false); }
  };

  const goHome = () => { setScreen('home'); setQuestions(null); setError(null); setShowContext(false); setCopied(false); clearInterval(timerRef.current); };

  const shareText = questions && screen === 'results'
    ? `📰 The Daily Quiz — ${category?.label}\n${Array.from({ length: questions.length }, (_, i) => i < roundCorrect ? '🟩' : '⬜').join('')}\nScore: ${score} pts · ${roundCorrect}/${questions.length} correct\n\nCan you beat me? Play the news.\nhttps://the-daily-quiz.vercel.app`
    : '';

  const handleCopy = async () => { try { await navigator.clipboard.writeText(shareText); } catch {} setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const handleNativeShare = async () => { if (navigator.share) { try { await navigator.share({ title: 'The Daily Quiz', text: shareText }); } catch {} } };
  const hasNativeShare = typeof navigator !== 'undefined' && !!navigator.share;

  const getResultTitle = () => { if (!questions) return ''; if (roundCorrect === questions.length) return '🏆 Perfect Score!'; if (roundCorrect >= 5) return '🧠 Certified News Buff'; if (roundCorrect >= 4) return '📰 Sharp Mind'; if (roundCorrect >= 3) return '📰 Getting There'; if (roundCorrect >= 1) return '🌱 Room to Grow'; return ''; };
  const getResultMessage = () => { if (!questions) return ''; if (roundCorrect === questions.length) return "Flawless. You're officially the most informed person in the room."; if (roundCorrect >= 5) return "Impressive — you clearly know what's happening in the world."; if (roundCorrect >= 4) return "Great work! You're well informed."; if (roundCorrect >= 3) return 'Not bad! A few more rounds and you\'ll be a pro.'; if (roundCorrect >= 1) return "Hey, that's a start. Come back tomorrow and level up."; return ''; };

  return (
    <div className="min-h-screen bg-white text-gray-900" style={{ fontFamily: "'Georgia', serif" }}>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
        @keyframes slideUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        @keyframes expandDown { from { opacity:0; max-height:0; } to { opacity:1; max-height:200px; } }
        @keyframes pulse { 0%,100% { opacity:.4; } 50% { opacity:1; } }
        @keyframes flashGreen { 0% { background-color:rgba(5,150,105,.08); } 100% { background-color:transparent; } }
        @keyframes flashRed { 0% { background-color:rgba(220,38,38,.06); } 100% { background-color:transparent; } }
        @keyframes cardEntrance { from { opacity:0; transform:translateY(24px) scale(.96); } to { opacity:1; transform:translateY(0) scale(1); } }
        @keyframes scoreReveal { from { opacity:0; transform:scale(.5); } to { opacity:1; transform:scale(1); } }
        @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
        @keyframes bonusPop { 0% { opacity:0; transform:translateY(0) scale(.5); } 50% { opacity:1; transform:translateY(-8px) scale(1.1); } 100% { opacity:0; transform:translateY(-20px) scale(.8); } }
        @keyframes timeoutPulse { 0%,100% { opacity:1; } 50% { opacity:.5; } }
        .animate-slide-up { animation:slideUp .2s ease-out forwards; }
        .animate-slide-up-delay { opacity:0; animation:slideUp .2s ease-out .1s forwards; }
        .animate-slide-up-delay-2 { opacity:0; animation:slideUp .2s ease-out .2s forwards; }
        .animate-expand { animation:expandDown .2s ease-out forwards; overflow:hidden; }
        .flash-correct { animation:flashGreen .4s ease-out; }
        .flash-wrong { animation:flashRed .4s ease-out; }
        .card-enter { animation:cardEntrance .7s cubic-bezier(.16,1,.3,1) forwards; }
        .score-reveal { animation:scoreReveal .6s cubic-bezier(.34,1.56,.64,1) .4s both; }
        .fade-in { animation:fadeIn .4s ease-out both; }
        .bonus-pop { animation:bonusPop 1.2s ease-out forwards; }
        .timeout-pulse { animation:timeoutPulse .6s ease-in-out 2; }
        .score-font { font-family:'DM Sans',system-ui,-apple-system,sans-serif; font-variant-numeric:tabular-nums; }
      `}</style>

      <Confetti trigger={confettiTrigger} intensity={confettiType} />
      <GoldConfetti trigger={goldTrigger} />

      <div className="max-w-xl mx-auto px-5">

        {/* HOME */}
        {screen === 'home' && (
          <div>
            <div className="text-center pt-12 pb-5 border-b-2 border-gray-900">
              <p className="text-xs font-semibold tracking-widest text-gray-400 mb-3 font-sans uppercase">{today}</p>
              <h1 className="text-5xl font-bold mb-1 tracking-tight">The Daily Quiz</h1>
              <p className="text-sm text-gray-400 font-sans">Play the news.</p>
            </div>
            {error && <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm font-sans">{error}</div>}
            {loading && (
              <div className="mt-6 mb-4 p-8 text-center">
                <div className="flex justify-center gap-1.5 mb-4">
                  {[0,1,2].map(i => <div key={i} className="w-2 h-2 rounded-full bg-gray-900" style={{ animation:`pulse 1.2s ease-in-out ${i*.2}s infinite` }} />)}
                </div>
                <p className="text-sm text-gray-500 font-sans">{LOADING_MESSAGES[loadingMsg]}</p>
              </div>
            )}
            <div className="flex flex-col pt-2">
              {CATEGORIES.map(cat => (
                <button key={cat.id} onClick={() => startQuiz(cat)} disabled={loading !== null}
                  className="bg-white border-b border-gray-200 py-5 px-1 text-left flex items-center justify-between hover:bg-gray-50 transition-colors disabled:opacity-40">
                  <div>
                    <p className="text-[10px] font-semibold tracking-widest uppercase font-sans mb-1" style={{ color:cat.color }}>{cat.tag}</p>
                    <p className="text-xl font-semibold">{cat.label}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {loading === cat.id ? <span className="text-xs font-semibold font-sans" style={{ color:cat.color }}>Loading…</span> : <span className="text-xs text-gray-300 font-sans">6 questions</span>}
                    <span className="text-gray-300 text-lg">→</span>
                  </div>
                </button>
              ))}
            </div>
            <p className="text-center py-8 text-xs text-gray-300 font-sans">Everyone plays the same quiz · Refreshes daily at 6 PM EST</p>
          </div>
        )}

        {/* QUIZ */}
        {screen === 'quiz' && questions && (
          <div className={`pt-6 ${revealed && !timedOut ? (selected === questions[currentQ].correct ? 'flash-correct' : 'flash-wrong') : ''}`}>
            <div className="flex items-center justify-between pb-3 mb-2 border-b border-gray-200">
              <button onClick={goHome} className="text-sm text-gray-400 font-sans">← Back</button>
              <div className="flex items-center gap-4 relative">
                {streak >= 2 && <span className="text-xs font-semibold font-sans text-amber-600">{streak}× streak 🔥</span>}
                <span className="text-base font-semibold score-font">{score} pts</span>
                {lastBonus && revealed && (
                  <span className="bonus-pop absolute -top-2 right-0 text-xs font-bold text-green-500 score-font">+{lastBonus} speed</span>
                )}
              </div>
            </div>

            <div className="mb-5">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[11px] font-semibold tracking-widest uppercase font-sans" style={{ color:category?.color }}>{category?.tag} · {currentQ+1} of {questions.length}</p>
                <span className={`text-sm font-semibold score-font ${timedOut ? 'text-red-500 timeout-pulse' : timer <= 3 ? 'text-red-500' : 'text-gray-400'}`}>
                  {revealed ? (timedOut ? "Time's up!" : '—') : `${timer}s`}
                </span>
              </div>
              <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-1000 ease-linear"
                  style={{ width: revealed ? '0%' : `${(timer/MAX_TIME)*100}%`, backgroundColor: timer <= 3 ? '#DC2626' : (category?.color || '#1A1A1A') }} />
              </div>
            </div>

            {questions[currentQ].headline && <div className="text-xs text-gray-400 font-sans mb-3 p-2 bg-gray-50 rounded border-l-[3px]" style={{ borderColor:category?.color }}>{questions[currentQ].headline}</div>}

            <h2 className="text-[22px] font-semibold mb-6 leading-snug">{questions[currentQ].question}</h2>

            <div className="flex flex-col gap-2">
              {questions[currentQ].options.map((opt: string, i: number) => {
                const isC = i === questions[currentQ].correct;
                const isS = i === selected;
                let cls = 'border-gray-200 bg-white text-gray-900';
                if (revealed && isC) cls = 'border-green-300 bg-green-50 text-green-900';
                else if (revealed && isS && !isC) cls = 'border-red-300 bg-red-50 text-red-900';
                else if (revealed) cls = 'border-gray-100 bg-white text-gray-300';
                return (
                  <button key={i} disabled={revealed} onClick={() => handleAnswer(i)}
                    className={`border-[1.5px] rounded-lg p-4 text-left text-[15px] font-sans font-medium flex items-center gap-3 transition-all duration-200 ${cls} ${!revealed ? 'hover:bg-gray-50 hover:border-gray-300 cursor-pointer' : 'cursor-default'}`}
                    style={{ opacity: revealed && !isC && !isS ? 0.45 : 1 }}>
                    <span className={`w-7 h-7 rounded-md flex items-center justify-center text-xs font-semibold score-font flex-shrink-0 ${revealed && isC ? 'bg-green-700 text-white' : revealed && isS && !isC ? 'bg-red-700 text-white' : 'bg-gray-100 text-gray-500'}`}>
                      {revealed && isC ? '✓' : revealed && isS && !isC ? '✗' : String.fromCharCode(65+i)}
                    </span>{opt}
                  </button>
                );
              })}
            </div>

            {revealed && (
              <div className="mt-6">
                <div className="animate-slide-up bg-gray-50 rounded-lg p-4 mb-3 border border-gray-200">
                  <p className={`text-xs font-semibold uppercase tracking-wide mb-1 font-sans ${
                    timedOut ? 'text-amber-600' : selected === questions[currentQ].correct ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {timedOut ? "⏱ Time's up — too slow!" : selected === questions[currentQ].correct ? (timer > 6 ? 'Correct — lightning fast! ⚡' : timer > 0 ? 'Correct — nice speed!' : 'Correct') : 'Incorrect'}
                  </p>
                  <p className="text-sm text-gray-500 font-sans leading-relaxed">{questions[currentQ].explanation}</p>
                  {questions[currentQ].context && (
                    <div className="mt-2">
                      {!showContext ? (
                        <button onClick={() => setShowContext(true)} className="text-xs font-sans font-semibold text-blue-600 hover:text-blue-800 transition-colors">Learn more →</button>
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
                  {currentQ+1 >= questions.length ? 'See Results' : 'Next Question'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* RESULTS */}
        {screen === 'results' && questions && (
          <div className="pt-12">
            {roundCorrect === 0 ? (
              <div className="text-center pb-7 border-b-2 border-gray-900 mb-8">
                <p className="text-4xl mb-3">💪</p>
                <h2 className="text-2xl font-bold mb-2">Tough round!</h2>
                <p className="text-sm text-gray-400 font-sans">The news moves fast — come back tomorrow and show it who's boss.</p>
              </div>
            ) : (
              <div className="text-center pb-7 border-b-2 border-gray-900 mb-8">
                <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase font-sans mb-3">{getResultTitle()}</p>
                <p className="text-6xl font-bold score-font"><CountUp target={score} /></p>
                <p className="text-sm text-gray-400 font-sans mt-1">{getResultMessage()}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-px bg-gray-200 rounded-lg overflow-hidden mb-8">
              {[{ label:'Correct', value:`${roundCorrect}/${questions.length}` }, { label:'Category', value:category?.label }].map((s,i) => (
                <div key={i} className="bg-white p-5 text-center">
                  <p className="text-xl font-semibold score-font mb-1">{s.value}</p>
                  <p className="text-[11px] text-gray-400 uppercase tracking-wide font-sans">{s.label}</p>
                </div>
              ))}
            </div>

            {roundCorrect === 0 ? (
              <div className="mb-8 p-5 bg-gray-50 rounded-lg border border-gray-200 text-center">
                <p className="text-sm font-sans text-gray-500 mb-4">Think your friends would do better? Send them the quiz and find out.</p>
                <div className="flex gap-2">
                  <button onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent("Think you know the news? Play the news. 👉 https://the-daily-quiz.vercel.app")}`, '_blank')} className="flex-1 py-3 rounded-lg text-white font-sans font-semibold text-sm" style={{ background:'#25D366' }}>Send Quiz</button>
                  <button onClick={handleCopy} className="flex-1 py-3 rounded-lg border-[1.5px] border-gray-200 font-sans font-semibold text-sm" style={{ background:copied?'#059669':'#FFF', color:copied?'#FFF':'#1A1A1A' }}>{copied ? '✓ Copied!' : '📋 Copy Link'}</button>
                </div>
              </div>
            ) : (
              <div className="mb-8">
                <p className="text-[11px] font-semibold tracking-widest uppercase text-gray-400 font-sans mb-4">Challenge Your Friends</p>

                <div className={`rounded-2xl overflow-hidden mb-5 ${cardRevealed ? 'card-enter' : 'opacity-0'}`}
                  style={{ background:'linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%)', boxShadow:'0 24px 64px rgba(0,0,0,.35)' }}>
                  <div className="m-5 rounded-xl p-7" style={{ background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.08)' }}>
                    <div className={`flex items-start justify-between mb-6 ${cardRevealed?'fade-in':'opacity-0'}`} style={{ animationDelay:'.3s' }}>
                      <div>
                        <p className="text-[10px] tracking-[3px] uppercase" style={{ fontFamily:"'DM Sans',sans-serif", color:'#64748b' }}>{shortDate}</p>
                        <p className="text-lg font-bold text-white mt-1" style={{ fontFamily:"'Georgia',serif" }}>The Daily Quiz</p>
                      </div>
                      <span className="text-[9px] font-bold tracking-[3px] uppercase px-3 py-1.5 rounded-full"
                        style={{ fontFamily:"'DM Sans',sans-serif", color:category?.color, background:`${category?.color}15`, border:`1px solid ${category?.color}25` }}>
                        {category?.tag}
                      </span>
                    </div>
                    <div className={`text-center py-6 ${cardRevealed?'score-reveal':'opacity-0'}`}>
                      <p className="text-7xl font-bold text-white tracking-tight" style={{ fontFamily:"'DM Sans',sans-serif", letterSpacing:'-3px' }}>
                        <CountUp target={score} duration={1500} />
                      </p>
                      <p className="text-[11px] tracking-[3px] uppercase mt-2" style={{ fontFamily:"'DM Sans',sans-serif", color:'#475569' }}>Points</p>
                    </div>
                    <div className="flex gap-[5px] justify-center mb-7">
                      {Array.from({ length:questions.length }, (_,i) => (
                        <div key={i} className={cardRevealed?'fade-in':'opacity-0'} style={{ animationDelay:`${.6+i*.08}s` }}>
                          <div className="h-[6px] rounded-full" style={{ width:44, background:i<roundCorrect?'#22c55e':'rgba(255,255,255,.08)' }} />
                        </div>
                      ))}
                    </div>
                    <div className={`flex justify-between items-center pt-5 ${cardRevealed?'fade-in':'opacity-0'}`} style={{ animationDelay:'1.1s', borderTop:'1px solid rgba(255,255,255,.06)' }}>
                      <p className="text-[11px]" style={{ fontFamily:"'DM Sans',sans-serif", color:'#475569' }}>Play the news.</p>
                      <p className="text-sm font-semibold" style={{ fontFamily:"'DM Sans',sans-serif", color:'#22c55e' }}>{roundCorrect}/{questions.length} · {Math.round((roundCorrect/questions.length)*100)}%</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-2">
                  <button onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`, '_blank')} className="py-3 rounded-lg bg-gray-900 text-white font-sans font-semibold text-sm flex items-center justify-center gap-2">𝕏 Twitter</button>
                  <button onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank')} className="py-3 rounded-lg text-white font-sans font-semibold text-sm flex items-center justify-center gap-2" style={{ background:'#25D366' }}>💬 WhatsApp</button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?quote=${encodeURIComponent(shareText)}`, '_blank')} className="py-3 rounded-lg text-white font-sans font-semibold text-sm flex items-center justify-center gap-2" style={{ background:'#1877F2' }}>f Facebook</button>
                  {hasNativeShare ? (
                    <button onClick={handleNativeShare} className="py-3 rounded-lg border-[1.5px] border-gray-200 text-gray-900 font-sans font-semibold text-sm flex items-center justify-center gap-2">📤 Share</button>
                  ) : (
                    <button onClick={handleCopy} className="py-3 rounded-lg border-[1.5px] border-gray-200 font-sans font-semibold text-sm flex items-center justify-center gap-2" style={{ background:copied?'#059669':'#FFF', color:copied?'#FFF':'#1A1A1A' }}>{copied ? '✓ Copied!' : '📋 Copy'}</button>
                  )}
                </div>
              </div>
            )}

            <div className="mb-8">
              <p className="text-[11px] font-semibold tracking-widest uppercase text-gray-400 font-sans mb-3 pb-2 border-b border-gray-200">Stories Covered</p>
              {questions.map((q,i) => <div key={i} className="py-3 border-b border-gray-100 text-[15px] font-medium">{q.headline || q.question}</div>)}
            </div>

            <div className="flex gap-3 pb-12">
              <button onClick={goHome} className="flex-1 py-3.5 rounded-lg bg-gray-900 text-white font-sans font-semibold text-sm">{roundCorrect === 0 ? 'Try Another Category' : 'New Category'}</button>
              <button onClick={() => startQuiz(category)} className="flex-1 py-3.5 rounded-lg border-[1.5px] border-gray-200 text-gray-900 font-sans font-semibold text-sm">Replay</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}