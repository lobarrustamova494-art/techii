import { useState, useEffect, useCallback } from 'react'

interface LogEntry {
  id: string
  timestamp: string
  level: 'log' | 'info' | 'warn' | 'error'
  message: string
  data?: any
}

export const useConsoleLogger = () => {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [isCapturing, setIsCapturing] = useState(false)

  // Store original console methods
  const originalConsole = {
    log: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error
  }

  const addLog = useCallback((level: LogEntry['level'], message: string, data?: any) => {
    const logEntry: LogEntry = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 11),
      timestamp: new Date().toLocaleTimeString(),
      level,
      message,
      data
    }
    
    setLogs(prev => [...prev.slice(-99), logEntry]) // Keep last 100 logs
  }, [])

  // Global error handler
  const handleGlobalError = useCallback((event: ErrorEvent) => {
    if (isCapturing) {
      addLog('error', `Global Error: ${event.message}`, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error?.toString()
      })
    }
  }, [isCapturing, addLog])

  // Unhandled promise rejection handler
  const handleUnhandledRejection = useCallback((event: PromiseRejectionEvent) => {
    if (isCapturing) {
      addLog('error', `Unhandled Promise Rejection: ${event.reason}`, {
        reason: event.reason,
        promise: event.promise
      })
    }
  }, [isCapturing, addLog])

  const startCapturing = useCallback(() => {
    if (isCapturing) return

    console.log('🎯 Console Logger: Starting log capture')
    setIsCapturing(true)
    
    // Override console methods to capture all logs
    console.log = (...args) => {
      originalConsole.log(...args)
      const message = args.map(arg => {
        if (typeof arg === 'object') {
          try {
            return JSON.stringify(arg, null, 2)
          } catch (e) {
            return String(arg)
          }
        }
        return String(arg)
      }).join(' ')
      addLog('log', message, args.length > 1 ? args.slice(1) : undefined)
    }

    console.info = (...args) => {
      originalConsole.info(...args)
      const message = args.map(arg => {
        if (typeof arg === 'object') {
          try {
            return JSON.stringify(arg, null, 2)
          } catch (e) {
            return String(arg)
          }
        }
        return String(arg)
      }).join(' ')
      addLog('info', message, args.length > 1 ? args.slice(1) : undefined)
    }

    console.warn = (...args) => {
      originalConsole.warn(...args)
      const message = args.map(arg => {
        if (typeof arg === 'object') {
          try {
            return JSON.stringify(arg, null, 2)
          } catch (e) {
            return String(arg)
          }
        }
        return String(arg)
      }).join(' ')
      addLog('warn', message, args.length > 1 ? args.slice(1) : undefined)
    }

    console.error = (...args) => {
      originalConsole.error(...args)
      const message = args.map(arg => {
        if (typeof arg === 'object') {
          try {
            return JSON.stringify(arg, null, 2)
          } catch (e) {
            return String(arg)
          }
        }
        return String(arg)
      }).join(' ')
      addLog('error', message, args.length > 1 ? args.slice(1) : undefined)
    }
    
    // Capture existing console history if available
    if (window.console && (window.console as any)._history) {
      (window.console as any)._history.forEach((entry: any) => {
        addLog(entry.level || 'log', entry.message || String(entry))
      })
    }
    
    // Add global error listeners
    window.addEventListener('error', handleGlobalError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)
    
    // Add initial log to confirm capture is working
    addLog('info', 'Console logging started - all logs will be captured here')
  }, [isCapturing, addLog, handleGlobalError, handleUnhandledRejection])

  const stopCapturing = useCallback(() => {
    if (!isCapturing) return

    console.log('🛑 Console Logger: Stopping log capture')
    setIsCapturing(false)
    
    // Remove global error listeners
    window.removeEventListener('error', handleGlobalError)
    window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    
    // Restore original console methods
    console.log = originalConsole.log
    console.info = originalConsole.info
    console.warn = originalConsole.warn
    console.error = originalConsole.error
    
    // Add final log using original console
    originalConsole.log('Console logging stopped')
  }, [isCapturing, handleGlobalError, handleUnhandledRejection])

  const clearLogs = useCallback(() => {
    setLogs([])
  }, [])

  const exportLogs = useCallback(() => {
    const logText = logs.map(log => 
      `[${log.timestamp}] ${log.level.toUpperCase()}: ${log.message}`
    ).join('\n')
    
    const blob = new Blob([logText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `evalbee-logs-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [logs])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Remove event listeners and restore console
      window.removeEventListener('error', handleGlobalError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
      stopCapturing()
    }
  }, [stopCapturing, handleGlobalError, handleUnhandledRejection])

  return {
    logs,
    isCapturing,
    startCapturing,
    stopCapturing,
    clearLogs,
    exportLogs,
    addLog
  }
}