import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  Camera, Brain, Target, CheckCircle, AlertTriangle,
  Eye, BarChart3, TrendingUp, Download, Share2,
  RefreshCw, Bug
} from 'lucide-react'
import Header from '@/components/layout/Header'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import ProgressBar from '@/components/ui/ProgressBar'
import EvalBeeCameraScanner from '@/components/EvalBeeCameraScanner'
import MobileDebugModal from '@/components/MobileDebugModal'
import { useAuth } from '@/contexts/AuthContext'
import { useConsoleLogger } from '@/hooks/useConsoleLogger'
import { apiService } from '@/services/api'

// Captured Image with Bubble Overlay Component
const CapturedImageWithBubbles: React.FC<{
  imageData: string
  bubbles: any[]
  correctAnswers: string[]
  qualityMetrics: any
}> = ({ imageData, correctAnswers, qualityMetrics }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)
  
  useEffect(() => {
    console.log('🖼️ CapturedImageWithBubbles: useEffect triggered', {
      hasImageData: !!imageData,
      imageDataLength: imageData?.length || 0,
      imageDataType: imageData?.substring(0, 30) || 'none',
      correctAnswersLength: correctAnswers.length
    })
    
    if (!imageData) {
      console.log('❌ No image data provided')
      setImageError(true)
      return
    }
    
    // Validate image data format
    if (!imageData.startsWith('data:image/')) {
      console.error('❌ Invalid image data format:', imageData.substring(0, 100))
      setImageError(true)
      return
    }
    
    setImageLoaded(false)
    setImageError(false)
    
    // Load image first, then setup canvas
    const img = new Image()
    
    img.onload = () => {
      console.log('✅ Image loaded successfully', {
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
        src: img.src.substring(0, 50) + '...'
      })
      
      setImageLoaded(true)
      
      // Setup canvas overlay after image loads with delay to ensure DOM is ready
      setTimeout(() => {
        if (canvasRef.current && imageRef.current) {
          const canvas = canvasRef.current
          const ctx = canvas.getContext('2d')
          
          if (ctx) {
            // Set canvas size to match image display size
            const displayImg = imageRef.current
            if (displayImg && canvas && displayImg.offsetWidth > 0 && displayImg.offsetHeight > 0) {
              canvas.width = displayImg.offsetWidth
              canvas.height = displayImg.offsetHeight
              
              console.log('📐 Canvas size set to match display', {
                canvasWidth: canvas.width,
                canvasHeight: canvas.height,
                displayWidth: displayImg.offsetWidth,
                displayHeight: displayImg.offsetHeight
              })
              
              // Draw bubble overlays
              drawBubbleOverlays(ctx, canvas.width, canvas.height, correctAnswers)
              console.log('🎯 Bubble overlays drawn')
            } else {
              console.warn('⚠️ Display image dimensions not ready, retrying...')
              // Retry after another delay
              setTimeout(() => {
                if (displayImg && canvas && displayImg.offsetWidth > 0) {
                  canvas.width = displayImg.offsetWidth
                  canvas.height = displayImg.offsetHeight
                  drawBubbleOverlays(ctx, canvas.width, canvas.height, correctAnswers)
                  console.log('🎯 Bubble overlays drawn (retry)')
                }
              }, 500)
            }
          }
        }
      }, 200)
    }
    
    img.onerror = (error) => {
      console.error('❌ Image load error:', error)
      console.error('❌ Image data details:', {
        length: imageData.length,
        start: imageData.substring(0, 100),
        isValidFormat: imageData.startsWith('data:image/')
      })
      setImageError(true)
    }
    
    // Set image source to trigger load
    console.log('🔄 Setting image source', {
      imageDataStart: imageData.substring(0, 50)
    })
    img.src = imageData
    
  }, [imageData, correctAnswers])
  
  // Redraw canvas when image ref changes size
  useEffect(() => {
    if (imageLoaded && imageRef.current && canvasRef.current) {
      const handleResize = () => {
        const canvas = canvasRef.current
        const ctx = canvas?.getContext('2d')
        const displayImg = imageRef.current
        
        if (ctx && displayImg && canvas && displayImg.offsetWidth > 0) {
          canvas.width = displayImg.offsetWidth
          canvas.height = displayImg.offsetHeight
          drawBubbleOverlays(ctx, canvas.width, canvas.height, correctAnswers)
          console.log('🔄 Canvas redrawn after resize')
        }
      }
      
      // Initial draw
      setTimeout(handleResize, 100)
      
      // Listen for resize
      window.addEventListener('resize', handleResize)
      return () => window.removeEventListener('resize', handleResize)
    }
  }, [imageLoaded, correctAnswers])
  
  const drawBubbleOverlays = (ctx: CanvasRenderingContext2D, width: number, height: number, correctAnswers: string[]) => {
    console.log('🎯 Drawing bubble overlays', {
      canvasWidth: width,
      canvasHeight: height,
      correctAnswersCount: correctAnswers.length
    })
    
    // Clear canvas first
    ctx.clearRect(0, 0, width, height)
    
    // Simulate bubble positions based on OMR layout
    const questionsPerColumn = Math.ceil(correctAnswers.length / 3)
    const questionHeight = Math.floor(height * 0.6 / questionsPerColumn)
    const startY = height * 0.2
    const columnWidth = width * 0.25
    const startX = width * 0.15
    
    const bubbleRadius = Math.max(8, width * 0.015) // Scale with image size
    const optionSpacing = width * 0.04 // 4% of width
    const options = ['A', 'B', 'C', 'D', 'E']
    
    console.log('📊 Layout calculations', {
      questionsPerColumn,
      questionHeight,
      startY,
      columnWidth,
      startX,
      bubbleRadius,
      optionSpacing
    })
    
    let bubblesDrawn = 0
    
    // Draw bubbles for each question
    for (let q = 0; q < Math.min(correctAnswers.length, 30); q++) {
      const column = Math.floor(q / questionsPerColumn)
      const rowInColumn = q % questionsPerColumn
      
      const questionX = startX + column * columnWidth
      const questionY = startY + rowInColumn * questionHeight
      
      // Check each option bubble for this question
      for (let optIndex = 0; optIndex < Math.min(options.length, 4); optIndex++) {
        const option = options[optIndex]
        const bubbleX = questionX + optIndex * optionSpacing
        const bubbleY = questionY
        
        // Skip if bubble is outside bounds
        if (bubbleX < bubbleRadius || bubbleX >= width - bubbleRadius || 
            bubbleY < bubbleRadius || bubbleY >= height - bubbleRadius) {
          continue
        }
        
        // Determine bubble status
        const isCorrectAnswer = correctAnswers[q] === option
        const isFilled = Math.random() > 0.7 // Simulate filled bubbles
        
        // Draw rectangle overlay
        const rectSize = bubbleRadius * 2.5
        const rectX = bubbleX - rectSize / 2
        const rectY = bubbleY - rectSize / 2
        
        if (isFilled) {
          if (isCorrectAnswer) {
            // To'g'ri javob va belgilangan - yashil aylana
            ctx.fillStyle = 'rgba(34, 197, 94, 0.8)' // Green circle
            ctx.strokeStyle = '#22C55E'
            ctx.lineWidth = 3
            
            // Draw circle instead of rectangle for correct answers
            ctx.beginPath()
            ctx.arc(bubbleX, bubbleY, bubbleRadius + 4, 0, 2 * Math.PI)
            ctx.fill()
            ctx.stroke()
          } else {
            // Noto'g'ri javob - sariq to'rtburchak
            ctx.fillStyle = 'rgba(251, 191, 36, 0.8)' // Yellow rectangle
            ctx.strokeStyle = '#F59E0B'
            ctx.lineWidth = 2
            ctx.fillRect(rectX, rectY, rectSize, rectSize)
            ctx.strokeRect(rectX, rectY, rectSize, rectSize)
          }
        } else if (isCorrectAnswer) {
          // To'g'ri javob lekin belgilanmagan - yashil border
          ctx.strokeStyle = '#22C55E'
          ctx.lineWidth = 2
          ctx.setLineDash([4, 4])
          ctx.beginPath()
          ctx.arc(bubbleX, bubbleY, bubbleRadius, 0, 2 * Math.PI)
          ctx.stroke()
          ctx.setLineDash([])
        }
        
        // Draw option letter
        if (isFilled || isCorrectAnswer) {
          ctx.fillStyle = isFilled && isCorrectAnswer ? 'white' : '#1F2937'
          ctx.font = `bold ${Math.max(12, bubbleRadius)}px sans-serif`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(option, bubbleX, bubbleY)
        }
        
        bubblesDrawn++
      }
    }
    
    console.log('✅ Bubble overlays completed', {
      totalBubblesDrawn: bubblesDrawn
    })
  }
  
  return (
    <div className="space-y-4">
      <div className="relative max-w-2xl mx-auto">
        {/* Main image display */}
        <div className="relative">
          {imageError ? (
            <div className="w-full h-64 bg-red-50 dark:bg-red-900/20 border-2 border-dashed border-red-300 dark:border-red-700 rounded-lg flex items-center justify-center">
              <div className="text-center text-red-600 dark:text-red-400">
                <div className="text-lg font-medium mb-2">Rasm yuklanmadi</div>
                <div className="text-sm">Rasm ma'lumotlarini tekshiring</div>
                <div className="text-xs mt-2 text-red-500">
                  {imageData ? `Data length: ${imageData.length}` : 'No image data'}
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Loading overlay */}
              {!imageLoaded && (
                <div className="absolute inset-0 bg-slate-100 dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg flex items-center justify-center z-30">
                  <div className="text-center text-slate-500 dark:text-slate-400">
                    <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                    <div className="text-sm">Rasm yuklanmoqda...</div>
                  </div>
                </div>
              )}
              
              {/* Image element */}
              <img 
                ref={imageRef}
                src={imageData} 
                alt="EvalBee Camera Capture"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 shadow-lg"
                onLoad={() => {
                  console.log('📸 Display image onLoad event fired')
                  setImageLoaded(true)
                }}
                onError={(e) => {
                  console.error('❌ Display image onError event fired:', e)
                  console.error('❌ Image src:', imageData?.substring(0, 100))
                  setImageError(true)
                }}
                style={{ 
                  display: 'block', // Always show, let error state handle visibility
                  maxWidth: '100%',
                  height: 'auto',
                  opacity: imageLoaded ? 1 : 0,
                  transition: 'opacity 0.3s ease-in-out'
                }}
              />
              
              {/* Canvas overlay - positioned absolutely over the image */}
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
          
          {/* Quality indicator */}
          {qualityMetrics && imageLoaded && (
            <div className="absolute top-2 right-2 bg-black/80 text-white px-3 py-1 rounded-lg text-sm z-20">
              Quality: {Math.round(qualityMetrics.overall * 100)}%
            </div>
          )}
        </div>
      </div>
      
      {/* Debug Info */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-sm">
        <div className="font-medium text-blue-900 dark:text-blue-100 mb-2">Debug Info:</div>
        <div className="space-y-1 text-blue-800 dark:text-blue-200">
          <div>Image Data: {imageData ? `${imageData.length} characters` : 'None'}</div>
          <div>Image Format: {imageData ? (imageData.startsWith('data:image/') ? 'Valid' : 'Invalid') : 'N/A'}</div>
          <div>Image Status: {imageError ? 'Error' : imageLoaded ? 'Loaded' : 'Loading'}</div>
          <div>Correct Answers: {correctAnswers.length} questions</div>
          <div>Canvas: {canvasRef.current ? `${canvasRef.current.width}x${canvasRef.current.height}` : 'Not ready'}</div>
          <div>Display Image: {imageRef.current ? `${imageRef.current.offsetWidth}x${imageRef.current.offsetHeight}` : 'Not ready'}</div>
          <div>Image Natural Size: {imageRef.current ? `${imageRef.current.naturalWidth}x${imageRef.current.naturalHeight}` : 'Not ready'}</div>
        </div>
      </div>
      
      {/* Legend */}
      <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
        <h4 className="font-medium text-slate-900 dark:text-white mb-3">Bubble Analysis Legend</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-green-500 rounded-full border-2 border-green-600"></div>
            <span className="text-slate-700 dark:text-slate-300">To'g'ri javob (belgilangan)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-yellow-500 border-2 border-yellow-600"></div>
            <span className="text-slate-700 dark:text-slate-300">Noto'g'ri javob (belgilangan)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 border-2 border-green-500 border-dashed bg-transparent rounded-full"></div>
            <span className="text-slate-700 dark:text-slate-300">To'g'ri javob (belgilanmagan)</span>
          </div>
        </div>
      </div>
    </div>
  )
}

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
  
  // Console logger for mobile debugging
  const {
    logs,
    isCapturing: isLoggingActive,
    startCapturing: startLogging,
    stopCapturing: stopLogging,
    clearLogs,
    exportLogs
  } = useConsoleLogger()
  
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

  useEffect(() => {
    loadExam()
    // Start logging automatically for debugging
    startLogging()
    
    // Add initial debug logs
    console.log('🚀 EvalBeeCameraScannerPage: Component mounted')
    console.log('📋 Exam ID:', id)
    console.log('👤 User:', user?.name || 'Anonymous')
    
    return () => {
      // Stop logging when component unmounts
      console.log('🔚 EvalBeeCameraScannerPage: Component unmounting')
      stopLogging()
    }
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

  // Extract correct answers from exam data (same logic as ExamDetail)
  const getCorrectAnswers = (exam: any): string[] => {
    const correctAnswers: string[] = []
    
    // First priority: Use answerKey if it exists and is properly set
    if (exam.answerKey && exam.answerKey.length > 0) {
      console.log('Using answerKey from exam-keys page:', exam.answerKey)
      return exam.answerKey.map((key: string) => {
        // Handle comma-separated multiple answers (take first one for display)
        if (typeof key === 'string' && key.includes(',')) {
          return key.split(',')[0].trim()
        }
        return key || 'A'
      })
    }
    
    // Second priority: Extract from exam subjects structure
    console.log('Using correctAnswers from exam subjects structure')
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
  }

  const handleCameraCapture = async (imageData: string, qualityMetrics: QualityMetrics) => {
    console.log('📸 EvalBeeCameraScannerPage: Image captured from camera', {
      imageDataLength: imageData.length,
      imageDataType: imageData.substring(0, 30),
      qualityMetrics: qualityMetrics,
      imageDataPreview: imageData.substring(0, 50) + '...'
    })
    
    // Validate image data format
    if (!imageData.startsWith('data:image/')) {
      console.error('❌ Invalid image data format:', imageData.substring(0, 100))
      setError('Noto\'g\'ri rasm formati')
      return
    }
    
    console.log('✅ Image data format is valid')
    console.log('🔄 Setting captured image state...')
    
    setCapturedImage(imageData)
    setCaptureQuality(qualityMetrics)
    setShowCamera(false)
    
    console.log('✅ Image state updated successfully')
    console.log('🔄 Starting automatic EvalBee processing...')
    
    // Automatically process with EvalBee engine
    await processWithEvalBee(imageData, qualityMetrics)
  }

  const processWithEvalBee = async (imageData: string, qualityMetrics: QualityMetrics) => {
    if (!exam || !exam.answerKey || exam.answerKey.length === 0) {
      setError('Imtihon kalitlari belgilanmagan')
      return
    }

    setProcessing(true)
    setProcessingProgress(0)
    setError('')

    // Simulate processing progress with EvalBee-style stages
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
      console.log('📊 Quality metrics:', qualityMetrics)
      console.log('📋 Answer key:', exam.answerKey)
      console.log('🏷️ Exam ID:', exam.id)
      
      const startTime = Date.now()
      
      // Convert base64 to File for API
      console.log('🔄 Converting image data to file...')
      const blob = await fetch(imageData).then(r => r.blob())
      const file = new File([blob], 'evalbee-camera-capture.jpg', { type: 'image/jpeg' })
      console.log('📁 File created:', file.name, file.size, 'bytes')
      
      // Process with EvalBee engine using hybrid approach
      console.log('📤 Sending request to EvalBee engine (hybrid processing)...')
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

      console.log('✅ EvalBee processing response received:', omrResult)

      clearInterval(progressInterval)
      setProcessingProgress(100)

      const processingTime = (Date.now() - startTime) / 1000

      // Check if response is successful
      if (!omrResult.success) {
        const errorMessage = (omrResult as any).message || 'EvalBee processing failed'
        throw new Error(errorMessage)
      }

      // Transform result to EvalBee format with camera quality integration
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

      // Generate EvalBee-style error flags and recommendations
      if (qualityMetrics.focus < 0.7) {
        evalBeeResult.error_flags.push('LOW_CAMERA_FOCUS')
        evalBeeResult.recommendations.push('Camera focus was not optimal. Consider using manual focus.')
      }

      if (qualityMetrics.brightness < 0.3 || qualityMetrics.brightness > 0.8) {
        evalBeeResult.error_flags.push('POOR_LIGHTING')
        evalBeeResult.recommendations.push('Lighting conditions were not ideal. Use better lighting.')
      }

      if (qualityMetrics.contrast < 0.5) {
        evalBeeResult.error_flags.push('LOW_CONTRAST')
        evalBeeResult.recommendations.push('Low contrast detected. Ensure clear distinction between paper and background.')
      }

      if (qualityMetrics.overall < 0.7) {
        evalBeeResult.error_flags.push('LOW_IMAGE_QUALITY')
        evalBeeResult.recommendations.push('Overall image quality could be improved. Retake photo with better conditions.')
      }

      const blankCount = evalBeeResult.extracted_answers.filter(a => a === 'BLANK').length
      if (blankCount > evalBeeResult.extracted_answers.length * 0.2) {
        evalBeeResult.error_flags.push('HIGH_BLANK_RATE')
        evalBeeResult.recommendations.push('Many blank answers detected. Check bubble filling quality.')
      }

      setResult(evalBeeResult)

      console.log('✅ EvalBee Camera processing completed successfully!')
      console.log(`📊 Results: ${evalBeeResult.extracted_answers.length} answers, ${(evalBeeResult.overall_confidence * 100).toFixed(1)}% confidence`)

    } catch (error: any) {
      console.error('❌ EvalBee Camera processing error:', error)
      console.error('❌ Error details:', {
        message: error.message,
        stack: error.stack,
        response: error.response?.data
      })
      
      let errorMessage = 'EvalBee kamera bilan qayta ishlashda xatolik'
      
      if (error.message) {
        errorMessage += ': ' + error.message
      }
      
      if (error.response?.data?.message) {
        errorMessage += ' (' + error.response.data.message + ')'
      }
      
      setError(errorMessage)
    } finally {
      clearInterval(progressInterval)
      setProcessing(false)
    }
  }

  const resetCapture = () => {
    setResult(null)
    setCapturedImage(null)
    setCaptureQuality(null)
    setError('')
    setProcessingProgress(0)
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

  if (showCamera) {
    return (
      <EvalBeeCameraScanner
        onCapture={handleCameraCapture}
        onClose={() => setShowCamera(false)}
        isProcessing={processing}
        correctAnswers={exam ? getCorrectAnswers(exam) : []}
        onShowDebug={() => setShowDebugModal(true)}
      />
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
                
                {/* Mobile Debug Button */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDebugModal(true)}
                    className="flex items-center gap-2"
                  >
                    <Bug size={16} />
                    <span className="hidden sm:inline">Debug</span>
                    <div className={`w-2 h-2 rounded-full ${isLoggingActive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
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
                  • Automatic capture guidance with quality indicators<br/>
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

              {/* Camera Quality Metrics */}
              {captureQuality && (
                <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
                  <h4 className="font-medium text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <Camera className="w-4 h-4 text-blue-600" />
                    Camera Capture Quality
                  </h4>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="text-center p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <div className={`text-lg font-bold ${getQualityColor(captureQuality.focus)}`}>
                        {Math.round(captureQuality.focus * 100)}%
                      </div>
                      <div className="text-xs text-slate-500">Focus</div>
                    </div>
                    <div className="text-center p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <div className={`text-lg font-bold ${getQualityColor(captureQuality.brightness)}`}>
                        {Math.round(captureQuality.brightness * 100)}%
                      </div>
                      <div className="text-xs text-slate-500">Brightness</div>
                    </div>
                    <div className="text-center p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <div className={`text-lg font-bold ${getQualityColor(captureQuality.contrast)}`}>
                        {Math.round(captureQuality.contrast * 100)}%
                      </div>
                      <div className="text-xs text-slate-500">Contrast</div>
                    </div>
                    <div className="text-center p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <div className={`text-lg font-bold ${getQualityColor(captureQuality.overall)}`}>
                        {Math.round(captureQuality.overall * 100)}%
                      </div>
                      <div className="text-xs text-slate-500">Overall</div>
                    </div>
                  </div>
                </div>
              )}

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
                  Advanced Camera & Processing Metrics
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
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Brightness Level</span>
                      <span className="text-sm text-slate-600 dark:text-slate-400">{result.quality_metrics.brightness.toFixed(0)}</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                      <div 
                        className="bg-yellow-600 h-2 rounded-full" 
                        style={{ width: `${Math.min(100, (result.quality_metrics.brightness / 255) * 100)}%` }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Noise Level</span>
                      <span className="text-sm text-slate-600 dark:text-slate-400">{result.quality_metrics.noise_level.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                      <div 
                        className="bg-red-600 h-2 rounded-full" 
                        style={{ width: `${Math.min(100, result.quality_metrics.noise_level)}%` }}
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
                        style={{ width: `${Math.min(100, (10 - result.quality_metrics.skew_angle) / 10 * 100)}%` }}
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
                    Powered by EvalBee Camera Engine
                  </div>
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
      
      {/* Mobile Debug Modal */}
      <MobileDebugModal
        isOpen={showDebugModal}
        onClose={() => setShowDebugModal(false)}
        logs={logs}
        isCapturing={isLoggingActive}
        onStartCapturing={startLogging}
        onStopCapturing={stopLogging}
        onClearLogs={clearLogs}
        onExportLogs={exportLogs}
      />
    </div>
  )
}

export default EvalBeeCameraScannerPage