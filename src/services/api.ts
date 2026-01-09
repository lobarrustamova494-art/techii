// Production-ready API configuration
const getApiBaseUrl = () => {
  // Check if we're in production
  if (import.meta.env.PROD) {
    // Production URL (will be set during deployment)
    return import.meta.env.VITE_API_URL || 'https://ultra-precision-omr-backend.onrender.com/api'
  }
  
  // Development URL - Backend runs on port 10000
  return import.meta.env.VITE_API_URL || 'http://localhost:10000/api'
}

const API_BASE_URL = getApiBaseUrl()

console.log('🔗 API Base URL:', API_BASE_URL)

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
  // EvalBee-style OMR processing
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

    console.log('🚀 EvalBee OMR Engine processing with advanced features')

    return this.request<any>('/omr/process', {
      method: 'POST',
      body: formData,
    })
  }
}

export const apiService = new ApiService()
export default apiService