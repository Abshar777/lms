'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, XCircle, Clock, Trophy, RotateCcw, ChevronRight, Loader2 } from 'lucide-react'
import { useStudentQuiz, useQuizSummary, useSubmitQuiz, type QuizQuestion, type SubmitQuizResult } from '@/lib/api/quizzes'

interface Props {
  lessonId: string
  onPassed?: () => void  // callback when quiz is passed (e.g. navigate to next lesson)
}

type Phase = 'summary' | 'taking' | 'result'

export function QuizPlayer({ lessonId, onPassed }: Props) {
  const { data: quiz,    isLoading: quizLoading }    = useStudentQuiz(lessonId)
  const { data: summary, isLoading: summaryLoading } = useQuizSummary(lessonId)
  const submit = useSubmitQuiz(lessonId)

  const [phase,   setPhase]   = useState<Phase>('summary')
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [result,  setResult]  = useState<SubmitQuizResult | null>(null)
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  /* Start timer when taking phase begins */
  useEffect(() => {
    if (phase === 'taking' && quiz?.timeLimit) {
      setTimeLeft(quiz.timeLimit * 60)
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev === null || prev <= 1) {
            clearInterval(timerRef.current!)
            void handleSubmit()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  const handleSubmit = async () => {
    if (!quiz) return
    const answerList = quiz.questions.map(q => ({
      questionId: q.id,
      answer:     answers[q.id] ?? '',
    }))
    const res = await submit.mutateAsync(answerList)
    setResult(res)
    setPhase('result')
    if (res.passed) onPassed?.()
  }

  const startQuiz = () => {
    setAnswers({})
    setResult(null)
    setPhase('taking')
  }

  if (quizLoading || summaryLoading) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-2xl bg-gray-50">
        <Loader2 size={24} className="animate-spin text-[#0057b8]" />
      </div>
    )
  }

  if (!quiz) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-2xl bg-gray-50">
        <p className="text-sm text-gray-500">No quiz found for this lesson.</p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-2xl border bg-white" style={{ borderColor: '#E4E7ED' }}>
      <AnimatePresence mode="wait">
        {phase === 'summary' && (
          <SummaryPanel key="summary" quiz={quiz} summary={summary} onStart={startQuiz} />
        )}
        {phase === 'taking' && (
          <TakingPanel key="taking" quiz={quiz} answers={answers} timeLeft={timeLeft}
            onAnswer={(qid, ans) => setAnswers(prev => ({ ...prev, [qid]: ans }))}
            onSubmit={handleSubmit} isPending={submit.isPending} />
        )}
        {phase === 'result' && result && (
          <ResultPanel key="result" result={result} passPercent={quiz.passPercent}
            onRetry={startQuiz} />
        )}
      </AnimatePresence>
    </div>
  )
}

/* ─── Summary panel (before attempt) ─────────────── */
function SummaryPanel({ quiz, summary, onStart }: {
  quiz:    { passPercent: number; timeLimit: number | null; questions: QuizQuestion[] }
  summary: { hasAttempted: boolean; bestScore: number | null; passed: boolean; attempts: number } | undefined
  onStart: () => void
}) {
  const hasPassed = summary?.passed ?? false

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="p-8 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl mx-auto"
        style={{ background: hasPassed ? 'rgba(34,197,94,0.10)' : 'rgba(0,87,184,0.10)' }}>
        <Trophy size={28} style={{ color: hasPassed ? '#22C55E' : '#0057b8' }} />
      </div>

      <h2 className="mb-1 text-xl font-bold" style={{ color: '#0D0F1A', fontFamily: 'Bricolage Grotesque, sans-serif' }}>
        {hasPassed ? 'Quiz completed!' : 'Ready for the quiz?'}
      </h2>
      <p className="mb-6 text-sm" style={{ color: '#9CA3AF' }}>
        {quiz.questions.length} questions · Pass at {quiz.passPercent}%
        {quiz.timeLimit ? ` · ${quiz.timeLimit} min limit` : ''}
      </p>

      {summary?.hasAttempted && (
        <div className="mb-6 inline-flex items-center gap-4 rounded-2xl px-6 py-3"
          style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
          <div>
            <p className="text-[11px] uppercase tracking-widest" style={{ color: '#9CA3AF' }}>Best score</p>
            <p className="text-lg font-bold" style={{ color: hasPassed ? '#22C55E' : '#EF4444' }}>
              {summary.bestScore?.toFixed(0) ?? 0}%
            </p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-widest" style={{ color: '#9CA3AF' }}>Attempts</p>
            <p className="text-lg font-bold" style={{ color: '#0D0F1A' }}>{summary.attempts}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-widest" style={{ color: '#9CA3AF' }}>Status</p>
            <p className="text-sm font-bold" style={{ color: hasPassed ? '#22C55E' : '#F59E0B' }}>
              {hasPassed ? '✓ Passed' : 'Not yet'}
            </p>
          </div>
        </div>
      )}

      <button onClick={onStart}
        className="inline-flex items-center gap-2 rounded-xl px-8 py-3 text-sm font-bold text-white"
        style={{ background: 'linear-gradient(135deg, #0057b8, #1a73e8)' }}>
        {summary?.hasAttempted ? <><RotateCcw size={14} />Retry quiz</> : <><ChevronRight size={14} />Start quiz</>}
      </button>
    </motion.div>
  )
}

/* ─── Taking panel ────────────────────────────────── */
function TakingPanel({ quiz, answers, timeLeft, onAnswer, onSubmit, isPending }: {
  quiz:      { passPercent: number; questions: QuizQuestion[] }
  answers:   Record<string, string>
  timeLeft:  number | null
  onAnswer:  (qid: string, ans: string) => void
  onSubmit:  () => void
  isPending: boolean
}) {
  const answered = Object.keys(answers).filter(k => answers[k] !== '').length

  const fmtTime = (secs: number) => `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`
  const timeWarn = timeLeft !== null && timeLeft < 60

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
      {/* Header */}
      <div className="flex items-center justify-between border-b px-6 py-4" style={{ borderColor: '#F0F1F5' }}>
        <p className="text-sm font-semibold" style={{ color: '#0D0F1A' }}>
          {answered}/{quiz.questions.length} answered
        </p>
        {timeLeft !== null && (
          <div className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold"
            style={{ background: timeWarn ? 'rgba(239,68,68,0.08)' : '#F9FAFB', color: timeWarn ? '#EF4444' : '#374151' }}>
            <Clock size={13} />
            {fmtTime(timeLeft)}
          </div>
        )}
        {/* Progress bar */}
        <div className="h-1.5 w-32 overflow-hidden rounded-full" style={{ background: '#F3F4F6' }}>
          <div className="h-full rounded-full transition-all"
            style={{ width: `${(answered / quiz.questions.length) * 100}%`, background: '#0057b8' }} />
        </div>
      </div>

      {/* Questions */}
      <div className="space-y-6 p-6">
        {quiz.questions.map((q, qi) => (
          <QuestionItem key={q.id} question={q} index={qi} answer={answers[q.id] ?? ''} onAnswer={onAnswer} />
        ))}
      </div>

      {/* Submit */}
      <div className="border-t px-6 py-4" style={{ borderColor: '#F0F1F5' }}>
        <button onClick={onSubmit} disabled={isPending}
          className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg, #0057b8, #1a73e8)' }}>
          {isPending ? <Loader2 size={14} className="animate-spin" /> : null}
          Submit quiz ({answered}/{quiz.questions.length} answered)
        </button>
      </div>
    </motion.div>
  )
}

function QuestionItem({ question: q, index, answer, onAnswer }: {
  question: QuizQuestion
  index:    number
  answer:   string
  onAnswer: (qid: string, ans: string) => void
}) {
  return (
    <div>
      <p className="mb-3 text-sm font-semibold" style={{ color: '#0D0F1A' }}>
        <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold text-white"
          style={{ background: '#0057b8' }}>{index + 1}</span>
        {q.text}
        {q.points > 1 && <span className="ml-2 text-[11px] font-normal" style={{ color: '#9CA3AF' }}>({q.points} pts)</span>}
      </p>

      {q.type === 'short' ? (
        <input value={answer} onChange={e => onAnswer(q.id, e.target.value)}
          placeholder="Type your answer…"
          className="w-full rounded-xl border px-4 py-2.5 text-sm text-gray-800 outline-none focus:border-orange-400"
          style={{ borderColor: '#E5E7EB' }}
        />
      ) : (
        <div className="space-y-2">
          {q.choices.map((c, ci) => {
            const val = String(ci)
            const chosen = answer === val
            return (
              <button key={ci} onClick={() => onAnswer(q.id, val)}
                className="flex w-full items-center gap-3 rounded-xl border px-4 py-2.5 text-left text-sm transition-colors"
                style={{
                  borderColor: chosen ? '#0057b8' : '#E5E7EB',
                  background:  chosen ? 'rgba(0,87,184,0.06)' : '#FAFAFA',
                  color:       '#374151',
                }}>
                <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors"
                  style={{ borderColor: chosen ? '#0057b8' : '#D1D5DB', background: chosen ? '#0057b8' : 'transparent' }}>
                  {chosen && <span className="h-2 w-2 rounded-full bg-white" />}
                </span>
                {c}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ─── Result panel ────────────────────────────────── */
function ResultPanel({ result, passPercent, onRetry }: {
  result:      SubmitQuizResult
  passPercent: number
  onRetry:     () => void
}) {
  const pct = result.scorePercent

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-6">
      {/* Score ring */}
      <div className="mb-6 flex flex-col items-center">
        <div className="relative mb-3">
          <svg width={100} height={100}>
            <circle cx={50} cy={50} r={42} fill="none" stroke="#F3F4F6" strokeWidth={8} />
            <motion.circle cx={50} cy={50} r={42} fill="none"
              stroke={result.passed ? '#22C55E' : '#EF4444'} strokeWidth={8}
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 42}
              initial={{ strokeDashoffset: 2 * Math.PI * 42 }}
              animate={{ strokeDashoffset: 2 * Math.PI * 42 - (pct / 100) * 2 * Math.PI * 42 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              style={{ transformOrigin: '50% 50%', transform: 'rotate(-90deg)' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-bold" style={{ color: result.passed ? '#22C55E' : '#EF4444' }}>
              {pct.toFixed(0)}%
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {result.passed
            ? <><CheckCircle2 size={18} style={{ color: '#22C55E' }} /><span className="font-bold text-green-600">Passed!</span></>
            : <><XCircle size={18} style={{ color: '#EF4444' }} /><span className="font-bold text-red-500">Not passed</span></>}
        </div>
        <p className="mt-1 text-xs" style={{ color: '#9CA3AF' }}>
          {result.score}/{result.maxScore} points · Pass threshold: {passPercent}%
        </p>
      </div>

      {/* Breakdown */}
      <div className="mb-6 space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: '#9CA3AF' }}>Answer breakdown</p>
        {result.breakdown.map((b, i) => (
          <div key={b.questionId} className="flex items-start gap-3 rounded-xl p-3"
            style={{ background: b.correct ? 'rgba(34,197,94,0.05)' : 'rgba(239,68,68,0.05)', border: `1px solid ${b.correct ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)'}` }}>
            <span className="mt-0.5 flex-shrink-0">
              {b.correct
                ? <CheckCircle2 size={14} style={{ color: '#22C55E' }} />
                : <XCircle size={14} style={{ color: '#EF4444' }} />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold" style={{ color: '#0D0F1A' }}>Question {i + 1}</p>
              {!b.correct && (
                <p className="text-xs" style={{ color: '#6B7280' }}>
                  Correct: <span className="font-semibold">{b.correctAnswer}</span>
                </p>
              )}
              {b.explanation && (
                <p className="mt-0.5 text-xs italic" style={{ color: '#9CA3AF' }}>{b.explanation}</p>
              )}
            </div>
            <span className="text-xs font-semibold" style={{ color: b.correct ? '#22C55E' : '#EF4444' }}>
              {b.correct ? `+${b.points}` : '0'}
            </span>
          </div>
        ))}
      </div>

      {!result.passed && (
        <button onClick={onRetry}
          className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white"
          style={{ background: 'linear-gradient(135deg, #0057b8, #1a73e8)' }}>
          <RotateCcw size={14} />Try again
        </button>
      )}
    </motion.div>
  )
}
