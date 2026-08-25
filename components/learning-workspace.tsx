'use client'

import { useState } from 'react'
import {
  BrainCircuit,
  Check,
  ChevronRight,
  Code2,
  HelpCircle,
  Lightbulb,
  Loader2,
  RotateCcw,
  Search,
  Sparkles,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Pill } from '@/components/ui/pill'
import { Progress } from '@/components/ui/progress'
import { CodeSandbox } from '@/components/code-sandbox'

export interface Lesson {
  id: number
  title: string
  duration: string
  category: string
  summary: string
  keyPoints: string[]
  starterCode: string
  quiz: {
    question: string
    options: string[]
    correct: number
    explanation: string
  }
}

const LESSONS: Lesson[] = [
  {
    id: 0,
    title: 'Machine Learning Foundations & Supervised Learning',
    duration: '15 min',
    category: 'AI / ML',
    summary: 'Supervised learning models map input features X to target outputs Y using labeled historical datasets. The goal is to learn a generalized function f(X) that minimizes empirical prediction error on unseen test data.',
    keyPoints: [
      'Classification vs Regression target variable types',
      'Training vs Validation vs Test dataset splitting',
      'Overfitting and Regularization (L1 Lasso, L2 Ridge)',
      'Loss functions: Mean Squared Error (MSE), Categorical Cross-Entropy',
    ],
    starterCode: `// Supervised Learning: Mean Squared Error (MSE) Loss Calculator
function computeMSE(y_true, y_pred) {
  if (y_true.length !== y_pred.length) throw new Error("Mismatched dimensions");
  let sumSquaredError = 0;
  for (let i = 0; i < y_true.length; i++) {
    const err = y_true[i] - y_pred[i];
    sumSquaredError += err * err;
  }
  return sumSquaredError / y_true.length;
}

// Sample target values and model predictions
const actualScores = [85, 90, 78, 92, 88];
const predictedModelA = [83, 89, 80, 91, 87];
const predictedModelB = [70, 95, 65, 80, 99];

const mseA = computeMSE(actualScores, predictedModelA);
const mseB = computeMSE(actualScores, predictedModelB);

console.log("Model A Mean Squared Error:", mseA.toFixed(3));
console.log("Model B Mean Squared Error:", mseB.toFixed(3));
console.log("Best performing model:", mseA < mseB ? "Model A (Lower Error)" : "Model B");
`,
    quiz: {
      question: 'Which loss function is standard for multi-class classification tasks?',
      options: ['Mean Squared Error (MSE)', 'Categorical Cross-Entropy', 'Hinge Loss', 'Huber Loss'],
      correct: 1,
      explanation: 'Categorical Cross-Entropy computes the negative log-likelihood of true class probabilities, penalizing confident wrong predictions heavily.',
    },
  },
  {
    id: 1,
    title: 'Linear & Logistic Regression Mechanics',
    duration: '20 min',
    category: 'AI / ML',
    summary: 'Linear regression models continuous outputs via dot product weights. Logistic regression applies the non-linear Sigmoid activation function to map log-odds into a bounded probability [0, 1].',
    keyPoints: [
      'Sigmoid activation function: σ(z) = 1 / (1 + e^-z)',
      'Gradient Descent weight updates: w = w - lr * ∇L',
      'Decision threshold calibration (default 0.50)',
      'Feature scaling and normalization (StandardScaler)',
    ],
    starterCode: `// Logistic Regression: Sigmoid & Decision Boundary
function sigmoid(z) {
  return 1 / (1 + Math.exp(-z));
}

function predict(weights, bias, features) {
  // z = w1*x1 + w2*x2 + ... + b
  const z = features.reduce((sum, x, i) => sum + x * weights[i], 0) + bias;
  const prob = sigmoid(z);
  return { probability: prob, prediction: prob >= 0.5 ? 1 : 0 };
}

// Weights for [StudyHours, AttendanceRate]
const weights = [0.45, 0.03];
const bias = -2.8;

// Test student: 6 study hours, 85% attendance
const student = [6, 85];
const res = predict(weights, bias, student);

console.log("Input student features:", { studyHours: student[0], attendance: student[1] + "%" });
console.log("Estimated pass probability:", (res.probability * 100).toFixed(2) + "%");
console.log("Predicted classification:", res.prediction === 1 ? "PASS (1)" : "AT RISK (0)");
`,
    quiz: {
      question: 'What is the mathematical output range of the Sigmoid activation function?',
      options: ['[-1, 1]', '[0, 1]', '[0, infinity)', '(-infinity, infinity)'],
      correct: 1,
      explanation: 'Sigmoid maps any real-valued number into a continuous probability distribution between 0 and 1.',
    },
  },
  {
    id: 2,
    title: 'Binary Search & Divide-and-Conquer Mastery',
    duration: '25 min',
    category: 'Algorithms',
    summary: 'Binary Search reduces the search space by half in every iteration, achieving O(log N) runtime on sorted sequences or monotonic predicate spaces.',
    keyPoints: [
      'Search space monotonicity requirement',
      'Midpoint overflow avoidance: low + Math.floor((high - low) / 2)',
      'Lower bound vs Upper bound implementations',
      'Binary search on answer space (optimization problems)',
    ],
    starterCode: `// Binary Search: Finding First Occurrence (Lower Bound)
function lowerBound(arr, target) {
  let low = 0;
  let high = arr.length - 1;
  let ans = -1;

  while (low <= high) {
    const mid = low + Math.floor((high - low) / 2);
    if (arr[mid] >= target) {
      ans = mid;
      high = mid - 1; // Look left for first occurrence
    } else {
      low = mid + 1;
    }
  }
  return ans;
}

const arr = [1, 2, 4, 4, 4, 5, 8, 9];
const target = 4;
const firstIndex = lowerBound(arr, target);

console.log("Array:", arr);
console.log(\`First occurrence of \${target} starts at index \${firstIndex}\`);
`,
    quiz: {
      question: 'How many maximum comparisons does Binary Search need for an array of 1,024 sorted elements?',
      options: ['10', '100', '512', '1024'],
      correct: 0,
      explanation: 'log2(1024) = 10 comparisons in the worst-case.',
    },
  },
  {
    id: 3,
    title: 'Dynamic Programming & Memoization Patterns',
    duration: '30 min',
    category: 'Algorithms',
    summary: 'Dynamic Programming solves optimization problems by breaking them into overlapping sub-problems and caching state transitions.',
    keyPoints: [
      'Optimal substructure property',
      'Overlapping subproblems property',
      'Top-down recursion with Memoization vs Bottom-up Tabulation',
      'Space optimization via state reduction',
    ],
    starterCode: `// 0/1 Knapsack Problem using Dynamic Programming Tabulation
function knapsack(weights, values, capacity) {
  const n = weights.length;
  // dp[i][w] = max value using first i items with weight capacity w
  const dp = Array.from({ length: n + 1 }, () => Array(capacity + 1).fill(0));

  for (let i = 1; i <= n; i++) {
    for (let w = 0; w <= capacity; w++) {
      if (weights[i - 1] <= w) {
        dp[i][w] = Math.max(
          dp[i - 1][w],
          dp[i - 1][w - weights[i - 1]] + values[i - 1]
        );
      } else {
        dp[i][w] = dp[i - 1][w];
      }
    }
  }
  return dp[n][capacity];
}

const weights = [2, 3, 4, 5];
const values = [3, 4, 5, 8];
const capacity = 8;

const maxVal = knapsack(weights, values, capacity);
console.log("Weights:", weights);
console.log("Values:", values);
console.log(\`Max value for knapsack capacity \${capacity} = \${maxVal}\`);
`,
    quiz: {
      question: 'What two properties must a problem have to be solved with Dynamic Programming?',
      options: [
        'Sorted array and binary tree',
        'Optimal substructure and overlapping subproblems',
        'Linear time and constant space',
        'Recursion without base case',
      ],
      correct: 1,
      explanation: 'A problem must exhibit optimal substructure and overlapping subproblems for DP memoization to apply.',
    },
  },
]

export function LearningWorkspace({
  active,
  subjects,
  notify,
}: {
  active: string
  subjects: any[]
  notify: (msg: string) => void
}) {
  const [selectedLesson, setSelectedLesson] = useState<number>(0)
  const [completedLessons, setCompletedLessons] = useState<number[]>([0])
  const [quizAnswer, setQuizAnswer] = useState<number | null>(null)
  const [showExplanation, setShowExplanation] = useState(false)
  const [showSandbox, setShowSandbox] = useState(true)

  // AI Learning State
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [aiContent, setAiContent] = useState<string | null>(null)
  const [aiQuizData, setAiQuizData] = useState<any | null>(null)
  const [aiQuizAnswer, setAiQuizAnswer] = useState<number | null>(null)
  const [showAiQuizExplanation, setShowAiQuizExplanation] = useState(false)
  const [aiLanguage, setAiLanguage] = useState<'Hinglish' | 'English'>('Hinglish')

  const activeLesson = LESSONS[selectedLesson] || LESSONS[0]
  const isLessonDone = completedLessons.includes(selectedLesson)

  const callAiLearn = async (action: 'explain' | 'simplify' | 'examples' | 'quiz' | 'hint' | 'recommendNext') => {
    setAiLoading(true)
    setAiError(null)
    setAiContent(null)
    setAiQuizData(null)
    setAiQuizAnswer(null)
    setShowAiQuizExplanation(false)

    try {
      const res = await fetch('/api/ai/learn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          topicTitle: activeLesson.title,
          topicCategory: activeLesson.category,
          currentQuestion: activeLesson.quiz.question,
          language: aiLanguage,
        }),
      })

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}))
        throw new Error(errJson.error || `AI Learning request failed with status ${res.status}`)
      }
      const data = await res.json()

      if (action === 'quiz' && data.data?.questions) {
        setAiQuizData(data.data.questions[0])
        notify('Generated fresh adaptive concept assessment with Gemini!')
      } else if (action === 'recommendNext' && data.data?.recommendations) {
        const text = data.data.recommendations
          .map((r: any, idx: number) => `**${idx + 1}. ${r.topic}** (${r.category})\n- ${r.reason}`)
          .join('\n\n')
        setAiContent(text)
        notify('Generated next high-yield topic recommendations!')
      } else if (data.content) {
        setAiContent(data.content)
        notify(`Gemini ${action} generated!`)
      }
    } catch (err: any) {
      console.error('AI Learn error:', err)
      const msg = err?.message || 'Could not complete AI learning request.'
      setAiError(msg)
      notify(msg)
    } finally {
      setAiLoading(false)
    }
  }

  const toggleLessonComplete = (idx: number) => {
    if (completedLessons.includes(idx)) {
      setCompletedLessons(completedLessons.filter((i) => i !== idx))
      notify('Lesson marked in progress.')
    } else {
      setCompletedLessons([...completedLessons, idx])
      notify('Lesson completed! Momentum +1')
    }
  }

  return (
    <div className="space-y-6">
      <div className="learning-layout">
        <div className="surface learning-feature">
          <div className="learning-art">
            <BrainCircuit />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <Pill tone="blue">{active.toUpperCase()} WORKSPACE</Pill>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-zinc-400 font-mono">Tutor Language:</span>
              <button
                className={`text-[11px] px-2 py-0.5 rounded transition ${
                  aiLanguage === 'Hinglish'
                    ? 'bg-violet-500/20 text-violet-300 font-semibold border border-violet-500/30'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
                onClick={() => setAiLanguage('Hinglish')}
              >
                Hinglish
              </button>
              <button
                className={`text-[11px] px-2 py-0.5 rounded transition ${
                  aiLanguage === 'English'
                    ? 'bg-violet-500/20 text-violet-300 font-semibold border border-violet-500/30'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
                onClick={() => setAiLanguage('English')}
              >
                English
              </button>
            </div>
          </div>

          <h2>{activeLesson.title}</h2>
          <p className="muted">{activeLesson.summary}</p>

          <div className="my-4">
            <div className="flex justify-between text-xs text-zinc-400 mb-1">
              <span>Progress ({completedLessons.length} of {LESSONS.length} complete)</span>
              <span className="font-mono">{Math.round((completedLessons.length / LESSONS.length) * 100)}%</span>
            </div>
            <Progress value={Math.round((completedLessons.length / LESSONS.length) * 100)} color="blue" />
          </div>

          {/* AI Assistive Actions Bar */}
          <div className="p-3 rounded-xl bg-violet-950/20 border border-violet-500/20 my-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs text-violet-300 font-mono">
                <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                <strong>GEMINI AI LEARNING SUITE</strong>
              </div>
              {aiLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-violet-400" />}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-7"
                disabled={aiLoading}
                onClick={() => callAiLearn('explain')}
              >
                <BrainCircuit className="w-3 h-3 mr-1 text-violet-400" /> Explain Concept
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-7"
                disabled={aiLoading}
                onClick={() => callAiLearn('simplify')}
              >
                <Lightbulb className="w-3 h-3 mr-1 text-amber-400" /> Simplify (ELI5)
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-7"
                disabled={aiLoading}
                onClick={() => callAiLearn('examples')}
              >
                <Code2 className="w-3 h-3 mr-1 text-cyan-400" /> Code Examples
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-7"
                disabled={aiLoading}
                onClick={() => callAiLearn('quiz')}
              >
                <Sparkles className="w-3 h-3 mr-1 text-emerald-400" /> AI Practice Quiz
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-7"
                disabled={aiLoading}
                onClick={() => callAiLearn('recommendNext')}
              >
                <Zap className="w-3 h-3 mr-1 text-pink-400" /> Recommend Next
              </Button>
            </div>

            {/* AI Error Banner */}
            {aiError && (
              <div className="mt-3 pt-3 border-t border-red-500/20 text-xs text-red-300 flex items-center justify-between gap-2">
                <span>⚠️ {aiError}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => callAiLearn('explain')}
                  className="text-xs h-6 text-red-200 hover:bg-red-950/40"
                >
                  Retry
                </Button>
              </div>
            )}

            {/* AI Generated Content Output */}
            {aiContent && (
              <div className="mt-3 pt-3 border-t border-white/10 text-xs text-zinc-200 whitespace-pre-wrap leading-relaxed">
                {aiContent}
              </div>
            )}

            {/* AI Generated Quiz */}
            {aiQuizData && (
              <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
                <p className="text-xs font-semibold text-white">{aiQuizData.question}</p>
                <div className="space-y-1.5">
                  {aiQuizData.options.map((opt: string, idx: number) => {
                    const isSelected = aiQuizAnswer === idx
                    const isCorrect = idx === aiQuizData.correctIndex
                    let btnClass = 'border-white/10 hover:border-violet-500/40 text-zinc-300'
                    if (showAiQuizExplanation) {
                      if (isCorrect) btnClass = 'border-emerald-500/80 bg-emerald-500/10 text-emerald-300 font-semibold'
                      else if (isSelected) btnClass = 'border-red-500/80 bg-red-500/10 text-red-300'
                    }
                    return (
                      <button
                        key={idx}
                        className={`w-full text-left p-2 rounded-lg text-xs border transition ${btnClass}`}
                        onClick={() => {
                          setAiQuizAnswer(idx)
                          setShowAiQuizExplanation(true)
                        }}
                      >
                        <span className="font-mono mr-2">{String.fromCharCode(65 + idx)})</span> {opt}
                      </button>
                    )
                  })}
                </div>
                {showAiQuizExplanation && (
                  <p className="text-xs text-zinc-400 mt-2 italic">
                    💡 {aiQuizData.explanation}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="surface p-4 rounded-xl border border-white/5 my-4 bg-black/40">
            <strong className="block text-xs uppercase tracking-wider text-violet-400 mb-2 font-mono">
              Core Takeaways
            </strong>
            <ul className="text-xs text-zinc-300 space-y-1.5 list-disc list-inside">
              {activeLesson.keyPoints.map((pt, i) => (
                <li key={i}>{pt}</li>
              ))}
            </ul>
          </div>

          {/* Interactive Self-Assessment Quiz */}
          <div className="surface p-4 rounded-xl border border-white/5 my-4 bg-violet-950/20">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-violet-400" />
                <strong className="text-xs uppercase tracking-wider text-violet-300 font-mono">
                  Quick Concept Check
                </strong>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-[11px] h-6 text-zinc-400 hover:text-white"
                onClick={() => callAiLearn('hint')}
                disabled={aiLoading}
              >
                <HelpCircle className="w-3 h-3 mr-1" /> Get Hint
              </Button>
            </div>
            <p className="text-sm font-medium text-white mb-3">{activeLesson.quiz.question}</p>
            <div className="space-y-2">
              {activeLesson.quiz.options.map((opt, i) => {
                const isSelected = quizAnswer === i
                const isCorrect = i === activeLesson.quiz.correct
                let btnClass = 'border-white/10 hover:border-violet-500/40 text-zinc-300'
                if (showExplanation) {
                  if (isCorrect) btnClass = 'border-emerald-500/80 bg-emerald-500/10 text-emerald-300 font-semibold'
                  else if (isSelected) btnClass = 'border-red-500/80 bg-red-500/10 text-red-300'
                }
                return (
                  <button
                    key={i}
                    className={`w-full text-left p-2.5 rounded-lg text-xs border transition ${btnClass}`}
                    onClick={() => {
                      setQuizAnswer(i)
                      setShowExplanation(true)
                    }}
                  >
                    <span className="font-mono mr-2">{String.fromCharCode(65 + i)})</span> {opt}
                  </button>
                )
              })}
            </div>
            {showExplanation && (
              <p className="text-xs text-zinc-400 mt-3 pt-2 border-t border-white/5">
                💡 {activeLesson.quiz.explanation}
              </p>
            )}
          </div>

          <div className="learning-foot">
            <span>{activeLesson.duration} interactive session</span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSandbox((prev) => !prev)}
                className="text-xs"
              >
                <Code2 className="w-3.5 h-3.5 mr-1" />
                {showSandbox ? 'Hide Sandbox' : 'Practice in Sandbox'}
              </Button>
              <Button
                className={isLessonDone ? 'variant-outline' : 'primary-btn'}
                onClick={() => toggleLessonComplete(selectedLesson)}
              >
                {isLessonDone ? <RotateCcw data-icon="inline-start" /> : <Check data-icon="inline-start" />}
                {isLessonDone ? 'Mark as Incomplete' : 'Complete Lesson'}
              </Button>
            </div>
          </div>
        </div>

        <div className="learning-list surface">
          <div className="card-head">
            <div>
              <span className="eyebrow">CURRICULUM</span>
              <h3>Interactive Modules</h3>
            </div>
            <Search />
          </div>
          {LESSONS.map((l, i) => {
            const isDone = completedLessons.includes(i)
            const isCurrent = selectedLesson === i
            return (
              <div
                className={`lesson-row cursor-pointer transition ${
                  isCurrent ? 'bg-white/5 rounded-xl border border-violet-500/30' : ''
                }`}
                key={l.title}
                onClick={() => {
                  setSelectedLesson(i)
                  setQuizAnswer(null)
                  setShowExplanation(false)
                  setAiContent(null)
                  setAiQuizData(null)
                }}
              >
                <div className={`lesson-num ${isDone ? 'done' : ''}`}>{isDone ? <Check /> : i + 1}</div>
                <div className="flex-1">
                  <strong className={isCurrent ? 'text-violet-300' : 'text-white'}>{l.title}</strong>
                  <small>{isDone ? 'Completed' : l.duration}</small>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-500" />
              </div>
            )
          })}
        </div>
      </div>

      {/* Embedded Live Code Sandbox */}
      {showSandbox && (
        <CodeSandbox
          key={`sandbox-lesson-${activeLesson.id}`}
          initialCode={activeLesson.starterCode}
          title={`Live Code Practice: ${activeLesson.title}`}
          description={`Run and modify algorithm experiments directly in your browser. Changes are executed safely in an isolated Web Worker.`}
          onRun={(code) => {
            notify('Code executed in JavaScript sandbox.')
          }}
        />
      )}
    </div>
  )
}
