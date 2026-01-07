import React from 'react'
import { Check, X, AlertCircle } from 'lucide-react'

interface PasswordStrengthProps {
  password: string
  strength: 'weak' | 'medium' | 'strong'
  className?: string
}

const PasswordStrength: React.FC<PasswordStrengthProps> = ({
  password,
  strength,
  className = ''
}) => {
  const requirements = [
    {
      label: 'Kamida 8 ta belgi',
      met: password.length >= 8
    },
    {
      label: 'Katta harf (A-Z)',
      met: /[A-Z]/.test(password)
    },
    {
      label: 'Kichik harf (a-z)',
      met: /[a-z]/.test(password)
    },
    {
      label: 'Raqam (0-9)',
      met: /[0-9]/.test(password)
    },
    {
      label: 'Maxsus belgi (!@#$%)',
      met: /[^A-Za-z0-9]/.test(password)
    }
  ]

  const getStrengthColor = () => {
    switch (strength) {
      case 'weak':
        return 'text-red-600 dark:text-red-400'
      case 'medium':
        return 'text-yellow-600 dark:text-yellow-400'
      case 'strong':
        return 'text-green-600 dark:text-green-400'
      default:
        return 'text-slate-600 dark:text-slate-400'
    }
  }

  const getStrengthBars = () => {
    const bars = []
    const activeCount = strength === 'weak' ? 1 : strength === 'medium' ? 2 : 3

    for (let i = 0; i < 3; i++) {
      bars.push(
        <div
          key={i}
          className={`h-1 rounded-full flex-1 ${
            i < activeCount
              ? strength === 'weak'
                ? 'bg-red-500'
                : strength === 'medium'
                ? 'bg-yellow-500'
                : 'bg-green-500'
              : 'bg-slate-200 dark:bg-slate-700'
          }`}
        />
      )
    }

    return bars
  }

  if (!password) return null

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Strength Indicator */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Parol kuchliligi
          </span>
          <span className={`text-sm font-medium capitalize ${getStrengthColor()}`}>
            {strength === 'weak' ? 'Zaif' : strength === 'medium' ? 'O\'rta' : 'Kuchli'}
          </span>
        </div>
        
        <div className="flex gap-1">
          {getStrengthBars()}
        </div>
      </div>

      {/* Requirements */}
      <div className="space-y-1">
        <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
          Parol talablari:
        </p>
        {requirements.map((req, index) => (
          <div key={index} className="flex items-center gap-2">
            {req.met ? (
              <Check size={12} className="text-green-500" />
            ) : (
              <X size={12} className="text-slate-400" />
            )}
            <span className={`text-xs ${
              req.met 
                ? 'text-green-600 dark:text-green-400' 
                : 'text-slate-500 dark:text-slate-400'
            }`}>
              {req.label}
            </span>
          </div>
        ))}
      </div>

      {/* Security Tips */}
      {strength === 'weak' && (
        <div className="flex items-start gap-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
          <AlertCircle size={14} className="text-yellow-600 dark:text-yellow-400 mt-0.5" />
          <p className="text-xs text-yellow-700 dark:text-yellow-300">
            Xavfsizlik uchun kuchli parol tanlang
          </p>
        </div>
      )}
    </div>
  )
}

export default PasswordStrength