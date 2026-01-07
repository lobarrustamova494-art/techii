import React from 'react'
import LoadingSpinner from './LoadingSpinner'
import SkeletonLoader from './SkeletonLoader'

interface LoadingStateProps {
  type?: 'spinner' | 'skeleton' | 'dots' | 'pulse'
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  message?: string
  variant?: 'page' | 'card' | 'inline' | 'overlay'
  skeletonType?: 'text' | 'circular' | 'rectangular' | 'card' | 'list' | 'table'
  lines?: number
  className?: string
}

const LoadingState: React.FC<LoadingStateProps> = ({
  type = 'spinner',
  size = 'md',
  message,
  variant = 'inline',
  skeletonType = 'rectangular',
  lines = 3,
  className = ''
}) => {
  const renderContent = () => {
    if (type === 'skeleton') {
      return (
        <SkeletonLoader 
          variant={skeletonType} 
          lines={lines}
          className={className}
        />
      )
    }

    return (
      <div className="flex flex-col items-center justify-center gap-3">
        <LoadingSpinner 
          size={size} 
          variant={type === 'dots' ? 'dots' : type === 'pulse' ? 'pulse' : 'default'}
          color="primary"
        />
        {message && (
          <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
            {message}
          </p>
        )}
      </div>
    )
  }

  switch (variant) {
    case 'page':
      return (
        <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center">
          <div className="text-center max-w-sm mx-auto px-4">
            {renderContent()}
          </div>
        </div>
      )
    
    case 'card':
      return (
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-8">
          <div className="text-center">
            {renderContent()}
          </div>
        </div>
      )
    
    case 'overlay':
      return (
        <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-10">
          <div className="text-center">
            {renderContent()}
          </div>
        </div>
      )
    
    default:
      return (
        <div className={`flex items-center justify-center py-4 ${className}`}>
          {renderContent()}
        </div>
      )
  }
}

export default LoadingState