import React from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

const Input: React.FC<InputProps> = ({ label, className, ...props }) => {
  return (
    <div className="flex flex-col">
      {label && (
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
          {label}
        </label>
      )}
      <input
        className={cn(
          'w-full bg-transparent border-0 p-0 text-base text-slate-900 dark:text-white placeholder:text-gray-400 focus:ring-0',
          className
        )}
        {...props}
      />
    </div>
  )
}

export default Input