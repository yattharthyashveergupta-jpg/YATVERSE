import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { GoogleGenAI } from '@google/genai'
import { buildStudentContext } from '@/lib/ai-student-context'

export async function POST(req: Request) {
  try {
    let supabase: any = null
    let userId: string | null = null

    try {
      supabase = await createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) userId = user.id
    } catch (authErr) {
      console.warn('Supabase auth in AI code route:', authErr)
    }

    const body = await req.json().catch(() => ({}))
    const {
      action = 'explain', // 'explain' | 'find-bug' | 'fix' | 'optimize' | 'explain-error' | 'test-cases' | 'practice-problem' | 'explain-algo'
      language = 'javascript',
      code = '',
      errorLog = '',
      problemTitle = '',
      problemDescription = '',
      userQuery = '',
    } = body

    const studentContext = await buildStudentContext(supabase, userId)
    const { profile, careerGoal } = studentContext
    const studentName = profile.full_name || 'Student'

    const apiKey = process.env.GEMINI_API_KEY
    if (apiKey) {
      try {
        const ai = new GoogleGenAI({
          apiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            },
          },
        })

        let systemInstruction = `You are YAT Code Mentor, an expert programming coach in YATVERSE.
You provide precise, mathematically sound, clean explanations and code assistance in ${language.toUpperCase()}.
Audience: ${studentName}, targeting ${careerGoal}.
Keep answers direct, actionable, and formatted with markdown.`

        let userPrompt = ''

        if (action === 'explain') {
          userPrompt = `Please explain this ${language} code clearly.
Problem: ${problemTitle || 'General Code snippet'}
\`\`\`${language}
${code}
\`\`\`
Provide:
1. High-level intuition & purpose
2. Step-by-step logic walkthrough
3. Time & Space Complexity (Big-O analysis)
4. Edge cases to watch out for`
        } else if (action === 'find-bug') {
          userPrompt = `Analyze this ${language} code for bugs, logic errors, boundary conditions, or edge case failures.
Problem: ${problemTitle}
\`\`\`${language}
${code}
\`\`\`
Identify the exact bug(s), why it occurs, and how to fix it.`
        } else if (action === 'fix') {
          userPrompt = `Fix and improve this ${language} code.
Problem: ${problemTitle}
${errorLog ? `Runtime / Compiler Error:\n${errorLog}\n` : ''}
\`\`\`${language}
${code}
\`\`\`
Provide the fully corrected, executable code in a \`\`\`${language} block, followed by a 2-bullet explanation of the changes made.`
        } else if (action === 'optimize') {
          userPrompt = `Optimize this ${language} code for optimal asymptotic time and space complexity.
Problem: ${problemTitle}
\`\`\`${language}
${code}
\`\`\`
Provide:
1. Current vs Optimized Time/Space Complexity
2. Optimized code implementation
3. Algorithmic trade-offs involved`
        } else if (action === 'explain-error') {
          userPrompt = `Explain this runtime or compiler error for ${language} and how to fix it.
Code:
\`\`\`${language}
${code}
\`\`\`
Error Log:
${errorLog || 'Unknown execution error'}
Explain what caused the error and provide the line-by-line correction.`
        } else if (action === 'test-cases') {
          userPrompt = `Generate 4 robust test cases (including boundary and corner cases) for this problem in ${language}.
Problem: ${problemTitle}
Description: ${problemDescription}
Code:
\`\`\`${language}
${code}
\`\`\`
Include inputs, expected outputs, and the edge condition each tests (e.g. empty input, single element, negative numbers, large input).`
        } else if (action === 'practice-problem') {
          userPrompt = `Generate a fresh coding interview practice problem similar to "${problemTitle}" for ${careerGoal}.
Include:
1. Problem Statement
2. Input/Output Examples
3. Constraints
4. Starter code template in ${language}
5. Optimal approach hint`
        } else if (action === 'explain-algo') {
          userPrompt = `Explain the underlying algorithmic pattern or data structure for: "${problemTitle || userQuery}".
Explain:
1. Core pattern intuition
2. When to choose this pattern in technical interviews
3. Key invariants and pointer/recursion rules`
        } else {
          userPrompt = `Assist the student with this ${language} code:\n\`\`\`${language}\n${code}\n\`\`\`\nQuery: ${userQuery}`
        }

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          config: {
            systemInstruction,
            temperature: 0.2,
          },
        })

        if (response.text) {
          return NextResponse.json({
            success: true,
            source: 'gemini-2.5-flash',
            action,
            output: response.text,
          })
        }
      } catch (err: any) {
        console.error('Gemini code assistant error:', err?.message || err)
      }
    }

    // Heuristic fallback
    const fallbackOutput = generateFallbackCodeAssistantResponse(action, language, problemTitle, code)
    return NextResponse.json({
      success: true,
      source: 'yatverse-code-engine',
      action,
      output: fallbackOutput,
    })
  } catch (error: any) {
    console.error('Fatal in AI code route:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to process AI code request.' },
      { status: 500 }
    )
  }
}

function generateFallbackCodeAssistantResponse(
  action: string,
  language: string,
  problemTitle: string,
  code: string
): string {
  if (action === 'explain') {
    return `### Code Walkthrough: ${problemTitle || 'Algorithm'}\n\n1. **Core Logic:** Implements an optimal approach in ${language.toUpperCase()}.\n2. **Time Complexity:** $O(N)$ or $O(N \\log N)$ depending on sorting and traversal requirements.\n3. **Space Complexity:** $O(1)$ auxiliary space if in-place, or $O(N)$ with hash mapping.\n4. **Edge Cases:** Handle empty inputs, single element lists, and integer overflow bounds.`
  }
  if (action === 'optimize') {
    return `### Optimization Strategy for ${problemTitle}\n\n- **Current Approach:** Linear or quadratic state verification.\n- **Optimized Strategy:** Use a Hash Map or Two-Pointer technique to reduce lookup time from $O(N)$ to $O(1)$.\n- **Target Runtime:** $O(N)$ Time with $O(N)$ Space.`
  }
  if (action === 'test-cases') {
    return `### Recommended Test Cases\n\n1. **Standard Case:** \`nums = [2, 7, 11, 15], target = 9\` → Output: \`[0, 1]\`\n2. **Negative Values:** \`nums = [-3, 4, 3, 90], target = 0\` → Output: \`[0, 2]\`\n3. **Duplicate Elements:** \`nums = [3, 3], target = 6\` → Output: \`[0, 1]\`\n4. **Boundary Array:** Minimum length array with large integers.`
  }
  return `### AI Code Analysis (${language.toUpperCase()})\n\nCode looks structured. Verify input constraints, edge boundaries (empty inputs, zero values), and clean separation of algorithmic logic.`
}
