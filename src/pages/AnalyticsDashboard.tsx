import React, { useState, useEffect } from 'react'
import { 
  BarChart3, TrendingUp, FileText, 
  Clock, Target, AlertTriangle, CheckCircle,
  Download, RefreshCw
} from 'lucide-react'
import Header from '@/components/layout/Header'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { useAuth } from '@/contexts/AuthContext'

interface AnalyticsData {
  overview: {
    totalProcessed: number
    averageAccuracy: number
    averageProcessingTime: number
    successRate: number
  }
  trends: {
    daily: Array<{
      date: string
      processed: number
      accuracy: number
      processingTime: number
    }>
    weekly: Array<{
      week: string
      processed: number
      accuracy: number
    }>
  }
  qualityMetrics: {
    excellent: number
    good: number
    fair: number
    poor: number
  }
  processingMethods: {
    [key: string]: number
  }
  commonErrors: Array<{
    error: string
    count: number
    percentage: number
  }>
  recommendations: string[]
}

const AnalyticsDashboard: React.FC = () => {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [error, setError] = useState('')
  const [timeRange, setTimeRange] = useState('7d')
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    loadAnalytics()
  }, [timeRange])

  const loadAnalytics = async () => {
    try {
      setLoading(true)
      setError('')
      
      // Simulate analytics API call
      // In real implementation, this would call the analytics service
      const mockData: AnalyticsData = {
        overview: {
          totalProcessed: 1247,
          averageAccuracy: 94.2,
          averageProcessingTime: 3.8,
          successRate: 96.1
        },
        trends: {
          daily: [
            { date: '2026-01-05', processed: 45, accuracy: 93.2, processingTime: 4.1 },
            { date: '2026-01-06', processed: 67, accuracy: 94.8, processingTime: 3.9 },
            { date: '2026-01-07', processed: 52, accuracy: 95.1, processingTime: 3.7 },
            { date: '2026-01-08', processed: 78, accuracy: 93.9, processingTime: 4.0 },
            { date: '2026-01-09', processed: 89, accuracy: 96.2, processingTime: 3.5 },
            { date: '2026-01-10', processed: 134, accuracy: 94.7, processingTime: 3.8 },
            { date: '2026-01-11', processed: 156, accuracy: 95.3, processingTime: 3.6 }
          ],
          weekly: [
            { week: 'Week 1', processed: 234, accuracy: 93.8 },
            { week: 'Week 2', processed: 456, accuracy: 94.5 },
            { week: 'Week 3', processed: 557, accuracy: 95.1 }
          ]
        },
        qualityMetrics: {
          excellent: 45,
          good: 32,
          fair: 18,
          poor: 5
        },
        processingMethods: {
          'EvalBee Professional': 45,
          'Anchor-Based': 28,
          'Ultra-Precision': 18,
          'Standard': 9
        },
        commonErrors: [
          { error: 'LOW_IMAGE_QUALITY', count: 23, percentage: 15.2 },
          { error: 'MULTIPLE_ANSWERS', count: 18, percentage: 11.9 },
          { error: 'LOW_CONTRAST', count: 12, percentage: 7.9 },
          { error: 'POOR_ALIGNMENT', count: 8, percentage: 5.3 }
        ],
        recommendations: [
          'Rasm sifatini yaxshilash uchun yaxshi yorug\'lik ishlatilsin',
          'Bir nechta javob belgilangan savollarni tekshiring',
          'Kamera fokusini yaxshilash tavsiya etiladi',
          'OMR varaqlarini to\'g\'ri joylashtirish muhim'
        ]
      }
      
      setData(mockData)
    } catch (err: any) {
      setError('Analytics ma\'lumotlarini yuklashda xatolik')
    } finally {
      setLoading(false)
    }
  }

  const refreshData = async () => {
    setRefreshing(true)
    await loadAnalytics()
    setRefreshing(false)
  }

  const exportReport = () => {
    // Export analytics report
    const reportData = {
      generatedAt: new Date().toISOString(),
      timeRange,
      data
    }
    
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `evalbee-analytics-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        {user && <Header user={user} />}
        <div className="flex items-center justify-center h-96">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {user && <Header user={user} />}
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl">
                <BarChart3 className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                  EvalBee Analytics
                </h1>
                <p className="text-slate-600 dark:text-slate-400">
                  Professional OMR tizimi tahlili va monitoring
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="1d">Bugun</option>
                <option value="7d">7 kun</option>
                <option value="30d">30 kun</option>
                <option value="90d">90 kun</option>
              </select>
              
              <Button
                variant="outline"
                onClick={refreshData}
                disabled={refreshing}
                className="flex items-center gap-2"
              >
                <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                Yangilash
              </Button>
              
              <Button
                onClick={exportReport}
                className="flex items-center gap-2"
              >
                <Download size={16} />
                Eksport
              </Button>
            </div>
          </div>
        </div>

        {error && (
          <Card className="mb-6 border-red-200 bg-red-50 dark:bg-red-900/20">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <p className="text-red-700 dark:text-red-400">{error}</p>
            </div>
          </Card>
        )}

        {data && (
          <div className="space-y-6">
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                      Jami Qayta Ishlangan
                    </p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">
                      {data.overview.totalProcessed.toLocaleString()}
                    </p>
                  </div>
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <FileText className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                      O'rtacha Aniqlik
                    </p>
                    <p className="text-2xl font-bold text-green-600">
                      {data.overview.averageAccuracy.toFixed(1)}%
                    </p>
                  </div>
                  <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <Target className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                      O'rtacha Vaqt
                    </p>
                    <p className="text-2xl font-bold text-purple-600">
                      {data.overview.averageProcessingTime.toFixed(1)}s
                    </p>
                  </div>
                  <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    <Clock className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                      Muvaffaqiyat Darajasi
                    </p>
                    <p className="text-2xl font-bold text-emerald-600">
                      {data.overview.successRate.toFixed(1)}%
                    </p>
                  </div>
                  <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                    <CheckCircle className="w-6 h-6 text-emerald-600" />
                  </div>
                </div>
              </Card>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Daily Trends */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                  Kunlik Tendensiyalar
                </h3>
                <div className="space-y-4">
                  {data.trends.daily.map((day, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span className="text-sm text-slate-600 dark:text-slate-400">
                          {new Date(day.date).toLocaleDateString('uz-UZ')}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-slate-900 dark:text-white font-medium">
                          {day.processed} ta
                        </span>
                        <span className="text-green-600">
                          {day.accuracy.toFixed(1)}%
                        </span>
                        <span className="text-purple-600">
                          {day.processingTime.toFixed(1)}s
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Quality Distribution */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                  Sifat Taqsimoti
                </h3>
                <div className="space-y-3">
                  {Object.entries(data.qualityMetrics).map(([quality, percentage]) => (
                    <div key={quality} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${
                          quality === 'excellent' ? 'bg-green-500' :
                          quality === 'good' ? 'bg-blue-500' :
                          quality === 'fair' ? 'bg-yellow-500' : 'bg-red-500'
                        }`}></div>
                        <span className="text-sm text-slate-600 dark:text-slate-400 capitalize">
                          {quality === 'excellent' ? 'Ajoyib' :
                           quality === 'good' ? 'Yaxshi' :
                           quality === 'fair' ? 'O\'rtacha' : 'Past'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              quality === 'excellent' ? 'bg-green-500' :
                              quality === 'good' ? 'bg-blue-500' :
                              quality === 'fair' ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium text-slate-900 dark:text-white">
                          {percentage}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Processing Methods & Errors */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Processing Methods */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                  Qayta Ishlash Usullari
                </h3>
                <div className="space-y-3">
                  {Object.entries(data.processingMethods).map(([method, percentage]) => (
                    <div key={method} className="flex items-center justify-between">
                      <span className="text-sm text-slate-600 dark:text-slate-400">
                        {method}
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                          <div 
                            className="h-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full"
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium text-slate-900 dark:text-white w-10">
                          {percentage}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Common Errors */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                  Keng Tarqalgan Xatoliklar
                </h3>
                <div className="space-y-3">
                  {data.commonErrors.map((error, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                        <span className="text-sm text-slate-600 dark:text-slate-400">
                          {error.error.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">
                          {error.count} ta
                        </span>
                        <span className="text-sm font-medium text-red-600">
                          {error.percentage.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Recommendations */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                Tavsiyalar va Yaxshilashlar
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.recommendations.map((recommendation, index) => (
                  <div key={index} className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                    <p className="text-sm text-slate-700 dark:text-slate-300">
                      {recommendation}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}

export default AnalyticsDashboard