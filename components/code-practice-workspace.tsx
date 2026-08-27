'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertCircle,
  AlertTriangle,
  Bug,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Code2,
  Copy,
  ExternalLink,
  FileText,
  Flame,
  Info,
  Lightbulb,
  Maximize2,
  Play,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Terminal,
  Trash2,
  Wrench,
  X,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Pill } from '@/components/ui/pill'

export type SupportedLanguage = 'javascript' | 'python' | 'cpp' | 'c' | 'java'

export interface PracticeProblem {
  id: string
  title: string
  difficulty: 'Easy' | 'Medium' | 'Hard'
  category: string
  description: string
  constraints: string[]
  templates: Record<SupportedLanguage, string>
}

export interface LogItem {
  id: string
  type: 'log' | 'info' | 'warn' | 'error' | 'result'
  content: string
  timestamp: string
}

const PRACTICE_PROBLEMS: PracticeProblem[] = [
  {
    id: 'hello-yatverse',
    title: '1. Hello YATVERSE & Standard Output',
    difficulty: 'Easy',
    category: 'Fundamentals',
    description: 'Write a program that outputs greetings, performs basic arithmetic, and verifies console stream execution.',
    constraints: ['Standard I/O stream', 'Time limit: 3000ms'],
    templates: {
      javascript: `// YATVERSE JavaScript Practice Sandbox
function main() {
  const greeting = "Hello, YATVERSE!";
  console.log(greeting);
  
  const student = {
    name: "Alex",
    semester: 4,
    skills: ["TypeScript", "Algorithms", "React"]
  };
  
  console.log("Student Profile Object:", student);
  console.log("Calculated 2^10 =", Math.pow(2, 10));
  return "Execution successful!";
}

main();
`,
      python: `# Python 3.11 Starter Template
def main():
    greeting = "Hello, YATVERSE!"
    print(greeting)
    
    student = {
        "name": "Alex",
        "semester": 4,
        "skills": ["Python", "Machine Learning", "FastAPI"]
    }
    print(f"Student Profile: {student}")
    print(f"2^10 = {2**10}")

if __name__ == "__main__":
    main()
`,
      cpp: `// C++20 Competitive Programming Blueprint
#include <iostream>
#include <vector>
#include <string>
#include <numeric>

int main() {
    std::cout << "Hello, YATVERSE!" << std::endl;
    
    std::vector<int> scores = {85, 92, 78, 96, 88};
    int total = std::accumulate(scores.begin(), scores.end(), 0);
    double avg = static_cast<double>(total) / scores.size();
    
    std::cout << "Average Test Score: " << avg << std::endl;
    return 0;
}
`,
      c: `// C17 Standard Header Blueprint
#include <stdio.h>
#include <stdlib.h>

int main(void) {
    printf("Hello, YATVERSE!\\n");
    
    int scores[] = {85, 92, 78, 96, 88};
    int n = sizeof(scores) / sizeof(scores[0]);
    int sum = 0;
    
    for (int i = 0; i < n; i++) {
        sum += scores[i];
    }
    
    printf("Total Sum: %d, Average: %.2f\\n", sum, (double)sum / n);
    return 0;
}
`,
      java: `// Java OpenJDK Standard Class
import java.util.*;

public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, YATVERSE!");
        
        List<String> skills = Arrays.asList("Java", "Spring Boot", "Data Structures");
        System.out.println("Enrolled Skills: " + skills);
        
        int a = 15, b = 27;
        System.out.println("GCD(" + a + ", " + b + ") = " + gcd(a, b));
    }
    
    private static int gcd(int a, int b) {
        return b == 0 ? a : gcd(b, a % b);
    }
}
`,
    },
  },
  {
    id: 'two-sum',
    title: '2. Two Sum Problem (Hash Map Optimal O(N))',
    difficulty: 'Easy',
    category: 'Arrays & Hash Maps',
    description: 'Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.',
    constraints: ['2 <= nums.length <= 10^4', '-10^9 <= nums[i] <= 10^9', 'Exactly one valid answer exists'],
    templates: {
      javascript: `// Two Sum: O(N) Time, O(N) Space via Map
function twoSum(nums, target) {
  const seen = new Map(); // value -> index
  
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (seen.has(complement)) {
      return [seen.get(complement), i];
    }
    seen.set(nums[i], i);
  }
  return [];
}

// Test Case
const nums = [2, 7, 11, 15];
const target = 9;
const indices = twoSum(nums, target);

console.log("Input Array:", nums);
console.log("Target:", target);
console.log("Result Indices:", indices);
console.log(\`Verification: nums[\${indices[0]}] + nums[\${indices[1]}] = \${nums[indices[0]] + nums[indices[1]]}\`);
`,
      python: `# Two Sum: O(N) Hash Map Lookup
def two_sum(nums: list[int], target: int) -> list[int]:
    seen = {}
    for i, num in enumerate(nums):
        complement = target - num
        if complement in seen:
            return [seen[complement], i]
        seen[num] = i
    return []

if __name__ == "__main__":
    test_nums = [2, 7, 11, 15]
    t = 9
    print("Indices:", two_sum(test_nums, t))
`,
      cpp: `// C++ Two Sum using std::unordered_map
#include <iostream>
#include <vector>
#include <unordered_map>

std::vector<int> twoSum(const std::vector<int>& nums, int target) {
    std::unordered_map<int, int> seen;
    for (int i = 0; i < nums.size(); ++i) {
        int complement = target - nums[i];
        if (seen.count(complement)) {
            return {seen[complement], i};
        }
        seen[nums[i]] = i;
    }
    return {};
}

int main() {
    std::vector<int> nums = {2, 7, 11, 15};
    auto res = twoSum(nums, 9);
    std::cout << "Indices: [" << res[0] << ", " << res[1] << "]" << std::endl;
    return 0;
}
`,
      c: `// C Two Sum with sorted two-pointer approach
#include <stdio.h>
#include <stdlib.h>

void twoSum(int* nums, int numsSize, int target, int* returnIndices) {
    for (int i = 0; i < numsSize; i++) {
        for (int j = i + 1; j < numsSize; j++) {
            if (nums[i] + nums[j] == target) {
                returnIndices[0] = i;
                returnIndices[1] = j;
                return;
            }
        }
    }
}

int main(void) {
    int nums[] = {2, 7, 11, 15};
    int res[2] = {-1, -1};
    twoSum(nums, 4, 9, res);
    printf("Indices: [%d, %d]\\n", res[0], res[1]);
    return 0;
}
`,
      java: `// Java Two Sum Implementation
import java.util.*;

public class Main {
    public static int[] twoSum(int[] nums, int target) {
        Map<Integer, Integer> map = new HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            int complement = target - nums[i];
            if (map.containsKey(complement)) {
                return new int[] { map.get(complement), i };
            }
            map.put(nums[i], i);
        }
        return new int[0];
    }
    
    public static void main(String[] args) {
        int[] nums = {2, 7, 11, 15};
        int[] res = twoSum(nums, 9);
        System.out.println("Result: " + Arrays.toString(res));
    }
}
`,
    },
  },
  {
    id: 'binary-search',
    title: '3. Binary Search on Monotonic Space',
    difficulty: 'Easy',
    category: 'Searching & Divide-and-Conquer',
    description: 'Find the first index of a target element in an ascending sorted array in O(log N) runtime.',
    constraints: ['Array is strictly sorted', 'Time limit: O(log N)'],
    templates: {
      javascript: `// Binary Search: Lower Bound (First occurrence)
function binarySearchFirst(arr, target) {
  let low = 0;
  let high = arr.length - 1;
  let ans = -1;
  let steps = 0;

  while (low <= high) {
    steps++;
    const mid = low + Math.floor((high - low) / 2);
    if (arr[mid] >= target) {
      if (arr[mid] === target) ans = mid;
      high = mid - 1; // Narrow down left
    } else {
      low = mid + 1;
    }
  }
  return { index: ans, steps };
}

const arr = [1, 3, 5, 7, 7, 7, 9, 11, 15, 20, 25];
const target = 7;
const res = binarySearchFirst(arr, target);

console.log("Sorted Array:", arr);
console.log(\`Target \${target} found at index \${res.index} in \${res.steps} comparisons.\`);
`,
      python: `# Python Binary Search
def binary_search(arr: list[int], target: int) -> int:
    low, high = 0, len(arr) - 1
    ans = -1
    while low <= high:
        mid = (low + high) // 2
        if arr[mid] >= target:
            if arr[mid] == target:
                ans = mid
            high = mid - 1
        else:
            low = mid + 1
    return ans

if __name__ == "__main__":
    nums = [1, 3, 5, 7, 7, 7, 9, 11, 15]
    print("Found at:", binary_search(nums, 7))
`,
      cpp: `// C++ std::lower_bound pattern
#include <iostream>
#include <vector>
#include <algorithm>

int main() {
    std::vector<int> arr = {1, 3, 5, 7, 7, 7, 9, 11, 15};
    auto it = std::lower_bound(arr.begin(), arr.end(), 7);
    if (it != arr.end() && *it == 7) {
        std::cout << "First occurrence index: " << std::distance(arr.begin(), it) << std::endl;
    }
    return 0;
}
`,
      c: `// C Binary Search
#include <stdio.h>

int binarySearch(int arr[], int n, int target) {
    int low = 0, high = n - 1, ans = -1;
    while (low <= high) {
        int mid = low + (high - low) / 2;
        if (arr[mid] >= target) {
            if (arr[mid] == target) ans = mid;
            high = mid - 1;
        } else {
            low = mid + 1;
        }
    }
    return ans;
}

int main(void) {
    int arr[] = {1, 3, 5, 7, 7, 7, 9, 11, 15};
    int idx = binarySearch(arr, 9, 7);
    printf("Target index: %d\\n", idx);
    return 0;
}
`,
      java: `// Java Binary Search
public class Main {
    public static int search(int[] arr, int target) {
        int low = 0, high = arr.length - 1, ans = -1;
        while (low <= high) {
            int mid = low + (high - low) / 2;
            if (arr[mid] >= target) {
                if (arr[mid] == target) ans = mid;
                high = mid - 1;
            } else {
                low = mid + 1;
            }
        }
        return ans;
    }
    
    public static void main(String[] args) {
        int[] arr = {1, 3, 5, 7, 7, 7, 9, 11, 15};
        System.out.println("First Index: " + search(arr, 7));
    }
}
`,
    },
  },
  {
    id: 'dp-fibonacci',
    title: '4. Dynamic Programming (Fibonacci Memoization & Tabulation)',
    difficulty: 'Medium',
    category: 'Dynamic Programming',
    description: 'Compute the N-th Fibonacci number in O(N) time and O(1) auxiliary space using bottom-up tabulation.',
    constraints: ['0 <= N <= 50', 'Prevent recursion stack overflow'],
    templates: {
      javascript: `// DP Fibonacci: Space-Optimized O(1) Space, O(N) Time
function fibTabulation(n) {
  if (n <= 1) return n;
  let prev2 = 0;
  let prev1 = 1;
  
  for (let i = 2; i <= n; i++) {
    const cur = prev1 + prev2;
    prev2 = prev1;
    prev1 = cur;
  }
  return prev1;
}

console.log("=== Fibonacci Sequence Test ===");
for (let i = 0; i <= 12; i++) {
  console.log(\`F(\${i}) = \${fibTabulation(i)}\`);
}

console.log("F(45) =", fibTabulation(45));
`,
      python: `# Python DP Fibonacci
def fib(n: int) -> int:
    if n <= 1:
        return n
    p2, p1 = 0, 1
    for _ in range(2, n + 1):
        p2, p1 = p1, p1 + p2
    return p1

if __name__ == "__main__":
    print("F(45) =", fib(45))
`,
      cpp: `// C++ Space-Optimized DP
#include <iostream>

long long fib(int n) {
    if (n <= 1) return n;
    long long p2 = 0, p1 = 1;
    for (int i = 2; i <= n; ++i) {
        long long cur = p1 + p2;
        p2 = p1;
        p1 = cur;
    }
    return p1;
}

int main() {
    std::cout << "F(45) = " << fib(45) << std::endl;
    return 0;
}
`,
      c: `// C Space-Optimized DP
#include <stdio.h>

long long fib(int n) {
    if (n <= 1) return n;
    long long p2 = 0, p1 = 1;
    for (int i = 2; i <= n; i++) {
        long long cur = p1 + p2;
        p2 = p1;
        p1 = cur;
    }
    return p1;
}

int main(void) {
    printf("F(45) = %lld\\n", fib(45));
    return 0;
}
`,
      java: `// Java Space-Optimized DP
public class Main {
    public static long fib(int n) {
        if (n <= 1) return n;
        long p2 = 0, p1 = 1;
        for (int i = 2; i <= n; i++) {
            long cur = p1 + p2;
            p2 = p1;
            p1 = cur;
        }
        return p1;
    }
    
    public static void main(String[] args) {
        System.out.println("F(45) = " + fib(45));
    }
}
`,
    },
  },
]

const LANGUAGE_CONFIG: Record<
  SupportedLanguage,
  {
    name: string
    badge: string
    color: 'emerald' | 'blue' | 'amber' | 'violet' | 'cyan'
    executionMode: 'local-worker' | 'server-runner' | 'requires-runner'
    runtimeLabel: string
    description: string
  }
> = {
  javascript: {
    name: 'JavaScript',
    badge: 'ES6+ / Node.js',
    color: 'amber',
    executionMode: 'local-worker',
    runtimeLabel: 'Browser Web Worker Sandbox',
    description: 'Runs directly in an isolated browser Web Worker with live console capture and infinite loop protection.',
  },
  python: {
    name: 'Python',
    badge: 'Python 3.10',
    color: 'blue',
    executionMode: 'server-runner',
    runtimeLabel: 'Sandboxed Python 3 Runtime',
    description: 'Executes safely via isolated server runner with standard library, stdin, and stdout/stderr capture.',
  },
  cpp: {
    name: 'C++',
    badge: 'GCC 10.2 / C++20',
    color: 'violet',
    executionMode: 'server-runner',
    runtimeLabel: 'GCC C++ Compiler Sandbox',
    description: 'Compiles and runs C++ with full STL support, compiler diagnostics, and memory bounds.',
  },
  c: {
    name: 'C',
    badge: 'GCC 10.2 / C17',
    color: 'cyan',
    executionMode: 'server-runner',
    runtimeLabel: 'GCC C Compiler Sandbox',
    description: 'Compiles standard C with memory isolation, pointer validation, and stdout/stderr reporting.',
  },
  java: {
    name: 'Java',
    badge: 'OpenJDK 15',
    color: 'emerald',
    executionMode: 'server-runner',
    runtimeLabel: 'OpenJDK JVM Sandbox',
    description: 'Compiles and runs Java classes with JVM isolation and standard output tracking.',
  },
}

export function CodePracticeWorkspace({
  notify,
}: {
  notify: (msg: string) => void
}) {
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>('javascript')
  const [selectedProblemIndex, setSelectedProblemIndex] = useState<number>(0)
  const [code, setCode] = useState<string>('')
  const [customStdin, setCustomStdin] = useState<string>('')
  const [showStdin, setShowStdin] = useState<boolean>(false)
  const [logs, setLogs] = useState<LogItem[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [executionTime, setExecutionTime] = useState<number | null>(null)
  const [statusBadge, setStatusBadge] = useState<'Ready' | 'Success' | 'Runtime Error' | 'Compilation Error' | 'Timeout'>('Ready')
  const [copied, setCopied] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiActionType, setAiActionType] = useState<string | null>(null)
  const [aiResult, setAiResult] = useState<{ action: string; output: string; source: string } | null>(null)

  const activeWorkerRef = useRef<Worker | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const activeProblem = PRACTICE_PROBLEMS[selectedProblemIndex] || PRACTICE_PROBLEMS[0]
  const activeLangConfig = LANGUAGE_CONFIG[selectedLanguage]

  // Update starter code when problem or language changes
  useEffect(() => {
    const template = activeProblem.templates[selectedLanguage] || '// No template available'
    setCode(template)
    setLogs([])
    setStatusBadge('Ready')
    setExecutionTime(null)
  }, [selectedProblemIndex, selectedLanguage])

  // Cleanup worker
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

  // Execute Code (Browser Worker for JS without stdin, Server API for Python/C++/C/Java/JS)
  const runCode = useCallback(async () => {
    if (isRunning) return
    setIsRunning(true)
    setLogs([])
    setStatusBadge('Ready')
    setExecutionTime(null)

    // For Python, C++, C, Java (or JS with custom stdin), execute via backend sandbox route
    if (selectedLanguage !== 'javascript' || (customStdin && customStdin.trim())) {
      const startTime = performance.now()
      try {
        setLogs([
          {
            id: `info-${Date.now()}`,
            type: 'info',
            content: `⏳ Compiling and executing ${activeLangConfig.name} in secure sandbox runner...`,
            timestamp: new Date().toLocaleTimeString(),
          },
        ])

        const res = await fetch('/api/code/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            language: selectedLanguage,
            code,
            stdin: customStdin,
          }),
        })

        const duration = Math.round(performance.now() - startTime)
        setExecutionTime(duration)

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}))
          setStatusBadge('Runtime Error')
          setLogs([
            {
              id: `err-${Date.now()}`,
              type: 'error',
              content: errData.error || `Execution failed with HTTP status ${res.status}`,
              timestamp: new Date().toLocaleTimeString(),
            },
          ])
          setIsRunning(false)
          notify('Execution failed.')
          return
        }

        const data = await res.json()
        const newLogs: LogItem[] = []

        if (data.compilationError) {
          setStatusBadge('Compilation Error')
          newLogs.push({
            id: `comp-err-${Date.now()}`,
            type: 'error',
            content: `[Compilation Error]:\n${data.compilationError}`,
            timestamp: new Date().toLocaleTimeString(),
          })
        }

        if (data.stdout) {
          newLogs.push({
            id: `stdout-${Date.now()}`,
            type: 'result',
            content: data.stdout,
            timestamp: new Date().toLocaleTimeString(),
          })
        }

        if (data.stderr) {
          newLogs.push({
            id: `stderr-${Date.now()}`,
            type: 'error',
            content: `[Standard Error]:\n${data.stderr}`,
            timestamp: new Date().toLocaleTimeString(),
          })
        }

        if (!data.stdout && !data.stderr && !data.compilationError) {
          if (data.success) {
            newLogs.push({
              id: `empty-${Date.now()}`,
              type: 'info',
              content: 'Program executed successfully with no output returned.',
              timestamp: new Date().toLocaleTimeString(),
            })
          } else {
            newLogs.push({
              id: `err-unknown-${Date.now()}`,
              type: 'error',
              content: data.error || 'Program exited with non-zero status.',
              timestamp: new Date().toLocaleTimeString(),
            })
          }
        }

        if (data.exitCode !== undefined && data.exitCode !== null) {
          newLogs.push({
            id: `exit-${Date.now()}`,
            type: 'info',
            content: `Process exited with code ${data.exitCode} (${duration}ms)`,
            timestamp: new Date().toLocaleTimeString(),
          })
        }

        setLogs(newLogs)
        if (data.compilationError) {
          setStatusBadge('Compilation Error')
          notify('Compilation error.')
        } else if (data.success) {
          setStatusBadge('Success')
          notify(`Executed cleanly in ${duration}ms!`)
        } else {
          setStatusBadge('Runtime Error')
          notify('Runtime error in execution.')
        }
      } catch (err: any) {
        const duration = Math.round(performance.now() - startTime)
        setExecutionTime(duration)
        setStatusBadge('Runtime Error')
        setLogs([
          {
            id: `fatal-${Date.now()}`,
            type: 'error',
            content: `Execution request error: ${err.message || 'Network failure'}`,
            timestamp: new Date().toLocaleTimeString(),
          },
        ])
        notify('Execution request failed.')
      } finally {
        setIsRunning(false)
      }
      return
    }

    // JavaScript: Browser Web Worker with infinite loop protection
    const startTime = performance.now()
    const collectedLogs: LogItem[] = []

    if (activeWorkerRef.current) {
      activeWorkerRef.current.terminate()
      activeWorkerRef.current = null
    }

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

        const customConsole = {
          log: (...args) => sendLog('log', formatArgs(args)),
          info: (...args) => sendLog('info', formatArgs(args)),
          warn: (...args) => sendLog('warn', formatArgs(args)),
          error: (...args) => sendLog('error', formatArgs(args)),
          table: (...args) => sendLog('log', formatArgs(args)),
          dir: (...args) => sendLog('log', formatArgs(args)),
        };

        try {
          const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
          const runner = new AsyncFunction('console', userCode);
          const result = await runner(customConsole);
          
          if (result !== undefined) {
            sendLog('result', '=> ' + (typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result)));
          }
          self.postMessage({ type: 'done', hasError: false });
        } catch (err) {
          sendLog('error', (err && err.stack) ? err.stack : String(err));
          self.postMessage({ type: 'done', hasError: true });
        }
      };
    `

    try {
      const blob = new Blob([workerScript], { type: 'application/javascript' })
      const workerUrl = URL.createObjectURL(blob)
      const worker = new Worker(workerUrl)
      activeWorkerRef.current = worker

      // Safety timeout of 4.0 seconds
      timeoutRef.current = setTimeout(() => {
        if (activeWorkerRef.current) {
          activeWorkerRef.current.terminate()
          activeWorkerRef.current = null
          const duration = Math.round(performance.now() - startTime)
          setExecutionTime(duration)
          setStatusBadge('Timeout')
          setLogs((prev) => [
            ...prev,
            {
              id: `err-${Date.now()}`,
              type: 'error',
              content: 'Execution timed out (4.0s limit reached). Infinite loop or heavy blocking call detected.',
              timestamp: new Date().toLocaleTimeString(),
            },
          ])
          setIsRunning(false)
          notify('Execution timed out after 4.0s.')
        }
      }, 4000)

      worker.onmessage = (e) => {
        const msg = e.data
        if (msg.type === 'log') {
          const entry: LogItem = {
            id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            type: msg.logType,
            content: msg.content,
            timestamp: new Date().toLocaleTimeString(),
          }
          collectedLogs.push(entry)
          setLogs((prev) => [...prev, entry])
        } else if (msg.type === 'done') {
          if (timeoutRef.current) clearTimeout(timeoutRef.current)
          const duration = Math.round(performance.now() - startTime)
          setExecutionTime(duration)
          setStatusBadge(msg.hasError ? 'Runtime Error' : 'Success')
          setIsRunning(false)
          worker.terminate()
          activeWorkerRef.current = null
          URL.revokeObjectURL(workerUrl)
          notify(msg.hasError ? 'Execution encountered an error.' : `Executed cleanly in ${duration}ms!`)
        }
      }

      worker.onerror = (err) => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current)
        const duration = Math.round(performance.now() - startTime)
        setExecutionTime(duration)
        setStatusBadge('Runtime Error')
        setIsRunning(false)
        setLogs((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            type: 'error',
            content: err.message || 'Worker syntax or script exception.',
            timestamp: new Date().toLocaleTimeString(),
          },
        ])
        if (activeWorkerRef.current) {
          activeWorkerRef.current.terminate()
          activeWorkerRef.current = null
        }
        URL.revokeObjectURL(workerUrl)
      }

      worker.postMessage(code)
    } catch (err: any) {
      setIsRunning(false)
      setStatusBadge('Runtime Error')
      setLogs([
        {
          id: `err-${Date.now()}`,
          type: 'error',
          content: err.message || 'Failed to instantiate browser sandbox worker.',
          timestamp: new Date().toLocaleTimeString(),
        },
      ])
    }
  }, [code, customStdin, isRunning, selectedLanguage, activeLangConfig, notify])

  const resetTemplate = () => {
    const template = activeProblem.templates[selectedLanguage] || ''
    setCode(template)
    setLogs([])
    setStatusBadge('Ready')
    setExecutionTime(null)
    notify('Code reset to default starter template.')
  }

  const copyCode = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    notify('Code copied to clipboard!')
    setTimeout(() => setCopied(false), 2000)
  }

  const callAiCodeAssistant = async (action: string) => {
    if (aiLoading) return
    setAiLoading(true)
    setAiActionType(action)
    try {
      const errorItem = logs.find((l) => l.type === 'error')
      const res = await fetch('/api/ai/code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          language: selectedLanguage,
          code,
          problemTitle: activeProblem.title,
          problemDescription: activeProblem.description,
          errorLog: errorItem?.content || '',
        }),
      })

      if (!res.ok) {
        notify('AI Code Assistant request failed.')
        return
      }

      const data = await res.json()
      if (data.output) {
        setAiResult({
          action,
          output: data.output,
          source: data.source || 'gemini-3.6-flash',
        })
        notify('AI Code insights generated!')
      }
    } catch (err: any) {
      console.error('AI code assist error:', err)
      notify('Failed to reach AI Code Assistant.')
    } finally {
      setAiLoading(false)
      setAiActionType(null)
    }
  }

  const applyAiFix = (extractedCode: string) => {
    // Check if output contains markdown code block
    const match = extractedCode.match(/```(?:[a-zA-Z0-9_-]+)?\n([\s\S]*?)```/)
    if (match && match[1]) {
      setCode(match[1].trim())
      notify('AI corrected code applied to editor!')
    } else {
      setCode(extractedCode)
      notify('AI code snippet applied to editor!')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Run on Ctrl+Enter or Cmd+Enter
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      runCode()
      return
    }

    // Handle Tab key for indentation
    if (e.key === 'Tab') {
      e.preventDefault()
      const target = e.currentTarget
      const start = target.selectionStart
      const end = target.selectionEnd
      const nextCode = code.substring(0, start) + '  ' + code.substring(end)
      setCode(nextCode)
      setTimeout(() => {
        target.selectionStart = target.selectionEnd = start + 2
      }, 0)
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="surface panel">
        <div className="section-head">
          <div>
            <span className="eyebrow">PRACTICE & EXECUTION</span>
            <h2>Multi-Language Code Practice</h2>
            <p className="muted">
              Practice data structures, algorithms, and university coding questions directly in your browser.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              className="primary-btn bg-emerald-600 hover:bg-emerald-500 text-white"
              onClick={runCode}
              disabled={isRunning}
            >
              <Play data-icon="inline-start" /> {isRunning ? 'Running…' : 'Run Code (Ctrl+↵)'}
            </Button>
          </div>
        </div>

        {/* Language Selection Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-4 border-t border-white/10">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-mono text-zinc-400">LANGUAGE:</span>
            {(['javascript', 'python', 'cpp', 'c', 'java'] as SupportedLanguage[]).map((lang) => {
              const cfg = LANGUAGE_CONFIG[lang]
              const isSelected = selectedLanguage === lang
              return (
                <button
                  key={lang}
                  onClick={() => setSelectedLanguage(lang)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition flex items-center gap-1.5 ${
                    isSelected
                      ? 'border-violet-500 bg-violet-600/20 text-violet-200 font-semibold shadow-sm'
                      : 'border-white/5 bg-black/40 text-zinc-400 hover:text-white hover:border-white/20'
                  }`}
                >
                  <Code2 className="w-3.5 h-3.5" />
                  <span>{cfg.name}</span>
                  <span className="text-[10px] text-zinc-400 font-mono">({cfg.badge})</span>
                </button>
              )
            })}
          </div>

          <div className="flex items-center gap-2 text-xs">
            {activeLangConfig.executionMode === 'local-worker' && !customStdin.trim() ? (
              <span className="flex items-center gap-1.5 text-emerald-400 bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-500/20 font-mono">
                <ShieldCheck className="w-3.5 h-3.5" /> Browser Sandbox (Zero Latency)
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-violet-400 bg-violet-950/40 px-2.5 py-1 rounded-lg border border-violet-500/20 font-mono">
                <Sparkles className="w-3.5 h-3.5" /> Sandboxed Compiler & Runner Active
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Workspace: 3-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Problem Catalog */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex justify-between items-center px-1 text-xs text-zinc-400 font-mono">
            <span>PRACTICE PROBLEMS</span>
            <span>{PRACTICE_PROBLEMS.length} MODULES</span>
          </div>

          <div className="space-y-2.5">
            {PRACTICE_PROBLEMS.map((prob, idx) => {
              const isSelected = selectedProblemIndex === idx
              return (
                <div
                  key={prob.id}
                  onClick={() => setSelectedProblemIndex(idx)}
                  className={`surface p-3.5 rounded-xl border cursor-pointer transition text-left ${
                    isSelected
                      ? 'border-violet-500/50 bg-violet-950/20 shadow-sm'
                      : 'border-white/5 hover:border-white/20 bg-zinc-900/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-mono text-zinc-400">{prob.category}</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                        prob.difficulty === 'Easy'
                          ? 'bg-emerald-500/10 text-emerald-300'
                          : prob.difficulty === 'Medium'
                          ? 'bg-amber-500/10 text-amber-300'
                          : 'bg-red-500/10 text-red-300'
                      }`}
                    >
                      {prob.difficulty}
                    </span>
                  </div>

                  <strong className={`block text-xs font-semibold ${isSelected ? 'text-violet-200' : 'text-white'}`}>
                    {prob.title}
                  </strong>
                  <p className="text-[11px] text-zinc-400 line-clamp-2 mt-1">{prob.description}</p>
                </div>
              )
            })}
          </div>

          {/* Problem Constraints Box */}
          <div className="surface p-4 rounded-xl border border-white/5 bg-black/40 text-xs">
            <strong className="block text-zinc-300 font-mono uppercase text-[11px] mb-2">
              Constraints & Specifications
            </strong>
            <ul className="text-zinc-400 space-y-1 list-disc list-inside">
              {activeProblem.constraints.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Center & Right: Code Editor and Console Terminal */}
        <div className="lg:col-span-8 space-y-4">
          {/* AI Code Intelligence Toolbar */}
          <div className="surface p-2.5 rounded-xl border border-violet-500/20 bg-violet-950/20 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs text-violet-300 font-semibold px-1">
              <Sparkles className="w-4 h-4 text-violet-400" />
              <span>AI Code Intelligence</span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-zinc-300 hover:text-white hover:bg-white/10"
                onClick={() => callAiCodeAssistant('explain')}
                disabled={aiLoading}
              >
                <Lightbulb className="w-3.5 h-3.5 mr-1 text-amber-400" />
                {aiLoading && aiActionType === 'explain' ? 'Explaining…' : 'Explain'}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-zinc-300 hover:text-white hover:bg-white/10"
                onClick={() => callAiCodeAssistant('find-bug')}
                disabled={aiLoading}
              >
                <Bug className="w-3.5 h-3.5 mr-1 text-red-400" />
                {aiLoading && aiActionType === 'find-bug' ? 'Analyzing…' : 'Find Bug'}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-zinc-300 hover:text-white hover:bg-white/10"
                onClick={() => callAiCodeAssistant('fix')}
                disabled={aiLoading}
              >
                <Wrench className="w-3.5 h-3.5 mr-1 text-cyan-400" />
                {aiLoading && aiActionType === 'fix' ? 'Fixing…' : 'Fix Code'}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-zinc-300 hover:text-white hover:bg-white/10"
                onClick={() => callAiCodeAssistant('optimize')}
                disabled={aiLoading}
              >
                <Zap className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                {aiLoading && aiActionType === 'optimize' ? 'Optimizing…' : 'Optimize (Big-O)'}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-zinc-300 hover:text-white hover:bg-white/10"
                onClick={() => callAiCodeAssistant('test-cases')}
                disabled={aiLoading}
              >
                <ShieldCheck className="w-3.5 h-3.5 mr-1 text-purple-400" />
                {aiLoading && aiActionType === 'test-cases' ? 'Generating…' : 'Test Cases'}
              </Button>
            </div>
          </div>

          {/* AI Result Card */}
          {aiResult && (
            <div className="surface p-4 rounded-xl border border-violet-500/30 bg-zinc-950 shadow-md">
              <div className="flex items-center justify-between mb-2 pb-2 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-violet-400" />
                  <strong className="text-xs font-semibold text-white uppercase tracking-wider">
                    AI {aiResult.action.replace('-', ' ')} ({aiResult.source})
                  </strong>
                </div>

                <div className="flex items-center gap-1.5">
                  {(aiResult.action === 'fix' || aiResult.action === 'optimize') && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-[11px] text-emerald-300 hover:text-emerald-200 hover:bg-emerald-950/40"
                      onClick={() => applyAiFix(aiResult.output)}
                    >
                      <Check className="w-3.5 h-3.5 mr-1" /> Apply to Editor
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-[11px] text-zinc-400 hover:text-white"
                    onClick={() => {
                      navigator.clipboard.writeText(aiResult.output)
                      notify('AI response copied!')
                    }}
                  >
                    <Copy className="w-3.5 h-3.5 mr-1" /> Copy
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-[11px] text-zinc-400 hover:text-white"
                    onClick={() => setAiResult(null)}
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              <div className="text-xs text-zinc-200 whitespace-pre-wrap leading-relaxed max-h-[300px] overflow-y-auto font-mono">
                {aiResult.output}
              </div>
            </div>
          )}

          {/* Editor Header Bar */}
          <div className="surface rounded-2xl border border-white/10 overflow-hidden bg-zinc-950">
            <div className="flex flex-wrap items-center justify-between p-3 bg-zinc-900 border-b border-white/10 gap-2">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-violet-400" />
                <strong className="text-xs font-mono text-white">
                  {activeProblem.title} ({activeLangConfig.name})
                </strong>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowStdin(!showStdin)}
                  className={`text-xs ${showStdin || customStdin ? 'text-violet-300 bg-violet-950/40' : 'text-zinc-300 hover:text-white'}`}
                >
                  <FileText className="w-3.5 h-3.5 mr-1" /> Stdin {customStdin ? '•' : ''}
                </Button>
                <Button variant="ghost" size="sm" onClick={copyCode} className="text-xs text-zinc-300 hover:text-white">
                  <Copy className="w-3.5 h-3.5 mr-1" /> {copied ? 'Copied' : 'Copy'}
                </Button>
                <Button variant="ghost" size="sm" onClick={resetTemplate} className="text-xs text-zinc-300 hover:text-white">
                  <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reset
                </Button>
                <Button
                  size="sm"
                  className="primary-btn bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-3 py-1"
                  onClick={runCode}
                  disabled={isRunning}
                >
                  <Play className="w-3.5 h-3.5 mr-1" /> {isRunning ? 'Running…' : 'Run (Ctrl+↵)'}
                </Button>
              </div>
            </div>

            {/* Optional Custom Stdin Input */}
            {showStdin && (
              <div className="p-3 bg-zinc-900/60 border-b border-white/10 text-xs">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-mono text-[11px] text-zinc-400">Custom Standard Input (stdin):</span>
                  {customStdin && (
                    <button onClick={() => setCustomStdin('')} className="text-[10px] text-zinc-500 hover:text-zinc-300">
                      Clear stdin
                    </button>
                  )}
                </div>
                <textarea
                  value={customStdin}
                  onChange={(e) => setCustomStdin(e.target.value)}
                  rows={2}
                  placeholder="e.g. 5&#10;10 20 30 40 50"
                  className="w-full p-2 bg-black/60 text-zinc-200 font-mono text-xs rounded border border-white/10 focus:outline-none focus:border-violet-500"
                />
              </div>
            )}

            {/* Code Input Textarea */}
            <div className="relative">
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={handleKeyDown}
                spellCheck={false}
                rows={16}
                className="w-full p-4 bg-zinc-950 text-zinc-100 font-mono text-xs leading-relaxed focus:outline-none focus:ring-1 focus:ring-violet-500 resize-y"
                placeholder="// Write code here..."
              />
            </div>
          </div>

          {/* Console Output Panel */}
          <div className="surface rounded-2xl border border-white/10 overflow-hidden bg-black/90">
            <div className="flex items-center justify-between p-3 bg-zinc-900/80 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <strong className="text-xs font-mono text-zinc-200">Execution Output & Diagnostics</strong>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                    statusBadge === 'Success'
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : statusBadge === 'Runtime Error' || statusBadge === 'Timeout'
                      ? 'bg-red-500/20 text-red-300'
                      : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {statusBadge}
                </span>
              </div>

              <div className="flex items-center gap-3 text-xs text-zinc-400 font-mono">
                {executionTime !== null && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-zinc-400" /> {executionTime}ms
                  </span>
                )}
                <button
                  onClick={() => setLogs([])}
                  className="hover:text-white p-1 rounded transition text-zinc-400"
                  title="Clear console"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="p-4 min-h-[160px] max-h-[320px] overflow-y-auto font-mono text-xs space-y-1.5">
              {logs.length === 0 ? (
                <div className="text-zinc-500 italic py-6 text-center">
                  Output will appear here when you execute code (Press Ctrl+Enter).
                </div>
              ) : (
                logs.map((log) => {
                  let colorClass = 'text-zinc-200'
                  if (log.type === 'error') colorClass = 'text-red-400 bg-red-950/20 p-2 rounded border border-red-500/20'
                  else if (log.type === 'warn') colorClass = 'text-amber-300'
                  else if (log.type === 'info') colorClass = 'text-blue-300'
                  else if (log.type === 'result') colorClass = 'text-emerald-400 font-semibold'

                  return (
                    <div key={log.id} className={`whitespace-pre-wrap leading-relaxed ${colorClass}`}>
                      {log.content}
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
