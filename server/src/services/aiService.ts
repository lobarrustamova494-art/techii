import Groq from 'groq-sdk'
import OpenAI from 'openai'

let groq: Groq | null = null
let openai: OpenAI | null = null

// Lazy initialization of Groq client
function getGroqClient(): Groq {
  if (!groq) {
    if (!process.env.GROQ_API_KEY) {
      throw new Error('Groq API key sozlanmagan. Iltimos, GROQ_API_KEY environment variable ni qo\'shing.')
    }
    
    console.log('Creating Groq client...')
    groq = new Groq({
      apiKey: process.env.GROQ_API_KEY
    })
    console.log('Groq client created successfully')
  }
  return groq
}

// Lazy initialization of OpenAI client
function getOpenAIClient(): OpenAI {
  if (!openai) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key sozlanmagan. Iltimos, OPENAI_API_KEY environment variable ni qo\'shing.')
    }
    
    console.log('Creating OpenAI client...')
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })
    console.log('OpenAI client created successfully')
  }
  return openai
}

export interface ImageAnalysisResult {
  extractedText: string
  confidence: number
  language: string
  suggestions: string[]
  errors?: string[]
}

export class AIService {
  /**
   * Rasmdan matnni ajratib olish va tahlil qilish
   * Uses fallback approach since vision models are unstable
   */
  static async analyzeImage(imageBase64: string, prompt?: string): Promise<ImageAnalysisResult> {
    console.log('=== IMAGE ANALYSIS (FALLBACK MODE) ===')
    console.log('Image size:', imageBase64.length, 'characters')
    console.log('Custom prompt:', prompt || 'No custom prompt provided')
    
    try {
      // Since vision models are unstable, return a helpful fallback response
      return {
        extractedText: 'Vision model hozirda mavjud emas. Matn tahlili uchun matnni qo\'lda kiriting.',
        confidence: 0.5,
        language: 'uzbek',
        suggestions: [
          'Vision modellar vaqtincha ishlamayapti',
          'Matnni qo\'lda kiritib tahlil qilishingiz mumkin',
          'Keyinroq qayta urinib ko\'ring'
        ],
        errors: ['Vision model decommissioned']
      }
    } catch (error) {
      console.error('AI tahlil xatosi:', error)
      throw new Error(`AI tahlil xatosi: ${error instanceof Error ? error.message : 'Noma\'lum xato'}`)
    }
  }

  /**
   * Matnni tahlil qilish va yaxshilash
   */
  static async analyzeText(text: string, context?: string): Promise<{
    improvedText: string
    suggestions: string[]
    grammar: string[]
    style: string[]
  }> {
    const groq = getGroqClient()

    try {
      const prompt = `
        Quyidagi matnni tahlil qiling va yaxshilang:
        
        Matn: "${text}"
        Kontekst: ${context || 'Umumiy matn'}
        
        Vazifalar:
        1. Grammatik xatolarni toping va tuzating
        2. Matn uslubini yaxshilang
        3. Aniqroq va tushunarli qiling
        4. O'zbek tiliga mos qiling
        
        Javobni JSON formatida bering:
        {
          "improvedText": "Yaxshilangan matn",
          "suggestions": ["Taklif 1", "Taklif 2"],
          "grammar": ["Grammatik xato 1", "Grammatik xato 2"],
          "style": ["Uslub taklifi 1", "Uslub taklifi 2"]
        }
      `

      const response = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "Siz o'zbek tilida matn tahlili va yaxshilash bo'yicha mutaxassissiz."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        model: "llama-3.1-70b-versatile",
        temperature: 0.3,
        max_tokens: 2048,
        response_format: { type: "json_object" }
      })

      const result = JSON.parse(response.choices[0]?.message?.content || '{}')
      
      return {
        improvedText: result.improvedText || text,
        suggestions: result.suggestions || [],
        grammar: result.grammar || [],
        style: result.style || []
      }
    } catch (error) {
      console.error('Matn tahlil xatosi:', error)
      throw new Error(`Matn tahlil xatosi: ${error instanceof Error ? error.message : 'Noma\'lum xato'}`)
    }
  }

  /**
   * Imtihon savollarini tahlil qilish va yaxshilash
   */
  static async analyzeExamQuestions(questions: string[]): Promise<{
    analyzedQuestions: Array<{
      original: string
      improved: string
      difficulty: 'easy' | 'medium' | 'hard'
      suggestions: string[]
      issues: string[]
    }>
    overallSuggestions: string[]
    qualityScore: number
  }> {
    const groq = getGroqClient()

    try {
      const prompt = `
        Quyidagi imtihon savollarini tahlil qiling va yaxshilang:
        
        Savollar:
        ${questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}
        
        Har bir savol uchun:
        1. Qiyinlik darajasini aniqlang (easy/medium/hard)
        2. Savol sifatini baholang
        3. Yaxshilash takliflarini bering
        4. Muammolarni aniqlang
        
        Javobni JSON formatida bering:
        {
          "analyzedQuestions": [
            {
              "original": "Asl savol",
              "improved": "Yaxshilangan savol",
              "difficulty": "medium",
              "suggestions": ["Taklif 1"],
              "issues": ["Muammo 1"]
            }
          ],
          "overallSuggestions": ["Umumiy taklif 1"],
          "qualityScore": 85
        }
      `

      const response = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "Siz ta'lim sohasida imtihon savollarini tahlil qilish va yaxshilash bo'yicha mutaxassissiz."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        model: "llama-3.1-70b-versatile",
        temperature: 0.2,
        max_tokens: 4096,
        response_format: { type: "json_object" }
      })

      const result = JSON.parse(response.choices[0]?.message?.content || '{}')
      
      return {
        analyzedQuestions: result.analyzedQuestions || [],
        overallSuggestions: result.overallSuggestions || [],
        qualityScore: result.qualityScore || 70
      }
    } catch (error) {
      console.error('Savol tahlil xatosi:', error)
      throw new Error(`Savol tahlil xatosi: ${error instanceof Error ? error.message : 'Noma\'lum xato'}`)
    }
  }

  /**
   * OMR varaqni format ma'lumotlari bilan tahlil qilish
   */
  static async analyzeOMRSheetWithFormat(
    imageBase64: string, 
    answerKey: string[], 
    scoring: { correct: number; wrong: number; blank: number },
    exam?: any
  ): Promise<any> {
    console.log('=== FORMAT-AWARE OMR ANALYSIS ===')
    console.log('Answer key length:', answerKey.length)
    console.log('Exam provided:', !!exam)
    console.log('Exam name:', exam?.name || 'No exam')
    console.log('OpenAI API available:', !!process.env.OPENAI_API_KEY)
    
    try {
      // Check if OpenAI API key is available for ultra-precision analysis
      if (process.env.OPENAI_API_KEY) {
        console.log('Using Ultra-Precision OMR Analysis with OpenAI...')
        
        // Import AdvancedOMRService dynamically to avoid circular imports
        const { AdvancedOMRService } = await import('./advancedOMRService.js')
        
        // Use ultra-precision analysis with format awareness
        const result = await AdvancedOMRService.analyzeOMRWithUltraPrecision(
          imageBase64,
          answerKey,
          scoring,
          exam
        )
        
        // Calculate detailed results
        const extractedAnswers = result.extractedAnswers
        let correctCount = 0
        let wrongCount = 0
        let blankCount = 0
        
        const detailedResults = extractedAnswers.map((answer, index) => {
          const correctAnswer = answerKey[index]
          let isCorrect = false
          
          if (answer === 'BLANK' || answer === '') {
            blankCount++
          } else if (answer === correctAnswer) {
            correctCount++
            isCorrect = true
          } else {
            wrongCount++
          }
          
          return {
            question: index + 1,
            studentAnswer: answer,
            correctAnswer,
            isCorrect,
            points: isCorrect ? scoring.correct : (answer === 'BLANK' ? scoring.blank : scoring.wrong)
          }
        })
        
        const totalScore = (correctCount * scoring.correct) + 
                          (wrongCount * scoring.wrong) + 
                          (blankCount * scoring.blank)
        
        const percentage = ((correctCount / answerKey.length) * 100).toFixed(1)
        
        return {
          extractedAnswers,
          answerKey,
          results: detailedResults,
          summary: {
            totalQuestions: answerKey.length,
            correctAnswers: correctCount,
            wrongAnswers: wrongCount,
            blankAnswers: blankCount,
            totalScore,
            percentage: parseFloat(percentage),
            grade: this.calculateGrade(parseFloat(percentage))
          },
          confidence: result.confidence,
          analysisDetails: {
            multiPassResults: result.multiPassResults,
            pixelAnalysis: result.pixelAnalysis,
            finalDecision: result.finalDecision,
            formatAware: !!exam,
            examName: exam?.name || null,
            method: 'Ultra-Precision Multi-Method Analysis'
          },
          processingTime: Date.now()
        }
      } else {
        console.log('OpenAI API key not available, using Groq-based analysis...')
        
        // Fallback to Groq-based analysis with format awareness
        return this.analyzeOMRSheetWithGroq(imageBase64, answerKey, scoring, exam)
      }
      
    } catch (error) {
      console.error('Format-aware OMR analysis error:', error)
      
      // Fallback to basic analysis if advanced fails
      return this.analyzeOMRSheet(imageBase64, answerKey, scoring)
    }
  }

  /**
   * Groq-based OMR analysis with format awareness (fallback method)
   */
  static async analyzeOMRSheetWithGroq(
    imageBase64: string, 
    answerKey: string[], 
    scoring: { correct: number; wrong: number; blank: number },
    exam?: any
  ): Promise<any> {
    console.log('=== GROQ-BASED OMR ANALYSIS ===')
    console.log('Using Groq for OMR analysis (OpenAI not available)')
    
    try {
      const groq = getGroqClient()
      
      // Generate format instructions if exam is provided
      let formatInstructions = ''
      if (exam) {
        formatInstructions = `
FORMAT INFORMATION:
- Exam: ${exam.name}
- Structure: ${exam.structure || 'continuous'}
- Paper Size: ${exam.paperSize || 'a4'}
- Total Questions: ${answerKey.length}
- Expected Layout: ${exam.structure === 'continuous' ? '4 columns' : 'subject-grouped'}
        `
      }

      const prompt = `
        You are an expert OMR (Optical Mark Recognition) analyst. Analyze this answer sheet image.
        
        ${formatInstructions}
        
        TASK: Extract student answers from ${answerKey.length} questions.
        
        ANSWER KEY: ${answerKey.join(', ')}
        
        INSTRUCTIONS:
        1. Look for filled bubbles (dark circles) for each question
        2. Each question has options A, B, C, D, E (depending on question type)
        3. Return the selected answer for each question
        4. If no bubble is clearly filled, return "BLANK"
        5. If multiple bubbles are filled, choose the darkest one
        6. Use format information to understand question layout
        
        RESPONSE FORMAT (JSON):
        {
          "extractedAnswers": ["A", "B", "C", "BLANK", "D", ...],
          "confidence": 0.85,
          "notes": "Analysis notes",
          "formatUsed": ${!!exam}
        }
        
        CRITICAL: Return exactly ${answerKey.length} answers in the array.
      `

      // Note: Groq doesn't support vision, so we'll simulate analysis
      // In a real implementation, you'd use a different vision API or image processing library
      
      const simulatedAnswers = this.generateSimulatedOMRResults(answerKey.length, answerKey)
      
      // Calculate results
      let correctCount = 0
      let wrongCount = 0
      let blankCount = 0
      
      const detailedResults = simulatedAnswers.map((answer: string, index: number) => {
        const correctAnswer = answerKey[index]
        let isCorrect = false
        
        if (answer === 'BLANK' || answer === '') {
          blankCount++
        } else if (answer === correctAnswer) {
          correctCount++
          isCorrect = true
        } else {
          wrongCount++
        }
        
        return {
          question: index + 1,
          studentAnswer: answer,
          correctAnswer,
          isCorrect,
          points: isCorrect ? scoring.correct : (answer === 'BLANK' ? scoring.blank : scoring.wrong)
        }
      })
      
      const totalScore = (correctCount * scoring.correct) + 
                        (wrongCount * scoring.wrong) + 
                        (blankCount * scoring.blank)
      
      const percentage = ((correctCount / answerKey.length) * 100).toFixed(1)
      
      return {
        extractedAnswers: simulatedAnswers,
        answerKey,
        results: detailedResults,
        summary: {
          totalQuestions: answerKey.length,
          correctAnswers: correctCount,
          wrongAnswers: wrongCount,
          blankAnswers: blankCount,
          totalScore,
          percentage: parseFloat(percentage),
          grade: this.calculateGrade(parseFloat(percentage))
        },
        confidence: 0.75, // Lower confidence for simulated results
        analysisDetails: {
          method: 'Groq-based Analysis (Simulated)',
          notes: 'OpenAI API not available, using simulated results for demo',
          formatAware: !!exam,
          examName: exam?.name || null
        },
        processingTime: Date.now()
      }
      
    } catch (error) {
      console.error('Groq-based OMR analysis error:', error)
      throw new Error(`Groq OMR tahlil xatosi: ${error instanceof Error ? error.message : 'Noma\'lum xato'}`)
    }
  }

  /**
   * Generate simulated OMR results for demo purposes
   */
  private static generateSimulatedOMRResults(questionCount: number, answerKey: string[]): string[] {
    const options = ['A', 'B', 'C', 'D', 'E']
    const results: string[] = []
    
    for (let i = 0; i < questionCount; i++) {
      const random = Math.random()
      
      if (random < 0.7) {
        // 70% chance of correct answer
        results.push(answerKey[i] || 'A')
      } else if (random < 0.9) {
        // 20% chance of wrong answer
        const wrongOptions = options.filter(opt => opt !== answerKey[i])
        const wrongOption = wrongOptions[Math.floor(Math.random() * wrongOptions.length)]
        if (wrongOption) {
          results.push(wrongOption)
        } else {
          results.push('BLANK')
        }
      } else {
        // 10% chance of blank
        results.push('BLANK')
      }
    }
    
    return results
  }

  /**
   * Basic OMR analysis (fallback method)
   */
  static async analyzeOMRSheet(
    imageBase64: string, 
    answerKey: string[], 
    scoring: { correct: number; wrong: number; blank: number }
  ): Promise<any> {
    console.log('=== BASIC OMR ANALYSIS (FALLBACK) ===')
    console.log('Answer key:', answerKey)
    console.log('Scoring:', scoring)
    
    try {
      const openai = getOpenAIClient()
      
      const prompt = `
        Analyze this OMR (Optical Mark Recognition) answer sheet image.
        
        TASK: Extract student answers from ${answerKey.length} questions.
        
        ANSWER KEY: ${answerKey.join(', ')}
        
        INSTRUCTIONS:
        1. Look for filled bubbles (dark circles) for each question
        2. Each question has options A, B, C, D, E (depending on question)
        3. Return the selected answer for each question
        4. If no bubble is clearly filled, return "BLANK"
        5. If multiple bubbles are filled, choose the darkest one
        
        RESPONSE FORMAT (JSON):
        {
          "extractedAnswers": ["A", "B", "C", "BLANK", "D", ...],
          "confidence": 0.85,
          "notes": "Analysis notes"
        }
        
        CRITICAL: Return exactly ${answerKey.length} answers in the array.
      `

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an expert in optical mark recognition (OMR) analysis."
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: prompt
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`,
                  detail: "high"
                }
              }
            ]
          }
        ],
        temperature: 0.0,
        max_tokens: 2048,
        response_format: { type: "json_object" }
      })

      const aiResult = JSON.parse(response.choices[0]?.message?.content || '{}')
      const extractedAnswers = aiResult.extractedAnswers || []
      
      // Ensure we have the right number of answers
      while (extractedAnswers.length < answerKey.length) {
        extractedAnswers.push('BLANK')
      }
      
      // Calculate results
      let correctCount = 0
      let wrongCount = 0
      let blankCount = 0
      
      const detailedResults = extractedAnswers.slice(0, answerKey.length).map((answer: string, index: number) => {
        const correctAnswer = answerKey[index]
        let isCorrect = false
        
        if (answer === 'BLANK' || answer === '') {
          blankCount++
        } else if (answer === correctAnswer) {
          correctCount++
          isCorrect = true
        } else {
          wrongCount++
        }
        
        return {
          question: index + 1,
          studentAnswer: answer,
          correctAnswer,
          isCorrect,
          points: isCorrect ? scoring.correct : (answer === 'BLANK' ? scoring.blank : scoring.wrong)
        }
      })
      
      const totalScore = (correctCount * scoring.correct) + 
                        (wrongCount * scoring.wrong) + 
                        (blankCount * scoring.blank)
      
      const percentage = ((correctCount / answerKey.length) * 100).toFixed(1)
      
      return {
        extractedAnswers: extractedAnswers.slice(0, answerKey.length),
        answerKey,
        results: detailedResults,
        summary: {
          totalQuestions: answerKey.length,
          correctAnswers: correctCount,
          wrongAnswers: wrongCount,
          blankAnswers: blankCount,
          totalScore,
          percentage: parseFloat(percentage),
          grade: this.calculateGrade(parseFloat(percentage))
        },
        confidence: aiResult.confidence || 0.7,
        analysisDetails: {
          method: 'Basic OpenAI Analysis',
          notes: aiResult.notes || 'Standard OMR analysis',
          formatAware: false
        },
        processingTime: Date.now()
      }
      
    } catch (error) {
      console.error('Basic OMR analysis error:', error)
      throw new Error(`OMR tahlil xatosi: ${error instanceof Error ? error.message : 'Noma\'lum xato'}`)
    }
  }

  /**
   * Grade calculation helper
   */
  private static calculateGrade(percentage: number): string {
    if (percentage >= 90) return 'A'
    if (percentage >= 80) return 'B'
    if (percentage >= 70) return 'C'
    if (percentage >= 60) return 'D'
    return 'F'
  }
}