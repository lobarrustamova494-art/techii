import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { apiService } from '@/services/api'

interface User {
  id: string
  name: string
  phone: string
  role: string
  avatar?: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (phone: string, password: string) => Promise<void>
  register: (name: string, phone: string, password: string, role: string) => Promise<void>
  logout: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token')
      if (token) {
        try {
          const response = await apiService.getCurrentUser()
          if (response.success && response.data) {
            setUser(response.data.user)
          }
        } catch (error) {
          console.error('Token tekshirishda xatolik:', error)
          localStorage.removeItem('token')
          apiService.removeToken()
        }
      }
      setLoading(false)
    }

    initAuth()
  }, [])

  const login = async (phone: string, password: string) => {
    const response = await apiService.login(phone, password)
    if (response.success && response.data) {
      apiService.setToken(response.data.token)
      setUser(response.data.user)
    } else {
      throw new Error(response.message || 'Kirish jarayonida xatolik')
    }
  }

  const register = async (name: string, phone: string, password: string, role: string) => {
    const response = await apiService.register(name, phone, password, role)
    if (response.success && response.data) {
      apiService.setToken(response.data.token)
      setUser(response.data.user)
    } else {
      throw new Error(response.message || 'Ro\'yxatdan o\'tish jarayonida xatolik')
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    apiService.removeToken()
    setUser(null)
  }

  const value: AuthContextType = {
    user,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}