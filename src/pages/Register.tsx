import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Phone, Lock, User, UserPlus, AlertCircle, CheckCircle, Shield } from 'lucide-react'
import Card from '@/components/ui/Card'
import LoadingButton from '@/components/ui/LoadingButton'
import PasswordStrength from '@/components/ui/PasswordStrength'
import { useAuth } from '@/contexts/AuthContext'
import { FormValidator } from '@/utils/validation'
import { apiService } from '@/services/api'

const Register: React.FC = () => {
  const navigate = useNavigate()
  const { register } = useAuth()
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: 'teacher'
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string
    phone?: string
    password?: string
    confirmPassword?: string
  }>({})
  const [touched, setTouched] = useState<{
    name?: boolean
    phone?: boolean
    password?: boolean
    confirmPassword?: boolean
  }>({})
  const [passwordStrength, setPasswordStrength] = useState<'weak' | 'medium' | 'strong'>('weak')

  // Real-time validation
  useEffect(() => {
    const errors: typeof fieldErrors = {}

    if (touched.name && formData.name) {
      const nameValidation = FormValidator.validateName(formData.name)
      if (!nameValidation.isValid) {
        errors.name = nameValidation.message
      }
    }

    if (touched.phone && formData.phone) {
      const phoneValidation = FormValidator.validatePhone(formData.phone)
      if (!phoneValidation.isValid) {
        errors.phone = phoneValidation.message
      }
    }

    if (touched.password && formData.password) {
      const passwordValidation = FormValidator.validatePassword(formData.password)
      if (!passwordValidation.isValid) {
        errors.password = passwordValidation.message
      }
      setPasswordStrength(passwordValidation.strength)
    }

    if (touched.confirmPassword && formData.confirmPassword) {
      const matchValidation = FormValidator.validatePasswordMatch(formData.password, formData.confirmPassword)
      if (!matchValidation.isValid) {
        errors.confirmPassword = matchValidation.message
      }
    }

    setFieldErrors(errors)
  }, [formData, touched])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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
    setTouched({ name: true, phone: true, password: true, confirmPassword: true })
    
    // Validate all fields
    const nameValidation = FormValidator.validateName(formData.name)
    const phoneValidation = FormValidator.validatePhone(formData.phone)
    const passwordValidation = FormValidator.validatePassword(formData.password)
    const matchValidation = FormValidator.validatePasswordMatch(formData.password, formData.confirmPassword)

    if (!nameValidation.isValid || !phoneValidation.isValid || !passwordValidation.isValid || !matchValidation.isValid) {
      setError('Iltimos, barcha maydonlarni to\'g\'ri to\'ldiring')
      return
    }

    setLoading(true)
    setError('')

    try {
      await register(
        formData.name,
        formData.phone,
        formData.password,
        formData.role
      )
      navigate('/')
    } catch (error: any) {
      setError(error.message || 'Ro\'yxatdan o\'tish jarayonida xatolik yuz berdi')
    } finally {
      setLoading(false)
    }
  }

  const isFormValid = () => {
    const nameValid = FormValidator.validateName(formData.name).isValid
    const phoneValid = FormValidator.validatePhone(formData.phone).isValid
    const passwordValid = FormValidator.validatePassword(formData.password).isValid
    const matchValid = FormValidator.validatePasswordMatch(formData.password, formData.confirmPassword).isValid
    return nameValid && phoneValid && passwordValid && matchValid
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500 rounded-full mb-4">
            <UserPlus size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            Ro'yxatdan o'tish
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Tizimda yangi hisob yarating
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
              {/* Name Field */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  To'liq ism
                </label>
                <div className="relative">
                  <User size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    onBlur={() => handleBlur('name')}
                    className={`w-full pl-10 pr-10 py-3 border rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:border-transparent transition-colors ${
                      fieldErrors.name
                        ? 'border-red-300 dark:border-red-600 focus:ring-red-500'
                        : touched.name && !fieldErrors.name && formData.name
                        ? 'border-green-300 dark:border-green-600 focus:ring-green-500'
                        : 'border-slate-300 dark:border-slate-600 focus:ring-primary'
                    }`}
                    placeholder="Ismingizni kiriting"
                    required
                  />
                  {touched.name && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      {fieldErrors.name ? (
                        <AlertCircle size={20} className="text-red-500" />
                      ) : formData.name ? (
                        <CheckCircle size={20} className="text-green-500" />
                      ) : null}
                    </div>
                  )}
                </div>
                {fieldErrors.name && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {fieldErrors.name}
                  </p>
                )}
              </div>

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
                        : touched.phone && !fieldErrors.phone && formData.phone
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
                      ) : formData.phone ? (
                        <CheckCircle size={20} className="text-green-500" />
                      ) : null}
                    </div>
                  )}
                </div>
                {fieldErrors.phone && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {fieldErrors.phone}
                  </p>
                )}
              </div>

              {/* Role Field */}
              <div>
                <label htmlFor="role" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Rol
                </label>
                <div className="relative">
                  <Shield size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                  <select
                    id="role"
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="teacher">O'qituvchi</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
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
                
                {/* Password Strength */}
                {formData.password && (
                  <PasswordStrength 
                    password={formData.password} 
                    strength={passwordStrength}
                    className="mt-3"
                  />
                )}
              </div>

              {/* Confirm Password Field */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Parolni tasdiqlash
                </label>
                <div className="relative">
                  <Lock size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    onBlur={() => handleBlur('confirmPassword')}
                    className={`w-full pl-10 pr-12 py-3 border rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:border-transparent transition-colors ${
                      fieldErrors.confirmPassword
                        ? 'border-red-300 dark:border-red-600 focus:ring-red-500'
                        : touched.confirmPassword && !fieldErrors.confirmPassword && formData.confirmPassword
                        ? 'border-green-300 dark:border-green-600 focus:ring-green-500'
                        : 'border-slate-300 dark:border-slate-600 focus:ring-primary'
                    }`}
                    placeholder="Parolni qayta kiriting"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                {fieldErrors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {fieldErrors.confirmPassword}
                  </p>
                )}
                {touched.confirmPassword && !fieldErrors.confirmPassword && formData.confirmPassword && (
                  <p className="mt-1 text-sm text-green-600 dark:text-green-400">
                    Parollar mos keladi
                  </p>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <LoadingButton
              type="submit"
              className="w-full py-3 text-base font-medium"
              loading={loading}
              loadingText="Ro'yxatdan o'tish..."
              disabled={!isFormValid()}
              icon={<UserPlus size={20} />}
            >
              Ro'yxatdan o'tish
            </LoadingButton>
          </form>

          {/* Login Link */}
          <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700 text-center">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Hisobingiz bormi?{' '}
              <button
                onClick={() => navigate('/login')}
                className="text-primary hover:underline font-medium"
              >
                Kirish
              </button>
            </p>
          </div>
        </Card>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
            Ro'yxatdan o'tish orqali siz foydalanish shartlariga rozilik bildirasiz
          </p>
          <button
            type="button"
            className="text-xs text-green-600 hover:underline font-medium"
            onClick={testConnection}
          >
            API Test
          </button>
        </div>
      </div>
    </div>
  )
}

export default Register