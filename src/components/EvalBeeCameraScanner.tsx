import React, { useRef, useEffect, useState, useCallback, useMemo, memo } from 'react'
import { 
  Camera, X, Bug
} from 'lucide-react'

interface EvalBeeCameraScannerProps {
  onCapture: (imageData: string, qualityMetrics: QualityMetrics) => void
  onClose: () => void
  isProcessing: boolean
  correctAnswers?: string[] // To'g'ri javoblar (exam-keys dan)
  onShowDebug?: () => void
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

interface AlignmentStatus {
  paperDetected: boolean
  withinFrame: boolean
  alignment: number
  corners: { x: number, y: number, detected?: boolean, name?: string }[]
}

interface DetectedBubble {
  x: number
  y: number
  option: string
  questionNumber: number
  isFilled: boolean
  isCorrect: boolean
  confidence: number
}

const EvalBeeCameraScanner: React.FC<EvalBeeCameraScannerProps> = memo(({
  onCapture,
  onClose,
  isProcessing,
  correctAnswers = [],
  onShowDebug
}) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null)
  const previewCanvasRef = useRef<HTMLCanvasElement>(null)
  const animationFrameRef = useRef<number>()
  
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState('')
  const [facingMode] = useState<'user' | 'environment'>('environment')
  
  // EvalBee Core States - Lightweight Real-time Analysis
  const [qualityMetrics, setQualityMetrics] = useState<QualityMetrics>({
    focus: 0,
    brightness: 0,
    contrast: 0,
    skew: 0,
    overall: 0,
    issues: [],
    recommendations: []
  })
  
  const [alignmentStatus, setAlignmentStatus] = useState<AlignmentStatus>({
    paperDetected: false,
    withinFrame: false,
    alignment: 0,
    corners: []
  })
  
  const [canCapture, setCanCapture] = useState(false)
  const [autoScanCountdown, setAutoScanCountdown] = useState(0)
  const [detectedBubbles, setDetectedBubbles] = useState<DetectedBubble[]>([])
  const [showBubbleOverlay, setShowBubbleOverlay] = useState(false)

  useEffect(() => {
    startCamera()
    return () => {
      stopCamera()
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [facingMode])

  useEffect(() => {
    if (isReady && !isProcessing) {
      startRealTimeAnalysis()
    }
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [isReady, isProcessing])

  // Memoize expensive calculations
  const cameraConstraints = useMemo(() => ({
    video: {
      facingMode: facingMode,
      width: { ideal: 1280, min: 960 }, // Reduced resolution for better performance
      height: { ideal: 960, min: 720 },
      frameRate: { ideal: 24, min: 15 }, // Reduced frame rate
      aspectRatio: { ideal: 4/3 },
      focusMode: 'continuous',
      exposureMode: 'continuous',
      whiteBalanceMode: 'continuous'
    }
  }), [facingMode])

  const startCamera = useCallback(async () => {
    try {
      setError('')
      console.log('🎥 EvalBee Camera: Starting camera initialization...')
      
      const mediaStream = await navigator.mediaDevices.getUserMedia(cameraConstraints)
      setStream(mediaStream)

      console.log('✅ Camera stream obtained successfully')

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
        
        videoRef.current.onloadedmetadata = () => {
          console.log('📺 Video metadata loaded, camera ready for analysis')
          setIsReady(true)
          setupOverlayCanvas()
        }
        
        videoRef.current.setAttribute('playsinline', 'true')
        videoRef.current.setAttribute('webkit-playsinline', 'true')
      }
    } catch (err: any) {
      console.error('❌ EvalBee Camera Error:', err)
      let errorMessage = 'Kameraga kirish imkoni yo\'q.'
      
      if (err.name === 'NotAllowedError') {
        errorMessage = 'Kamera ruxsati berilmagan. Brauzer sozlamalarini tekshiring.'
      } else if (err.name === 'NotFoundError') {
        errorMessage = 'Kamera topilmadi. Qurilmangizda kamera borligini tekshiring.'
      } else if (err.name === 'NotReadableError') {
        errorMessage = 'Kamera band. Boshqa ilovalarni yoping va qayta urinib ko\'ring.'
      }
      
      setError(errorMessage)
    }
  }, [cameraConstraints])

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
    setIsReady(false)
  }, [stream])

  const setupOverlayCanvas = () => {
    if (!overlayCanvasRef.current || !videoRef.current) return
    
    const canvas = overlayCanvasRef.current
    const video = videoRef.current
    
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    
    // Setup preview canvas too
    if (previewCanvasRef.current) {
      previewCanvasRef.current.width = 200 // Small preview size
      previewCanvasRef.current.height = 150
    }
  }

  // EvalBee Core: Lightweight Real-time Analysis (NO HEAVY OpenCV)
  const startRealTimeAnalysis = () => {
    const analyzeFrame = () => {
      if (!videoRef.current || !canvasRef.current || isProcessing) {
        animationFrameRef.current = requestAnimationFrame(analyzeFrame)
        return
      }

      const video = videoRef.current
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      
      if (!ctx) {
        animationFrameRef.current = requestAnimationFrame(analyzeFrame)
        return
      }

      // Capture frame for lightweight analysis
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      
      // EvalBee Method: Fast, lightweight quality checks
      performLightweightAnalysis(imageData)
      
      animationFrameRef.current = requestAnimationFrame(analyzeFrame)
    }
    
    analyzeFrame()
  }

  // EvalBee Core: Fast Analysis (grayscale + basic checks only) - OPTIMIZED
  const performLightweightAnalysis = (imageData: ImageData) => {
    const { data, width, height } = imageData
    
    // Skip analysis if processing or not ready
    if (isProcessing || !isReady) return
    
    // Throttle analysis to every 3rd frame for better performance
    if (Math.random() > 0.33) return
    
    // Convert to grayscale (lightweight) - sample every 4th pixel
    const sampleRate = 4
    const sampledWidth = Math.floor(width / sampleRate)
    const sampledHeight = Math.floor(height / sampleRate)
    const grayscale = new Array(sampledWidth * sampledHeight)
    
    for (let y = 0; y < sampledHeight; y++) {
      for (let x = 0; x < sampledWidth; x++) {
        const sourceX = x * sampleRate
        const sourceY = y * sampleRate
        const sourceIdx = (sourceY * width + sourceX) * 4
        
        const gray = 0.299 * data[sourceIdx] + 0.587 * data[sourceIdx + 1] + 0.114 * data[sourceIdx + 2]
        grayscale[y * sampledWidth + x] = gray
      }
    }
    
    // 1. Fast Focus Check (simplified)
    const focus = calculateFastFocus(grayscale, sampledWidth, sampledHeight)
    
    // 2. Fast Brightness Check
    const brightness = calculateFastBrightness(grayscale)
    
    // 3. Fast Alignment Check
    const alignment = detectPaperAlignment(grayscale, sampledWidth, sampledHeight, sampleRate)
    
    // 4. Bubble Detection (only when paper detected and every 10th frame)
    let bubbles: DetectedBubble[] = []
    if (alignment.paperDetected && correctAnswers.length > 0 && Math.random() > 0.9) {
      bubbles = detectBubbles(grayscale, sampledWidth, sampledHeight, alignment, sampleRate)
    }
    
    // 5. Overall Quality (EvalBee method)
    const overall = (focus * 0.4 + brightness * 0.3 + alignment.alignment * 0.3)
    
    // Batch state updates to prevent excessive re-renders
    const newQualityMetrics = {
      focus,
      brightness,
      contrast: alignment.alignment,
      skew: 1 - alignment.alignment,
      overall,
      issues: generateIssues(focus, brightness, alignment),
      recommendations: generateRecommendations(focus, brightness, alignment)
    }
    
    // Only update if significant change
    if (Math.abs(qualityMetrics.overall - overall) > 0.05) {
      setQualityMetrics(newQualityMetrics)
      setAlignmentStatus(alignment)
      
      if (bubbles.length > 0) {
        setDetectedBubbles(bubbles)
        setShowBubbleOverlay(true)
      }
    }
    
    // EvalBee Logic: Optimized capture detection
    const detectedMarkers = alignment.corners.filter(c => c.detected).length
    const canCaptureNow = (
      focus >= 0.7 &&
      brightness >= 0.3 && brightness <= 0.8 &&
      alignment.paperDetected &&
      detectedMarkers >= 3 &&
      alignment.alignment >= 0.75
    )
    
    setCanCapture(canCaptureNow)
    
    // Throttled auto-capture logic
    if (canCaptureNow && overall >= 0.9 && autoScanCountdown === 0) {
      setAutoScanCountdown(3)
      setTimeout(() => {
        if (canCapture && qualityMetrics.overall >= 0.9) {
          captureImage()
        }
        setAutoScanCountdown(0)
      }, 3000)
    }
    
    // Draw guide overlay (throttled)
    if (Math.random() > 0.5) {
      drawGuideWithBubbles(alignment, bubbles)
    }
  }

  // Fast focus calculation (optimized)
  const calculateFastFocus = (grayscale: number[], width: number, height: number): number => {
    let variance = 0
    let count = 0
    
    // Sample every 8th pixel for better performance
    for (let y = 2; y < height - 2; y += 8) {
      for (let x = 2; x < width - 2; x += 8) {
        const idx = y * width + x
        if (idx < grayscale.length - width - 1) {
          const laplacian = 
            -grayscale[idx - width] - grayscale[idx - 1] + 4 * grayscale[idx] - grayscale[idx + 1] - grayscale[idx + width]
          
          variance += laplacian * laplacian
          count++
        }
      }
    }
    
    return count > 0 ? Math.min(1, (variance / count) / 500) : 0
  }

  // Fast brightness calculation (optimized)
  const calculateFastBrightness = (grayscale: number[]): number => {
    // Sample every 20th pixel for better performance
    let sum = 0
    let count = 0
    
    for (let i = 0; i < grayscale.length; i += 20) {
      sum += grayscale[i]
      count++
    }
    
    return count > 0 ? (sum / count) / 255 : 0
  }

  // EvalBee Core: Paper alignment detection with 4 corner markers (optimized)
  const detectPaperAlignment = (grayscale: number[], width: number, height: number, sampleRate: number = 1): AlignmentStatus => {
    // Define 4 corner marker positions (scaled)
    const markerSize = Math.floor(30 / sampleRate)
    const margin = Math.floor(80 / sampleRate)
    
    const cornerMarkers = [
      { x: margin, y: margin, name: 'TL', detected: false },
      { x: width - margin, y: margin, name: 'TR', detected: false },
      { x: margin, y: height - margin, name: 'BL', detected: false },
      { x: width - margin, y: height - margin, name: 'BR', detected: false }
    ]
    
    // Detect dark rectangular markers in corners (optimized)
    let detectedMarkers = 0
    
    cornerMarkers.forEach(marker => {
      let darkPixels = 0
      let totalPixels = 0
      
      // Sample fewer pixels for performance
      for (let dy = -markerSize/2; dy <= markerSize/2; dy += 2) {
        for (let dx = -markerSize/2; dx <= markerSize/2; dx += 2) {
          const x = Math.floor(marker.x + dx)
          const y = Math.floor(marker.y + dy)
          
          if (x >= 0 && x < width && y >= 0 && y < height) {
            const idx = y * width + x
            if (idx < grayscale.length) {
              const pixel = grayscale[idx]
              
              if (pixel < 100) darkPixels++
              totalPixels++
            }
          }
        }
      }
      
      const darkRatio = totalPixels > 0 ? darkPixels / totalPixels : 0
      if (darkRatio > 0.6) {
        marker.detected = true
        detectedMarkers++
      }
    })
    
    // Calculate alignment quality
    const markerDetectionRatio = detectedMarkers / 4
    const paperDetected = detectedMarkers >= 3
    const withinFrame = true
    const alignment = markerDetectionRatio
    
    // Scale marker positions back for overlay
    const corners = cornerMarkers.map(m => ({ 
      x: m.x * sampleRate, 
      y: m.y * sampleRate, 
      detected: m.detected, 
      name: m.name 
    }))
    
    return {
      paperDetected,
      withinFrame,
      alignment,
      corners
    }
  }

  // Bubble detection funksiyasi (optimized)
  const detectBubbles = (grayscale: number[], width: number, height: number, alignment: AlignmentStatus, sampleRate: number = 1): DetectedBubble[] => {
    const bubbles: DetectedBubble[] = []
    
    if (!alignment.paperDetected || correctAnswers.length === 0) return bubbles
    
    // Limit to first 15 questions for performance
    const maxQuestions = Math.min(correctAnswers.length, 15)
    const questionsPerColumn = Math.ceil(maxQuestions / 3)
    const questionHeight = Math.floor(height * 0.6 / questionsPerColumn)
    const startY = Math.floor(height * 0.2)
    const columnWidth = Math.floor(width * 0.25)
    const startX = Math.floor(width * 0.15)
    
    const bubbleRadius = Math.floor(8 / sampleRate)
    const optionSpacing = Math.floor(25 / sampleRate)
    const options = ['A', 'B', 'C', 'D', 'E']
    
    // Detect bubbles for limited questions
    for (let q = 0; q < maxQuestions; q++) {
      const column = Math.floor(q / questionsPerColumn)
      const rowInColumn = q % questionsPerColumn
      
      const questionX = startX + column * columnWidth
      const questionY = startY + rowInColumn * questionHeight
      
      // Check only first 4 options for performance
      for (let optIndex = 0; optIndex < Math.min(options.length, 4); optIndex++) {
        const option = options[optIndex]
        const bubbleX = questionX + optIndex * optionSpacing
        const bubbleY = questionY
        
        if (bubbleX < bubbleRadius || bubbleX >= width - bubbleRadius || 
            bubbleY < bubbleRadius || bubbleY >= height - bubbleRadius) {
          continue
        }
        
        // Simplified bubble detection
        let darkPixels = 0
        let totalPixels = 0
        
        // Sample fewer pixels in circular area
        for (let dy = -bubbleRadius; dy <= bubbleRadius; dy += 2) {
          for (let dx = -bubbleRadius; dx <= bubbleRadius; dx += 2) {
            if (dx * dx + dy * dy <= bubbleRadius * bubbleRadius) {
              const x = Math.floor(bubbleX + dx)
              const y = Math.floor(bubbleY + dy)
              
              if (x >= 0 && x < width && y >= 0 && y < height) {
                const idx = y * width + x
                if (idx < grayscale.length) {
                  const pixel = grayscale[idx]
                  
                  if (pixel < 120) darkPixels++
                  totalPixels++
                }
              }
            }
          }
        }
        
        const fillRatio = totalPixels > 0 ? darkPixels / totalPixels : 0
        const isFilled = fillRatio > 0.4
        const isCorrect = correctAnswers[q] === option
        const confidence = Math.min(1, fillRatio * 2)
        
        bubbles.push({
          x: bubbleX * sampleRate, // Scale back
          y: bubbleY * sampleRate,
          option,
          questionNumber: q + 1,
          isFilled,
          isCorrect,
          confidence
        })
      }
    }
    
    return bubbles
  }

  const generateIssues = (focus: number, brightness: number, alignment: AlignmentStatus): string[] => {
    const issues = []
    
    if (focus < 0.7) issues.push('Rasm aniq emas')
    if (brightness < 0.3) issues.push('Yorug\'lik kam')
    if (brightness > 0.8) issues.push('Juda yorqin')
    if (!alignment.paperDetected) issues.push('Qog\'oz topilmadi')
    if (alignment.alignment < 0.8) issues.push('Qog\'oz qiyshaygan')
    
    return issues
  }

  const generateRecommendations = (focus: number, brightness: number, alignment: AlignmentStatus): string[] => {
    const recommendations = []
    
    if (focus < 0.7) recommendations.push('📱 Kamerani yaqinlashtiring va fokusni sozlang')
    if (brightness < 0.3) recommendations.push('💡 Ko\'proq yorug\'lik kerak')
    if (brightness > 0.8) recommendations.push('🌤️ Yorug\'likni kamaytiring')
    if (!alignment.paperDetected) recommendations.push('📄 OMR varaqni ramkaga joylashtiring')
    if (alignment.alignment < 0.8) recommendations.push('📐 Qog\'ozni to\'g\'ri joylashtiring')
    
    return recommendations
  }

  // Guide overlay with bubble visualization
  const drawGuideWithBubbles = (alignment: AlignmentStatus, bubbles: DetectedBubble[]) => {
    if (!overlayCanvasRef.current) return
    
    const canvas = overlayCanvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    // Simple paper frame guide
    const margin = 0.12
    const frameX = canvas.width * margin
    const frameY = canvas.height * margin
    const frameWidth = canvas.width * (1 - 2 * margin)
    const frameHeight = canvas.height * (1 - 2 * margin)
    
    // Frame color based on paper detection
    const frameColor = alignment.paperDetected ? '#10B981' : '#3B82F6'
    const frameOpacity = alignment.paperDetected ? 0.9 : 0.7
    
    // Draw main guide frame with glow effect
    ctx.strokeStyle = frameColor
    ctx.globalAlpha = frameOpacity
    ctx.lineWidth = 3
    ctx.shadowColor = frameColor
    ctx.shadowBlur = 10
    ctx.setLineDash([15, 8])
    ctx.strokeRect(frameX, frameY, frameWidth, frameHeight)
    
    // Reset shadow
    ctx.shadowBlur = 0
    
    // Draw corner guides (L-shapes in corners) with better visibility
    ctx.setLineDash([])
    ctx.lineWidth = 4
    ctx.globalAlpha = 1.0
    const cornerSize = 50
    
    // Corner colors based on detection
    alignment.corners.forEach((corner) => {
      const cornerColor = corner.detected ? '#10B981' : '#EF4444'
      ctx.strokeStyle = cornerColor
      ctx.shadowColor = cornerColor
      ctx.shadowBlur = 8
      
      const x = corner.x
      const y = corner.y
      
      // Draw L-shape for each corner
      ctx.beginPath()
      if (corner.name === 'TL') {
        // Top-left
        ctx.moveTo(x, y + cornerSize)
        ctx.lineTo(x, y)
        ctx.lineTo(x + cornerSize, y)
      } else if (corner.name === 'TR') {
        // Top-right
        ctx.moveTo(x - cornerSize, y)
        ctx.lineTo(x, y)
        ctx.lineTo(x, y + cornerSize)
      } else if (corner.name === 'BL') {
        // Bottom-left
        ctx.moveTo(x, y - cornerSize)
        ctx.lineTo(x, y)
        ctx.lineTo(x + cornerSize, y)
      } else if (corner.name === 'BR') {
        // Bottom-right
        ctx.moveTo(x - cornerSize, y)
        ctx.lineTo(x, y)
        ctx.lineTo(x, y - cornerSize)
      }
      ctx.stroke()
    })
    
    // Reset shadow
    ctx.shadowBlur = 0
    ctx.globalAlpha = 1.0
    
    // Draw bubble overlays when paper is detected
    if (alignment.paperDetected && showBubbleOverlay && bubbles.length > 0) {
      bubbles.forEach(bubble => {
        const rectSize = 20
        const rectX = bubble.x - rectSize / 2
        const rectY = bubble.y - rectSize / 2
        
        // Determine colors based on bubble status
        if (bubble.isFilled) {
          if (bubble.isCorrect) {
            // To'g'ri javob - yashil to'rtburchak
            ctx.fillStyle = 'rgba(16, 185, 129, 0.7)' // Green with transparency
            ctx.strokeStyle = '#10B981'
          } else {
            // Noto'g'ri javob - qizil to'rtburchak
            ctx.fillStyle = 'rgba(239, 68, 68, 0.7)' // Red with transparency
            ctx.strokeStyle = '#EF4444'
          }
        } else if (bubble.isCorrect) {
          // To'g'ri javob lekin belgilanmagan - yashil border
          ctx.fillStyle = 'rgba(16, 185, 129, 0.3)'
          ctx.strokeStyle = '#10B981'
        } else {
          // Oddiy bubble - shaffof
          ctx.fillStyle = 'rgba(156, 163, 175, 0.3)'
          ctx.strokeStyle = '#9CA3AF'
        }
        
        // Draw rectangle
        ctx.lineWidth = 2
        ctx.shadowColor = ctx.strokeStyle
        ctx.shadowBlur = 5
        
        ctx.fillRect(rectX, rectY, rectSize, rectSize)
        ctx.strokeRect(rectX, rectY, rectSize, rectSize)
        
        // Draw option letter
        ctx.fillStyle = 'white'
        ctx.font = 'bold 12px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.shadowBlur = 2
        ctx.shadowColor = 'black'
        ctx.fillText(bubble.option, bubble.x, bubble.y)
        
        // Reset shadow
        ctx.shadowBlur = 0
      })
    }
    
    // Center instruction (only when no paper detected)
    if (!alignment.paperDetected) {
      // Semi-transparent background
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'
      ctx.fillRect(canvas.width/2 - 140, canvas.height/2 - 40, 280, 80)
      
      // Border glow
      ctx.strokeStyle = '#3B82F6'
      ctx.lineWidth = 2
      ctx.shadowColor = '#3B82F6'
      ctx.shadowBlur = 10
      ctx.strokeRect(canvas.width/2 - 140, canvas.height/2 - 40, 280, 80)
      ctx.shadowBlur = 0
      
      // Text
      ctx.fillStyle = 'white'
      ctx.font = 'bold 18px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('OMR varaqni ramkaga', canvas.width/2, canvas.height/2 - 8)
      ctx.fillText('joylashtiring', canvas.width/2, canvas.height/2 + 18)
    }
    
    // Show capture preview area (what will be captured)
    if (alignment.paperDetected) {
      // Draw capture area outline with animated effect
      ctx.strokeStyle = '#FFD700'
      ctx.globalAlpha = 0.8
      ctx.lineWidth = 2
      ctx.shadowColor = '#FFD700'
      ctx.shadowBlur = 15
      ctx.setLineDash([8, 4])
      
      // Slightly smaller area than guide frame (actual capture area)
      const captureMargin = 0.15
      const captureX = canvas.width * captureMargin
      const captureY = canvas.height * captureMargin
      const captureWidth = canvas.width * (1 - 2 * captureMargin)
      const captureHeight = canvas.height * (1 - 2 * captureMargin)
      
      ctx.strokeRect(captureX, captureY, captureWidth, captureHeight)
      
      // Reset effects
      ctx.shadowBlur = 0
      ctx.globalAlpha = 1.0
      ctx.setLineDash([])
    }
  }

  const captureImage = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !isReady || !canCapture) {
      console.log('❌ Cannot capture image', {
        hasVideo: !!videoRef.current,
        hasCanvas: !!canvasRef.current,
        isReady,
        canCapture
      })
      return
    }

    console.log('📸 EvalBee Camera: Starting image capture...')

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')

    if (!context) {
      console.error('❌ Could not get canvas context')
      return
    }

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    
    console.log('📐 Canvas dimensions set', {
      width: canvas.width,
      height: canvas.height,
      videoWidth: video.videoWidth,
      videoHeight: video.videoHeight
    })
    
    // Fix mirror effect - flip image horizontally to get correct orientation
    context.save()
    context.scale(-1, 1) // Flip horizontally
    context.drawImage(video, -canvas.width, 0, canvas.width, canvas.height)
    context.restore()

    console.log('🖼️ Image drawn to canvas with mirror correction')

    // Generate image data
    const finalImageData = canvas.toDataURL('image/jpeg', 0.85)
    
    console.log('✅ EvalBee Camera: Image capture completed successfully', {
      imageDataLength: finalImageData.length,
      imageDataStart: finalImageData.substring(0, 50),
      qualityMetrics: qualityMetrics
    })
    
    // Validate the generated image data
    if (!finalImageData || finalImageData.length < 1000) {
      console.error('❌ Generated image data is too small or empty', {
        length: finalImageData?.length || 0,
        data: finalImageData?.substring(0, 100) || 'none'
      })
      return
    }
    
    if (!finalImageData.startsWith('data:image/')) {
      console.error('❌ Generated image data has invalid format', {
        start: finalImageData.substring(0, 50)
      })
      return
    }
    
    console.log('✅ Image data validation passed, calling onCapture')
    onCapture(finalImageData, qualityMetrics)
  }, [videoRef, canvasRef, isReady, canCapture, qualityMetrics, onCapture])

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Camera View - Full Screen */}
      <div className="flex-1 relative overflow-hidden">
        {error ? (
          <div className="flex items-center justify-center h-full text-white text-center p-4">
            <div>
              <Camera size={48} className="mx-auto mb-4 opacity-50" />
              <p className="text-lg mb-2">Kamera xatoligi</p>
              <p className="text-sm opacity-75 mb-4">{error}</p>
              <button 
                onClick={startCamera} 
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-colors"
              >
                Qayta urinish
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Video Element - Full Screen */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover"
              style={{ 
                transform: 'scaleX(-1)', // Mirror effect for better UX
                backgroundColor: '#000'
              }}
            />
            
            {/* Overlay Canvas for Guides */}
            <canvas
              ref={overlayCanvasRef}
              className="absolute inset-0 w-full h-full pointer-events-none z-10"
              style={{ transform: 'scaleX(-1)' }} // Match video mirror
            />
            
            {/* Real-time Preview Window */}
            {alignmentStatus.paperDetected && (
              <div className="absolute top-4 left-4 bg-black/90 rounded-lg p-2 border-2 border-green-400 z-20">
                <div className="text-green-400 text-xs font-bold mb-1 text-center">
                  PREVIEW
                </div>
                <canvas
                  ref={previewCanvasRef}
                  className="rounded border border-green-400"
                  width={160}
                  height={120}
                  style={{ transform: 'scaleX(-1)' }} // Match video mirror
                />
                <div className="text-white text-xs text-center mt-1">
                  Suratga olinadi
                </div>
              </div>
            )}
            
            {/* Bubble Detection Legend */}
            {showBubbleOverlay && detectedBubbles.length > 0 && (
              <div className="absolute bottom-20 left-4 bg-black/90 rounded-lg p-3 z-20">
                <div className="text-white text-xs font-bold mb-2">
                  BUBBLE DETECTION
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-green-500 rounded border border-green-400"></div>
                    <span className="text-white">To'g'ri javob</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-red-500 rounded border border-red-400"></div>
                    <span className="text-white">Noto'g'ri javob</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-gray-400 rounded border border-gray-300"></div>
                    <span className="text-white">Bo'sh</span>
                  </div>
                </div>
                <div className="text-white/70 text-xs mt-2">
                  {detectedBubbles.filter(b => b.isFilled).length} belgilangan
                </div>
              </div>
            )}
            
            {/* Top Controls */}
            <div className="absolute top-4 right-4 flex items-center gap-2 z-20">
              {onShowDebug && (
                <button
                  onClick={onShowDebug}
                  className="p-3 bg-black/70 hover:bg-black/90 rounded-full text-white transition-colors backdrop-blur-sm"
                  title="Debug Console"
                >
                  <Bug size={20} />
                </button>
              )}
              <button
                onClick={onClose}
                className="p-3 bg-black/70 hover:bg-black/90 rounded-full text-white transition-colors backdrop-blur-sm"
                title="Yopish"
              >
                <X size={24} />
              </button>
            </div>

            {/* Quality Indicator */}
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20">
              <div className="bg-black/70 backdrop-blur-sm rounded-full px-4 py-2 flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${
                  qualityMetrics.overall >= 0.8 ? 'bg-green-500' :
                  qualityMetrics.overall >= 0.6 ? 'bg-yellow-500' : 'bg-red-500'
                }`} />
                <span className="text-white text-sm font-medium">
                  Sifat: {Math.round(qualityMetrics.overall * 100)}%
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/80 to-transparent p-6 z-20">
        {/* Status Text */}
        <div className="text-center mb-6">
          {!alignmentStatus.paperDetected ? (
            <div className="space-y-2">
              <p className="text-red-400 text-lg font-medium">📄 OMR varaqni joylashtiring</p>
              <p className="text-white/70 text-sm">Varaqni kamera oldiga qo'ying</p>
            </div>
          ) : alignmentStatus.corners.filter(c => c.detected).length < 3 ? (
            <div className="space-y-2">
              <p className="text-yellow-400 text-lg font-medium">🎯 Qog'ozni to'g'ri joylashtiring</p>
              <p className="text-white/70 text-sm">
                Burchaklar: {alignmentStatus.corners.filter(c => c.detected).length}/4
              </p>
            </div>
          ) : !canCapture ? (
            <div className="space-y-2">
              <p className="text-yellow-400 text-lg font-medium">⚡ Sifatni yaxshilang</p>
              <div className="flex justify-center gap-4 text-xs text-white/60">
                <span>Focus: {Math.round(qualityMetrics.focus * 100)}%</span>
                <span>Yorug'lik: {Math.round(qualityMetrics.brightness * 100)}%</span>
              </div>
            </div>
          ) : qualityMetrics.overall >= 0.9 ? (
            <div className="space-y-2">
              <p className="text-green-400 text-lg font-medium">✨ Mukammal sifat!</p>
              {autoScanCountdown > 0 && (
                <p className="text-green-300 text-sm">Avtomatik suratga olish: {autoScanCountdown}s</p>
              )}
              {showBubbleOverlay && (
                <p className="text-blue-300 text-sm">
                  🎯 {detectedBubbles.filter(b => b.isFilled && b.isCorrect).length} to'g'ri, {detectedBubbles.filter(b => b.isFilled && !b.isCorrect).length} noto'g'ri
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-blue-400 text-lg font-medium">📸 Suratga olish mumkin</p>
              <p className="text-white/70 text-sm">Tugmani bosing yoki kutib turing</p>
              {showBubbleOverlay && (
                <p className="text-blue-300 text-sm">
                  🎯 {detectedBubbles.filter(b => b.isFilled && b.isCorrect).length} to'g'ri, {detectedBubbles.filter(b => b.isFilled && !b.isCorrect).length} noto'g'ri
                </p>
              )}
            </div>
          )}
        </div>
        
        {/* Capture Button */}
        <div className="flex justify-center">
          <button
            onClick={captureImage}
            disabled={!isReady || isProcessing || !canCapture}
            className={`relative p-4 rounded-full transition-all duration-300 ${
              canCapture && qualityMetrics.overall >= 0.9
                ? 'bg-green-500 hover:bg-green-600 scale-110 shadow-lg shadow-green-500/50' 
                : canCapture
                  ? 'bg-blue-500 hover:bg-blue-600 shadow-lg shadow-blue-500/50'
                  : 'bg-gray-600 cursor-not-allowed opacity-50'
            }`}
            style={{
              boxShadow: canCapture ? '0 0 30px rgba(59, 130, 246, 0.5)' : 'none'
            }}
          >
            {isProcessing ? (
              <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Camera size={32} className="text-white" />
            )}
            
            {/* Quality Ring */}
            {canCapture && (
              <div className="absolute inset-0 rounded-full border-4 border-white/30 animate-pulse" />
            )}
          </button>
        </div>

        {/* Quick Stats */}
        {alignmentStatus.paperDetected && (
          <div className="flex justify-center gap-6 mt-4 text-xs text-white/60">
            <div className="text-center">
              <div className="text-white font-medium">{Math.round(qualityMetrics.focus * 100)}%</div>
              <div>Focus</div>
            </div>
            <div className="text-center">
              <div className="text-white font-medium">{Math.round(qualityMetrics.brightness * 100)}%</div>
              <div>Yorug'lik</div>
            </div>
            <div className="text-center">
              <div className="text-white font-medium">{alignmentStatus.corners.filter(c => c.detected).length}/4</div>
              <div>Burchak</div>
            </div>
          </div>
        )}
      </div>

      {/* Hidden Processing Canvas */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
})

EvalBeeCameraScanner.displayName = 'EvalBeeCameraScanner'

export default EvalBeeCameraScanner