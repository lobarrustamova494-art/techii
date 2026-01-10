import React, { useRef, useEffect, useState, useCallback, useMemo, memo } from 'react'
import { 
  Camera, X, Bug
} from 'lucide-react'

interface EvalBeeCameraScannerProps {
  onCapture: (imageData: string, qualityMetrics: QualityMetrics) => void
  onClose: () => void
  isProcessing: boolean
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

const EvalBeeCameraScanner: React.FC<EvalBeeCameraScannerProps> = memo(({
  onCapture,
  onClose,
  isProcessing,
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

  // EvalBee Core: Lightweight Real-time Analysis (EXACTLY as specified in evalbee_camera_page.md)
  const performLightweightAnalysis = useCallback((imageData: ImageData) => {
    const { data, width, height } = imageData
    
    // Skip analysis if processing or not ready
    if (isProcessing || !isReady) return
    
    // EvalBee Method: ONLY lightweight checks - NO HEAVY OpenCV
    // 1. Grayscale conversion (lightweight sampling)
    const sampleRate = 12 // Even more aggressive sampling for performance
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
    
    // 2. FOCUS CHECK using Laplacian variance (as specified)
    const focus = calculateLaplacianVariance(grayscale, sampledWidth, sampledHeight)
    
    // 3. BRIGHTNESS CHECK (average brightness)
    const brightness = calculateAverageBrightness(grayscale)
    
    // 4. ALIGNMENT CHECK (paper detection)
    const alignment = detectPaperInFrame(grayscale, sampledWidth, sampledHeight, sampleRate)
    
    // 5. Overall quality calculation
    const overall = (focus * 0.5 + brightness * 0.3 + alignment.alignment * 0.2)
    
    // EvalBee Logic: STRICT quality requirements
    const focusGood = focus >= 0.7
    const brightnessGood = brightness >= 0.3 && brightness <= 0.8
    const alignmentGood = alignment.paperDetected && alignment.alignment >= 0.8
    
    // Update state only if significant change (prevent excessive re-renders)
    if (Math.abs(qualityMetrics.overall - overall) > 0.05) {
      const issues = []
      const recommendations = []
      
      if (!focusGood) {
        issues.push('Rasm aniq emas')
        recommendations.push('📱 Kamerani yaqinlashtiring va fokusni sozlang')
      }
      if (!brightnessGood) {
        if (brightness < 0.3) {
          issues.push('Yorug\'lik kam')
          recommendations.push('💡 Ko\'proq yorug\'lik kerak')
        } else {
          issues.push('Juda yorqin')
          recommendations.push('🌤️ Yorug\'likni kamaytiring')
        }
      }
      if (!alignmentGood) {
        issues.push('Varaq noto\'g\'ri joylashgan')
        recommendations.push('📄 Varaqni ramkaga to\'g\'ri joylashtiring')
      }
      
      const newQualityMetrics = {
        focus,
        brightness,
        contrast: alignment.alignment,
        skew: 1 - alignment.alignment,
        overall,
        issues,
        recommendations
      }
      
      setQualityMetrics(newQualityMetrics)
      setAlignmentStatus(alignment)
    }
    
    // EvalBee Logic: STRICT capture conditions
    const canCaptureNow = focusGood && brightnessGood && alignmentGood
    setCanCapture(canCaptureNow)
    
    // AUTO-SCAN Logic (as specified in document)
    if (canCaptureNow && overall >= 0.9 && autoScanCountdown === 0) {
      console.log('🎯 EvalBee: Perfect conditions detected, starting auto-scan countdown')
      setAutoScanCountdown(3)
      
      // Auto-capture after 0.5-1 second (as specified)
      setTimeout(() => {
        if (canCapture && qualityMetrics.overall >= 0.9 && !isProcessing) {
          console.log('📸 EvalBee: Auto-capturing perfect frame')
          captureImage()
        }
        setAutoScanCountdown(0)
      }, 800) // 0.8 seconds as specified
    }
    
    // Draw guide overlay (throttled)
    if (Math.random() > 0.7) {
      drawEvalBeeGuide(alignment)
    }
  }, [isProcessing, isReady, qualityMetrics.overall, canCapture, autoScanCountdown])

  // EvalBee Method: Laplacian variance for focus detection
  const calculateLaplacianVariance = (grayscale: number[], width: number, height: number): number => {
    let variance = 0
    let count = 0
    
    // Sample every 10th pixel for performance
    for (let y = 1; y < height - 1; y += 10) {
      for (let x = 1; x < width - 1; x += 10) {
        const idx = y * width + x
        if (idx < grayscale.length - width - 1) {
          // Laplacian kernel: center * 4 - neighbors
          const laplacian = 
            4 * grayscale[idx] - 
            grayscale[idx - 1] - grayscale[idx + 1] - 
            grayscale[idx - width] - grayscale[idx + width]
          
          variance += laplacian * laplacian
          count++
        }
      }
    }
    
    const result = count > 0 ? variance / count : 0
    return Math.min(1, result / 1000) // Normalize to 0-1
  }

  // EvalBee Method: Average brightness calculation
  const calculateAverageBrightness = (grayscale: number[]): number => {
    let sum = 0
    const sampleStep = 25 // Sample every 25th pixel for performance
    
    for (let i = 0; i < grayscale.length; i += sampleStep) {
      sum += grayscale[i]
    }
    
    const count = Math.floor(grayscale.length / sampleStep)
    return count > 0 ? (sum / count) / 255 : 0
  }

  // EvalBee Method: Paper detection in frame
  const detectPaperInFrame = (grayscale: number[], width: number, height: number, sampleRate: number = 1): AlignmentStatus => {
    // Define frame boundaries for paper detection
    const frameMargin = 0.1 // 10% margin
    const frameLeft = Math.floor(width * frameMargin)
    const frameRight = Math.floor(width * (1 - frameMargin))
    const frameTop = Math.floor(height * frameMargin)
    const frameBottom = Math.floor(height * (1 - frameMargin))
    
    // Check if paper edges are within frame
    let edgePixels = 0
    let totalChecked = 0
    
    // Sample frame edges for paper detection
    for (let x = frameLeft; x < frameRight; x += 5) {
      for (let y = frameTop; y < frameBottom; y += 5) {
        const idx = y * width + x
        if (idx < grayscale.length) {
          const pixel = grayscale[idx]
          
          // Look for paper edges (moderate contrast)
          if (pixel > 180 && pixel < 240) { // Paper-like brightness
            edgePixels++
          }
          totalChecked++
        }
      }
    }
    
    const paperRatio = totalChecked > 0 ? edgePixels / totalChecked : 0
    const paperDetected = paperRatio > 0.3
    const alignment = paperRatio
    
    // Mock corner detection for compatibility
    const corners = [
      { x: frameLeft * sampleRate, y: frameTop * sampleRate, detected: paperDetected, name: 'TL' },
      { x: frameRight * sampleRate, y: frameTop * sampleRate, detected: paperDetected, name: 'TR' },
      { x: frameLeft * sampleRate, y: frameBottom * sampleRate, detected: paperDetected, name: 'BL' },
      { x: frameRight * sampleRate, y: frameBottom * sampleRate, detected: paperDetected, name: 'BR' }
    ]
    
    return {
      paperDetected,
      withinFrame: true,
      alignment,
      corners
    }
  }
  // EvalBee Guide: Simple alignment overlay (as specified in evalbee_camera_page.md)
  const drawEvalBeeGuide = (alignment: AlignmentStatus) => {
    if (!overlayCanvasRef.current) return
    
    const canvas = overlayCanvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    // EvalBee Method: Simple rectangular frame + corner markers
    const frameMargin = 0.1 // 10% margin as specified
    const frameX = canvas.width * frameMargin
    const frameY = canvas.height * frameMargin
    const frameWidth = canvas.width * (1 - 2 * frameMargin)
    const frameHeight = canvas.height * (1 - 2 * frameMargin)
    
    // Main frame color based on paper detection
    const frameColor = alignment.paperDetected ? '#10B981' : '#EF4444'
    const frameOpacity = alignment.paperDetected ? 0.9 : 0.7
    
    // Draw main rectangular frame
    ctx.strokeStyle = frameColor
    ctx.globalAlpha = frameOpacity
    ctx.lineWidth = 4
    ctx.shadowColor = frameColor
    ctx.shadowBlur = 15
    ctx.strokeRect(frameX, frameY, frameWidth, frameHeight)
    
    // Corner markers (L-shapes)
    ctx.setLineDash([])
    ctx.lineWidth = 6
    ctx.globalAlpha = 1.0
    const cornerSize = 60
    
    // Draw L-shaped corner markers
    const corners = [
      { x: frameX, y: frameY, type: 'TL' },
      { x: frameX + frameWidth, y: frameY, type: 'TR' },
      { x: frameX, y: frameY + frameHeight, type: 'BL' },
      { x: frameX + frameWidth, y: frameY + frameHeight, type: 'BR' }
    ]
    
    corners.forEach(corner => {
      ctx.strokeStyle = frameColor
      ctx.shadowColor = frameColor
      ctx.shadowBlur = 10
      
      ctx.beginPath()
      if (corner.type === 'TL') {
        ctx.moveTo(corner.x, corner.y + cornerSize)
        ctx.lineTo(corner.x, corner.y)
        ctx.lineTo(corner.x + cornerSize, corner.y)
      } else if (corner.type === 'TR') {
        ctx.moveTo(corner.x - cornerSize, corner.y)
        ctx.lineTo(corner.x, corner.y)
        ctx.lineTo(corner.x, corner.y + cornerSize)
      } else if (corner.type === 'BL') {
        ctx.moveTo(corner.x, corner.y - cornerSize)
        ctx.lineTo(corner.x, corner.y)
        ctx.lineTo(corner.x + cornerSize, corner.y)
      } else if (corner.type === 'BR') {
        ctx.moveTo(corner.x - cornerSize, corner.y)
        ctx.lineTo(corner.x, corner.y)
        ctx.lineTo(corner.x, corner.y - cornerSize)
      }
      ctx.stroke()
    })
    
    // Reset effects
    ctx.shadowBlur = 0
    ctx.globalAlpha = 1.0
    
    // Center instruction based on paper detection
    if (!alignment.paperDetected) {
      // Semi-transparent background
      ctx.fillStyle = 'rgba(0, 0, 0, 0.85)'
      ctx.fillRect(canvas.width/2 - 180, canvas.height/2 - 60, 360, 120)
      
      // Border
      ctx.strokeStyle = '#EF4444'
      ctx.lineWidth = 3
      ctx.shadowColor = '#EF4444'
      ctx.shadowBlur = 15
      ctx.strokeRect(canvas.width/2 - 180, canvas.height/2 - 60, 360, 120)
      ctx.shadowBlur = 0
      
      // Text
      ctx.fillStyle = 'white'
      ctx.font = 'bold 20px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('OMR varaqni ramkaga', canvas.width/2, canvas.height/2 - 20)
      ctx.fillText('joylashtiring', canvas.width/2, canvas.height/2 + 10)
      
      ctx.font = '14px sans-serif'
      ctx.fillStyle = '#FFB3B3'
      ctx.fillText('Varaq ramkadan chiqmasin', canvas.width/2, canvas.height/2 + 35)
    } else if (alignment.alignment < 0.8) {
      // Alignment warning
      ctx.fillStyle = 'rgba(0, 0, 0, 0.85)'
      ctx.fillRect(canvas.width/2 - 120, canvas.height/2 - 40, 240, 80)
      
      ctx.strokeStyle = '#F59E0B'
      ctx.lineWidth = 3
      ctx.strokeRect(canvas.width/2 - 120, canvas.height/2 - 40, 240, 80)
      
      ctx.fillStyle = 'white'
      ctx.font = 'bold 18px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('Varaqni tekislang', canvas.width/2, canvas.height/2 - 5)
      
      ctx.font = '14px sans-serif'
      ctx.fillStyle = '#FCD34D'
      ctx.fillText('Qiyshaygan', canvas.width/2, canvas.height/2 + 20)
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

    console.log('📸 EvalBee: Starting SINGLE FRAME capture...')

    // EvalBee Method: STOP video stream immediately (as specified)
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }

    // STOP real-time analysis
    setIsReady(false)

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
    
    // Capture SINGLE frame with mirror correction
    context.save()
    context.scale(-1, 1) // Flip horizontally
    context.drawImage(video, -canvas.width, 0, canvas.width, canvas.height)
    context.restore()

    console.log('🖼️ SINGLE frame captured with mirror correction')

    // Generate image data
    const finalImageData = canvas.toDataURL('image/jpeg', 0.85)
    
    console.log('✅ EvalBee: SINGLE frame capture completed', {
      imageDataLength: finalImageData.length,
      qualityMetrics: qualityMetrics
    })
    
    // Validate the generated image data
    if (!finalImageData || finalImageData.length < 1000) {
      console.error('❌ Generated image data is too small or empty')
      // EvalBee Method: Return to camera if capture failed
      setIsReady(true)
      startRealTimeAnalysis()
      return
    }
    
    if (!finalImageData.startsWith('data:image/')) {
      console.error('❌ Generated image data has invalid format')
      // EvalBee Method: Return to camera if capture failed
      setIsReady(true)
      startRealTimeAnalysis()
      return
    }
    
    console.log('✅ Image data validation passed, calling onCapture')
    
    // EvalBee Method: Camera is now CLOSED during processing
    // Processing happens in background/separate thread
    onCapture(finalImageData, qualityMetrics)
  }, [videoRef, canvasRef, isReady, canCapture, qualityMetrics, onCapture, startRealTimeAnalysis])

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
            
            {/* Visible UI Frame Overlay */}
            <div className="absolute inset-0 z-15 pointer-events-none">
              {/* Main Frame Border */}
              <div 
                className={`absolute border-4 rounded-lg transition-all duration-300 ${
                  alignmentStatus.paperDetected 
                    ? 'border-green-400 shadow-lg shadow-green-400/50' 
                    : 'border-red-400 shadow-lg shadow-red-400/50'
                }`}
                style={{
                  left: '10%',
                  top: '10%',
                  width: '80%',
                  height: '80%',
                  borderStyle: 'dashed',
                  borderWidth: '3px'
                }}
              >
                {/* Corner Markers with Animation */}
                <div className="absolute -top-3 -left-3">
                  <div className={`w-16 h-16 border-l-4 border-t-4 rounded-tl-lg transition-all duration-300 ${
                    alignmentStatus.paperDetected 
                      ? 'border-green-400 shadow-lg shadow-green-400/50' 
                      : 'border-red-400 shadow-lg shadow-red-400/50 animate-pulse'
                  }`}></div>
                </div>
                <div className="absolute -top-3 -right-3">
                  <div className={`w-16 h-16 border-r-4 border-t-4 rounded-tr-lg transition-all duration-300 ${
                    alignmentStatus.paperDetected 
                      ? 'border-green-400 shadow-lg shadow-green-400/50' 
                      : 'border-red-400 shadow-lg shadow-red-400/50 animate-pulse'
                  }`}></div>
                </div>
                <div className="absolute -bottom-3 -left-3">
                  <div className={`w-16 h-16 border-l-4 border-b-4 rounded-bl-lg transition-all duration-300 ${
                    alignmentStatus.paperDetected 
                      ? 'border-green-400 shadow-lg shadow-green-400/50' 
                      : 'border-red-400 shadow-lg shadow-red-400/50 animate-pulse'
                  }`}></div>
                </div>
                <div className="absolute -bottom-3 -right-3">
                  <div className={`w-16 h-16 border-r-4 border-b-4 rounded-br-lg transition-all duration-300 ${
                    alignmentStatus.paperDetected 
                      ? 'border-green-400 shadow-lg shadow-green-400/50' 
                      : 'border-red-400 shadow-lg shadow-red-400/50 animate-pulse'
                  }`}></div>
                </div>
                
                {/* Frame Label */}
                <div className="absolute -top-10 left-1/2 transform -translate-x-1/2">
                  <div className={`px-4 py-2 rounded-full text-sm font-bold transition-all duration-300 ${
                    alignmentStatus.paperDetected 
                      ? 'bg-green-400 text-green-900 shadow-lg shadow-green-400/50' 
                      : 'bg-red-400 text-red-900 shadow-lg shadow-red-400/50 animate-pulse'
                  }`}>
                    {alignmentStatus.paperDetected ? '✅ RAMKA ICHIDA' : '📄 RAMKAGA JOYLASHTIRING'}
                  </div>
                </div>
              </div>
              
              {/* Center Guidelines */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                {/* Horizontal center line */}
                <div className={`absolute w-20 h-0.5 transition-all duration-300 ${
                  alignmentStatus.paperDetected ? 'bg-green-400' : 'bg-white'
                } opacity-60`}></div>
                {/* Vertical center line */}
                <div className={`absolute h-20 w-0.5 transition-all duration-300 ${
                  alignmentStatus.paperDetected ? 'bg-green-400' : 'bg-white'
                } opacity-60`}></div>
                
                {/* Center circle */}
                <div className={`absolute w-4 h-4 rounded-full transition-all duration-300 ${
                  alignmentStatus.paperDetected ? 'bg-green-400' : 'bg-white'
                } opacity-60`}></div>
              </div>
              
              {/* Scanning Area Overlay */}
              <div className="absolute inset-0 pointer-events-none">
                {/* Top overlay */}
                <div className="absolute top-0 left-0 right-0 bg-black/40" style={{ height: '10%' }}></div>
                {/* Bottom overlay */}
                <div className="absolute bottom-0 left-0 right-0 bg-black/40" style={{ height: '10%' }}></div>
                {/* Left overlay */}
                <div className="absolute left-0 bg-black/40" style={{ top: '10%', bottom: '10%', width: '10%' }}></div>
                {/* Right overlay */}
                <div className="absolute right-0 bg-black/40" style={{ top: '10%', bottom: '10%', width: '10%' }}></div>
              </div>
            </div>
            
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
            
            {/* Frame Status Indicator */}
            <div className="absolute top-16 left-1/2 transform -translate-x-1/2 z-20">
              <div className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                alignmentStatus.paperDetected 
                  ? 'bg-green-500/90 text-white' 
                  : 'bg-red-500/90 text-white'
              }`}>
                {alignmentStatus.paperDetected 
                  ? '✅ Ramka ichida' 
                  : '❌ Ramkaga joylashtiring'
                }
              </div>
            </div>
          </>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/80 to-transparent p-6 z-20">
        {/* EvalBee Status Text (as specified in evalbee_camera_page.md) */}
        <div className="text-center mb-6">
          {!alignmentStatus.paperDetected ? (
            <div className="space-y-2">
              <p className="text-red-400 text-lg font-medium">📄 Varaqni ramkaga joylashtiring</p>
              <p className="text-white/70 text-sm">Varaq ramkadan chiqmasin</p>
            </div>
          ) : qualityMetrics.focus < 0.7 ? (
            <div className="space-y-2">
              <p className="text-yellow-400 text-lg font-medium">📱 Kamerani yaqinlashtiring</p>
              <p className="text-white/70 text-sm">Rasm aniq emas - Focus: {Math.round(qualityMetrics.focus * 100)}%</p>
            </div>
          ) : qualityMetrics.brightness < 0.3 ? (
            <div className="space-y-2">
              <p className="text-yellow-400 text-lg font-medium">💡 Yorug'likni sozlang</p>
              <p className="text-white/70 text-sm">Juda qorong'i - Yorug'lik: {Math.round(qualityMetrics.brightness * 100)}%</p>
            </div>
          ) : qualityMetrics.brightness > 0.8 ? (
            <div className="space-y-2">
              <p className="text-yellow-400 text-lg font-medium">🌤️ Yorug'likni kamaytiring</p>
              <p className="text-white/70 text-sm">Juda yorqin - Yorug'lik: {Math.round(qualityMetrics.brightness * 100)}%</p>
            </div>
          ) : alignmentStatus.alignment < 0.8 ? (
            <div className="space-y-2">
              <p className="text-yellow-400 text-lg font-medium">📐 Varaqni tekislang</p>
              <p className="text-white/70 text-sm">Qiyshaygan - Tekislash: {Math.round(alignmentStatus.alignment * 100)}%</p>
            </div>
          ) : !canCapture ? (
            <div className="space-y-2">
              <p className="text-yellow-400 text-lg font-medium">⚡ Sharoitlarni yaxshilang</p>
              <div className="flex justify-center gap-4 text-xs text-white/60">
                <span>Focus: {Math.round(qualityMetrics.focus * 100)}%</span>
                <span>Yorug'lik: {Math.round(qualityMetrics.brightness * 100)}%</span>
                <span>Tekislash: {Math.round(alignmentStatus.alignment * 100)}%</span>
              </div>
            </div>
          ) : qualityMetrics.overall >= 0.9 ? (
            <div className="space-y-2">
              <p className="text-green-400 text-lg font-medium">✨ Mukammal sharoitlar!</p>
              {autoScanCountdown > 0 ? (
                <p className="text-green-300 text-sm animate-pulse">Avtomatik suratga olish: {autoScanCountdown}s</p>
              ) : (
                <p className="text-green-300 text-sm">Avtomatik suratga olinadi</p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-blue-400 text-lg font-medium">📸 Suratga olish mumkin</p>
              <p className="text-white/70 text-sm">Tugmani bosing</p>
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