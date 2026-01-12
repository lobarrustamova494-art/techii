// Production-ready API configuration
const getApiBaseUrl = () => {
  // Check if we're in production
  if (import.meta.env.PROD) {
    // Production URL (will be set during deployment)
    return import.meta.env.VITE_API_BASE_URL || 'https://ultra-precision-omr-backend.onrender.com/api'
  }
  
  // Development URL - Backend runs on port 10000
  return import.meta.env.VITE_API_BASE_URL || 'http://localhost:10000/api'
}

const getPythonOMRUrl = () => {
  // Check if we're in production
  if (import.meta.env.PROD) {
    // Production URL for Python OMR service
    return import.meta.env.VITE_PYTHON_OMR_URL || 'https://ultra-precision-python-omr.onrender.com'
  }
  
  // Development URL - Python OMR runs on port 5000
  return import.meta.env.VITE_PYTHON_OMR_URL || 'http://localhost:5000'
}

const API_BASE_URL = getApiBaseUrl()
const PYTHON_OMR_URL = getPythonOMRUrl()

console.log('🔗 API Base URL:', API_BASE_URL)
console.log('🐍 Python OMR URL:', PYTHON_OMR_URL)

interface ApiResponse<T = any> {
  success: boolean
  message: string
  data?: T
  error?: string
}

class ApiService {
  private token: string | null = null

  constructor() {
    this.token = localStorage.getItem('token')
  }

  setToken(token: string) {
    this.token = token
    localStorage.setItem('token', token)
  }

  removeToken() {
    this.token = null
    localStorage.removeItem('token')
  }

  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${API_BASE_URL}${endpoint}`
    
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string> || {}),
    }

    // Only set Content-Type for non-FormData requests
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json'
    }

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      })

      const data = await response.json()

      if (!response.ok) {
        console.error('API Error Response:', data)
        throw new Error(data.message || 'API xatoligi')
      }

      return data
    } catch (error) {
      console.error('API request error:', error)
      throw error
    }
  }

  // Test methods
  async testConnection() {
    return this.request<{ server: string; database: string; timestamp: string }>('/test')
  }

  async healthCheck() {
    return this.request<{ message: string; timestamp: string; environment: string }>('/health')
  }

  // Auth methods
  async login(phone: string, password: string) {
    return this.request<{ user: any; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ phone, password }),
    })
  }

  async register(name: string, phone: string, password: string, role: string = 'teacher') {
    return this.request<{ user: any; token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, phone, password, role }),
    })
  }

  async getCurrentUser() {
    return this.request<{ user: any }>('/auth/me')
  }

  // Subject methods
  async getSubjects() {
    return this.request<{ subjects: any[] }>('/subjects')
  }

  async createSubject(subjectData: any) {
    return this.request<{ subject: any }>('/subjects', {
      method: 'POST',
      body: JSON.stringify(subjectData),
    })
  }

  async updateSubject(id: string, subjectData: any) {
    return this.request<{ subject: any }>(`/subjects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(subjectData),
    })
  }

  async deleteSubject(id: string) {
    return this.request(`/subjects/${id}`, {
      method: 'DELETE',
    })
  }

  // Exam methods
  async getExams() {
    return this.request<{ exams: any[] }>('/exams')
  }

  async getExam(id: string) {
    return this.request<{ exam: any }>(`/exams/${id}`)
  }

  async createExam(examData: any) {
    return this.request<{ exam: any }>('/exams', {
      method: 'POST',
      body: JSON.stringify(examData),
    })
  }

  async updateExam(id: string, examData: any) {
    return this.request<{ exam: any }>(`/exams/${id}`, {
      method: 'PUT',
      body: JSON.stringify(examData),
    })
  }

  async deleteExam(id: string) {
    return this.request(`/exams/${id}`, {
      method: 'DELETE',
    })
  }

  // AI methods (using OpenCV-based detection as primary, AI as secondary option)
  async analyzeImage(imageBase64: string, prompt?: string) {
    return this.request<any>('/ai/analyze-image', {
      method: 'POST',
      body: JSON.stringify({ image: imageBase64, prompt }),
    })
  }

  async analyzeOMRSheet(
    imageBase64: string, 
    answerKey: string[], 
    scoring: { correct: number; wrong: number; blank: number },
    examId?: string
  ) {
    const requestBody: any = {
      image: imageBase64,
      answerKey,
      scoring
    }

    // Include exam ID for format-aware analysis
    if (examId) {
      requestBody.examId = examId
    }

    return this.request<any>('/ai/analyze-omr', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    })
  }

  async uploadOMRImage(
    file: File, 
    answerKey: string[], 
    scoring: { correct: number; wrong: number; blank: number },
    examId?: string
  ) {
    const formData = new FormData()
    formData.append('image', file)
    formData.append('answerKey', JSON.stringify(answerKey))
    formData.append('scoring', JSON.stringify(scoring))
    
    if (examId) {
      formData.append('examId', examId)
    }

    return this.request<any>('/ai/upload-omr', {
      method: 'POST',
      body: formData,
    })
  }

  async analyzeText(text: string, context?: string) {
    return this.request<any>('/ai/analyze-text', {
      method: 'POST',
      body: JSON.stringify({ text, context }),
    })
  }

  async analyzeQuestions(questions: string[]) {
    return this.request<any>('/ai/analyze-questions', {
      method: 'POST',
      body: JSON.stringify({ questions }),
    })
  }

  async getAIStatus() {
    return this.request<any>('/ai/status')
  }

  // OpenCV-based OMR methods
  
  /**
   * Process OMR using Anchor-Based Processor (Langor + Piksel tahlili)
   */
  async processOMRWithAnchorBased(
    file: File,
    answerKey: string[],
    scoring: { correct: number; wrong: number; blank: number },
    examId?: string,
    examData?: any
  ) {
    console.log('🎯 Anchor-Based OMR processing started')
    
    try {
      const formData = new FormData()
      formData.append('image', file)
      formData.append('answerKey', JSON.stringify(answerKey))
      formData.append('scoring', JSON.stringify(scoring))
      formData.append('anchor_based', 'true')
      formData.append('debug', 'true')
      
      if (examId) {
        formData.append('examId', examId)
      }
      
      if (examData) {
        formData.append('examData', JSON.stringify({
          ...examData,
          processing_mode: 'anchor_based_langor',
          ocr_enabled: true,
          pixel_analysis: true
        }))
      }

      // Try Python service first (anchor-based endpoint)
      try {
        console.log('🎯 Trying Anchor-Based via Python service')
        const pythonResponse = await fetch(`${PYTHON_OMR_URL}/api/omr/process_anchor_based`, {
          method: 'POST',
          body: formData,
          headers: {
            'Accept': 'application/json'
          }
        })

        if (pythonResponse.ok) {
          const result = await pythonResponse.json()
          if (result.success) {
            console.log('✅ Anchor-Based Python processing successful')
            return this.transformAnchorBasedResult(result, answerKey, scoring)
          }
        }
      } catch (error) {
        console.warn('⚠️ Python anchor-based service failed:', error)
      }

      // Fallback to main endpoint with anchor_based flag
      console.log('🔄 Falling back to main endpoint with anchor_based flag')
      const response = await fetch(`${PYTHON_OMR_URL}/api/omr/process`, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.message || 'Anchor-Based processing failed')
      }

      console.log('✅ Anchor-Based processing completed')
      return this.transformAnchorBasedResult(result, answerKey, scoring)

    } catch (error) {
      console.error('❌ Anchor-Based OMR processing failed:', error)
      throw new Error(`Anchor-Based processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Transform anchor-based processing result
   */
  private transformAnchorBasedResult(
    result: any,
    answerKey: string[],
    scoring: { correct: number; wrong: number; blank: number }
  ) {
    const data = result.data || result
    
    // Calculate scoring
    const extractedAnswers = data.extracted_answers || []
    const scoreResults = this.calculateScore(extractedAnswers, answerKey, scoring)
    
    return {
      extractedAnswers,
      confidence: data.confidence || 0,
      processingDetails: {
        alignmentMarksFound: data.anchor_points?.length || 0,
        bubbleDetectionAccuracy: data.confidence || 0,
        imageQuality: 0.8, // Default for anchor-based
        processingMethod: data.processing_method || 'Anchor-Based OMR Processor (Langor + Piksel tahlili)',
        imageInfo: {
          width: data.processing_details?.image_dimensions?.[1] || 2000,
          height: data.processing_details?.image_dimensions?.[0] || 3000,
          format: 'JPEG',
          size: 0
        },
        actualQuestionCount: data.processing_details?.bubbles_analyzed || extractedAnswers.length,
        expectedQuestionCount: answerKey.length,
        processingTime: data.processing_time || 0,
        // Anchor-based specific details
        anchorsFound: data.processing_details?.anchors_found || 0,
        bubblesAnalyzed: data.processing_details?.bubbles_analyzed || 0,
        preprocessingApplied: data.processing_details?.preprocessing_applied || false,
        anchorPoints: data.anchor_points || [],
        bubbleRegions: data.bubble_regions || []
      },
      detailedResults: (data.detailed_results || []).map((dr: any) => ({
        question: dr.question,
        detectedAnswer: dr.detected_answer,
        confidence: dr.confidence,
        bubbleIntensities: dr.bubble_intensities || {},
        bubbleCoordinates: dr.bubble_coordinates || {},
        // Anchor-based specific fields
        processingMethod: dr.processing_method || 'anchor_based_density_analysis'
      })),
      scoring: scoreResults
    }
  }

  /**
   * Process OMR using EvalBee Professional Multi-Pass Engine
   */
  async processOMRWithEvalBeeProfessional(
    file: File,
    answerKey: string[],
    scoring: { correct: number; wrong: number; blank: number },
    examId?: string,
    examData?: any
  ) {
    console.log('🚀 EvalBee Professional OMR processing started')
    
    try {
      const formData = new FormData()
      formData.append('image', file)
      formData.append('answerKey', JSON.stringify(answerKey))
      formData.append('scoring', JSON.stringify(scoring))
      formData.append('professional', 'true')
      formData.append('debug', 'true')
      
      if (examId) {
        formData.append('examId', examId)
      }
      
      if (examData) {
        formData.append('examData', JSON.stringify({
          ...examData,
          processing_mode: 'evalbee_professional',
          multi_pass_analysis: true,
          consensus_voting: true,
          advanced_quality_control: true
        }))
      }

      // Try Python service first (professional endpoint)
      try {
        console.log('🐍 Trying EvalBee Professional via Python service')
        const pythonResponse = await fetch(`${PYTHON_OMR_URL}/api/omr/process_professional`, {
          method: 'POST',
          body: formData,
          headers: {
            'Accept': 'application/json'
          }
        })

        if (pythonResponse.ok) {
          const result = await pythonResponse.json()
          if (result.success) {
            console.log('✅ EvalBee Professional Python processing successful')
            return this.transformProfessionalResult(result, answerKey, scoring)
          }
        }
      } catch (error) {
        console.warn('⚠️ Python professional service failed:', error)
      }

      // Fallback to main endpoint with professional flag
      console.log('🔄 Falling back to main endpoint with professional flag')
      const response = await fetch(`${PYTHON_OMR_URL}/api/omr/process`, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.message || 'EvalBee Professional processing failed')
      }

      console.log('✅ EvalBee Professional processing completed')
      return this.transformProfessionalResult(result, answerKey, scoring)

    } catch (error) {
      console.error('❌ EvalBee Professional OMR processing failed:', error)
      throw new Error(`EvalBee Professional processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Calculate score based on extracted answers and answer key
   */
  private calculateScore(
    extractedAnswers: string[],
    answerKey: string[],
    scoring: { correct: number; wrong: number; blank: number }
  ) {
    let correctCount = 0
    let wrongCount = 0
    let blankCount = 0
    
    const results = []
    
    for (let i = 0; i < Math.max(extractedAnswers.length, answerKey.length); i++) {
      const studentAnswer = extractedAnswers[i] || 'BLANK'
      const correctAnswer = answerKey[i] || ''
      
      let isCorrect = false
      let points = 0
      
      if (studentAnswer === 'BLANK' || studentAnswer === '') {
        blankCount++
        points = scoring.blank
      } else if (studentAnswer === correctAnswer) {
        correctCount++
        isCorrect = true
        points = scoring.correct
      } else {
        wrongCount++
        points = scoring.wrong
      }
      
      results.push({
        question: i + 1,
        studentAnswer,
        correctAnswer,
        isCorrect,
        points
      })
    }
    
    const totalScore = (correctCount * scoring.correct + 
                       wrongCount * scoring.wrong + 
                       blankCount * scoring.blank)
    
    const percentage = answerKey.length > 0 ? (correctCount / answerKey.length * 100) : 0
    
    return {
      results,
      summary: {
        totalQuestions: answerKey.length,
        correctAnswers: correctCount,
        wrongAnswers: wrongCount,
        blankAnswers: blankCount,
        totalScore,
        percentage: Math.round(percentage * 10) / 10
      }
    }
  }

  /**
   * Transform professional processing result
   */
  private transformProfessionalResult(
    result: any,
    answerKey: string[],
    scoring: { correct: number; wrong: number; blank: number }
  ) {
    const data = result.data || result
    
    // Calculate scoring
    const extractedAnswers = data.extracted_answers || []
    const scoreResults = this.calculateScore(extractedAnswers, answerKey, scoring)
    
    return {
      success: true, // Add success flag for compatibility
      data: {
        extractedAnswers,
        confidence: data.overall_confidence || data.confidence || 0,
        processingDetails: {
          alignmentMarksFound: 6, // Professional engine assumes good alignment
          bubbleDetectionAccuracy: data.overall_confidence || data.confidence || 0,
          imageQuality: data.image_quality_metrics?.overall_quality || 0.8,
          processingMethod: data.processing_method || 'EvalBee Professional Multi-Pass Engine',
          imageInfo: {
            width: 2000,
            height: 3000,
            format: 'JPEG',
            size: 0
          },
          actualQuestionCount: data.question_results?.length || extractedAnswers.length,
          expectedQuestionCount: answerKey.length,
          processingTime: data.processing_time || 0,
          // Professional-specific details
          performanceMetrics: data.performance_metrics || {},
          errorSummary: data.error_summary || {},
          systemRecommendations: data.system_recommendations || [],
          qualityMetrics: data.image_quality_metrics || {}
        },
        detailedResults: (data.question_results || []).map((qr: any) => ({
          question: qr.question_number,
          detectedAnswer: qr.detected_answer,
          confidence: qr.confidence,
          bubbleIntensities: Object.fromEntries(
            Object.entries(qr.bubble_analyses || {}).map(([option, analysis]: [string, any]) => [
              option,
              analysis.intensity || 0
            ])
          ),
          bubbleCoordinates: Object.fromEntries(
            Object.keys(qr.bubble_analyses || {}).map(option => [
              option,
              { x: 0, y: 0 } // Coordinates not exposed in professional result
            ])
          ),
          // Professional-specific fields
          qualityScore: qr.quality_score,
          errorFlags: qr.error_flags || [],
          processingNotes: qr.processing_notes || [],
          consensusVotes: qr.consensus_votes || {},
          bubbleAnalyses: qr.bubble_analyses || {}
        })),
        scoring: scoreResults
      }
    }
  }

  // EvalBee-style OMR processing via Node.js backend
  async processOMRWithEvalBee(
    file: File,
    answerKey: string[],
    scoring: { correct: number; wrong: number; blank: number },
    examId?: string,
    examData?: any
  ) {
    const formData = new FormData()
    formData.append('image', file)
    formData.append('answerKey', JSON.stringify(answerKey))
    formData.append('scoring', JSON.stringify(scoring))
    
    if (examId) {
      formData.append('examId', examId)
    }
    
    if (examData) {
      formData.append('examData', JSON.stringify({
        ...examData,
        processing_mode: 'evalbee_engine',
        advanced_features: true,
        quality_enhancement: true
      }))
    }

    // EvalBee processing parameters
    formData.append('evalbee', 'true')        // Use EvalBee engine
    formData.append('ultra', 'true')          // Ultra precision
    formData.append('universal', 'true')      // Universal coordinates
    formData.append('quality_analysis', 'true') // Quality metrics
    formData.append('advanced_detection', 'true') // Advanced bubble detection
    formData.append('debug', 'true')

    console.log('🚀 EvalBee OMR Engine processing via Node.js backend')

    return this.request<any>('/omr/process', {
      method: 'POST',
      body: formData,
    })
  }

  // Direct Python OMR Service methods
  async processOMRDirectly(
    file: File,
    answerKey: string[],
    examId?: string,
    processingMode: string = 'evalbee'
  ) {
    const formData = new FormData()
    formData.append('image', file)
    formData.append('answerKey', JSON.stringify(answerKey))
    formData.append('processing_mode', processingMode)
    
    // EvalBee processing parameters
    formData.append('evalbee', 'true')        // Use EvalBee engine
    formData.append('ultra', 'true')          // Ultra precision
    formData.append('universal', 'true')      // Universal coordinates
    formData.append('debug', 'true')          // Debug mode
    
    if (examId) {
      formData.append('exam_id', examId)
    }

    console.log('🐍 Processing OMR directly via Python service')

    // Retry mechanism for production services
    const maxRetries = 2
    let lastError: any = null

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 Attempt ${attempt}/${maxRetries} - Connecting to Python OMR service...`)
        
        const response = await fetch(`${PYTHON_OMR_URL}/api/omr/process`, {
          method: 'POST',
          body: formData,
          // Add timeout for production
          signal: AbortSignal.timeout(30000) // 30 second timeout
        })

        if (!response.ok) {
          const errorText = await response.text()
          
          // Handle specific HTTP errors
          if (response.status === 503) {
            throw new Error('EvalBee xizmati vaqtincha ishlamayapti. Iltimos, biroz kutib qayta urinib ko\'ring.')
          } else if (response.status === 502) {
            throw new Error('EvalBee serveriga ulanishda muammo. Iltimos, qayta urinib ko\'ring.')
          } else if (response.status === 500) {
            throw new Error('EvalBee serverida ichki xatolik. Iltimos, qayta urinib ko\'ring.')
          } else {
            throw new Error(`Python OMR Error: ${response.status} - ${errorText}`)
          }
        }

        const result = await response.json()
        console.log('✅ Direct Python OMR processing completed')
        return result  // Python server already returns { success: true, data: {...} }
        
      } catch (error: any) {
        lastError = error
        console.error(`❌ Attempt ${attempt} failed:`, error.message)
        
        // Don't retry on certain errors
        if (error.name === 'AbortError') {
          throw new Error('EvalBee xizmati juda sekin javob bermoqda. Iltimos, qayta urinib ko\'ring.')
        }
        
        if (error.message.includes('EvalBee xizmati') || error.message.includes('serverida ichki')) {
          throw error // Don't retry service-specific errors
        }
        
        // Wait before retry (except on last attempt)
        if (attempt < maxRetries) {
          console.log(`⏳ Waiting 2 seconds before retry...`)
          await new Promise(resolve => setTimeout(resolve, 2000))
        }
      }
    }
    
    // All attempts failed
    console.error('❌ All retry attempts failed')
    throw lastError || new Error('EvalBee xizmatiga ulanishda muammo')
  }

  async checkPythonOMRHealth() {
    try {
      const response = await fetch(`${PYTHON_OMR_URL}/health`)
      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`)
      }
      const result = await response.json()
      console.log('✅ Python OMR service is healthy')
      return { success: true, data: result }
    } catch (error: any) {
      console.error('❌ Python OMR service health check failed:', error)
      return { success: false, error: error?.message || 'Unknown error' }
    }
  }

  // GROQ AI OMR Processing
  async processOMRWithGroqAI(
    file: File,
    answerKey: string[],
    scoring: { correct: number; wrong: number; blank: number },
    examId?: string,
    examData?: any
  ) {
    console.log('🤖 GROQ AI OMR processing started')
    
    try {
      const formData = new FormData()
      formData.append('image', file)
      formData.append('answerKey', JSON.stringify(answerKey))
      formData.append('scoring', JSON.stringify(scoring))
      formData.append('groq_ai', 'true')
      formData.append('debug', 'true')
      
      if (examId) {
        formData.append('examId', examId)
      }
      
      if (examData) {
        formData.append('examData', JSON.stringify({
          ...examData,
          processing_mode: 'groq_ai',
          ai_analysis: true,
          hybrid_approach: true
        }))
      }

      // Try GROQ AI endpoint
      try {
        console.log('🤖 Trying GROQ AI via Python service')
        const pythonResponse = await fetch(`${PYTHON_OMR_URL}/api/omr/process_groq_ai`, {
          method: 'POST',
          body: formData,
          headers: {
            'Accept': 'application/json'
          }
        })

        if (pythonResponse.ok) {
          const result = await pythonResponse.json()
          if (result.success) {
            console.log('✅ GROQ AI processing successful')
            return this.transformGroqAIResult(result, answerKey, scoring)
          }
        }
      } catch (error) {
        console.warn('⚠️ GROQ AI service failed:', error)
      }

      // Fallback to hybrid AI endpoint
      console.log('🔄 Falling back to hybrid AI endpoint')
      const response = await fetch(`${PYTHON_OMR_URL}/api/omr/process_hybrid_ai`, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'GROQ AI processing failed')
      }

      console.log('✅ GROQ AI processing completed')
      return this.transformGroqAIResult(result, answerKey, scoring)

    } catch (error) {
      console.error('❌ GROQ AI OMR processing failed:', error)
      throw new Error(`GROQ AI processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Transform GROQ AI processing result
   */
  private transformGroqAIResult(
    result: any,
    answerKey: string[],
    scoring: { correct: number; wrong: number; blank: number }
  ) {
    const data = result.data || result
    
    // Calculate scoring
    const extractedAnswers = data.extracted_answers || []
    const scoreResults = this.calculateScore(extractedAnswers, answerKey, scoring)
    
    return {
      success: true,
      data: {
        extractedAnswers,
        confidence: data.confidence || 0,
        processingDetails: {
          processingMethod: data.processing_method || 'GROQ AI OMR Analyzer',
          processingTime: data.processing_time || 0,
          aiModel: 'llama-3.2-90b-vision-preview',
          totalQuestions: answerKey.length,
          answeredQuestions: data.processing_details?.answered_questions || 0,
          blankQuestions: data.processing_details?.blank_questions || 0,
          averageConfidence: data.processing_details?.average_confidence || 0,
          // AI-specific details
          aiInsights: data.ai_insights || {},
          qualityAssessment: data.quality_assessment || {},
          recommendations: data.recommendations || [],
          confidenceScores: data.confidence_scores || [],
          hybridAnalysis: data.hybrid_analysis || false,
          comparison: data.comparison || null
        },
        scoring: scoreResults
      }
    }
  }

  // Cloud Processing Integration
  async processOMRWithCloudProcessor(
    file: File,
    answerKey: string[],
    scoring: { correct: number; wrong: number; blank: number },
    priority: number = 5
  ) {
    console.log('☁️ Cloud OMR processing started')
    
    try {
      // Convert file to base64
      const base64 = await this.fileToBase64(file)
      
      // Submit job to cloud processor
      const jobId = await this.submitCloudJob(base64, answerKey, 'professional', priority)
      
      // Wait for result
      const result = await this.waitForCloudResult(jobId, 60) // 60 second timeout
      
      if (result.success) {
        console.log('✅ Cloud processing successful')
        return this.transformCloudResult(result, answerKey, scoring)
      } else {
        throw new Error(result.error || 'Cloud processing failed')
      }
      
    } catch (error) {
      console.error('❌ Cloud OMR processing failed:', error)
      throw new Error(`Cloud processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        resolve(result)
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  private async submitCloudJob(
    imageBase64: string, 
    answerKey: string[], 
    processingMode: string, 
    priority: number
  ): Promise<string> {
    const response = await fetch(`${PYTHON_OMR_URL}/api/cloud/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        image_data: imageBase64,
        answer_key: answerKey,
        processing_mode: processingMode,
        priority: priority
      })
    })

    if (!response.ok) {
      throw new Error(`Failed to submit cloud job: ${response.status}`)
    }

    const result = await response.json()
    if (!result.success) {
      throw new Error(result.message || 'Failed to submit job')
    }

    return result.job_id
  }

  private async waitForCloudResult(jobId: string, timeoutSeconds: number): Promise<any> {
    const startTime = Date.now()
    const timeout = timeoutSeconds * 1000

    while (Date.now() - startTime < timeout) {
      try {
        const response = await fetch(`${PYTHON_OMR_URL}/api/cloud/status/${jobId}`)
        
        if (!response.ok) {
          throw new Error(`Failed to check job status: ${response.status}`)
        }

        const status = await response.json()
        
        if (status.status === 'completed') {
          return { success: true, data: status.result }
        } else if (status.status === 'failed') {
          return { success: false, error: status.error }
        }
        
        // Wait before next check
        await new Promise(resolve => setTimeout(resolve, 1000))
        
      } catch (error) {
        console.warn('Error checking cloud job status:', error)
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }

    throw new Error('Cloud processing timeout')
  }

  private transformCloudResult(
    result: any,
    answerKey: string[],
    scoring: { correct: number; wrong: number; blank: number }
  ) {
    const data = result.data || result
    const extractedAnswers = data.extracted_answers || []
    const scoreResults = this.calculateScore(extractedAnswers, answerKey, scoring)
    
    return {
      success: true,
      data: {
        extractedAnswers,
        confidence: data.confidence || 0,
        processingDetails: {
          processingMethod: 'Cloud Distributed Processing',
          processingTime: data.processing_time || 0,
          instanceId: data.instance_id || 'unknown',
          cloudMetrics: data.cloud_metrics || {}
        },
        scoring: scoreResults
      }
    }
  }
  // OMR Sheet Analysis with AI (Langor + Piksel algoritmi)
  async processOMRSheetAnalysis(
    file: File,
    answerKey: string[],
    examData?: any
  ) {
    console.log('🔍 OMR Sheet AI Analysis started')
    
    try {
      const formData = new FormData()
      formData.append('image', file)
      formData.append('answerKey', JSON.stringify(answerKey))
      
      if (examData) {
        formData.append('examData', JSON.stringify({
          ...examData,
          processing_mode: 'omr_sheet_analysis',
          ai_analysis: true,
          anchor_detection: true,
          pixel_analysis: true
        }))
      }

      console.log('🔍 Calling OMR Sheet Analyzer endpoint')
      const response = await fetch(`${PYTHON_OMR_URL}/api/omr/analyze_sheet`, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'OMR Sheet analysis failed')
      }

      console.log('✅ OMR Sheet analysis completed')
      return result

    } catch (error) {
      console.error('❌ OMR Sheet analysis failed:', error)
      throw new Error(`OMR Sheet analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Hybrid processing: Try Professional first (production stable), then anchor-based, then GROQ AI, then cloud, then fallback options
  async processOMRHybrid(
    file: File,
    answerKey: string[],
    scoring: { correct: number; wrong: number; blank: number },
    examId?: string,
    examData?: any,
    useGroqAI: boolean = import.meta.env.VITE_ENABLE_GROQ_AI === 'true',  // Control via environment variable
    useProfessional: boolean = true,  // Enable professional as primary
    useAnchorBased: boolean = true,
    useCloud: boolean = false
  ) {
    console.log('🔄 Hybrid OMR processing started')
    
    let professionalError: any = null
    let anchorError: any = null
    let groqAIError: any = null
    let cloudError: any = null
    let directError: any = null
    let backendError: any = null
    
    // Try EvalBee Professional engine first (most stable for production)
    if (useProfessional) {
      try {
        console.log('🎯 Trying EvalBee Professional Multi-Pass Engine')
        const professionalResult = await this.processOMRWithEvalBeeProfessional(file, answerKey, scoring, examId, examData)
        console.log('✅ EvalBee Professional processing successful')
        return professionalResult
      } catch (error: any) {
        professionalError = error
        console.log('⚠️ EvalBee Professional failed, falling back:', error?.message || 'Failed to fetch')
      }
    }
    
    // Try Anchor-Based processor if requested
    if (useAnchorBased) {
      try {
        console.log('🎯 Trying Anchor-Based Processor (Langor + Piksel tahlili)')
        const anchorResult = await this.processOMRWithAnchorBased(file, answerKey, scoring, examId, examData)
        console.log('✅ Anchor-Based processing successful')
        return anchorResult
      } catch (error: any) {
        anchorError = error
        console.log('⚠️ Anchor-Based failed, falling back:', error?.message || 'Failed to fetch')
      }
    }
    
    // Try GROQ AI if requested (only if enabled)
    if (useGroqAI) {
      try {
        console.log('🤖 Trying GROQ AI OMR Analyzer')
        const groqResult = await this.processOMRWithGroqAI(file, answerKey, scoring, examId, examData)
        console.log('✅ GROQ AI processing successful')
        return groqResult
      } catch (error: any) {
        groqAIError = error
        console.log('⚠️ GROQ AI failed, falling back:', error?.message || 'Failed to fetch')
      }
    }
    
    // Try Cloud processing if requested
    if (useCloud) {
      try {
        console.log('☁️ Trying Cloud Distributed Processing')
        const cloudResult = await this.processOMRWithCloudProcessor(file, answerKey, scoring, 8) // High priority
        console.log('✅ Cloud processing successful')
        return cloudResult
      } catch (error: any) {
        cloudError = error
        console.log('⚠️ Cloud processing failed, falling back:', error?.message || 'Failed to fetch')
      }
    }
    
    try {
      // Try direct Python OMR service
      console.log('🐍 Trying direct Python OMR service')
      const directResult = await this.processOMRDirectly(file, answerKey, examId, 'evalbee')
      console.log('✅ Direct Python processing successful')
      return directResult
    } catch (error: any) {
      directError = error
      console.log('⚠️ Direct Python failed, falling back to Node.js backend:', error?.message || 'Failed to fetch')
      
      try {
        // Fallback to Node.js backend
        console.log('🚀 Trying Node.js backend')
        const backendResult = await this.processOMRWithEvalBee(file, answerKey, scoring, examId, examData)
        console.log('✅ Node.js backend processing successful')
        return backendResult
      } catch (error: any) {
        backendError = error
        console.error('❌ All processing methods failed')
        
        // Create detailed error message
        const professionalMsg = professionalError?.message || 'Not attempted'
        const anchorMsg = anchorError?.message || 'Not attempted'
        const groqMsg = groqAIError?.message || 'Not attempted'
        const cloudMsg = cloudError?.message || 'Not attempted'
        const directMsg = directError?.message || 'Failed to fetch'
        const backendMsg = backendError?.message || 'Failed to fetch'
        
        // Check if it's a network connectivity issue
        if (directMsg.includes('Failed to fetch') && backendMsg.includes('Failed to fetch')) {
          throw new Error('Internetga ulanishda muammo. Iltimos, internet aloqangizni tekshiring va qayta urinib ko\'ring.')
        }
        
        // Check if services are down
        if (directMsg.includes('503') || directMsg.includes('502') || directMsg.includes('500')) {
          throw new Error('EvalBee xizmatlari vaqtincha ishlamayapti. Iltimos, biroz kutib qayta urinib ko\'ring.')
        }
        
        let errorMessage = 'OMR qayta ishlashda xatolik.'
        if (useProfessional) {
          errorMessage += ` Professional: ${professionalMsg},`
        }
        if (useAnchorBased) {
          errorMessage += ` Anchor-based: ${anchorMsg},`
        }
        if (useGroqAI) {
          errorMessage += ` GROQ AI: ${groqMsg},`
        }
        if (useCloud) {
          errorMessage += ` Cloud: ${cloudMsg},`
        }
        errorMessage += ` Python: ${directMsg}, Backend: ${backendMsg}`
        
        throw new Error(errorMessage)
      }
    }
  }
}

export const apiService = new ApiService()
export default apiService