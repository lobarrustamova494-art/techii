import React, { useRef, useEffect, useState } from 'react'
import { Check, X, AlertCircle, Eye, EyeOff } from 'lucide-react'

interface BubbleAnnotation {
  x: number
  y: number
  option: string
  questionNumber: number
  isDetected: boolean
  isCorrect: boolean
  confidence: number
  fillPercentage: number
  bubbleIntensity?: number
}

interface DetailedResult {
  question: number
  bubble_coordinates?: Record<string, {x: number, y: number}>
  bubble_intensities?: Record<string, number>
  status?: string
  detectedAnswer?: string
  confidence?: number
}

interface AnnotatedImageViewerProps {
  imageData: string
  detectedAnswers: string[]
  correctAnswers: string[]
  detailedResults?: DetailedResult[]
  bubbleCoordinates?: Array<{
    question: number
    option: string
    x: number
    y: number
    fillPercentage: number
    confidence: number
  }>
  onClose?: () => void
}

const AnnotatedImageViewer: React.FC<AnnotatedImageViewerProps> = ({
  imageData,
  detectedAnswers,
  correctAnswers,
  detailedResults = [],
  bubbleCoordinates = [],
  onClose
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const [showAnnotations, setShowAnnotations] = useState(true)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [annotations, setAnnotations] = useState<BubbleAnnotation[]>([])

  useEffect(() => {
    if (imageData) {
      const img = new Image()
      img.onload = () => {
        setImageLoaded(true)
        if (imageRef.current) {
          imageRef.current.src = imageData
        }
        generateAnnotations()
      }
      img.src = imageData
    }
  }, [imageData, detectedAnswers, correctAnswers, bubbleCoordinates, detailedResults])

  useEffect(() => {
    if (imageLoaded && showAnnotations) {
      drawAnnotations()
    } else if (imageLoaded) {
      clearAnnotations()
    }
  }, [imageLoaded, showAnnotations, annotations])

  const generateAnnotations = () => {
    const newAnnotations: BubbleAnnotation[] = []

    // Priority 1: Use detailedResults if available (most accurate)
    if (detailedResults && detailedResults.length > 0) {
      console.log('📍 Using detailed results for annotations:', detailedResults.length)
      
      detailedResults.forEach((result, index) => {
        const questionNumber = result.question || (index + 1)
        const detectedAnswer = detectedAnswers[questionNumber - 1]
        const correctAnswer = correctAnswers[questionNumber - 1]
        
        // Extract bubble coordinates and intensities
        const bubbleCoords = result.bubble_coordinates || {}
        const bubbleIntensities = result.bubble_intensities || {}
        
        // Process each bubble option
        Object.keys(bubbleCoords).forEach(option => {
          const coord = bubbleCoords[option]
          const intensity = bubbleIntensities[option] || 0
          
          if (coord && coord.x && coord.y) {
            const isDetected = detectedAnswer === option
            const isCorrect = correctAnswer === option
            
            newAnnotations.push({
              x: coord.x,
              y: coord.y,
              option,
              questionNumber,
              isDetected,
              isCorrect,
              confidence: isDetected ? 0.9 : 0.1,
              fillPercentage: intensity * 100,
              bubbleIntensity: intensity
            })
          }
        })
      })
    }
    // Priority 2: Use bubbleCoordinates if available
    else if (bubbleCoordinates.length > 0) {
      console.log('📍 Using bubble coordinates for annotations:', bubbleCoordinates.length)
      
      bubbleCoordinates.forEach(bubble => {
        const detectedAnswer = detectedAnswers[bubble.question - 1]
        const correctAnswer = correctAnswers[bubble.question - 1]
        
        const isDetected = detectedAnswer === bubble.option
        const isCorrect = correctAnswer === bubble.option
        
        newAnnotations.push({
          x: bubble.x,
          y: bubble.y,
          option: bubble.option,
          questionNumber: bubble.question,
          isDetected,
          isCorrect,
          confidence: bubble.confidence,
          fillPercentage: bubble.fillPercentage
        })
      })
    } 
    // Priority 3: Generate standard layout annotations
    else {
      console.log('📍 Using standard layout for annotations')
      generateStandardLayoutAnnotations(newAnnotations)
    }

    console.log('📍 Generated annotations:', newAnnotations.length)
    setAnnotations(newAnnotations)
  }

  const generateStandardLayoutAnnotations = (newAnnotations: BubbleAnnotation[]) => {
    // Yangi OMR layout parametrlari - sizning tavsifingiz bo'yicha
    const PADDING = 80 // Chetdan bo'shliq
    const ROW_HEIGHT = 28 // Savollar orasidagi masofa
    const COLUMN_WIDTH = 200 // Ustunlar orasidagi masofa
    const BUBBLE_SPACING = 22 // Javob variantlari orasidagi masofa
    const QUESTIONS_PER_COLUMN = 14 // Har ustunda 14 ta savol
    const OPTIONS = ['A', 'B', 'C', 'D'] // 4 ta javob varianti
    const ALIGNMENT_MARKS_WIDTH = 40 // Chap tomondagi alignment belgilari uchun joy
    
    console.log('📐 Generating standard OMR layout annotations')
    console.log(`   Questions: ${detectedAnswers.length}`)
    console.log(`   Columns needed: ${Math.ceil(detectedAnswers.length / QUESTIONS_PER_COLUMN)}`)

    for (let i = 0; i < Math.min(detectedAnswers.length, correctAnswers.length); i++) {
      const questionNumber = i + 1
      const detectedAnswer = detectedAnswers[i]
      const correctAnswer = correctAnswers[i]

      // Qaysi ustunda va qaysi qatorda ekanligini aniqlash
      const column = Math.floor(i / QUESTIONS_PER_COLUMN)
      const rowInColumn = i % QUESTIONS_PER_COLUMN
      
      // Savol pozitsiyasini hisoblash
      const questionY = PADDING + 120 + (rowInColumn * ROW_HEIGHT) // 120 - header uchun joy
      const questionX = PADDING + ALIGNMENT_MARKS_WIDTH + (column * COLUMN_WIDTH)

      console.log(`   Q${questionNumber}: Column ${column + 1}, Row ${rowInColumn + 1}, Position (${questionX}, ${questionY})`)

      // Har bir javob varianti uchun bubble yaratish
      OPTIONS.forEach((option, optionIndex) => {
        const bubbleX = questionX + 60 + (optionIndex * BUBBLE_SPACING) // 60 - savol raqami uchun joy
        const bubbleY = questionY

        const isDetected = detectedAnswer === option
        const isCorrect = correctAnswer === option

        newAnnotations.push({
          x: bubbleX,
          y: bubbleY,
          option,
          questionNumber,
          isDetected,
          isCorrect,
          confidence: isDetected ? 0.9 : 0.1,
          fillPercentage: isDetected ? 85 : 15
        })
      })
    }
    
    console.log(`📐 Generated ${newAnnotations.length} bubble annotations`)
  }

  const drawAnnotations = () => {
    const canvas = canvasRef.current
    const image = imageRef.current
    
    if (!canvas || !image || !imageLoaded) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size to match image
    canvas.width = image.naturalWidth
    canvas.height = image.naturalHeight

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw annotations
    annotations.forEach(annotation => {
      const {
        x, y, option, isDetected, isCorrect, confidence
      } = annotation

      // Scale coordinates if needed (assuming coordinates are for display size)
      const scaleX = canvas.width / (image.offsetWidth || canvas.width)
      const scaleY = canvas.height / (image.offsetHeight || canvas.height)
      
      const scaledX = x * scaleX
      const scaledY = y * scaleY
      const bubbleRadius = 8 * Math.min(scaleX, scaleY)

      // Draw bubble circle based on detection and correctness
      ctx.beginPath()
      ctx.arc(scaledX, scaledY, bubbleRadius, 0, 2 * Math.PI)

      if (isDetected) {
        if (isCorrect) {
          // Detected and correct - Green circle
          ctx.strokeStyle = '#10B981'
          ctx.fillStyle = 'rgba(16, 185, 129, 0.2)'
          ctx.lineWidth = 3
        } else {
          // Detected but incorrect - Red circle
          ctx.strokeStyle = '#EF4444'
          ctx.fillStyle = 'rgba(239, 68, 68, 0.2)'
          ctx.lineWidth = 3
        }
      } else if (isCorrect) {
        // Not detected but correct - Green dashed circle
        ctx.strokeStyle = '#10B981'
        ctx.fillStyle = 'rgba(16, 185, 129, 0.1)'
        ctx.lineWidth = 2
        ctx.setLineDash([5, 5])
      } else {
        // Not detected and not correct - Light gray
        ctx.strokeStyle = '#9CA3AF'
        ctx.fillStyle = 'rgba(156, 163, 175, 0.1)'
        ctx.lineWidth = 1
      }

      ctx.fill()
      ctx.stroke()
      ctx.setLineDash([]) // Reset dash

      // Draw confidence indicator for detected bubbles
      if (isDetected && confidence > 0.5) {
        // Small confidence indicator
        ctx.beginPath()
        ctx.arc(scaledX + bubbleRadius + 5, scaledY - bubbleRadius - 5, 3, 0, 2 * Math.PI)
        ctx.fillStyle = confidence > 0.8 ? '#10B981' : confidence > 0.6 ? '#F59E0B' : '#EF4444'
        ctx.fill()
      }

      // Draw option label
      ctx.font = `${Math.max(10, bubbleRadius)}px Arial`
      ctx.fillStyle = '#374151'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(option, scaledX, scaledY)
    })
  }

  const clearAnnotations = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }

  const getStatistics = () => {
    const totalQuestions = Math.min(detectedAnswers.length, correctAnswers.length)
    let correctCount = 0
    let incorrectCount = 0
    let blankCount = 0

    for (let i = 0; i < totalQuestions; i++) {
      const detected = detectedAnswers[i]
      const correct = correctAnswers[i]

      if (!detected || detected === 'BLANK') {
        blankCount++
      } else if (detected === correct) {
        correctCount++
      } else {
        incorrectCount++
      }
    }

    return { totalQuestions, correctCount, incorrectCount, blankCount }
  }

  const stats = getStatistics()

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Tekshirilgan Rasm
          </h2>
          
          {/* Statistics */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <Check className="w-4 h-4 text-green-600" />
              <span className="text-green-600 font-medium">{stats.correctCount}</span>
            </div>
            <div className="flex items-center gap-1">
              <X className="w-4 h-4 text-red-600" />
              <span className="text-red-600 font-medium">{stats.incorrectCount}</span>
            </div>
            <div className="flex items-center gap-1">
              <AlertCircle className="w-4 h-4 text-gray-500" />
              <span className="text-gray-500 font-medium">{stats.blankCount}</span>
            </div>
            <span className="text-gray-600">
              / {stats.totalQuestions} savol
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Toggle Annotations */}
          <button
            onClick={() => setShowAnnotations(!showAnnotations)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
              showAnnotations 
                ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {showAnnotations ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            <span className="text-sm font-medium">
              {showAnnotations ? 'Belgilarni yashirish' : 'Belgilarni ko\'rsatish'}
            </span>
          </button>

          {/* Close Button */}
          {onClose && (
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
            >
              Yopish
            </button>
          )}
        </div>
      </div>

      {/* Image Container */}
      <div className="flex-1 overflow-auto p-4">
        <div className="relative max-w-full mx-auto">
          {/* Original Image */}
          <img
            ref={imageRef}
            src={imageData}
            alt="Tekshirilgan OMR varaq"
            className="max-w-full h-auto border border-gray-300 rounded-lg shadow-lg"
            style={{ display: imageLoaded ? 'block' : 'none' }}
          />
          
          {/* Annotation Canvas */}
          <canvas
            ref={canvasRef}
            className="absolute top-0 left-0 pointer-events-none"
            style={{ 
              width: '100%', 
              height: '100%',
              display: imageLoaded && showAnnotations ? 'block' : 'none'
            }}
          />

          {/* Loading State */}
          {!imageLoaded && (
            <div className="flex items-center justify-center h-96 bg-gray-100 rounded-lg">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-gray-600">Rasm yuklanmoqda...</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      {showAnnotations && (
        <div className="bg-white border-t border-gray-200 p-4">
          <div className="max-w-4xl mx-auto">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Belgilar:</h3>
            <div className="flex flex-wrap gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full border-2 border-green-500 bg-green-100"></div>
                <span>To'g'ri javob (belgilangan)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full border-2 border-red-500 bg-red-100"></div>
                <span>Noto'g'ri javob (belgilangan)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full border-2 border-green-500 border-dashed bg-green-50"></div>
                <span>To'g'ri javob (belgilanmagan)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full border border-gray-400 bg-gray-50"></div>
                <span>Belgilanmagan</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AnnotatedImageViewer