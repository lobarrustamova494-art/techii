import React from 'react'

interface LoadingSpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'default' | 'dots' | 'pulse' | 'bars' | 'ring'
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'current'
  className?: string
  text?: string
  fullScreen?: boolean
  centered?: boolean
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  variant = 'default',
  color = 'primary',
  className = '',
  text,
  fullScreen = false,
  centered = false
}) => {
  const sizeClasses = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  }

  const colorClasses = {
    primary: 'text-primary border-primary',
    secondary: 'text-slate-500 border-slate-500',
    success: 'text-green-500 border-green-500',
    warning: 'text-yellow-500 border-yellow-500',
    error: 'text-red-500 border-red-500',
    current: 'text-current border-current'
  }

  const textSizeClasses = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl'
  }

  const renderSpinner = () => {
    const baseClasses = `${sizeClasses[size]} ${colorClasses[color]}`
    
    switch (variant) {
      case 'dots':
        return (
          <div className={`flex space-x-1 ${className}`}>
            <div className={`${sizeClasses[size]} ${colorClasses[color]} rounded-full animate-bounce`} style={{ animationDelay: '0ms' }}></div>
            <div className={`${sizeClasses[size]} ${colorClasses[color]} rounded-full animate-bounce`} style={{ animationDelay: '150ms' }}></div>
            <div className={`${sizeClasses[size]} ${colorClasses[color]} rounded-full animate-bounce`} style={{ animationDelay: '300ms' }}></div>
          </div>
        )
      
      case 'pulse':
        return (
          <div className={`${baseClasses} rounded-full animate-pulse bg-current ${className}`}></div>
        )
      
      case 'bars':
        return (
          <div className={`flex space-x-1 ${className}`}>
            <div className={`w-1 ${sizeClasses[size].split(' ')[1]} ${colorClasses[color]} bg-current animate-pulse`} style={{ animationDelay: '0ms' }}></div>
            <div className={`w-1 ${sizeClasses[size].split(' ')[1]} ${colorClasses[color]} bg-current animate-pulse`} style={{ animationDelay: '150ms' }}></div>
            <div className={`w-1 ${sizeClasses[size].split(' ')[1]} ${colorClasses[color]} bg-current animate-pulse`} style={{ animationDelay: '300ms' }}></div>
            <div className={`w-1 ${sizeClasses[size].split(' ')[1]} ${colorClasses[color]} bg-current animate-pulse`} style={{ animationDelay: '450ms' }}></div>
          </div>
        )
      
      case 'ring':
        return (
          <div className={`${baseClasses} border-4 border-t-transparent rounded-full animate-spin ${className}`}></div>
        )
      
      default:
        return (
          <div className={`${baseClasses} border-2 border-t-transparent rounded-full animate-spin ${className}`}></div>
        )
    }
  }

  const content = (
    <div className="flex flex-col items-center justify-center gap-3">
      {renderSpinner()}
      {text && (
        <p className={`${textSizeClasses[size]} ${colorClasses[color]} font-medium animate-pulse`}>
          {text}
        </p>
      )}
    </div>
  )

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50">
        {content}
      </div>
    )
  }

  if (centered) {
    return (
      <div className="flex items-center justify-center w-full h-full min-h-[200px]">
        {content}
      </div>
    )
  }

  return content
}

export default LoadingSpinner