import React from 'react'
import LoadingSpinner from './LoadingSpinner'

interface LoadingOverlayProps {
  isVisible: boolean
  message?: string
  variant?: 'default' | 'dots' | 'pulse' | 'bars' | 'ring'
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  blur?: boolean
  className?: string
  children?: React.ReactNode
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isVisible,
  message = 'Yuklanmoqda...',
  variant = 'default',
  size = 'lg',
  blur = true,
  className = '',
  children
}) => {
  if (!isVisible) return null

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center ${className}`}>
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 bg-white/80 dark:bg-slate-900/80 ${
          blur ? 'backdrop-blur-sm' : ''
        }`} 
      />
      
      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center p-8 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 max-w-sm mx-4">
        <LoadingSpinner 
          size={size} 
          variant={variant} 
          color="primary"
          text={message}
        />
        
        {children && (
          <div className="mt-4 text-center">
            {children}
          </div>
        )}
      </div>
    </div>
  )
}

export default LoadingOverlay