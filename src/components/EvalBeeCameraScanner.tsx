import React, { useRef, useEffect, useState } from 'react'
import { 
  Camera, RotateCcw, X, CheckCircle, AlertTriangle, 
  Eye, Target
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
  isProcessing,
  answerKey
}) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null)
  const animationFrameRef = useRef<number>()
  
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState('')
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment')
  
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
    
    // Draw overlay
    drawEvalBeeOverlay(alignment, focus, brightness)
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

  // EvalBee Overlay: Simple 4-corner alignment markers
  const drawEvalBeeOverlay = (alignment: AlignmentStatus, _focus: number, _brightness: number) => {
    if (!overlayCanvasRef.current) return
    
    const canvas = overlayCanvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    // EvalBee Frame: Main guide rectangle
    const margin = 0.12
    const frameX = canvas.width * margin
    const frameY = canvas.height * margin
    const frameWidth = canvas.width * (1 - 2 * margin)
    const frameHeight = canvas.height * (1 - 2 * margin)
    
    // Frame color based on alignment
    const frameColor = alignment.paperDetected && alignment.alignment >= 0.75 
      ? '#10B981' // Green - good
      : alignment.paperDetected 
        ? '#F59E0B' // Yellow - needs adjustment
        : '#EF4444' // Red - no paper detected
    
    // Draw main frame
    ctx.strokeStyle = frameColor
    ctx.lineWidth = 3
    ctx.setLineDash([15, 8])
    ctx.strokeRect(frameX, frameY, frameWidth, frameHeight)
    
    // Draw 4 Corner Alignment Markers
    const markerSize = 35
    const markerMargin = 80
    
    const cornerPositions = [
      { x: markerMargin, y: markerMargin, name: 'TL' }, // Top-left
      { x: canvas.width - markerMargin, y: markerMargin, name: 'TR' }, // Top-right
      { x: markerMargin, y: canvas.height - markerMargin, name: 'BL' }, // Bottom-left
      { x: canvas.width - markerMargin, y: canvas.height - markerMargin, name: 'BR' } // Bottom-right
    ]
    
    ctx.setLineDash([])
    
    cornerPositions.forEach(pos => {
      // Find corresponding detected marker
      const detectedMarker = alignment.corners.find(corner => 
        Math.abs(corner.x - pos.x) < 50 && Math.abs(corner.y - pos.y) < 50
      )
      
      const isDetected = detectedMarker?.detected || false
      
      // Marker background (always visible - black rectangle)
      ctx.fillStyle = 'rgba(0, 0, 0, 0.9)'
      ctx.fillRect(pos.x - markerSize/2, pos.y - markerSize/2, markerSize, markerSize)
      
      // Marker border color based on detection
      ctx.strokeStyle = isDetected ? '#10B981' : '#EF4444'
      ctx.lineWidth = 4
      ctx.strokeRect(pos.x - markerSize/2, pos.y - markerSize/2, markerSize, markerSize)
      
      // Detection indicator (green dot)
      if (isDetected) {
        ctx.fillStyle = '#10B981'
        ctx.beginPath()
        ctx.arc(pos.x + markerSize/2 - 6, pos.y - markerSize/2 + 6, 5, 0, 2 * Math.PI)
        ctx.fill()
      }
      
      // Marker label
      ctx.fillStyle = 'white'
      ctx.font = 'bold 12px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(pos.name, pos.x, pos.y + 4)
    })
    
    // Center instruction text
    if (!alignment.paperDetected) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.9)'
      ctx.fillRect(canvas.width/2 - 160, canvas.height/2 - 35, 320, 70)
      
      ctx.fillStyle = 'white'
      ctx.font = 'bold 16px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('OMR varaqni 4 ta burchakdagi', canvas.width/2, canvas.height/2 - 10)
      ctx.fillText('qora to\'rtburchaklarga moslashtiring', canvas.width/2, canvas.height/2 + 15)
    } else if (alignment.alignment < 0.75) {
      ctx.fillStyle = 'rgba(255, 193, 7, 0.9)'
      ctx.fillRect(canvas.width/2 - 120, canvas.height/2 - 25, 240, 50)
      
      ctx.fillStyle = 'black'
      ctx.font = 'bold 14px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('Burchak markerlarni aniqroq joylashtiring', canvas.width/2, canvas.height/2 + 5)
    }
    
    // Marker detection status
    const detectedCount = alignment.corners.filter(c => c.detected).length
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'
    ctx.fillRect(canvas.width/2 - 70, 20, 140, 30)
    
    ctx.fillStyle = detectedCount >= 3 ? '#10B981' : '#EF4444'
    ctx.font = 'bold 14px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(`Burchaklar: ${detectedCount}/4`, canvas.width/2, 40)
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

  const switchCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user')
  }

  const getQualityColor = (value: number) => {
    if (value >= 0.8) return 'text-green-500'
    if (value >= 0.6) return 'text-yellow-500'
    return 'text-red-500'
  }

  const getQualityIcon = (value: number) => {
    if (value >= 0.8) return <CheckCircle size={16} className="text-green-500" />
    if (value >= 0.6) return <AlertTriangle size={16} className="text-yellow-500" />
    return <X size={16} className="text-red-500" />
  }

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black/80 text-white">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Target className="w-6 h-6 text-blue-400" />
            <h2 className="text-lg font-semibold">EvalBee OMR Scanner</h2>
          </div>
          <div className="text-sm text-gray-300">
            {answerKey.length} savol
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-white/20 rounded-full transition-colors"
        >
          <X size={24} />
        </button>
      </div>

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
            
            {/* EvalBee Alignment Overlay */}
            <canvas
              ref={overlayCanvasRef}
              className="absolute inset-0 w-full h-full pointer-events-none"
            />
            
            {/* EvalBee Quality Control Panel */}
            <div className="absolute top-4 right-4 bg-black/90 rounded-xl p-4 text-white min-w-[250px] shadow-2xl border border-white/20">
              <div className="flex items-center gap-2 mb-3">
                <Eye size={16} className="text-blue-400" />
                <span className="text-sm font-medium">EvalBee Quality Control</span>
                {qualityMetrics.overall >= 0.9 && (
                  <CheckCircle size={16} className="text-green-400" />
                )}
              </div>
              
              {/* Overall Quality Progress */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium">Overall Quality</span>
                  <span className={`text-sm font-bold ${
                    qualityMetrics.overall >= 0.9 ? 'text-green-400' :
                    qualityMetrics.overall >= 0.7 ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {Math.round(qualityMetrics.overall * 100)}%
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${
                      qualityMetrics.overall >= 0.9 ? 'bg-green-500' :
                      qualityMetrics.overall >= 0.7 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.round(qualityMetrics.overall * 100)}%` }}
                  />
                </div>
              </div>
              
              {/* Detailed Metrics */}
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span>Focus:</span>
                  <div className="flex items-center gap-1">
                    {getQualityIcon(qualityMetrics.focus)}
                    <span className={getQualityColor(qualityMetrics.focus)}>
                      {Math.round(qualityMetrics.focus * 100)}%
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span>Brightness:</span>
                  <div className="flex items-center gap-1">
                    {getQualityIcon(qualityMetrics.brightness)}
                    <span className={getQualityColor(qualityMetrics.brightness)}>
                      {Math.round(qualityMetrics.brightness * 100)}%
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span>Alignment:</span>
                  <div className="flex items-center gap-1">
                    {getQualityIcon(alignmentStatus.alignment)}
                    <span className={getQualityColor(alignmentStatus.alignment)}>
                      {Math.round(alignmentStatus.alignment * 100)}%
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span>Burchaklar:</span>
                  <div className="flex items-center gap-1">
                    {alignmentStatus.corners.filter(c => c.detected).length >= 3 ? 
                      <CheckCircle size={16} className="text-green-500" /> : 
                      alignmentStatus.corners.filter(c => c.detected).length >= 2 ?
                      <AlertTriangle size={16} className="text-yellow-500" /> :
                      <X size={16} className="text-red-500" />
                    }
                    <span className={
                      alignmentStatus.corners.filter(c => c.detected).length >= 3 ? 'text-green-500' :
                      alignmentStatus.corners.filter(c => c.detected).length >= 2 ? 'text-yellow-500' : 'text-red-500'
                    }>
                      {alignmentStatus.corners.filter(c => c.detected).length}/4
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span>Paper:</span>
                  <div className="flex items-center gap-1">
                    {alignmentStatus.paperDetected ? 
                      <CheckCircle size={16} className="text-green-500" /> : 
                      <X size={16} className="text-red-500" />
                    }
                    <span className={alignmentStatus.paperDetected ? 'text-green-500' : 'text-red-500'}>
                      {alignmentStatus.paperDetected ? 'Detected' : 'Not Found'}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Issues and Recommendations */}
              {qualityMetrics.issues.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-600">
                  <div className="text-xs font-medium text-yellow-400 mb-2">
                    📋 Issues:
                  </div>
                  <div className="text-xs text-red-400 mb-2">
                    {qualityMetrics.issues[0]}
                  </div>
                  {qualityMetrics.recommendations[0] && (
                    <div className="text-xs text-gray-300">
                      💡 {qualityMetrics.recommendations[0]}
                    </div>
                  )}
                </div>
              )}
              
              {/* Auto-scan countdown */}
              {autoScanCountdown > 0 && (
                <div className="mt-3 pt-3 border-t border-green-600">
                  <div className="text-xs text-green-400 font-medium flex items-center gap-2">
                    <CheckCircle size={14} />
                    Auto-scan in {autoScanCountdown}s...
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Controls */}
      <div className="p-4 bg-black/80">
        <div className="flex items-center justify-center gap-4">
          {/* Switch Camera */}
          <button
            onClick={switchCamera}
            disabled={!isReady || isProcessing}
            className="p-3 bg-white/20 hover:bg-white/30 disabled:opacity-50 disabled:cursor-not-allowed rounded-full text-white transition-colors"
          >
            <RotateCcw size={24} />
          </button>

          {/* EvalBee Capture Button */}
          <div className="relative">
            <button
              onClick={captureImage}
              disabled={!isReady || isProcessing || !canCapture}
              className={`relative p-6 rounded-full text-white transition-all duration-300 shadow-2xl ${
                canCapture && qualityMetrics.overall >= 0.9
                  ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 scale-125 animate-pulse' 
                  : canCapture
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 scale-110'
                    : 'bg-gray-600 cursor-not-allowed scale-100'
              }`}
            >
              {isProcessing ? (
                <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Camera size={36} />
                  {canCapture && qualityMetrics.overall >= 0.9 && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full flex items-center justify-center">
                      <CheckCircle size={12} className="text-white" />
                    </div>
                  )}
                </>
              )}
            </button>
            
            {/* Quality Status Ring */}
            <div className="absolute inset-0 rounded-full border-4 border-transparent">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="46"
                  fill="none"
                  stroke="rgba(255,255,255,0.2)"
                  strokeWidth="4"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="46"
                  fill="none"
                  stroke={
                    qualityMetrics.overall >= 0.9 ? '#10B981' :
                    qualityMetrics.overall >= 0.7 ? '#F59E0B' : '#EF4444'
                  }
                  strokeWidth="4"
                  strokeDasharray={`${qualityMetrics.overall * 289} 289`}
                  strokeLinecap="round"
                  className="transition-all duration-300"
                />
              </svg>
            </div>
            
            {/* Quality Percentage */}
            <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2">
              <div className={`text-xs font-bold px-2 py-1 rounded-full ${
                qualityMetrics.overall >= 0.9 ? 'bg-green-500 text-white' :
                qualityMetrics.overall >= 0.7 ? 'bg-yellow-500 text-black' : 'bg-red-500 text-white'
              }`}>
                {Math.round(qualityMetrics.overall * 100)}%
              </div>
            </div>
          </div>
        </div>
        
        {/* Status Text */}
        <div className="text-center mt-4">
          {!alignmentStatus.paperDetected ? (
            <p className="text-red-400 text-sm">📄 OMR varaqni 4 ta burchakdagi qora markerlar bilan joylashtiring</p>
          ) : alignmentStatus.corners.filter(c => c.detected).length < 3 ? (
            <p className="text-yellow-400 text-sm">🎯 Burchak markerlarni aniqroq joylashtiring ({alignmentStatus.corners.filter(c => c.detected).length}/4)</p>
          ) : !canCapture ? (
            <p className="text-yellow-400 text-sm">⚡ Sifatni yaxshilang</p>
          ) : qualityMetrics.overall >= 0.9 ? (
            <p className="text-green-400 text-sm">✨ Mukammal! Suratga olishga tayyor</p>
          ) : (
            <p className="text-blue-400 text-sm">📸 Suratga olish mumkin</p>
          )}
        </div>
      </div>

      {/* Hidden canvas for processing */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}

export default EvalBeeCameraScanner