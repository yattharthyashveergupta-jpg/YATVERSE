'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Play, RotateCcw, Trash2, Terminal, Sparkles, Check, AlertCircle, Clock, Code2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export interface LogEntry {
  id: string
  type: 'log' | 'info' | 'warn' | 'error' | 'result'
  content: string
  timestamp: string
}

export interface CodeSandboxProps {
  initialCode?: string
  title?: string
  description?: string
  snippets?: { name: string; code: string }[]
  onRun?: (code: string, logs: LogEntry[]) => void
}

const DEFAULT_SNIPPETS = [
  {
    name: 'Sigmoid Activation (ML)',
    code: `// Sigmoid activation function used in Logistic Regression
function sigmoid(z) {
  return 1 / (1 + Math.exp(-z));
}

// Predict probability for task urgency score
const testInputs = [-5, -2, 0, 1.5, 4];
console.log("=== Sigmoid Probability Mapping ===");
testInputs.forEach(z => {
  const prob = sigmoid(z);
  console.log(\`z = \${z.toString().padStart(4)} -> P(completion) = \${(prob * 100).toFixed(1)}%\`);
});
`,
  },
  {
    name: 'Binary Search (DSA)',
    code: `// Binary Search on a sorted array - O(log N)
function binarySearch(arr, target) {
  let low = 0;
  let high = arr.length - 1;
  let comparisons = 0;

  while (low <= high) {
    comparisons++;
    const mid = low + Math.floor((high - low) / 2);
    if (arr[mid] === target) {
      return { index: mid, comparisons };
    } else if (arr[mid] < target) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return { index: -1, comparisons };
}

const dataset = [2, 5, 8, 12, 16, 23, 38, 56, 72, 91, 105, 142];
const target = 56;
const result = binarySearch(dataset, target);
console.log("Searching in array:", dataset);
console.log(\`Target \${target} found at index \${result.index} after \${result.comparisons} comparisons.\`);
`,
  },
  {
    name: 'Dynamic Programming Memoization',
    code: `// Fibonacci with Top-Down DP Memoization
function fibMemo(n, memo = {}) {
  if (n in memo) return memo[n];
  if (n <= 1) return n;
  
  memo[n] = fibMemo(n - 1, memo) + fibMemo(n - 2, memo);
  return memo[n];
}

console.log("=== Fibonacci DP Computed Values ===");
for (let i = 1; i <= 10; i++) {
  console.log(\`Fib(\${i}) = \${fibMemo(i)}\`);
}
console.log("Fib(40) =", fibMemo(40));
`,
  },
]

export function CodeSandbox({
  initialCode,
  title = 'In-Browser JavaScript Sandbox',
  description = 'Safe isolated runtime for practicing engineering algorithms and testing code snippets.',
  snippets = DEFAULT_SNIPPETS,
  onRun,
}: CodeSandboxProps) {
  const defaultCode = initialCode || snippets[0]?.code || '// Write JavaScript code here\nconsole.log("Hello from YATVERSE Sandbox!");\n'
  const [code, setCode] = useState(defaultCode)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [executionTime, setExecutionTime] = useState<number | null>(null)
  const activeWorkerRef = useRef<Worker | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Clean up workers on unmount
  useEffect(() => {
    return () => {
      if (activeWorkerRef.current) {
        activeWorkerRef.current.terminate()
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const executeCode = useCallback(() => {
    if (isRunning) return
    setIsRunning(true)
    setLogs([])
    setExecutionTime(null)

    const startTime = performance.now()
    const collectedLogs: LogEntry[] = []

    // Terminate any previous worker
    if (activeWorkerRef.current) {
      activeWorkerRef.current.terminate()
      activeWorkerRef.current = null
    }

    // Isolated Worker Code Template
    const workerScript = `
      self.onmessage = async function(e) {
        const userCode = e.data;
        const sendLog = (type, content) => {
          self.postMessage({ type: 'log', logType: type, content: String(content) });
        };

        const formatArgs = (args) => {
          return args.map(arg => {
            if (arg === null) return 'null';
            if (arg === undefined) return 'undefined';
            if (typeof arg === 'object') {
              try {
                return JSON.stringify(arg, null, 2);
              } catch(err) {
                return String(arg);
              }
            }
            return String(arg);
          }).join(' ');
        };

        // Override console in worker
        const customConsole = {
          log: (...args) => sendLog('log', formatArgs(args)),
          info: (...args) => sendLog('info', formatArgs(args)),
          warn: (...args) => sendLog('warn', formatArgs(args)),
          error: (...args) => sendLog('error', formatArgs(args)),
          table: (...args) => sendLog('log', formatArgs(args)),
          dir: (...args) => sendLog('log', formatArgs(args)),
        };

        try {
          // Restrict access to worker globals
          const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
          const runner = new AsyncFunction('console', userCode);
          const result = await runner(customConsole);
          
          if (result !== undefined) {
            sendLog('result', '=> ' + (typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result)));
          }
          self.postMessage({ type: 'done' });
        } catch (err) {
          sendLog('error', (err && err.stack) ? err.stack : String(err));
          self.postMessage({ type: 'done' });
        }
      };
    `

    try {
      const blob = new Blob([workerScript], { type: 'application/javascript' })
      const workerUrl = URL.createObjectURL(blob)
      const worker = new Worker(workerUrl)
      activeWorkerRef.current = worker

      // Set a strict 3000ms safety timeout to kill infinite loops
      timeoutRef.current = setTimeout(() => {
        if (activeWorkerRef.current) {
          activeWorkerRef.current.terminate()
          activeWorkerRef.current = null
          const time = Math.round(performance.now() - startTime)
          setExecutionTime(time)
          const timeoutEntry: LogEntry = {
            id: `err-${Date.now()}`,
            type: 'error',
            content: 'Execution timed out (3.0s limit reached). Infinite loop or heavy blocking call detected.',
            timestamp: new Date().toLocaleTimeString(),
          }
          setLogs((prev) => [...prev, timeoutEntry])
          setIsRunning(false)
        }
      }, 3000)

      worker.onmessage = (e) => {
        const msg = e.data
        if (msg.type === 'log') {
          const entry: LogEntry = {
            id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            type: msg.logType,
            content: msg.content,
            timestamp: new Date().toLocaleTimeString(),
          }
          collectedLogs.push(entry)
          setLogs((prev) => [...prev, entry])
        } else if (msg.type === 'done') {
          if (timeoutRef.current) clearTimeout(timeoutRef.current)
          const time = Math.round(performance.now() - startTime)
          setExecutionTime(time)
          setIsRunning(false)
          worker.terminate()
          activeWorkerRef.current = null
          URL.revokeObjectURL(workerUrl)
          onRun?.(code, collectedLogs)
        }
      }

      worker.onerror = (err) => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current)
        const time = Math.round(performance.now() - startTime)
        setExecutionTime(time)
        const errorEntry: LogEntry = {
          id: `err-${Date.now()}`,
          type: 'error',
          content: err.message || 'Worker runtime execution error.',
          timestamp: new Date().toLocaleTimeString(),
        }
        setLogs((prev) => [...prev, errorEntry])
        setIsRunning(false)
        worker.terminate()
        activeWorkerRef.current = null
        URL.revokeObjectURL(workerUrl)
      }

      worker.postMessage(code)
    } catch (err: any) {
      setIsRunning(false)
      setLogs([{
        id: `err-${Date.now()}`,
        type: 'error',
        content: `Could not launch sandbox worker: ${err.message}`,
        timestamp: new Date().toLocaleTimeString(),
      }])
    }
  }, [code, isRunning, onRun])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Support Tab for indentation
    if (e.key === 'Tab') {
      e.preventDefault()
      const target = e.target as HTMLTextAreaElement
      const start = target.selectionStart
      const end = target.selectionEnd
      const newCode = code.substring(0, start) + '  ' + code.substring(end)
      setCode(newCode)
      setTimeout(() => {
        target.selectionStart = target.selectionEnd = start + 2
      }, 0)
    }
    // Support Cmd/Ctrl + Enter to run
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      executeCode()
    }
  }

  const lineCount = code.split('\n').length

  return (
    <div className="surface p-5 rounded-2xl border border-white/5 bg-zinc-950/60 flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="pill pill-violet text-xs font-semibold">
              <Code2 className="w-3 h-3 inline mr-1" />
              JS ENGINE
            </span>
            <span className="text-xs text-zinc-500 font-mono">Isolated Web Worker · 3s limit</span>
          </div>
          <h3 className="text-lg font-bold text-white mt-1">{title}</h3>
          <p className="text-xs text-zinc-400">{description}</p>
        </div>

        {/* Snippet Picker */}
        <div className="flex items-center gap-2">
          {snippets.length > 0 && (
            <select
              className="text-xs bg-zinc-900 border border-white/10 text-zinc-300 rounded-lg px-2.5 py-1.5 outline-none focus:border-violet-500"
              onChange={(e) => {
                const found = snippets.find((s) => s.name === e.target.value)
                if (found) {
                  setCode(found.code)
                  setLogs([])
                }
              }}
              defaultValue=""
            >
              <option value="" disabled>Load Starter Snippet...</option>
              {snippets.map((s) => (
                <option key={s.name} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setCode(defaultCode)
              setLogs([])
            }}
            title="Reset code to original"
            className="text-xs text-zinc-400 hover:text-white"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reset
          </Button>

          <Button
            className="primary-btn"
            size="sm"
            onClick={executeCode}
            disabled={isRunning}
          >
            {isRunning ? (
              <>
                <Sparkles className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                Executing…
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 mr-1.5 fill-current" />
                Run Code <span className="opacity-60 text-[10px] ml-1 font-mono">(⌘+↵)</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Editor & Console Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Code Editor */}
        <div className="lg:col-span-7 flex flex-col rounded-xl border border-white/10 bg-zinc-950 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-white/5 bg-zinc-900/80 text-[11px] text-zinc-400 font-mono">
            <span>script.js (JavaScript ES2024)</span>
            <span>{lineCount} lines</span>
          </div>

          <div className="relative flex flex-1 min-h-[260px] font-mono text-xs">
            {/* Line numbers */}
            <div className="w-10 py-3 bg-zinc-900/40 text-right pr-2.5 text-zinc-600 select-none border-r border-white/5 shrink-0">
              {Array.from({ length: lineCount }).map((_, i) => (
                <div key={i} className="leading-5">{i + 1}</div>
              ))}
            </div>

            {/* Textarea */}
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 p-3 bg-transparent text-zinc-100 outline-none resize-none leading-5 font-mono whitespace-pre"
              spellCheck={false}
              autoCapitalize="off"
              autoComplete="off"
            />
          </div>
        </div>

        {/* Output Console */}
        <div className="lg:col-span-5 flex flex-col rounded-xl border border-white/10 bg-zinc-950 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-white/5 bg-zinc-900/80 text-[11px] text-zinc-400 font-mono">
            <div className="flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-violet-400" />
              <span>Console Output</span>
            </div>
            <div className="flex items-center gap-2">
              {executionTime !== null && (
                <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5" />
                  {executionTime}ms
                </span>
              )}
              {logs.length > 0 && (
                <button
                  onClick={() => setLogs([])}
                  className="hover:text-white transition"
                  title="Clear Console"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 p-3 font-mono text-xs overflow-y-auto max-h-[300px] min-h-[260px] space-y-1.5 bg-black/50">
            {logs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-600 py-10 text-center">
                <Terminal className="w-6 h-6 mb-1 opacity-40" />
                <span className="text-[11px]">Click &quot;Run Code&quot; to execute in browser sandbox.</span>
              </div>
            ) : (
              logs.map((log) => {
                let colorClass = 'text-zinc-200'
                let badge = 'LOG'
                let badgeClass = 'text-zinc-500'

                if (log.type === 'error') {
                  colorClass = 'text-red-400'
                  badge = 'ERR'
                  badgeClass = 'text-red-500 font-bold'
                } else if (log.type === 'warn') {
                  colorClass = 'text-amber-300'
                  badge = 'WRN'
                  badgeClass = 'text-amber-500'
                } else if (log.type === 'result') {
                  colorClass = 'text-cyan-300 font-semibold'
                  badge = 'OUT'
                  badgeClass = 'text-cyan-500'
                }

                return (
                  <div key={log.id} className="flex items-start gap-2 leading-relaxed break-all">
                    <span className={`text-[10px] uppercase font-mono ${badgeClass} shrink-0 mt-0.5`}>
                      [{badge}]
                    </span>
                    <span className={`${colorClass} flex-1 whitespace-pre-wrap`}>{log.content}</span>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
