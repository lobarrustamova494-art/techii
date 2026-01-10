import React from 'react'
import { X, Download, Trash2, Play, Square, AlertCircle, Info, AlertTriangle, Bug, Copy, CopyCheck } from 'lucide-react'

interface LogEntry {
  id: string
  timestamp: string
  level: 'log' | 'info' | 'warn' | 'error'
  message: string
  data?: any
}

interface MobileDebugModalProps {
  isOpen: boolean
  onClose: () => void
  logs: LogEntry[]
  isCapturing: boolean
  onStartCapturing: () => void
  onStopCapturing: () => void
  onClearLogs: () => void
  onExportLogs: () => void
}

const MobileDebugModal: React.FC<MobileDebugModalProps> = ({
  isOpen,
  onClose,
  logs,
  isCapturing,
  onStartCapturing,
  onStopCapturing,
  onClearLogs,
  onExportLogs
}) => {
  const [copiedLogId, setCopiedLogId] = React.useState<string | null>(null)
  const [copiedAll, setCopiedAll] = React.useState(false)
  const logsEndRef = React.useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new logs are added
  React.useEffect(() => {
    if (logsEndRef.current && logs.length > 0) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs.length])

  if (!isOpen) return null

  const getLogIcon = (level: LogEntry['level']) => {
    switch (level) {
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />
      case 'warn':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />
      case 'info':
        return <Info className="w-4 h-4 text-blue-500" />
      default:
        return <Bug className="w-4 h-4 text-gray-500" />
    }
  }

  const getLogBgColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'error':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
      case 'warn':
        return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
      case 'info':
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
      default:
        return 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800'
    }
  }

  const copyLogToClipboard = async (log: LogEntry) => {
    try {
      const logText = `[${log.timestamp}] ${log.level.toUpperCase()}: ${log.message}`
      await navigator.clipboard.writeText(logText)
      setCopiedLogId(log.id)
      setTimeout(() => setCopiedLogId(null), 2000)
    } catch (err) {
      console.error('Failed to copy log:', err)
    }
  }

  const copyAllLogsToClipboard = async () => {
    try {
      const allLogsText = logs.map(log => 
        `[${log.timestamp}] ${log.level.toUpperCase()}: ${log.message}`
      ).join('\n')
      await navigator.clipboard.writeText(allLogsText)
      setCopiedAll(true)
      setTimeout(() => setCopiedAll(false), 2000)
    } catch (err) {
      console.error('Failed to copy all logs:', err)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-t-2xl sm:rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Bug className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                Debug Console
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Mobile debugging for EvalBee Camera
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </button>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
          <button
            onClick={isCapturing ? onStopCapturing : onStartCapturing}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              isCapturing
                ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50'
                : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50'
            }`}
          >
            {isCapturing ? (
              <>
                <Square className="w-4 h-4" />
                Stop Logging
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Start Logging
              </>
            )}
          </button>

          <button
            onClick={onClearLogs}
            className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg text-sm font-medium transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Clear
          </button>

          <button
            onClick={onExportLogs}
            disabled={logs.length === 0}
            className="flex items-center gap-2 px-3 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            Export
          </button>

          <button
            onClick={copyAllLogsToClipboard}
            disabled={logs.length === 0}
            className="flex items-center gap-2 px-3 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {copiedAll ? (
              <>
                <CopyCheck className="w-4 h-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy All
              </>
            )}
          </button>

          <div className="ml-auto flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
            <div className={`w-2 h-2 rounded-full ${isCapturing ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
            {logs.length} logs
          </div>
        </div>

        {/* Logs Display */}
        <div className="flex-1 overflow-auto p-4 space-y-2 min-h-0">
          {logs.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-slate-500 dark:text-slate-400">
              <div className="text-center">
                <Bug className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No logs captured yet</p>
                <p className="text-xs mt-1">
                  {isCapturing ? 'Logs will appear here as they are generated' : 'Click "Start Logging" to begin capturing'}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className={`p-3 rounded-lg border ${getLogBgColor(log.level)}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {getLogIcon(log.level)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase">
                          {log.level}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-500">
                          {log.timestamp}
                        </span>
                      </div>
                      <div className="text-sm text-slate-900 dark:text-white break-words whitespace-pre-wrap">
                        {log.message}
                      </div>
                      {log.data && (
                        <details className="mt-2">
                          <summary className="text-xs text-slate-600 dark:text-slate-400 cursor-pointer hover:text-slate-800 dark:hover:text-slate-200">
                            Show data ({typeof log.data === 'object' ? 'object' : typeof log.data})
                          </summary>
                          <pre className="mt-1 text-xs bg-slate-100 dark:bg-slate-800 p-2 rounded overflow-x-auto text-slate-700 dark:text-slate-300 max-h-40 overflow-y-auto">
                            {typeof log.data === 'string' ? log.data : JSON.stringify(log.data, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                    <div className="flex-shrink-0">
                      <button
                        onClick={() => copyLogToClipboard(log)}
                        className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"
                        title="Copy this log"
                      >
                        {copiedLogId === log.id ? (
                          <CopyCheck className="w-4 h-4 text-green-600" />
                        ) : (
                          <Copy className="w-4 h-4 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Auto-scroll to bottom indicator */}
              <div className="text-center py-2">
                <div className="text-xs text-slate-400 dark:text-slate-500">
                  {logs.length} total logs • Scroll up to see older logs
                </div>
              </div>
              
              {/* Invisible element for auto-scroll */}
              <div ref={logsEndRef} />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <div>
              EvalBee Mobile Debug Console
            </div>
            <div>
              {isCapturing ? 'Recording...' : 'Paused'}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MobileDebugModal