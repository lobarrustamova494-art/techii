import React, { useState } from 'react'
import { LogOut, Settings, Home } from 'lucide-react'
import { User } from '@/types'
import { useAuth } from '@/contexts/AuthContext'
import { useNavigate } from 'react-router-dom'

interface HeaderProps {
  user: User
  title?: string
  showBack?: boolean
  showHome?: boolean
  onBack?: () => void
  actions?: React.ReactNode
}

const Header: React.FC<HeaderProps> = ({ user, title, showBack, showHome = true, onBack, actions }) => {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [showDropdown, setShowDropdown] = useState(false)

  const handleLogout = () => {
    logout()
    setShowDropdown(false)
  }

  const handleHome = () => {
    navigate('/')
  }

  const getInitials = (name: string) => {
    if (!name) return 'U'
    const words = name.trim().split(' ')
    if (words.length === 1) {
      return words[0].charAt(0).toUpperCase()
    }
    return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase()
  }
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between px-4 py-3 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800">
      {showBack ? (
        <button 
          onClick={onBack}
          className="flex items-center justify-center p-2 -ml-2 text-slate-600 hover:text-primary dark:text-gray-400 dark:hover:text-white transition-colors"
        >
          <span className="text-base font-medium">Ortga</span>
        </button>
      ) : (
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="bg-primary text-white rounded-full size-10 border-2 border-white dark:border-slate-700 shadow-sm flex items-center justify-center font-semibold text-sm">
              {getInitials(user.name)}
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Xush kelibsiz,</span>
            <span className="text-sm font-bold text-slate-900 dark:text-white leading-tight">{user.name}</span>
          </div>
        </div>
      )}

      {title && (
        <h2 className="text-slate-900 dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center">
          {title}
        </h2>
      )}

      {actions || (
        <div className="flex items-center gap-2">
          {showHome && !showBack && (
            <button 
              onClick={handleHome}
              className="flex items-center justify-center size-10 rounded-full bg-white dark:bg-surface-dark shadow-sm border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              title="Bosh sahifa"
            >
              <Home size={20} />
            </button>
          )}
          
          <div className="relative">
            <button 
              onClick={() => setShowDropdown(!showDropdown)}
              className="relative flex items-center justify-center size-10 rounded-full bg-white dark:bg-surface-dark shadow-sm border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              <Settings size={20} />
            </button>

            {showDropdown && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setShowDropdown(false)}
                />
                <div className="absolute right-0 top-12 z-20 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-2">
                  <button
                    onClick={handleHome}
                    className="flex items-center gap-3 w-full px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    <Home size={16} />
                    Bosh sahifa
                  </button>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <LogOut size={16} />
                    Chiqish
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}

export default Header