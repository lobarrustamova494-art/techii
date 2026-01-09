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

  const startCapturing = useCallback(() => {
    if (isCapturing) return

    setIsCapturing(true)
    
    // Override console methods
    console.log = (...args) => {
      originalConsole.log(...args)
      addLog('log', args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)).join(' '))
    }

    console.info = (...args) => {
      originalConsole.info(...args)
      addLog('info', args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)).join(' '))
    }

    console.warn = (...args) => {
      originalConsole.warn(...args)
      addLog('warn', args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)).join(' '))
    }

    console.error = (...args) => {
      originalConsole.error(...args)
      addLog('error', args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)).join(' '))
    }
  }, [isCapturing, addLog])

  const stopCapturing = useCallback(() => {
    if (!isCapturing) return

    setIsCapturing(false)
    
    // Restore original console methods
    console.log = originalConsole.log
    console.info = originalConsole.info
    console.warn = originalConsole.warn
    console.error = originalConsole.error
  }, [isCapturing])

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
      stopCapturing()
    }
  }, [stopCapturing])

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