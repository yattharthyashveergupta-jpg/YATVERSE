import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { GoogleGenAI } from '@google/genai'

export interface ExtractedUnit {
  unitNumber: number
  title: string
  topics: string[]
  estimatedHours: number
}

export interface ExtractedSyllabus {
  courseTitle: string
  courseCode: string
  credits: number
  units: ExtractedUnit[]
  rawSummary: string
  source: 'gemini' | 'heuristic-parser'
}

// Multi-strategy text stream decoder for raw PDF buffers
function extractTextFromPdfBuffer(buffer: Buffer): string {
  const raw = buffer.toString('latin1')
  const textBlocks: string[] = []

  // 1. Extract strings inside parentheses following BT ... ET / Tj operators
  const tjMatches = raw.match(/\(([^)]+)\)\s*Tj/g) || []
  for (const match of tjMatches) {
    const text = match.replace(/\(([^)]+)\)\s*Tj/, '$1')
    if (text.length > 1) {
      textBlocks.push(text)
    }
  }

  // 2. Extract literal text chunks inside TJ arrays
  const tjArrayMatches = raw.match(/\[([^\]]+)\]\s*TJ/gi) || []
  for (const match of tjArrayMatches) {
    const inner = match.replace(/\[([^\]]+)\]\s*TJ/i, '$1')
    const innerMatches = inner.match(/\(([^)]+)\)/g) || []
    for (const im of innerMatches) {
      const cleaned = im.slice(1, -1).trim()
      if (cleaned.length > 1) {
        textBlocks.push(cleaned)
      }
    }
  }

  // 3. Extract uncompressed stream blocks
  const streamMatches = raw.match(/stream[\r\n]+([\s\S]*?)[\r\n]+endstream/gi) || []
  for (const st of streamMatches) {
    const streamContent = st.replace(/^stream[\r\n]+/i, '').replace(/[\r\n]+endstream$/i, '')
    const words = streamContent.match(/[a-zA-Z0-9_\-\s.,:;()]{4,}/g) || []
    for (const w of words) {
      const trimmed = w.trim()
      if (trimmed.length > 3 && !trimmed.startsWith('/') && !trimmed.startsWith('end')) {
        textBlocks.push(trimmed)
      }
    }
  }

  if (textBlocks.length > 5) {
    return textBlocks.join(' ').replace(/\s+/g, ' ').trim()
  }

  // 4. Fallback: filter clean readable ASCII characters
  const asciiStrings = raw
    .replace(/[^\x20-\x7E\n\r\t]/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()

  return asciiStrings.slice(0, 15000)
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()

    // Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in to extract syllabus.' },
        { status: 401 }
      )
    }

    const contentType = req.headers.get('content-type') || ''
    let rawText = ''
    let pdfBase64: string | null = null
    let fileName = ''

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData().catch(() => null)
      if (!formData) {
        return NextResponse.json(
          { error: 'Invalid form data upload.' },
          { status: 400 }
        )
      }

      const file = formData.get('file') as File | null
      const manualText = (formData.get('text') as string) || ''

      if (file) {
        fileName = file.name || 'syllabus.pdf'
        if (file.size > 10 * 1024 * 1024) {
          return NextResponse.json(
            { error: 'File is too large. Maximum supported file size is 10MB.' },
            { status: 400 }
          )
        }

        const arrayBuf = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuf)

        if (file.type === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf')) {
          pdfBase64 = buffer.toString('base64')
          rawText = extractTextFromPdfBuffer(buffer)
        } else if (file.type.startsWith('text/') || fileName.endsWith('.txt') || fileName.endsWith('.md')) {
          rawText = buffer.toString('utf-8')
        } else if (file.type.startsWith('image/')) {
          pdfBase64 = buffer.toString('base64')
          rawText = `Syllabus Image document: ${fileName}`
        } else {
          rawText = buffer.toString('utf-8')
        }
      } else if (manualText.trim()) {
        rawText = manualText.trim()
      } else {
        return NextResponse.json(
          { error: 'Please upload a valid syllabus PDF or provide syllabus text.' },
          { status: 400 }
        )
      }
    } else {
      const json = await req.json().catch(() => ({}))
      rawText = json.text || ''
      if (!rawText.trim()) {
        return NextResponse.json(
          { error: 'Please provide syllabus text in the request payload.' },
          { status: 400 }
        )
      }
    }

    // Gemini API Extraction with strict 12-second timeout and fallback
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
        const systemPrompt = `You are an expert academic curriculum parsing engine for college engineering syllabi.
Extract structured course information into pure, valid JSON with no markdown wrapping or preamble:
{
  "courseTitle": "e.g. Data Structures and Algorithms",
  "courseCode": "e.g. CS201 or unknown",
  "credits": 4,
  "units": [
    {
      "unitNumber": 1,
      "title": "Unit Name",
      "topics": ["Topic 1", "Topic 2", "Topic 3"],
      "estimatedHours": 8
    }
  ],
  "rawSummary": "A concise 2-sentence summary of the curriculum and learning outcomes."
}

Ensure all units, main chapters, and core problem patterns are cleanly extracted.`

        const parts: any[] = []
        if (pdfBase64 && (fileName.toLowerCase().endsWith('.pdf') || fileName.match(/\.(jpg|jpeg|png|webp)$/i))) {
          parts.push({
            inlineData: {
              mimeType: fileName.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg',
              data: pdfBase64,
            },
          })
        }
        parts.push({
          text: `Parse this college syllabus document (filename: ${fileName || 'syllabus'}):\n\n${rawText.slice(0, 20000)}`,
        })

        // Use Promise.race with 15s timeout to prevent hanging on AI response
        const geminiPromise = ai.models.generateContent({
          model: 'gemini-3.6-flash',
          contents: [{ role: 'user', parts }],
          config: {
            systemInstruction: systemPrompt,
            responseMimeType: 'application/json',
            temperature: 0.1,
          },
        })

        const timeoutPromise = new Promise<null>((_, reject) =>
          setTimeout(() => reject(new Error('Gemini API timeout')), 15000)
        )

        const response: any = await Promise.race([geminiPromise, timeoutPromise])

        if (response && response.text) {
          const textResponse = response.text
          const cleaned = textResponse.replace(/^```json/i, '').replace(/```$/i, '').trim()
          const parsed = JSON.parse(cleaned)

          if (parsed && (parsed.courseTitle || (Array.isArray(parsed.units) && parsed.units.length > 0))) {
            const structured: ExtractedSyllabus = {
              courseTitle: parsed.courseTitle || fileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ') || 'Engineering Course',
              courseCode: parsed.courseCode || '',
              credits: Number(parsed.credits) || 4,
              units: Array.isArray(parsed.units) && parsed.units.length > 0
                ? parsed.units.map((u: any, i: number) => ({
                    unitNumber: Number(u.unitNumber) || i + 1,
                    title: String(u.title || `Unit ${i + 1}`),
                    topics: Array.isArray(u.topics) && u.topics.length > 0
                      ? u.topics.map(String)
                      : ['Foundations & Terminology', 'Applied Problem Solving'],
                    estimatedHours: Number(u.estimatedHours) || 8,
                  }))
                : [],
              rawSummary: parsed.rawSummary || 'Syllabus extracted successfully.',
              source: 'gemini',
            }

            if (structured.units.length > 0) {
              // Persist to syllabus_knowledge table
              let savedId: string | null = null
              try {
                const { data: savedRecord } = await supabase
                  .from('syllabus_knowledge')
                  .insert({
                    user_id: user.id,
                    course_title: structured.courseTitle,
                    course_code: structured.courseCode || null,
                    credits: structured.credits || 4,
                    raw_summary: structured.rawSummary,
                    units: structured.units,
                    extracted_source: 'gemini',
                    updated_at: new Date().toISOString(),
                  })
                  .select('id')
                  .maybeSingle()
                if (savedRecord) savedId = savedRecord.id
              } catch (dbErr) {
                console.warn('Could not save to syllabus_knowledge table:', dbErr)
              }

              return NextResponse.json({ success: true, syllabus: structured, knowledgeId: savedId })
            }
          }
        }
      } catch (aiErr) {
        console.warn('Gemini extraction bypassed/failed, executing heuristic parser:', aiErr)
      }
    }

    // Heuristic Fallback Parser
    const fallbackSyllabus = parseSyllabusHeuristically(rawText, fileName)

    // Persist heuristic fallback to syllabus_knowledge table
    let savedId: string | null = null
    try {
      const { data: savedRecord } = await supabase
        .from('syllabus_knowledge')
        .insert({
          user_id: user.id,
          course_title: fallbackSyllabus.courseTitle,
          course_code: fallbackSyllabus.courseCode || null,
          credits: fallbackSyllabus.credits || 4,
          raw_summary: fallbackSyllabus.rawSummary,
          units: fallbackSyllabus.units,
          extracted_source: 'heuristic-parser',
          updated_at: new Date().toISOString(),
        })
        .select('id')
        .maybeSingle()
      if (savedRecord) savedId = savedRecord.id
    } catch (dbErr) {
      console.warn('Could not save fallback to syllabus_knowledge table:', dbErr)
    }

    return NextResponse.json({ success: true, syllabus: fallbackSyllabus, knowledgeId: savedId })
  } catch (error: any) {
    console.error('Fatal syllabus extraction error:', error)
    return NextResponse.json(
      { error: error?.message || 'An unexpected error occurred while parsing the syllabus.' },
      { status: 500 }
    )
  }
}

function parseSyllabusHeuristically(text: string, fileName: string): ExtractedSyllabus {
  const cleanText = (text || '').trim()
  const lines = cleanText.split('\n').map((l) => l.trim()).filter(Boolean)
  
  let courseTitle = ''
  let courseCode = ''
  let credits = 4
  const units: ExtractedUnit[] = []

  const codeMatch = cleanText.match(/\b([A-Z]{2,4}\s*[-]?\s*[0-9]{3,4}[A-Z]?)\b/i)
  if (codeMatch) {
    courseCode = codeMatch[1].toUpperCase().replace(/\s+/g, '')
  }

  const creditsMatch = cleanText.match(/(?:credits|credit\s*hours?|credits\s*:)\s*([1-9])/i)
  if (creditsMatch) {
    credits = parseInt(creditsMatch[1], 10)
  }

  const titlePatterns = [
    /(?:course\s*title|subject|subject\s*name|course\s*name)\s*[:=-]\s*([^\n\r]+)/i,
    /(?:syllabus\s*for|curriculum\s*for)\s*([^\n\r]+)/i,
  ]

  for (const pat of titlePatterns) {
    const m = cleanText.match(pat)
    if (m && m[1].trim()) {
      courseTitle = m[1].trim().replace(/[;,.].*$/, '')
      break
    }
  }

  if (!courseTitle) {
    if (lines.length > 0 && lines[0].length < 60 && !lines[0].toLowerCase().includes('syllabus')) {
      courseTitle = lines[0]
    } else if (fileName) {
      courseTitle = fileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ')
    } else {
      courseTitle = 'Engineering Course Curriculum'
    }
  }

  const unitRegex = /(?:unit|module|chapter|section)\s*[-:]?\s*([0-9IVX]+)\s*[:.\-–]?\s*([^\n\r]+)?/gi
  let match: RegExpExecArray | null

  const unitMatches: { index: number; numberStr: string; title: string }[] = []
  while ((match = unitRegex.exec(cleanText)) !== null) {
    unitMatches.push({
      index: match.index,
      numberStr: match[1],
      title: match[2] ? match[2].trim() : `Unit ${match[1]}`,
    })
  }

  if (unitMatches.length > 0) {
    for (let i = 0; i < unitMatches.length; i++) {
      const current = unitMatches[i]
      const nextIndex = i + 1 < unitMatches.length ? unitMatches[i + 1].index : cleanText.length
      const unitText = cleanText.slice(current.index, nextIndex)

      const topicLines = unitText
        .split(/[;\n•·\-\*]/)
        .map((s) => s.trim())
        .filter((s) => s.length > 3 && s.length < 120 && !s.toLowerCase().startsWith('unit') && !s.toLowerCase().startsWith('module'))
        .slice(0, 8)

      units.push({
        unitNumber: i + 1,
        title: current.title || `Unit ${i + 1}`,
        topics: topicLines.length ? topicLines : ['Foundations and core terminology', 'Applied problem-solving patterns', 'Topic applications'],
        estimatedHours: 8,
      })
    }
  } else {
    // Partition lines or synthesize standard 4 engineering curriculum units
    const defaultCurriculumUnits = [
      {
        title: 'Foundations & Mathematical Principles',
        topics: ['Core definitions & terminology', 'Theoretical models and axioms', 'Basic computational analysis'],
      },
      {
        title: 'Core Methodologies & Algorithms',
        topics: ['Algorithmic formulation', 'State transitions & data structures', 'Optimization patterns'],
      },
      {
        title: 'System Design & Implementation',
        topics: ['Architectural design patterns', 'Modularity and interfaces', 'Concurrency and synchronization'],
      },
      {
        title: 'Applied Engineering & Verification',
        topics: ['Testing and boundary analysis', 'Case studies and benchmarks', 'Modern domain applications'],
      },
    ]

    const chunkCount = 4
    const validLines = lines.filter((l) => l.length > 3 && !l.includes('Page') && !l.includes('http'))
    const chunkSize = Math.max(1, Math.floor(validLines.length / chunkCount))

    for (let i = 0; i < chunkCount; i++) {
      const chunkLines = validLines.slice(i * chunkSize, (i + 1) * chunkSize)
      const defaultUnit = defaultCurriculumUnits[i]
      const unitTitle = chunkLines[0] && chunkLines[0].length < 60 ? `Unit ${i + 1}: ${chunkLines[0]}` : `Unit ${i + 1}: ${defaultUnit.title}`
      const extractedTopics = chunkLines.slice(1, 6).filter((l) => l.length > 4 && l.length < 100)

      units.push({
        unitNumber: i + 1,
        title: unitTitle,
        topics: extractedTopics.length >= 2 ? extractedTopics : defaultUnit.topics,
        estimatedHours: 8,
      })
    }
  }

  return {
    courseTitle,
    courseCode,
    credits,
    units,
    rawSummary: `Parsed ${units.length} units covering ${units.reduce((acc, u) => acc + u.topics.length, 0)} key topics for ${courseTitle}.`,
    source: 'heuristic-parser',
  }
}
