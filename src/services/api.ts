const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000/api'

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
}

export const apiService = new ApiService()
export default apiService