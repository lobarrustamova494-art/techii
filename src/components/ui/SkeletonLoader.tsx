import React from 'react'

interface SkeletonLoaderProps {
  variant?: 'text' | 'circular' | 'rectangular' | 'card' | 'list' | 'table'
  width?: string | number
  height?: string | number
  lines?: number
  className?: string
  animate?: boolean
}

const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  variant = 'rectangular',
  width,
  height,
  lines = 3,
  className = '',
  animate = true
}) => {
  const baseClasses = `bg-slate-200 dark:bg-slate-700 ${animate ? 'animate-pulse' : ''}`
  
  const getStyle = () => {
    const style: React.CSSProperties = {}
    if (width) style.width = typeof width === 'number' ? `${width}px` : width
    if (height) style.height = typeof height === 'number' ? `${height}px` : height
    return style
  }

  const renderSkeleton = () => {
    switch (variant) {
      case 'text':
        return (
          <div className={`space-y-2 ${className}`}>
            {Array.from({ length: lines }).map((_, index) => (
              <div
                key={index}
                className={`${baseClasses} rounded h-4`}
                style={{
                  width: index === lines - 1 ? '75%' : '100%',
                  ...getStyle()
                }}
              />
            ))}
          </div>
        )
      
      case 'circular':
        return (
          <div
            className={`${baseClasses} rounded-full ${className}`}
            style={{ width: width || '40px', height: height || '40px', ...getStyle() }}
          />
        )
      
      case 'card':
        return (
          <div className={`${className} space-y-4`}>
            <div className={`${baseClasses} rounded-lg h-48`} />
            <div className="space-y-2">
              <div className={`${baseClasses} rounded h-4 w-3/4`} />
              <div className={`${baseClasses} rounded h-4 w-1/2`} />
            </div>
          </div>
        )
      
      case 'list':
        return (
          <div className={`space-y-3 ${className}`}>
            {Array.from({ length: lines }).map((_, index) => (
              <div key={index} className="flex items-center space-x-3">
                <div className={`${baseClasses} rounded-full w-10 h-10`} />
                <div className="flex-1 space-y-2">
                  <div className={`${baseClasses} rounded h-4 w-3/4`} />
                  <div className={`${baseClasses} rounded h-3 w-1/2`} />
                </div>
              </div>
            ))}
          </div>
        )
      
      case 'table':
        return (
          <div className={`space-y-2 ${className}`}>
            <div className={`${baseClasses} rounded h-8 w-full`} />
            {Array.from({ length: lines }).map((_, index) => (
              <div key={index} className="flex space-x-2">
                <div className={`${baseClasses} rounded h-6 flex-1`} />
                <div className={`${baseClasses} rounded h-6 flex-1`} />
                <div className={`${baseClasses} rounded h-6 flex-1`} />
              </div>
            ))}
          </div>
        )
      
      default:
        return (
          <div
            className={`${baseClasses} rounded ${className}`}
            style={{ width: width || '100%', height: height || '20px', ...getStyle() }}
          />
        )
    }
  }

  return renderSkeleton()
}

export default SkeletonLoader