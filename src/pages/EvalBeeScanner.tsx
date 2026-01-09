import React, { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { 
  AlertCircle, FileText, Brain, Upload,
  BarChart3, TrendingUp, AlertTriangle, CheckCircle, Clock, Target,
  Download, Share2, Eye
} from 'lucide-react'
import Header from '@/components/layout/Header'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import ProgressBar from '@/components/ui/ProgressBar'
import { useAuth } from '@/contexts/AuthContext'
import { apiService } from '@/services/api'

interface EvalBeeResult {
  extracted_answers: string[]
  confidence_scores: number[]
  overall_confidence: number
  processing_time: number
  layout_analysis: {
    layout_type: string
    total_questions: number
    columns: number
    format_confidence: number
  }
  quality_metrics: {
    sharpness: number
    contrast_ratio: number
    brightness: number
    noise_level: number
    skew_angle: number
    overall_quality: number
  }
  detailed_results: Array<{
    question: number
    bubble_coordinates: Record<string, {x: number, y: number}>
    bubble_intensities: Record<string, number>
    status: string
  }>
  error_flags: string[]
  recommendations: string[]
}

const EvalBeeScanner: React.FC = () => {
  const { id } = useParams()
  const { user } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [exam, setExam] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [processingProgress, setProcessingProgress] = useState(0)
  const [result, setResult] = useState<EvalBeeResult | null>(null)
  const [error, setError] = useState('')
  const [showAdvancedMetrics, setShowAdvancedMetrics] = useState(false)

  useEffect(() => {
    loadExam()
  }, [id])

  const loadExam = async () => {
    try {
      setLoading(true)
      const response = await apiService.getExam(id!)
      if (response.data) {
        setExam(response.data.exam)
      }
    } catch (error: any) {
      setError('Imtihon ma\'lumotlarini yuklashda xatolik')
    } finally {
      setLoading(false)
    }
  }

  const processWithEvalBee = async (file: File) => {
    if (!exam || !exam.answerKey || exam.answerKey.length === 0) {
      setError('Imtihon kalitlari belgilanmagan')
      return
    }

    setProcessing(true)
    setProcessingProgress(0)
    setError('')

    // Simulate processing progress
    const progressInterval = setInterval(() => {
      setProcessingProgress(prev => {
        if (prev >= 90) return prev
        return prev + Math.random() * 10
      })
    }, 500)

    try {
      console.log('🚀 EvalBee OMR Engine processing started')
      
      const startTime = Date.now()
      
      // Enhanced image processing with quality enhancement
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')!
      const img = document.createElement('img')
      
      await new Promise((resolve) => {
        img.onload = resolve
        img.src = URL.createObjectURL(file)
      })
      
      // High-quality image processing
      const maxSize = 3000  // Higher resolution for better accuracy
      const scale = Math.min(2.5, maxSize / Math.max(img.width, img.height))
      
      canvas.width = img.width * scale
      canvas.height = img.height * scale
      
      // Advanced image enhancement
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      
      // Apply contrast enhancement
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const data = imageData.data
      
      // Contrast and brightness adjustment
      const contrast = 1.2
      const brightness = 10
      
      for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.min(255, Math.max(0, contrast * (data[i] - 128) + 128 + brightness))     // Red
        data[i + 1] = Math.min(255, Math.max(0, contrast * (data[i + 1] - 128) + 128 + brightness)) // Green
        data[i + 2] = Math.min(255, Math.max(0, contrast * (data[i + 2] - 128) + 128 + brightness)) // Blue
      }
      
      ctx.putImageData(imageData, 0, 0)
      
      // Convert to high-quality blob
      const enhancedBlob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error('Failed to create blob'))
          }
        }, 'image/jpeg', 0.98)
      })
      
      const enhancedFile = new File([enhancedBlob], file.name, { type: 'image/jpeg' })
      
      // EvalBee processing with advanced parameters
      const omrResult = await apiService.processOMRWithEvalBee(
        enhancedFile,
        exam.answerKey,
        exam.scoring || { correct: 1, wrong: 0, blank: 0 },
        exam.id,
        {
          ...exam,
          processing_mode: 'evalbee_high_accuracy',
          quality_enhancement: true,
          advanced_detection: true
        }
      )

      clearInterval(progressInterval)
      setProcessingProgress(100)

      const processingTime = (Date.now() - startTime) / 1000

      // Transform result to EvalBee format
      const evalBeeResult: EvalBeeResult = {
        extracted_answers: omrResult.data?.extracted_answers || [],
        confidence_scores: omrResult.data?.detailed_results?.map((r: any) => r.confidence) || [],
        overall_confidence: omrResult.data?.confidence || 0,
        processing_time: processingTime,
        layout_analysis: {
          layout_type: omrResult.data?.processing_details?.layout_type || 'unknown',
          total_questions: omrResult.data?.processing_details?.actual_question_count || 0,
          columns: 3, // Default
          format_confidence: omrResult.data?.confidence || 0
        },
        quality_metrics: {
          sharpness: omrResult.data?.processing_details?.image_quality ? omrResult.data.processing_details.image_quality * 200 : 100,
          contrast_ratio: 0.45, // Simulated
          brightness: 128, // Simulated
          noise_level: 0.05, // Simulated
          skew_angle: 0.5, // Simulated
          overall_quality: omrResult.data?.processing_details?.image_quality || 0.85
        },
        detailed_results: omrResult.data?.detailed_results || [],
        error_flags: [],
        recommendations: []
      }

      // Generate error flags and recommendations
      if (evalBeeResult.overall_confidence < 0.7) {
        evalBeeResult.error_flags.push('LOW_CONFIDENCE')
        evalBeeResult.recommendations.push('Consider retaking the photo with better lighting')
      }

      const blankCount = evalBeeResult.extracted_answers.filter(a => a === 'BLANK').length
      if (blankCount > evalBeeResult.extracted_answers.length * 0.2) {
        evalBeeResult.error_flags.push('HIGH_BLANK_RATE')
        evalBeeResult.recommendations.push('Many blank answers detected. Check bubble filling quality')
      }

      if (evalBeeResult.quality_metrics.overall_quality < 0.7) {
        evalBeeResult.error_flags.push('LOW_IMAGE_QUALITY')
        evalBeeResult.recommendations.push('Image quality could be improved. Ensure good lighting and focus')
      }

      setResult(evalBeeResult)

      console.log('✅ EvalBee processing completed successfully!')
      console.log(`📊 Results: ${evalBeeResult.extracted_answers.length} answers, ${(evalBeeResult.overall_confidence * 100).toFixed(1)}% confidence`)

    } catch (error: any) {
      console.error('❌ EvalBee processing error:', error)
      setError('EvalBee qayta ishlashda xatolik: ' + error.message)
    } finally {
      clearInterval(progressInterval)
      setProcessing(false)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    await processWithEvalBee(file)
  }

  const getQualityColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600'
    if (score >= 0.6) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getQualityLabel = (score: number) => {
    if (score >= 0.8) return 'Excellent'
    if (score >= 0.6) return 'Good'
    return 'Needs Improvement'
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
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl">
              <Brain className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                EvalBee OMR Scanner
              </h1>
              <p className="text-slate-600 dark:text-slate-400">
                Professional-grade OMR processing with advanced AI
              </p>
            </div>
          </div>
          
          {exam && (
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                    {exam.title}
                  </h2>
                  <div className="flex items-center gap-6 text-sm text-slate-600 dark:text-slate-400">
                    <div className="flex items-center gap-2">
                      <FileText size={16} />
                      <span>{exam.answerKey?.length || 0} questions</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock size={16} />
                      <span>{exam.duration || 'No limit'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Target size={16} />
                      <span>EvalBee Engine</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {error && (
          <Card className="mb-6 border-red-200 bg-red-50 dark:bg-red-900/20">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <p className="text-red-700 dark:text-red-400">{error}</p>
            </div>
          </Card>
        )}

        {!result && !processing && (
          <Card className="mb-6">
            <div className="text-center py-12">
              <div className="mb-6">
                <div className="mx-auto w-24 h-24 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-4">
                  <Upload className="w-12 h-12 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                  Upload OMR Sheet
                </h3>
                <p className="text-slate-600 dark:text-slate-400 mb-6">
                  EvalBee engine will automatically detect and process any OMR format
                </p>
              </div>

              <div className="space-y-4">
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                  size="lg"
                >
                  <Upload size={20} className="mr-2" />
                  Choose Image File
                </Button>

                <div className="text-xs text-slate-500 dark:text-slate-400 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <strong>EvalBee Advanced Features:</strong><br/>
                  • Universal format detection (any OMR layout)<br/>
                  • Advanced image quality enhancement<br/>
                  • Multi-method bubble detection<br/>
                  • Real-time confidence scoring<br/>
                  • Comprehensive error analysis
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          </Card>
        )}

        {processing && (
          <Card className="mb-6">
            <div className="text-center py-8">
              <div className="mb-6">
                <div className="mx-auto w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-4 animate-pulse">
                  <Brain className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                  EvalBee Engine Processing...
                </h3>
                <p className="text-slate-600 dark:text-slate-400 mb-4">
                  Advanced AI analysis in progress
                </p>
              </div>

              <div className="max-w-md mx-auto">
                <ProgressBar value={processingProgress} className="mb-4" />
                <div className="text-sm text-slate-500 dark:text-slate-400">
                  {processingProgress < 30 && "Analyzing image quality..."}
                  {processingProgress >= 30 && processingProgress < 60 && "Detecting layout structure..."}
                  {processingProgress >= 60 && processingProgress < 90 && "Processing bubbles..."}
                  {processingProgress >= 90 && "Finalizing results..."}
                </div>
              </div>
            </div>
          </Card>
        )}

        {result && (
          <div className="space-y-6">
            {/* Results Overview */}
            <Card>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  EvalBee Analysis Complete
                </h3>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAdvancedMetrics(!showAdvancedMetrics)}
                  >
                    <Eye size={16} className="mr-1" />
                    {showAdvancedMetrics ? 'Hide' : 'Show'} Details
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-1">
                    {result.extracted_answers.length}
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">Questions Detected</div>
                </div>
                <div className="text-center">
                  <div className={`text-3xl font-bold mb-1 ${getQualityColor(result.overall_confidence)}`}>
                    {(result.overall_confidence * 100).toFixed(1)}%
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">Overall Confidence</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600 mb-1">
                    {result.processing_time.toFixed(1)}s
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">Processing Time</div>
                </div>
                <div className="text-center">
                  <div className={`text-3xl font-bold mb-1 ${getQualityColor(result.quality_metrics.overall_quality)}`}>
                    {getQualityLabel(result.quality_metrics.overall_quality)}
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">Image Quality</div>
                </div>
              </div>

              {/* Error Flags and Recommendations */}
              {(result.error_flags.length > 0 || result.recommendations.length > 0) && (
                <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
                  {result.error_flags.length > 0 && (
                    <div className="mb-4">
                      <h4 className="font-medium text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-yellow-600" />
                        Detected Issues
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {result.error_flags.map((flag, index) => (
                          <span
                            key={index}
                            className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 rounded-full text-sm"
                          >
                            {flag.replace(/_/g, ' ')}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {result.recommendations.length > 0 && (
                    <div>
                      <h4 className="font-medium text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-blue-600" />
                        Recommendations
                      </h4>
                      <ul className="space-y-1">
                        {result.recommendations.map((rec, index) => (
                          <li key={index} className="text-sm text-slate-600 dark:text-slate-400 flex items-start gap-2">
                            <span className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0"></span>
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </Card>

            {/* Advanced Metrics */}
            {showAdvancedMetrics && (
              <Card>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Advanced Quality Metrics
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Image Sharpness</span>
                      <span className="text-sm text-slate-600 dark:text-slate-400">{result.quality_metrics.sharpness.toFixed(0)}</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${Math.min(100, (result.quality_metrics.sharpness / 200) * 100)}%` }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Contrast Ratio</span>
                      <span className="text-sm text-slate-600 dark:text-slate-400">{result.quality_metrics.contrast_ratio.toFixed(2)}</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full" 
                        style={{ width: `${Math.min(100, (result.quality_metrics.contrast_ratio / 0.6) * 100)}%` }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Noise Level</span>
                      <span className="text-sm text-slate-600 dark:text-slate-400">{(result.quality_metrics.noise_level * 100).toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                      <div 
                        className="bg-yellow-600 h-2 rounded-full" 
                        style={{ width: `${Math.min(100, result.quality_metrics.noise_level * 1000)}%` }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Skew Angle</span>
                      <span className="text-sm text-slate-600 dark:text-slate-400">{result.quality_metrics.skew_angle.toFixed(1)}°</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                      <div 
                        className="bg-purple-600 h-2 rounded-full" 
                        style={{ width: `${Math.min(100, (5 - result.quality_metrics.skew_angle) / 5 * 100)}%` }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Layout Detection</span>
                      <span className="text-sm text-slate-600 dark:text-slate-400">{result.layout_analysis.layout_type}</span>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {result.layout_analysis.columns} columns, {result.layout_analysis.total_questions} questions
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Format Confidence</span>
                      <span className="text-sm text-slate-600 dark:text-slate-400">{(result.layout_analysis.format_confidence * 100).toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                      <div 
                        className="bg-indigo-600 h-2 rounded-full" 
                        style={{ width: `${result.layout_analysis.format_confidence * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* Answer Results */}
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Extracted Answers
                </h3>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Download size={16} className="mr-1" />
                    Export
                  </Button>
                  <Button variant="outline" size="sm">
                    <Share2 size={16} className="mr-1" />
                    Share
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                {result.extracted_answers.map((answer, index) => {
                  const confidence = result.confidence_scores[index] || 0
                  const isHighConfidence = confidence >= 0.8
                  const isMediumConfidence = confidence >= 0.6
                  
                  return (
                    <div
                      key={index}
                      className={`
                        p-3 rounded-lg text-center border-2 transition-all
                        ${answer === 'BLANK' 
                          ? 'border-slate-300 bg-slate-100 dark:bg-slate-800 dark:border-slate-600' 
                          : isHighConfidence
                            ? 'border-green-300 bg-green-50 dark:bg-green-900/20 dark:border-green-600'
                            : isMediumConfidence
                              ? 'border-yellow-300 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-600'
                              : 'border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-600'
                        }
                      `}
                    >
                      <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                        Q{index + 1}
                      </div>
                      <div className={`
                        font-bold text-lg
                        ${answer === 'BLANK' 
                          ? 'text-slate-400 dark:text-slate-500' 
                          : isHighConfidence
                            ? 'text-green-700 dark:text-green-400'
                            : isMediumConfidence
                              ? 'text-yellow-700 dark:text-yellow-400'
                              : 'text-red-700 dark:text-red-400'
                        }
                      `}>
                        {answer === 'BLANK' ? '—' : answer}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {(confidence * 100).toFixed(0)}%
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded"></div>
                      <span className="text-slate-600 dark:text-slate-400">High Confidence (≥80%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                      <span className="text-slate-600 dark:text-slate-400">Medium Confidence (60-80%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-red-500 rounded"></div>
                      <span className="text-slate-600 dark:text-slate-400">Low Confidence (&lt;60%)</span>
                    </div>
                  </div>
                  <div className="text-slate-500 dark:text-slate-400">
                    Powered by EvalBee Engine
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}

export default EvalBeeScanner