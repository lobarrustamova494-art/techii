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

  // EvalBee Core: Lightweight Real-time Analysis (NO HEAVY OpenCV) - OPTIMIZED
  const startRealTimeAnalysis = useCallback(() => {
    let frameCount = 0
    
    const analyzeFrame = () => {
      if (!videoRef.current || !canvasRef.current || isProcessing) {
        animationFrameRef.current = requestAnimationFrame(analyzeFrame)
        return
      }

      frameCount++
      
      // Skip frames for better performance - analyze every 5th frame
      if (frameCount % 5 !== 0) {
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
  }, [isProcessing])

  // EvalBee Core: Fast Analysis (grayscale + basic checks only) - HEAVILY OPTIMIZED
  const performLightweightAnalysis = useCallback((imageData: ImageData) => {
    const { data, width, height } = imageData
    
    // Skip analysis if processing or not ready
    if (isProcessing || !isReady) return
    
    // Throttle analysis to every 10th call for better performance
    if (Math.random() > 0.1) return
    
    // Convert to grayscale (lightweight) - sample every 8th pixel for extreme performance
    const sampleRate = 8
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
    
    // 4. Enhanced Bubble Detection (more frequent when paper detected)
    let bubbles: DetectedBubble[] = []
    if (alignment.paperDetected && correctAnswers.length > 0) {
      // Increase detection frequency when paper is properly aligned
      const detectionChance = alignment.alignment > 0.8 ? 0.3 : 0.1 // 30% vs 10% chance
      if (Math.random() < detectionChance) {
        bubbles = detectBubbles(grayscale, sampledWidth, sampledHeight, alignment, sampleRate)
      }
    }
    
    // 5. Overall Quality (EvalBee method)
    const overall = (focus * 0.4 + brightness * 0.3 + alignment.alignment * 0.3)
    
    // Batch state updates to prevent excessive re-renders - only update if significant change
    if (Math.abs(qualityMetrics.overall - overall) > 0.1) {
      const newQualityMetrics = {
        focus,
        brightness,
        contrast: alignment.alignment,
        skew: 1 - alignment.alignment,
        overall,
        issues: generateIssues(focus, brightness, alignment),
        recommendations: generateRecommendations(focus, brightness, alignment)
      }
      
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
    
    // Draw guide overlay (throttled to every 3rd call)
    if (Math.random() > 0.66) {
      drawGuideWithBubbles(alignment, bubbles)
    }
  }, [isProcessing, isReady, correctAnswers, qualityMetrics.overall, canCapture, autoScanCountdown])

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

  // EvalBee Core: Paper alignment detection with OMR sheet format (8 alignment marks - 4 corners)
  const detectPaperAlignment = (grayscale: number[], width: number, height: number, sampleRate: number = 1): AlignmentStatus => {
    // Define 4 corner alignment positions based on actual OMR sheet format
    // These correspond to the outermost alignment marks from the OMR sheet
    const markerSize = Math.floor(35 / sampleRate) // Larger marker size to match OMR format
    const leftMargin = Math.floor(47 / sampleRate)   // 4mm from left edge
    const rightMargin = Math.floor(47 / sampleRate)  // 4mm from right edge
    const topMargin = Math.floor(120 / sampleRate)   // Top position (L1/R1)
    const bottomMargin = Math.floor(922 / sampleRate) // Bottom position (L4/R4)
    
    // Adjust positions based on image dimensions
    const adjustedLeftX = Math.min(leftMargin, width * 0.05)
    const adjustedRightX = Math.max(width - rightMargin, width * 0.95)
    const adjustedTopY = Math.min(topMargin, height * 0.12)
    const adjustedBottomY = Math.max(bottomMargin, height * 0.88)
    
    const cornerMarkers = [
      { x: adjustedLeftX, y: adjustedTopY, name: 'TL', detected: false },      // Top-Left (L1)
      { x: adjustedRightX, y: adjustedTopY, name: 'TR', detected: false },     // Top-Right (R1)
      { x: adjustedLeftX, y: adjustedBottomY, name: 'BL', detected: false },   // Bottom-Left (L4)
      { x: adjustedRightX, y: adjustedBottomY, name: 'BR', detected: false }   // Bottom-Right (R4)
    ]
    
    // Detect dark rectangular markers in corners (optimized for OMR format)
    let detectedMarkers = 0
    
    cornerMarkers.forEach(marker => {
      let darkPixels = 0
      let totalPixels = 0
      
      // Sample rectangular area (not circular) to match OMR alignment marks
      const halfWidth = Math.floor(markerSize * 0.6)
      const halfHeight = Math.floor(markerSize * 0.6)
      
      for (let dy = -halfHeight; dy <= halfHeight; dy += 2) {
        for (let dx = -halfWidth; dx <= halfWidth; dx += 2) {
          const x = Math.floor(marker.x + dx)
          const y = Math.floor(marker.y + dy)
          
          if (x >= 0 && x < width && y >= 0 && y < height) {
            const idx = y * width + x
            if (idx < grayscale.length) {
              const pixel = grayscale[idx]
              
              if (pixel < 80) darkPixels++ // Lower threshold for black alignment marks
              totalPixels++
            }
          }
        }
      }
      
      const darkRatio = totalPixels > 0 ? darkPixels / totalPixels : 0
      if (darkRatio > 0.5) { // Lower threshold for better detection
        marker.detected = true
        detectedMarkers++
      }
    })
    
    // Calculate alignment quality
    const markerDetectionRatio = detectedMarkers / 4
    const paperDetected = detectedMarkers >= 3 // Need at least 3 corners
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

  // Enhanced Bubble detection with improved accuracy (optimized)
  const detectBubbles = (grayscale: number[], width: number, height: number, alignment: AlignmentStatus, sampleRate: number = 1): DetectedBubble[] => {
    const bubbles: DetectedBubble[] = []
    
    if (!alignment.paperDetected || correctAnswers.length === 0) return bubbles
    
    // Enhanced: Process more questions for better coverage
    const maxQuestions = Math.min(correctAnswers.length, 25)
    const questionsPerColumn = Math.ceil(maxQuestions / 3)
    const questionHeight = Math.floor(height * 0.6 / questionsPerColumn)
    const startY = Math.floor(height * 0.2)
    const columnWidth = Math.floor(width * 0.25)
    const startX = Math.floor(width * 0.15)
    
    const bubbleRadius = Math.floor(10 / sampleRate) // Slightly larger for better detection
    const optionSpacing = Math.floor(28 / sampleRate) // Better spacing
    const options = ['A', 'B', 'C', 'D', 'E']
    
    // Enhanced: Detect bubbles with improved algorithm
    for (let q = 0; q < maxQuestions; q++) {
      const column = Math.floor(q / questionsPerColumn)
      const rowInColumn = q % questionsPerColumn
      
      const questionX = startX + column * columnWidth
      const questionY = startY + rowInColumn * questionHeight
      
      // Process all available options (up to 5)
      const maxOptions = Math.min(options.length, 5)
      for (let optIndex = 0; optIndex < maxOptions; optIndex++) {
        const option = options[optIndex]
        const bubbleX = questionX + optIndex * optionSpacing
        const bubbleY = questionY
        
        if (bubbleX < bubbleRadius || bubbleX >= width - bubbleRadius || 
            bubbleY < bubbleRadius || bubbleY >= height - bubbleRadius) {
          continue
        }
        
        // Enhanced bubble detection with multiple thresholds
        let darkPixels = 0
        let mediumPixels = 0
        let totalPixels = 0
        
        // More precise circular sampling
        for (let dy = -bubbleRadius; dy <= bubbleRadius; dy += 1) {
          for (let dx = -bubbleRadius; dx <= bubbleRadius; dx += 1) {
            const distance = Math.sqrt(dx * dx + dy * dy)
            if (distance <= bubbleRadius) {
              const x = Math.floor(bubbleX + dx)
              const y = Math.floor(bubbleY + dy)
              
              if (x >= 0 && x < width && y >= 0 && y < height) {
                const idx = y * width + x
                if (idx < grayscale.length) {
                  const pixel = grayscale[idx]
                  
                  if (pixel < 100) darkPixels++ // Very dark (definitely filled)
                  else if (pixel < 140) mediumPixels++ // Medium dark (possibly filled)
                  totalPixels++
                }
              }
            }
          }
        }
        
        // Enhanced fill detection with multiple criteria
        const darkRatio = totalPixels > 0 ? darkPixels / totalPixels : 0
        const mediumRatio = totalPixels > 0 ? mediumPixels / totalPixels : 0
        const combinedRatio = darkRatio + (mediumRatio * 0.5)
        
        // More sophisticated fill detection
        const isFilled = darkRatio > 0.3 || combinedRatio > 0.5
        const isCorrect = correctAnswers[q] === option
        const confidence = Math.min(1, combinedRatio * 1.5)
        
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

  // Guide overlay with OMR sheet format alignment rectangles
  const drawGuideWithBubbles = (alignment: AlignmentStatus, bubbles: DetectedBubble[]) => {
    if (!overlayCanvasRef.current) return
    
    const canvas = overlayCanvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    // OMR Sheet format guide - 4 black rectangles for corner alignment
    const rectWidth = 30  // Width of alignment rectangles
    const rectHeight = 30 // Height of alignment rectangles
    
    // Calculate positions based on OMR sheet format
    const leftMargin = canvas.width * 0.05   // 5% from left edge
    const rightMargin = canvas.width * 0.95  // 5% from right edge  
    const topMargin = canvas.height * 0.12   // 12% from top
    const bottomMargin = canvas.height * 0.88 // 12% from bottom
    
    // Define 4 corner alignment rectangles matching OMR sheet format
    const alignmentRects = [
      { x: leftMargin - rectWidth/2, y: topMargin - rectHeight/2, name: 'TL' },      // Top-Left
      { x: rightMargin - rectWidth/2, y: topMargin - rectHeight/2, name: 'TR' },     // Top-Right
      { x: leftMargin - rectWidth/2, y: bottomMargin - rectHeight/2, name: 'BL' },   // Bottom-Left
      { x: rightMargin - rectWidth/2, y: bottomMargin - rectHeight/2, name: 'BR' }   // Bottom-Right
    ]
    
    // Draw 4 black alignment rectangles
    alignmentRects.forEach((rect, index) => {
      const corner = alignment.corners[index]
      const isDetected = corner?.detected || false
      
      // Rectangle styling based on detection
      if (isDetected) {
        // Green glow for detected alignment marks
        ctx.fillStyle = 'rgba(16, 185, 129, 0.8)'
        ctx.strokeStyle = '#10B981'
        ctx.shadowColor = '#10B981'
        ctx.shadowBlur = 15
        ctx.lineWidth = 3
      } else {
        // Red glow for undetected alignment marks
        ctx.fillStyle = 'rgba(239, 68, 68, 0.8)'
        ctx.strokeStyle = '#EF4444'
        ctx.shadowColor = '#EF4444'
        ctx.shadowBlur = 15
        ctx.lineWidth = 3
      }
      
      // Draw filled rectangle (matching OMR sheet black rectangles)
      ctx.fillRect(rect.x, rect.y, rectWidth, rectHeight)
      ctx.strokeRect(rect.x, rect.y, rectWidth, rectHeight)
      
      // Add corner label
      ctx.fillStyle = 'white'
      ctx.font = 'bold 12px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.shadowColor = 'rgba(0,0,0,0.8)'
      ctx.shadowBlur = 3
      ctx.fillText(rect.name, rect.x + rectWidth/2, rect.y + rectHeight/2)
      
      // Reset shadow
      ctx.shadowBlur = 0
    })
    
    // Draw main paper frame guide (dashed outline)
    const frameMargin = 0.08 // 8% margin for paper frame
    const frameX = canvas.width * frameMargin
    const frameY = canvas.height * frameMargin
    const frameWidth = canvas.width * (1 - 2 * frameMargin)
    const frameHeight = canvas.height * (1 - 2 * frameMargin)
    
    // Frame color based on paper detection
    const frameColor = alignment.paperDetected ? '#10B981' : '#3B82F6'
    const frameOpacity = alignment.paperDetected ? 0.9 : 0.7
    
    // Draw main guide frame
    ctx.strokeStyle = frameColor
    ctx.globalAlpha = frameOpacity
    ctx.lineWidth = 2
    ctx.setLineDash([15, 8])
    ctx.strokeRect(frameX, frameY, frameWidth, frameHeight)
    ctx.setLineDash([])
    ctx.globalAlpha = 1.0
    
    // Draw bubble overlays when paper is detected - ENHANCED VISUAL FEEDBACK
    if (alignment.paperDetected && showBubbleOverlay && bubbles.length > 0) {
      bubbles.forEach(bubble => {
        const rectSize = 24 // Larger rectangles for better visibility
        const rectX = bubble.x - rectSize / 2
        const rectY = bubble.y - rectSize / 2
        
        // Enhanced visual feedback with better colors and effects
        if (bubble.isFilled) {
          if (bubble.isCorrect) {
            // To'g'ri javob - yashil to'rtburchak (more prominent)
            ctx.fillStyle = 'rgba(16, 185, 129, 0.8)' // Stronger green
            ctx.strokeStyle = '#10B981'
            ctx.lineWidth = 3
            ctx.shadowColor = '#10B981'
            ctx.shadowBlur = 8
          } else {
            // Noto'g'ri javob - qizil to'rtburchak (more prominent)
            ctx.fillStyle = 'rgba(239, 68, 68, 0.8)' // Stronger red
            ctx.strokeStyle = '#EF4444'
            ctx.lineWidth = 3
            ctx.shadowColor = '#EF4444'
            ctx.shadowBlur = 8
          }
        } else if (bubble.isCorrect) {
          // To'g'ri javob lekin belgilanmagan - yashil border with animation
          ctx.fillStyle = 'rgba(16, 185, 129, 0.4)'
          ctx.strokeStyle = '#10B981'
          ctx.lineWidth = 2
          ctx.shadowColor = '#10B981'
          ctx.shadowBlur = 6
          ctx.setLineDash([4, 4]) // Dashed border for unfilled correct answers
        } else {
          // Oddiy bubble - shaffof
          ctx.fillStyle = 'rgba(156, 163, 175, 0.3)'
          ctx.strokeStyle = '#9CA3AF'
          ctx.lineWidth = 1
          ctx.shadowBlur = 2
        }
        
        // Draw rectangle with enhanced styling
        ctx.fillRect(rectX, rectY, rectSize, rectSize)
        ctx.strokeRect(rectX, rectY, rectSize, rectSize)
        
        // Reset line dash
        ctx.setLineDash([])
        
        // Draw option letter with better styling
        ctx.fillStyle = bubble.isFilled ? 'white' : '#374151'
        ctx.font = 'bold 14px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.shadowColor = bubble.isFilled ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.8)'
        ctx.shadowBlur = 3
        ctx.fillText(bubble.option, bubble.x, bubble.y)
        
        // Add confidence indicator for filled bubbles
        if (bubble.isFilled && bubble.confidence > 0.7) {
          // Small confidence dot
          const dotSize = 4
          ctx.fillStyle = bubble.isCorrect ? '#10B981' : '#EF4444'
          ctx.shadowBlur = 0
          ctx.beginPath()
          ctx.arc(bubble.x + rectSize/2 - 6, bubble.y - rectSize/2 + 6, dotSize, 0, 2 * Math.PI)
          ctx.fill()
        }
        
        // Reset shadow
        ctx.shadowBlur = 0
      })
    }
    
    // Center instruction (only when no paper detected)
    if (!alignment.paperDetected) {
      // Semi-transparent background
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'
      ctx.fillRect(canvas.width/2 - 160, canvas.height/2 - 50, 320, 100)
      
      // Border glow
      ctx.strokeStyle = '#3B82F6'
      ctx.lineWidth = 2
      ctx.shadowColor = '#3B82F6'
      ctx.shadowBlur = 10
      ctx.strokeRect(canvas.width/2 - 160, canvas.height/2 - 50, 320, 100)
      ctx.shadowBlur = 0
      
      // Text
      ctx.fillStyle = 'white'
      ctx.font = 'bold 18px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('OMR varaqni 4 ta qora', canvas.width/2, canvas.height/2 - 15)
      ctx.fillText('to\'rtburchak ichiga joylashtiring', canvas.width/2, canvas.height/2 + 15)
    }
    
    // Show alignment status
    if (alignment.paperDetected) {
      // Alignment status indicator
      const detectedCount = alignment.corners.filter(c => c.detected).length
      
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'
      ctx.fillRect(canvas.width/2 - 100, 20, 200, 40)
      
      ctx.strokeStyle = detectedCount >= 3 ? '#10B981' : '#EF4444'
      ctx.lineWidth = 2
      ctx.strokeRect(canvas.width/2 - 100, 20, 200, 40)
      
      ctx.fillStyle = 'white'
      ctx.font = 'bold 16px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(`Alignment: ${detectedCount}/4`, canvas.width/2, 45)
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
            
            {/* Enhanced Bubble Detection Legend with Real-time Stats */}
            {showBubbleOverlay && detectedBubbles.length > 0 && (
              <div className="absolute bottom-20 left-4 bg-black/90 rounded-lg p-3 z-20 border border-green-400">
                <div className="text-green-400 text-xs font-bold mb-2 flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  REAL-TIME DETECTION
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-green-500 rounded border border-green-400"></div>
                    <span className="text-white">To'g'ri javob</span>
                    <span className="text-green-400 font-bold ml-auto">
                      {detectedBubbles.filter(b => b.isFilled && b.isCorrect).length}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-red-500 rounded border border-red-400"></div>
                    <span className="text-white">Noto'g'ri javob</span>
                    <span className="text-red-400 font-bold ml-auto">
                      {detectedBubbles.filter(b => b.isFilled && !b.isCorrect).length}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-gray-400 rounded border border-gray-300"></div>
                    <span className="text-white">Bo'sh</span>
                    <span className="text-gray-400 font-bold ml-auto">
                      {detectedBubbles.filter(b => !b.isFilled).length}
                    </span>
                  </div>
                </div>
                <div className="border-t border-gray-600 mt-2 pt-2">
                  <div className="text-white/70 text-xs">
                    <div className="flex justify-between">
                      <span>Jami belgilangan:</span>
                      <span className="text-blue-400 font-bold">
                        {detectedBubbles.filter(b => b.isFilled).length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Aniqlangan savollar:</span>
                      <span className="text-blue-400 font-bold">
                        {new Set(detectedBubbles.map(b => b.questionNumber)).size}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>O'rtacha ishonch:</span>
                      <span className="text-blue-400 font-bold">
                        {detectedBubbles.length > 0 ? 
                          Math.round(detectedBubbles.reduce((sum, b) => sum + b.confidence, 0) / detectedBubbles.length * 100) : 0}%
                      </span>
                    </div>
                  </div>
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
              <p className="text-white/70 text-sm">Varaqni 4 ta qora to'rtburchak ichiga qo'ying</p>
            </div>
          ) : alignmentStatus.corners.filter(c => c.detected).length < 3 ? (
            <div className="space-y-2">
              <p className="text-yellow-400 text-lg font-medium">🎯 Qora to'rtburchaklarni tekislang</p>
              <p className="text-white/70 text-sm">
                Aniqlangan: {alignmentStatus.corners.filter(c => c.detected).length}/4 burchak
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
              <p className="text-green-400 text-lg font-medium">✨ Mukammal tekislash!</p>
              {autoScanCountdown > 0 && (
                <p className="text-green-300 text-sm">Avtomatik suratga olish: {autoScanCountdown}s</p>
              )}
              {showBubbleOverlay && detectedBubbles.length > 0 && (
                <div className="space-y-1">
                  <p className="text-blue-300 text-sm">
                    🎯 {detectedBubbles.filter(b => b.isFilled && b.isCorrect).length} to'g'ri, {detectedBubbles.filter(b => b.isFilled && !b.isCorrect).length} noto'g'ri
                  </p>
                  <p className="text-green-300 text-xs">
                    📊 {new Set(detectedBubbles.map(b => b.questionNumber)).size} savol aniqlandi
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-blue-400 text-lg font-medium">📸 Suratga olish mumkin</p>
              <p className="text-white/70 text-sm">Tugmani bosing yoki kutib turing</p>
              {showBubbleOverlay && detectedBubbles.length > 0 && (
                <div className="space-y-1">
                  <p className="text-blue-300 text-sm">
                    🎯 {detectedBubbles.filter(b => b.isFilled && b.isCorrect).length} to'g'ri, {detectedBubbles.filter(b => b.isFilled && !b.isCorrect).length} noto'g'ri
                  </p>
                  <p className="text-blue-300 text-xs">
                    📊 {new Set(detectedBubbles.map(b => b.questionNumber)).size} savol aniqlandi
                  </p>
                </div>
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
              <div>Tekislash</div>
            </div>
            <div className="text-center">
              <div className="text-white font-medium">{Math.round(alignmentStatus.alignment * 100)}%</div>
              <div>Sifat</div>
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