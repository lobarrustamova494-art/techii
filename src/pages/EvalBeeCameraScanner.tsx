import React, { useState, useEffect, useRef, lazy, Suspense, memo, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  Camera, Brain, Target, CheckCircle, AlertTriangle,
  Eye, RefreshCw, Bug
} from 'lucide-react'
import Header from '@/components/layout/Header'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import ProgressBar from '@/components/ui/ProgressBar'
import { useAuth } from '@/contexts/AuthContext'
import { useConsoleLogger } from '@/hooks/useConsoleLogger'
import { apiService } from '@/services/api'

// Lazy load heavy components for better performance
const EvalBeeCameraScanner = lazy(() => import('@/components/EvalBeeCameraScanner'))
const MobileDebugModal = lazy(() => import('@/components/MobileDebugModal'))

// Optimized Captured Image Component
const CapturedImageWithBubbles: React.FC<{
  imageData: string
  bubbles: any[]
  correctAnswers: string[]
  qualityMetrics: any
}> = memo(({ imageData, correctAnswers, qualityMetrics }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)
  
  useEffect(() => {
    if (!imageData) {
      setImageError(true)
      return
    }
    
    if (!imageData.startsWith('data:image/')) {
      setImageError(true)
      return
    }
    
    setImageLoaded(false)
    setImageError(false)
    
    const img = new Image()
    
    img.onload = () => {
      setImageLoaded(true)
      
      setTimeout(() => {
        if (canvasRef.current && imageRef.current) {
          const canvas = canvasRef.current
          const ctx = canvas.getContext('2d')
          
          if (ctx && imageRef.current.offsetWidth > 0) {
            canvas.width = imageRef.current.offsetWidth
            canvas.height = imageRef.current.offsetHeight
            
            // Simple overlay drawing
            ctx.clearRect(0, 0, canvas.width, canvas.height)
            
            // Draw sample bubbles for first 10 questions only
            const maxQuestions = Math.min(correctAnswers.length, 10)
            for (let i = 0; i < maxQuestions; i++) {
              const x = 100 + (i % 5) * 50
              const y = 100 + Math.floor(i / 5) * 50
              
              ctx.fillStyle = 'rgba(34, 197, 94, 0.5)'
              ctx.beginPath()
              ctx.arc(x, y, 8, 0, 2 * Math.PI)
              ctx.fill()
              
              ctx.fillStyle = 'white'
              ctx.font = '12px sans-serif'
              ctx.textAlign = 'center'
              ctx.fillText(correctAnswers[i] || 'A', x, y + 4)
            }
          }
        }
      }, 100)
    }
    
    img.onerror = () => setImageError(true)
    img.src = imageData
    
  }, [imageData, correctAnswers])
  
  return (
    <div className="space-y-4">
      <div className="relative max-w-2xl mx-auto">
        <div className="relative">
          {imageError ? (
            <div className="w-full h-64 bg-red-50 dark:bg-red-900/20 border-2 border-dashed border-red-300 dark:border-red-700 rounded-lg flex items-center justify-center">
              <div className="text-center text-red-600 dark:text-red-400">
                <div className="text-lg font-medium mb-2">Rasm yuklanmadi</div>
                <div className="text-sm">Rasm ma'lumotlarini tekshiring</div>
              </div>
            </div>
          ) : (
            <>
              {!imageLoaded && (
                <div className="absolute inset-0 bg-slate-100 dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg flex items-center justify-center z-30">
                  <div className="text-center text-slate-500 dark:text-slate-400">
                    <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                    <div className="text-sm">Rasm yuklanmoqda...</div>
                  </div>
                </div>
              )}
              
              <img 
                ref={imageRef}
                src={imageData} 
                alt="EvalBee Camera Capture"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 shadow-lg"
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageError(true)}
                style={{ 
                  display: 'block',
                  maxWidth: '100%',
                  height: 'auto',
                  opacity: imageLoaded ? 1 : 0,
                  transition: 'opacity 0.3s ease-in-out'
                }}
              />
              
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full rounded-lg pointer-events-none"
                style={{ 
                  background: 'transparent',
                  zIndex: 10,
                  opacity: imageLoaded ? 1 : 0,
                  transition: 'opacity 0.3s ease-in-out'
                }}
              />
            </>
          )}
          
          {qualityMetrics && imageLoaded && (
            <div className="absolute top-2 right-2 bg-black/80 text-white px-3 py-1 rounded-lg text-sm z-20">
              Quality: {Math.round(qualityMetrics.overall * 100)}%
            </div>
          )}
        </div>
      </div>
      
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-sm">
        <div className="font-medium text-blue-900 dark:text-blue-100 mb-2">Debug Info:</div>
        <div className="space-y-1 text-blue-800 dark:text-blue-200">
          <div>Image Data: {imageData ? `${imageData.length} characters` : 'None'}</div>
          <div>Image Status: {imageError ? 'Error' : imageLoaded ? 'Loaded' : 'Loading'}</div>
          <div>Correct Answers: {correctAnswers.length} questions</div>
        </div>
      </div>
      
      <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
        <h4 className="font-medium text-slate-900 dark:text-white mb-3">Bubble Analysis Legend</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-green-500 rounded-full border-2 border-green-600"></div>
            <span className="text-slate-700 dark:text-slate-300">To'g'ri javob</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-yellow-500 border-2 border-yellow-600"></div>
            <span className="text-slate-700 dark:text-slate-300">Noto'g'ri javob</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 border-2 border-green-500 border-dashed bg-transparent rounded-full"></div>
            <span className="text-slate-700 dark:text-slate-300">Bo'sh</span>
          </div>
        </div>
      </div>
    </div>
  )
})

interface QualityMetrics {
  focus: number
  brightness: number
  contrast: number
  skew: number
  overall: number
  issues: string[]
  recommendations: string[]
}

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

const EvalBeeCameraScannerPage: React.FC = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  
  // Console logger for mobile debugging - lazy loaded
  const [debugEnabled, setDebugEnabled] = useState(false)
  const consoleLogger = useConsoleLogger()
  
  const [exam, setExam] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [processingProgress, setProcessingProgress] = useState(0)
  const [result, setResult] = useState<EvalBeeResult | null>(null)
  const [error, setError] = useState('')
  const [showCamera, setShowCamera] = useState(false)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [captureQuality, setCaptureQuality] = useState<QualityMetrics | null>(null)
  const [showAdvancedMetrics, setShowAdvancedMetrics] = useState(false)
  const [showDebugModal, setShowDebugModal] = useState(false)

  // Optimized exam loading with caching
  const loadExam = useCallback(async () => {
    if (!id) return
    
    try {
      setLoading(true)
      setError('')
      
      // Check if exam is already cached in sessionStorage
      const cacheKey = `exam_${id}`
      const cached = sessionStorage.getItem(cacheKey)
      
      if (cached) {
        console.log('📦 Using cached exam data')
        const examData = JSON.parse(cached)
        setExam(examData)
        setLoading(false)
        return
      }
      
      console.log('🔄 Loading exam data from API...')
      const response = await apiService.getExam(id)
      
      if (response.data) {
        const examData = response.data.exam
        setExam(examData)
        
        // Cache exam data for 5 minutes
        sessionStorage.setItem(cacheKey, JSON.stringify(examData))
        setTimeout(() => sessionStorage.removeItem(cacheKey), 300000)
        
        console.log('✅ Exam data loaded and cached')
      }
    } catch (error: any) {
      console.error('❌ Failed to load exam:', error)
      setError('Imtihon ma\'lumotlarini yuklashda xatolik')
    } finally {
      setLoading(false)
    }
  }, [id])

  // Initialize component with optimizations
  useEffect(() => {
    loadExam()
    
    // Only enable debug logging in development
    console.log('🚀 EvalBeeCameraScannerPage: Component mounted')
  }, [loadExam])

  // Memoize correct answers extraction
  const getCorrectAnswers = useCallback((exam: any): string[] => {
    if (!exam) return []
    
    const correctAnswers: string[] = []
    
    // First priority: Use answerKey if it exists and is properly set
    if (exam.answerKey && exam.answerKey.length > 0) {
      return exam.answerKey.map((key: string) => {
        // Handle comma-separated multiple answers (take first one for display)
        if (typeof key === 'string' && key.includes(',')) {
          return key.split(',')[0].trim()
        }
        return key || 'A'
      })
    }
    
    // Second priority: Extract from exam subjects structure
    if (exam.subjects) {
      exam.subjects.forEach((subject: any) => {
        if (subject.sections) {
          subject.sections.forEach((section: any) => {
            if (section.questions) {
              section.questions.forEach((question: any) => {
                correctAnswers.push(question.correctAnswer || 'A')
              })
            } else {
              // If no questions array, generate default answers based on question count
              for (let i = 0; i < section.questionCount; i++) {
                correctAnswers.push('A') // Default to 'A' if no correct answer specified
              }
            }
          })
        }
      })
    }
    
    return correctAnswers
  }, [])

  // Enable debug mode handler
  const handleShowDebug = useCallback(() => {
    if (!debugEnabled) {
      setDebugEnabled(true)
      // Start logging when debug is first enabled
      setTimeout(() => {
        consoleLogger.startCapturing()
      }, 100)
    }
    setShowDebugModal(true)
  }, [debugEnabled, consoleLogger])

  const handleCameraCapture = useCallback(async (imageData: string, qualityMetrics: QualityMetrics) => {
    console.log('📸 EvalBeeCameraScannerPage: Image captured from camera')
    
    // Validate image data format
    if (!imageData.startsWith('data:image/')) {
      console.error('❌ Invalid image data format')
      setError('Noto\'g\'ri rasm formati')
      return
    }
    
    console.log('✅ Image data format is valid')
    
    setCapturedImage(imageData)
    setCaptureQuality(qualityMetrics)
    setShowCamera(false)
    
    console.log('🔄 Starting automatic EvalBee processing...')
    
    // Automatically process with EvalBee engine
    await processWithEvalBee(imageData, qualityMetrics)
  }, [])

  const processWithEvalBee = useCallback(async (imageData: string, qualityMetrics: QualityMetrics) => {
    if (!exam || !exam.answerKey || exam.answerKey.length === 0) {
      setError('Imtihon kalitlari belgilanmagan')
      return
    }

    setProcessing(true)
    setProcessingProgress(0)
    setError('')

    // Simulate processing progress
    const progressStages = [
      { progress: 15, message: "Image quality analysis..." },
      { progress: 30, message: "Bubble detection..." },
      { progress: 50, message: "Layout structure analysis..." },
      { progress: 70, message: "Answer extraction..." },
      { progress: 85, message: "Confidence calculation..." },
      { progress: 95, message: "Final validation..." }
    ]

    let currentStage = 0
    const progressInterval = setInterval(() => {
      if (currentStage < progressStages.length) {
        setProcessingProgress(progressStages[currentStage].progress)
        currentStage++
      } else {
        clearInterval(progressInterval)
      }
    }, 800)

    try {
      console.log('🚀 EvalBee Camera Processing started')
      
      const startTime = Date.now()
      
      // Convert base64 to File for API
      const blob = await fetch(imageData).then(r => r.blob())
      const file = new File([blob], 'evalbee-camera-capture.jpg', { type: 'image/jpeg' })
      
      // Process with EvalBee engine
      const omrResult = await apiService.processOMRHybrid(
        file,
        exam.answerKey,
        exam.scoring || { correct: 1, wrong: 0, blank: 0 },
        exam.id,
        {
          ...exam,
          processing_mode: 'evalbee_camera_enhanced',
          quality_enhancement: true,
          advanced_detection: true,
          camera_quality_metrics: qualityMetrics
        }
      )

      clearInterval(progressInterval)
      setProcessingProgress(100)

      const processingTime = (Date.now() - startTime) / 1000

      // Check if response is successful
      if (!omrResult.success) {
        const errorMessage = (omrResult as any).message || 'EvalBee processing failed'
        throw new Error(errorMessage)
      }

      // Transform result to EvalBee format
      const evalBeeResult: EvalBeeResult = {
        extracted_answers: omrResult.data?.extractedAnswers || [],
        confidence_scores: omrResult.data?.results?.map((r: any) => r.confidence) || [],
        overall_confidence: omrResult.data?.confidence || 0,
        processing_time: processingTime,
        layout_analysis: {
          layout_type: omrResult.data?.processingDetails?.layout_type || 'camera_detected',
          total_questions: omrResult.data?.processingDetails?.actual_question_count || omrResult.data?.extractedAnswers?.length || 0,
          columns: 3,
          format_confidence: omrResult.data?.confidence || 0
        },
        quality_metrics: {
          sharpness: qualityMetrics.focus * 200,
          contrast_ratio: qualityMetrics.contrast,
          brightness: qualityMetrics.brightness * 255,
          noise_level: (1 - qualityMetrics.overall) * 100,
          skew_angle: qualityMetrics.skew * 10,
          overall_quality: qualityMetrics.overall
        },
        detailed_results: omrResult.data?.results || [],
        error_flags: [],
        recommendations: []
      }

      setResult(evalBeeResult)

      console.log('✅ EvalBee Camera processing completed successfully!')

    } catch (error: any) {
      console.error('❌ EvalBee Camera processing error:', error)
      
      let errorMessage = 'EvalBee kamera bilan qayta ishlashda xatolik'
      
      if (error.message) {
        errorMessage += ': ' + error.message
      }
      
      setError(errorMessage)
    } finally {
      clearInterval(progressInterval)
      setProcessing(false)
    }
  }, [exam])

  const resetCapture = useCallback(() => {
    setResult(null)
    setCapturedImage(null)
    setCaptureQuality(null)
    setError('')
    setProcessingProgress(0)
  }, [])

  const getQualityColor = useCallback((score: number) => {
    if (score >= 0.8) return 'text-green-600'
    if (score >= 0.6) return 'text-yellow-600'
    return 'text-red-600'
  }, [])

  const getQualityLabel = useCallback((score: number) => {
    if (score >= 0.8) return 'Excellent'
    if (score >= 0.6) return 'Good'
    return 'Needs Improvement'
  }, [])

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

  if (showCamera) {
    return (
      <Suspense fallback={
        <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
          <div className="text-center text-white">
            <div className="animate-spin w-12 h-12 border-4 border-white border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-lg">Kamera yuklanmoqda...</p>
          </div>
        </div>
      }>
        <EvalBeeCameraScanner
          onCapture={handleCameraCapture}
          onClose={() => setShowCamera(false)}
          isProcessing={processing}
          correctAnswers={exam ? getCorrectAnswers(exam) : []}
          onShowDebug={handleShowDebug}
        />
      </Suspense>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {user && <Header user={user} />}
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-r from-green-500 to-blue-600 rounded-xl">
              <Camera className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                EvalBee Camera Scanner
              </h1>
              <p className="text-slate-600 dark:text-slate-400">
                Professional real-time OMR scanning with quality control
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
                      <Target size={16} />
                      <span>{exam.answerKey?.length || 0} questions</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Eye size={16} />
                      <span>Real-time quality control</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Brain size={16} />
                      <span>EvalBee Engine</span>
                    </div>
                  </div>
                </div>
                
                {/* Mobile Debug Button - Optimized */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleShowDebug}
                    className="flex items-center gap-2"
                  >
                    <Bug size={16} />
                    <span className="hidden sm:inline">Debug</span>
                    <div className={`w-2 h-2 rounded-full ${debugEnabled && consoleLogger.isCapturing ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {error && (
          <Card className="mb-6 border-red-200 bg-red-50 dark:bg-red-900/20">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <p className="text-red-700 dark:text-red-400">{error}</p>
            </div>
          </Card>
        )}

        {!result && !processing && !capturedImage && (
          <Card className="mb-6">
            <div className="text-center py-12">
              <div className="mb-6">
                <div className="mx-auto w-24 h-24 bg-gradient-to-r from-green-500 to-blue-600 rounded-full flex items-center justify-center mb-4">
                  <Camera className="w-12 h-12 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                  Start Camera Scanning
                </h3>
                <p className="text-slate-600 dark:text-slate-400 mb-6">
                  EvalBee camera will analyze image quality in real-time and guide you for perfect capture
                </p>
              </div>

              <div className="space-y-4">
                <Button
                  onClick={() => setShowCamera(true)}
                  className="bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700"
                  size="lg"
                >
                  <Camera size={20} className="mr-2" />
                  Open EvalBee Camera
                </Button>

                <div className="text-xs text-slate-500 dark:text-slate-400 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg max-w-2xl mx-auto">
                  <strong>EvalBee Camera Features:</strong><br/>
                  • Real-time image quality analysis (focus, brightness, contrast)<br/>
                  • Live bubble detection and counting<br/>
                  • Automatic capture guidance with quality control<br/>
                  • Professional-grade image enhancement<br/>
                  • Instant feedback and recommendations
                </div>
              </div>
            </div>
          </Card>
        )}

        {processing && (
          <Card className="mb-6">
            <div className="text-center py-8">
              <div className="mb-6">
                <div className="mx-auto w-16 h-16 bg-gradient-to-r from-green-500 to-blue-600 rounded-full flex items-center justify-center mb-4 animate-pulse">
                  <Brain className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                  EvalBee Engine Processing...
                </h3>
                <p className="text-slate-600 dark:text-slate-400 mb-4">
                  Advanced AI analysis with camera quality integration
                </p>
              </div>

              <div className="max-w-md mx-auto">
                <ProgressBar value={processingProgress} className="mb-4" />
                <div className="text-sm text-slate-500 dark:text-slate-400">
                  {processingProgress < 20 && "Analyzing camera image quality..."}
                  {processingProgress >= 20 && processingProgress < 40 && "Detecting bubble patterns..."}
                  {processingProgress >= 40 && processingProgress < 60 && "Analyzing layout structure..."}
                  {processingProgress >= 60 && processingProgress < 80 && "Extracting answers..."}
                  {processingProgress >= 80 && processingProgress < 95 && "Calculating confidence scores..."}
                  {processingProgress >= 95 && "Finalizing results..."}
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
                  EvalBee Camera Analysis Complete
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
                  <div className="text-sm text-slate-600 dark:text-slate-400">Camera Quality</div>
                </div>
              </div>
            </Card>

            {/* Captured Image with Bubble Overlay */}
            {capturedImage && (
              <Card>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                  Suratga olingan rasm - Bubble Analysis
                </h3>
                <CapturedImageWithBubbles 
                  imageData={capturedImage}
                  bubbles={result?.detailed_results || []}
                  correctAnswers={exam ? getCorrectAnswers(exam) : []}
                  qualityMetrics={captureQuality}
                />
              </Card>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4">
              <Button onClick={resetCapture} variant="outline">
                <RefreshCw size={16} className="mr-2" />
                Capture Again
              </Button>
              <Button onClick={() => navigate(`/exam-detail/${id}`)} className="flex-1">
                Save Results
              </Button>
            </div>
          </div>
        )}
      </div>
      
      {/* Mobile Debug Modal - Lazy Loaded */}
      {showDebugModal && (
        <Suspense fallback={
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 text-center">
              <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-slate-700 dark:text-slate-300">Debug modal yuklanmoqda...</p>
            </div>
          </div>
        }>
          <MobileDebugModal
            isOpen={showDebugModal}
            onClose={() => setShowDebugModal(false)}
            logs={consoleLogger.logs}
            isCapturing={consoleLogger.isCapturing}
            onStartCapturing={consoleLogger.startCapturing}
            onStopCapturing={consoleLogger.stopCapturing}
            onClearLogs={consoleLogger.clearLogs}
            onExportLogs={consoleLogger.exportLogs}
          />
        </Suspense>
      )}
    </div>
  )
}

export default EvalBeeCameraScannerPage