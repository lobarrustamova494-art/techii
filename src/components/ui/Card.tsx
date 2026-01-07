import React from 'react'
import { cn } from '@/lib/utils'

interface CardProps {
  children: React.ReactNode
  className?: string
  gradient?: boolean
}

const Card: React.FC<CardProps> = ({ children, className, gradient = false }) => {
  return (
    <div
      className={cn(
        'rounded-xl p-5 shadow-sm',
        gradient 
          ? 'bg-gradient-to-br from-primary to-blue-600 text-white shadow-blue-500/20' 
          : 'bg-surface-light dark:bg-surface-dark border border-slate-200 dark:border-slate-800',
        className
      )}
    >
      {children}
    </div>
  )
}

export default Card