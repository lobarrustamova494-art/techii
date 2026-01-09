import React, { useRef, useEffect, useState } from 'react'
import { 
  Camera, X
} from 'lucide-react'

interface EvalBeeCameraScannerProps {
  onCapture: (imageData: string, qualityMetrics: QualityMetrics) => void
  onClose: () => void
  isProcessing: boolean
  answerKey: string[]
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

const EvalBeeCameraScanner: React.FC<EvalBeeCameraScannerProps> = ({
  onCapture,
  onClose,
  isProcessing
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

  const startCamera = async () => {
    try {
      setError('')
      
      // EvalBee-style camera constraints - optimized for documents
      const constraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1920, min: 1280 }, // Moderate resolution for real-time
          height: { ideal: 1440, min: 960 },
          frameRate: { ideal: 30, min: 15 },
          aspectRatio: { ideal: 4/3 }
        }
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints)
      setStream(mediaStream)

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
        videoRef.current.onloadedmetadata = () => {
          setIsReady(true)
          setupOverlayCanvas()
        }
      }
    } catch (err: any) {
      console.error('EvalBee Camera Error:', err)
      setError('Kameraga kirish imkoni yo\'q. Brauzer sozlamalarini tekshiring.')
    }
  }

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
    setIsReady(false)
  }

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

  // EvalBee Core: Fast Analysis (grayscale + basic checks only)
  const performLightweightAnalysis = (imageData: ImageData) => {
    const { data, width, height } = imageData
    
    // Convert to grayscale (lightweight)
    const grayscale = new Array(width * height)
    for (let i = 0; i < data.length; i += 4) {
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
      grayscale[i / 4] = gray
    }
    
    // 1. Fast Focus Check (Laplacian variance - simplified)
    const focus = calculateFastFocus(grayscale, width, height)
    
    // 2. Fast Brightness Check
    const brightness = calculateFastBrightness(grayscale)
    
    // 3. Fast Alignment Check
    const alignment = detectPaperAlignment(grayscale, width, height)
    
    // 4. Overall Quality (EvalBee method)
    const overall = (focus * 0.4 + brightness * 0.3 + alignment.alignment * 0.3)
    
    // Update states
    setQualityMetrics({
      focus,
      brightness,
      contrast: alignment.alignment, // Using alignment as contrast proxy
      skew: 1 - alignment.alignment,
      overall,
      issues: generateIssues(focus, brightness, alignment),
      recommendations: generateRecommendations(focus, brightness, alignment)
    })
    
    setAlignmentStatus(alignment)
    
    // EvalBee Logic: Strict requirements for capture based on 4 corner markers
    const detectedMarkers = alignment.corners.filter(c => c.detected).length
    const canCaptureNow = (
      focus >= 0.7 &&           // Good focus required
      brightness >= 0.3 &&      // Adequate lighting
      brightness <= 0.8 &&      
      alignment.paperDetected && // Paper must be detected
      detectedMarkers >= 3 &&    // At least 3 out of 4 corners detected
      alignment.alignment >= 0.75 // Good alignment required (75%+ corners)
    )
    
    setCanCapture(canCaptureNow)
    
    // EvalBee Feature: Auto-scan when conditions are perfect
    if (canCaptureNow && overall >= 0.9) {
      if (autoScanCountdown === 0) {
        setAutoScanCountdown(3) // 3 second countdown
        setTimeout(() => {
          if (canCapture && overall >= 0.9) {
            captureImage()
          }
          setAutoScanCountdown(0)
        }, 3000)
      }
    } else {
      setAutoScanCountdown(0)
    }
    
    // Draw simple guide overlay
    drawSimpleGuide(alignment)
    
    // Update preview canvas
    updatePreview()
  }

  // Fast focus calculation (simplified Laplacian)
  const calculateFastFocus = (grayscale: number[], width: number, height: number): number => {
    let variance = 0
    let count = 0
    
    // Sample every 4th pixel for speed
    for (let y = 2; y < height - 2; y += 4) {
      for (let x = 2; x < width - 2; x += 4) {
        const idx = y * width + x
        const laplacian = 
          -grayscale[idx - width] - grayscale[idx - 1] + 4 * grayscale[idx] - grayscale[idx + 1] - grayscale[idx + width]
        
        variance += laplacian * laplacian
        count++
      }
    }
    
    return Math.min(1, (variance / count) / 500)
  }

  // Fast brightness calculation
  const calculateFastBrightness = (grayscale: number[]): number => {
    // Sample every 10th pixel for speed
    let sum = 0
    let count = 0
    
    for (let i = 0; i < grayscale.length; i += 10) {
      sum += grayscale[i]
      count++
    }
    
    return (sum / count) / 255
  }

  // EvalBee Core: Paper alignment detection with 4 corner markers
  const detectPaperAlignment = (grayscale: number[], width: number, height: number): AlignmentStatus => {
    // Define 4 corner marker positions
    const markerSize = 30
    const margin = 80 // Distance from edges
    
    const cornerMarkers = [
      { x: margin, y: margin, name: 'TL', detected: false }, // Top-left
      { x: width - margin, y: margin, name: 'TR', detected: false }, // Top-right
      { x: margin, y: height - margin, name: 'BL', detected: false }, // Bottom-left
      { x: width - margin, y: height - margin, name: 'BR', detected: false } // Bottom-right
    ]
    
    // Detect dark rectangular markers in corners
    let detectedMarkers = 0
    
    cornerMarkers.forEach(marker => {
      let darkPixels = 0
      let totalPixels = 0
      
      for (let dy = -markerSize/2; dy <= markerSize/2; dy++) {
        for (let dx = -markerSize/2; dx <= markerSize/2; dx++) {
          const x = Math.floor(marker.x + dx)
          const y = Math.floor(marker.y + dy)
          
          if (x >= 0 && x < width && y >= 0 && y < height) {
            const idx = y * width + x
            const pixel = grayscale[idx]
            
            if (pixel < 100) darkPixels++ // Dark threshold
            totalPixels++
          }
        }
      }
      
      const darkRatio = totalPixels > 0 ? darkPixels / totalPixels : 0
      if (darkRatio > 0.6) { // 60% dark pixels = marker detected
        marker.detected = true
        detectedMarkers++
      }
    })
    
    // Calculate alignment quality
    const markerDetectionRatio = detectedMarkers / 4
    const paperDetected = detectedMarkers >= 3 // At least 3 out of 4 corners
    const withinFrame = true
    const alignment = markerDetectionRatio
    
    // Store marker positions for overlay
    const corners = cornerMarkers.map(m => ({ x: m.x, y: m.y, detected: m.detected, name: m.name }))
    
    return {
      paperDetected,
      withinFrame,
      alignment,
      corners
    }
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

  // Simple guide overlay - shows paper frame and basic alignment
  const drawSimpleGuide = (alignment: AlignmentStatus) => {
    if (!overlayCanvasRef.current) return
    
    const canvas = overlayCanvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    // Simple paper frame guide
    const margin = 0.15
    const frameX = canvas.width * margin
    const frameY = canvas.height * margin
    const frameWidth = canvas.width * (1 - 2 * margin)
    const frameHeight = canvas.height * (1 - 2 * margin)
    
    // Frame color based on paper detection
    const frameColor = alignment.paperDetected ? '#10B981' : '#FFFFFF'
    const frameOpacity = alignment.paperDetected ? 0.8 : 0.5
    
    // Draw main guide frame
    ctx.strokeStyle = frameColor
    ctx.globalAlpha = frameOpacity
    ctx.lineWidth = 3
    ctx.setLineDash([20, 10])
    ctx.strokeRect(frameX, frameY, frameWidth, frameHeight)
    
    // Draw corner guides (small L-shapes in corners)
    ctx.setLineDash([])
    ctx.lineWidth = 4
    const cornerSize = 40
    
    // Top-left corner
    ctx.beginPath()
    ctx.moveTo(frameX, frameY + cornerSize)
    ctx.lineTo(frameX, frameY)
    ctx.lineTo(frameX + cornerSize, frameY)
    ctx.stroke()
    
    // Top-right corner
    ctx.beginPath()
    ctx.moveTo(frameX + frameWidth - cornerSize, frameY)
    ctx.lineTo(frameX + frameWidth, frameY)
    ctx.lineTo(frameX + frameWidth, frameY + cornerSize)
    ctx.stroke()
    
    // Bottom-left corner
    ctx.beginPath()
    ctx.moveTo(frameX, frameY + frameHeight - cornerSize)
    ctx.lineTo(frameX, frameY + frameHeight)
    ctx.lineTo(frameX + cornerSize, frameY + frameHeight)
    ctx.stroke()
    
    // Bottom-right corner
    ctx.beginPath()
    ctx.moveTo(frameX + frameWidth - cornerSize, frameY + frameHeight)
    ctx.lineTo(frameX + frameWidth, frameY + frameHeight)
    ctx.lineTo(frameX + frameWidth, frameY + frameHeight - cornerSize)
    ctx.stroke()
    
    ctx.globalAlpha = 1.0
    
    // Simple center instruction (only when no paper detected)
    if (!alignment.paperDetected) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
      ctx.fillRect(canvas.width/2 - 120, canvas.height/2 - 30, 240, 60)
      
      ctx.fillStyle = 'white'
      ctx.font = 'bold 16px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('OMR varaqni ramkaga', canvas.width/2, canvas.height/2 - 5)
      ctx.fillText('joylashtiring', canvas.width/2, canvas.height/2 + 20)
    }
    
    // Show capture preview area (what will be captured)
    if (alignment.paperDetected) {
      // Draw capture area outline
      ctx.strokeStyle = '#FFD700' // Gold color for capture area
      ctx.globalAlpha = 0.9
      ctx.lineWidth = 2
      ctx.setLineDash([10, 5])
      
      // Slightly smaller area than guide frame (actual capture area)
      const captureMargin = 0.18
      const captureX = canvas.width * captureMargin
      const captureY = canvas.height * captureMargin
      const captureWidth = canvas.width * (1 - 2 * captureMargin)
      const captureHeight = canvas.height * (1 - 2 * captureMargin)
      
      ctx.strokeRect(captureX, captureY, captureWidth, captureHeight)
      
      // Add "CAPTURE AREA" label
      ctx.fillStyle = 'rgba(255, 215, 0, 0.9)'
      ctx.fillRect(captureX + 10, captureY + 10, 120, 25)
      
      ctx.fillStyle = 'black'
      ctx.font = 'bold 12px sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText('CAPTURE AREA', captureX + 15, captureY + 27)
      
      ctx.globalAlpha = 1.0
      ctx.setLineDash([])
    }
  }

  // Update preview canvas to show what will be captured
  const updatePreview = () => {
    if (!previewCanvasRef.current || !videoRef.current || !alignmentStatus.paperDetected) return
    
    const previewCanvas = previewCanvasRef.current
    const previewCtx = previewCanvas.getContext('2d')
    const video = videoRef.current
    
    if (!previewCtx) return
    
    // Clear preview
    previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height)
    
    // Calculate capture area (same as overlay)
    const captureMargin = 0.18
    const sourceX = video.videoWidth * captureMargin
    const sourceY = video.videoHeight * captureMargin
    const sourceWidth = video.videoWidth * (1 - 2 * captureMargin)
    const sourceHeight = video.videoHeight * (1 - 2 * captureMargin)
    
    // Draw cropped video frame to preview canvas
    previewCtx.drawImage(
      video,
      sourceX, sourceY, sourceWidth, sourceHeight, // Source area
      0, 0, previewCanvas.width, previewCanvas.height // Destination area
    )
    
    // Add preview border
    previewCtx.strokeStyle = '#FFD700'
    previewCtx.lineWidth = 2
    previewCtx.strokeRect(0, 0, previewCanvas.width, previewCanvas.height)
  }

  const captureImage = async () => {
    if (!videoRef.current || !canvasRef.current || !isReady || !canCapture) return

    // EvalBee Method: Stop video stream during processing
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')

    if (!context) return

    // Capture high-quality frame
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    // Get image data
    const finalImageData = canvas.toDataURL('image/jpeg', 0.95)
    
    // Call parent callback
    onCapture(finalImageData, qualityMetrics)
  }

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Camera View */}
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
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            
            {/* Simple Guide Overlay */}
            <canvas
              ref={overlayCanvasRef}
              className="absolute inset-0 w-full h-full pointer-events-none"
            />
            
            {/* Real-time Preview - shows what will be captured */}
            {alignmentStatus.paperDetected && (
              <div className="absolute top-4 left-4 bg-black/90 rounded-lg p-2 border-2 border-yellow-400">
                <div className="text-yellow-400 text-xs font-bold mb-1 text-center">
                  PREVIEW
                </div>
                <canvas
                  ref={previewCanvasRef}
                  className="rounded border border-yellow-400"
                  width={200}
                  height={150}
                />
                <div className="text-white text-xs text-center mt-1">
                  Suratga olinadi
                </div>
              </div>
            )}
            
            {/* Close button - top right */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors z-10"
            >
              <X size={24} />
            </button>
          </>
        )}
      </div>

      {/* Simple Status Text - Bottom */}
      <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/90 to-transparent">
        <div className="text-center">
          {!alignmentStatus.paperDetected ? (
            <p className="text-red-400 text-lg font-medium">📄 OMR varaqni joylashtiring</p>
          ) : alignmentStatus.corners.filter(c => c.detected).length < 3 ? (
            <p className="text-yellow-400 text-lg font-medium">🎯 Qog'ozni to'g'ri joylashtiring</p>
          ) : !canCapture ? (
            <p className="text-yellow-400 text-lg font-medium">⚡ Sifatni yaxshilang</p>
          ) : qualityMetrics.overall >= 0.9 ? (
            <p className="text-green-400 text-lg font-medium">✨ Suratga olishga tayyor</p>
          ) : (
            <p className="text-blue-400 text-lg font-medium">📸 Suratga olish mumkin</p>
          )}
        </div>
        
        {/* Simple Capture Button */}
        <div className="flex justify-center mt-4">
          <button
            onClick={captureImage}
            disabled={!isReady || isProcessing || !canCapture}
            className={`p-4 rounded-full text-white transition-all duration-300 ${
              canCapture && qualityMetrics.overall >= 0.9
                ? 'bg-green-500 hover:bg-green-600 scale-110' 
                : canCapture
                  ? 'bg-blue-500 hover:bg-blue-600'
                  : 'bg-gray-600 cursor-not-allowed opacity-50'
            }`}
          >
            {isProcessing ? (
              <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Camera size={32} />
            )}
          </button>
        </div>
      </div>

      {/* Hidden canvas for processing */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}

export default EvalBeeCameraScanner