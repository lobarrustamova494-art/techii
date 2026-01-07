import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Eye, EyeOff, Phone, Lock, LogIn, AlertCircle, CheckCircle } from 'lucide-react'
import Card from '@/components/ui/Card'
import LoadingButton from '@/components/ui/LoadingButton'
import { useAuth } from '@/contexts/AuthContext'
import { FormValidator } from '@/utils/validation'
import { apiService } from '@/services/api'

const Login: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()
  
  const [formData, setFormData] = useState({
    phone: '',
    password: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<{
    phone?: string
    password?: string
  }>({})
  const [touched, setTouched] = useState<{
    phone?: boolean
    password?: boolean
  }>({})

  const from = location.state?.from?.pathname || '/'

  // Real-time validation
  useEffect(() => {
    const errors: typeof fieldErrors = {}

    if (touched.phone && formData.phone) {
      const phoneValidation = FormValidator.validatePhone(formData.phone)
      if (!phoneValidation.isValid) {
        errors.phone = phoneValidation.message
      }
    }

    if (touched.password && formData.password) {
      if (formData.password.length < 6) {
        errors.password = 'Parol kamida 6 ta belgidan iborat bo\'lishi kerak'
      }
    }

    setFieldErrors(errors)
  }, [formData, touched])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    
    let processedValue = value
    
    // Telefon raqam uchun format
    if (name === 'phone') {
      processedValue = FormValidator.formatPhone(value)
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: processedValue
    }))
    
    if (error) setError('')
  }

  const handleBlur = (field: keyof typeof touched) => {
    setTouched(prev => ({
      ...prev,
      [field]: true
    }))
  }

  const testConnection = async () => {
    try {
      const result = await apiService.testConnection()
      alert(`API Test: ${result.message}`)
    } catch (error) {
      alert(`API Test Failed: ${error}`)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Mark all fields as touched
    setTouched({ phone: true, password: true })
    
    // Validate all fields
    const phoneValidation = FormValidator.validatePhone(formData.phone)
    const passwordValidation = formData.password.length >= 6

    if (!phoneValidation.isValid || !passwordValidation) {
      setError('Iltimos, barcha maydonlarni to\'g\'ri to\'ldiring')
      return
    }

    setLoading(true)
    setError('')

    try {
      await login(formData.phone, formData.password)
      navigate(from, { replace: true })
    } catch (error: any) {
      setError(error.message || 'Kirish jarayonida xatolik yuz berdi')
    } finally {
      setLoading(false)
    }
  }

  const isFormValid = () => {
    const phoneValid = FormValidator.validatePhone(formData.phone).isValid
    const passwordValid = formData.password.length >= 6
    return phoneValid && passwordValid
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-full mb-4">
            <LogIn size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            Xush kelibsiz!
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Hisobingizga kirish uchun ma'lumotlaringizni kiriting
          </p>
        </div>

        <Card className="shadow-xl border-0">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Global Error */}
            {error && (
              <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <AlertCircle size={20} className="text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-red-800 dark:text-red-200">
                    Xatolik yuz berdi
                  </p>
                  <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                    {error}
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-5">
              {/* Phone Field */}
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Telefon raqam
                </label>
                <div className="relative">
                  <Phone size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    onBlur={() => handleBlur('phone')}
                    className={`w-full pl-10 pr-10 py-3 border rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:border-transparent transition-colors ${
                      fieldErrors.phone
                        ? 'border-red-300 dark:border-red-600 focus:ring-red-500'
                        : touched.phone && !fieldErrors.phone
                        ? 'border-green-300 dark:border-green-600 focus:ring-green-500'
                        : 'border-slate-300 dark:border-slate-600 focus:ring-primary'
                    }`}
                    placeholder="+998 90 123 45 67"
                    required
                  />
                  {touched.phone && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      {fieldErrors.phone ? (
                        <AlertCircle size={20} className="text-red-500" />
                      ) : (
                        <CheckCircle size={20} className="text-green-500" />
                      )}
                    </div>
                  )}
                </div>
                {fieldErrors.phone && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {fieldErrors.phone}
                  </p>
                )}
                {touched.phone && !fieldErrors.phone && formData.phone && (
                  <p className="mt-1 text-sm text-green-600 dark:text-green-400">
                    Telefon raqam to'g'ri formatda
                  </p>
                )}
              </div>

              {/* Password Field */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Parol
                </label>
                <div className="relative">
                  <Lock size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    onBlur={() => handleBlur('password')}
                    className={`w-full pl-10 pr-12 py-3 border rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:border-transparent transition-colors ${
                      fieldErrors.password
                        ? 'border-red-300 dark:border-red-600 focus:ring-red-500'
                        : touched.password && !fieldErrors.password && formData.password
                        ? 'border-green-300 dark:border-green-600 focus:ring-green-500'
                        : 'border-slate-300 dark:border-slate-600 focus:ring-primary'
                    }`}
                    placeholder="Parolingizni kiriting"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                {fieldErrors.password && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {fieldErrors.password}
                  </p>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <LoadingButton
              type="submit"
              className="w-full py-3 text-base font-medium"
              loading={loading}
              loadingText="Kirish..."
              disabled={!isFormValid()}
              icon={<LogIn size={20} />}
            >
              Tizimga kirish
            </LoadingButton>

            {/* Forgot Password */}
            <div className="text-center">
              <button
                type="button"
                className="text-sm text-primary hover:underline font-medium mr-4"
                onClick={() => {
                  // TODO: Implement forgot password
                  alert('Parolni tiklash funksiyasi hali ishlab chiqilmagan')
                }}
              >
                Parolni unutdingizmi?
              </button>
              <button
                type="button"
                className="text-sm text-green-600 hover:underline font-medium"
                onClick={testConnection}
              >
                API Test
              </button>
            </div>
          </form>

          {/* Register Link */}
          <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700 text-center">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Hisobingiz yo'qmi?{' '}
              <button
                onClick={() => navigate('/register')}
                className="text-primary hover:underline font-medium"
              >
                Ro'yxatdan o'tish
              </button>
            </p>
          </div>
        </Card>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Tizimga kirishda muammo bo'lsa, administrator bilan bog'laning
          </p>
        </div>
      </div>
    </div>
  )
}

export default Login