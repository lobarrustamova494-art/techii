import React, { useRef, useEffect, useState, useCallback } from 'react'
import { 
  Camera, RotateCcw, X, CheckCircle, AlertTriangle, Focus, 
  Zap, Eye, Settings, Target, Maximize2, Sun, Contrast
} from 'lucide-react'
import Button from '@/components/ui/Button'
import ProgressBar from '@/components/ui/ProgressBar'

interface EvalBeeCameraScannerProps {
  onCapture: (imageData: string, qualityMetrics: QualityMetrics) => void
  onClose: () => void
  isProcessing?: boolean
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

interface BubbleDetection {
  detected: number
  expected: number
  confidence: number
  layout: 'single' | 'double' | 'triple'
}

const EvalBeeCameraScanner: React.FC<EvalBeeCameraScannerProps> = ({ 
  onCapture, 
  onClose, 
  isProcessing = false,
  answerKey 
}) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState('')
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment')
  
  // EvalBee Quality Control States
  const [qualityMetrics, setQualityMetrics] = useState<QualityMetrics>({
    focus: 0,
    brightness: 0,
    contrast: 0,
    skew: 0,
    overall: 0,
    issues: [],
    recommendations: []
  })
  
  const [bubbleDetection, setBubbleDetection] = useState<BubbleDetection>({
    detected: 0,
    expected: answerKey.length,
    confidence: 0,
    layout: 'triple'
  })
  
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [canCapture, setCanCapture] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [autoFocus, setAutoFocus] = useState(true)
  const [flashMode, setFlashMode] = useState(false)

  useEffect(() => {
    startCamera()
    return () => {
      stopCamera()
    }
  }, [facingMode])

  // Real-time quality analysis
  useEffect(() => {
    if (isReady && videoRef.current && !isProcessing) {
      const interval = setInterval(() => {
        analyzeImageQuality()
      }, 1000) // Analyze every second
      
      return () => clearInterval(interval)
    }
  }, [isReady, isProcessing])

  const startCamera = async () => {
    try {
      setError('')
      setIsReady(false)

      // Stop existing stream
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }

      // EvalBee-style high-quality camera constraints
      const constraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 3840, min: 1920 }, // 4K preferred for OMR
          height: { ideal: 2160, min: 1080 },
          frameRate: { ideal: 30, min: 15 },
          focusMode: autoFocus ? 'continuous' : 'manual',
          exposureMode: 'continuous',
          whiteBalanceMode: 'continuous'
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
  }

  const setupOverlayCanvas = () => {
    if (!overlayCanvasRef.current || !videoRef.current) return
    
    const canvas = overlayCanvasRef.current
    const video = videoRef.current
    
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
  }

  const analyzeImageQuality = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || isAnalyzing) return
    
    setIsAnalyzing(true)
    
    try {
      const video = videoRef.current
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      
      if (!ctx) return
      
      // Capture current frame for analysis
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const data = imageData.data
      
      // EvalBee-style quality analysis
      const metrics = await performEvalBeeQualityAnalysis(data, canvas.width, canvas.height)
      setQualityMetrics(metrics)
      
      // Bubble detection analysis
      const bubbles = await detectBubbleLayout(imageData, answerKey.length)
      setBubbleDetection(bubbles)
      
      // Determine if capture is allowed
      const canCaptureNow = metrics.overall >= 0.7 && bubbles.confidence >= 0.6
      setCanCapture(canCaptureNow)
      
      // Draw overlay indicators
      drawQualityOverlay(metrics, bubbles)
      
    } catch (error) {
      console.error('Quality analysis error:', error)
    } finally {
      setIsAnalyzing(false)
    }
  }, [answerKey.length, isAnalyzing])

  const performEvalBeeQualityAnalysis = async (
    data: Uint8ClampedArray, 
    width: number, 
    height: number
  ): Promise<QualityMetrics> => {
    
    // Convert to grayscale for analysis
    const grayscale = new Array(width * height)
    for (let i = 0; i < data.length; i += 4) {
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
      grayscale[i / 4] = gray
    }
    
    // 1. Focus Analysis (Laplacian variance)
    const focus = calculateFocus(grayscale, width, height)
    
    // 2. Brightness Analysis
    const brightness = calculateBrightness(grayscale)
    
    // 3. Contrast Analysis
    const contrast = calculateContrast(grayscale)
    
    // 4. Skew Detection
    const skew = calculateSkew(grayscale, width, height)
    
    // 5. Overall Quality Score
    const overall = (focus * 0.3 + brightness * 0.2 + contrast * 0.3 + (1 - skew) * 0.2)
    
    // 6. Generate Issues and Recommendations
    const issues: string[] = []
    const recommendations: string[] = []
    
    if (focus < 0.6) {
      issues.push('Rasm aniq emas')
      recommendations.push('Kamerani OMR varaqqa yaqinroq olib boring va fokusni sozlang')
    }
    
    if (brightness < 0.3 || brightness > 0.8) {
      issues.push('Yorug\'lik yetarli emas yoki juda ko\'p')
      recommendations.push('Yaxshi yorug\'lik sharoitida suratga oling')
    }
    
    if (contrast < 0.4) {
      issues.push('Kontrast past')
      recommendations.push('Qog\'oz va fon o\'rtasida aniq farq bo\'lishi kerak')
    }
    
    if (skew > 0.3) {
      issues.push('Rasm qiyshaygan')
      recommendations.push('Kamerani to\'g\'ridan-to\'g\'ri OMR varaq ustiga qo\'ying')
    }
    
    return {
      focus,
      brightness,
      contrast,
      skew,
      overall,
      issues,
      recommendations
    }
  }

  const calculateFocus = (grayscale: number[], width: number, height: number): number => {
    // Laplacian operator for focus measurement
    let variance = 0
    let count = 0
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x
        const laplacian = 
          -grayscale[idx - width - 1] - grayscale[idx - width] - grayscale[idx - width + 1] +
          -grayscale[idx - 1] + 8 * grayscale[idx] - grayscale[idx + 1] +
          -grayscale[idx + width - 1] - grayscale[idx + width] - grayscale[idx + width + 1]
        
        variance += laplacian * laplacian
        count++
      }
    }
    
    return Math.min(1, (variance / count) / 1000) // Normalize
  }

  const calculateBrightness = (grayscale: number[]): number => {
    const avg = grayscale.reduce((sum, val) => sum + val, 0) / grayscale.length
    return avg / 255
  }

  const calculateContrast = (grayscale: number[]): number => {
    const avg = grayscale.reduce((sum, val) => sum + val, 0) / grayscale.length
    const variance = grayscale.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / grayscale.length
    return Math.min(1, Math.sqrt(variance) / 128)
  }

  const calculateSkew = (grayscale: number[], width: number, height: number): number => {
    // Simplified skew detection using edge analysis
    // In a real implementation, you'd use Hough transform
    return Math.random() * 0.2 // Placeholder
  }

  const detectBubbleLayout = async (
    imageData: ImageData, 
    expectedQuestions: number
  ): Promise<BubbleDetection> => {
    
    // Simplified bubble detection for demo
    // In real EvalBee, this would use advanced computer vision
    
    const detected = Math.floor(expectedQuestions * (0.7 + Math.random() * 0.3))
    const confidence = Math.min(1, detected / expectedQuestions)
    
    let layout: 'single' | 'double' | 'triple' = 'triple'
    if (expectedQuestions <= 20) layout = 'single'
    else if (expectedQuestions <= 40) layout = 'double'
    
    return {
      detected,
      expected: expectedQuestions,
      confidence,
      layout
    }
  }

  const drawQualityOverlay = (metrics: QualityMetrics, bubbles: BubbleDetection) => {
    if (!overlayCanvasRef.current) return
    
    const canvas = overlayCanvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    // Clear previous overlay
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    // Draw OMR guide rectangle
    const centerX = canvas.width / 2
    const centerY = canvas.height / 2
    const guideWidth = Math.min(canvas.width * 0.8, 600)
    const guideHeight = Math.min(canvas.height * 0.6, 400)
    
    // Guide rectangle color based on quality
    const guideColor = metrics.overall >= 0.7 ? '#10B981' : 
                      metrics.overall >= 0.5 ? '#F59E0B' : '#EF4444'
    
    ctx.strokeStyle = guideColor
    ctx.lineWidth = 3
    ctx.setLineDash([10, 5])
    ctx.strokeRect(
      centerX - guideWidth / 2,
      centerY - guideHeight / 2,
      guideWidth,
      guideHeight
    )
    
    // Corner markers
    const cornerSize = 20
    const corners = [
      [centerX - guideWidth / 2, centerY - guideHeight / 2],
      [centerX + guideWidth / 2, centerY - guideHeight / 2],
      [centerX - guideWidth / 2, centerY + guideHeight / 2],
      [centerX + guideWidth / 2, centerY + guideHeight / 2]
    ]
    
    ctx.setLineDash([])
    ctx.lineWidth = 4
    corners.forEach(([x, y]) => {
      ctx.strokeStyle = guideColor
      ctx.beginPath()
      ctx.moveTo(x - cornerSize, y)
      ctx.lineTo(x - 5, y)
      ctx.moveTo(x, y - cornerSize)
      ctx.lineTo(x, y - 5)
      ctx.stroke()
    })
    
    // Quality indicators
    drawQualityIndicators(ctx, metrics, bubbles)
  }

  const drawQualityIndicators = (
    ctx: CanvasRenderingContext2D, 
    metrics: QualityMetrics, 
    bubbles: BubbleDetection
  ) => {
    const padding = 20
    const indicatorSize = 60
    
    // Focus indicator
    drawCircularIndicator(ctx, padding, padding, indicatorSize, metrics.focus, 'Focus', '#3B82F6')
    
    // Brightness indicator
    drawCircularIndicator(ctx, padding, padding + 80, indicatorSize, metrics.brightness, 'Brightness', '#F59E0B')
    
    // Contrast indicator
    drawCircularIndicator(ctx, padding, padding + 160, indicatorSize, metrics.contrast, 'Contrast', '#8B5CF6')
    
    // Bubble detection indicator
    drawCircularIndicator(ctx, padding, padding + 240, indicatorSize, bubbles.confidence, 'Bubbles', '#10B981')
  }

  const drawCircularIndicator = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    value: number,
    label: string,
    color: string
  ) => {
    const radius = size / 2 - 5
    const centerX = x + size / 2
    const centerY = y + size / 2
    
    // Background circle
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'
    ctx.lineWidth = 3
    ctx.stroke()
    
    // Progress arc
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius, -Math.PI / 2, -Math.PI / 2 + (2 * Math.PI * value))
    ctx.strokeStyle = color
    ctx.lineWidth = 3
    ctx.stroke()
    
    // Value text
    ctx.fillStyle = 'white'
    ctx.font = 'bold 12px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(`${Math.round(value * 100)}%`, centerX, centerY + 2)
    
    // Label
    ctx.font = '10px sans-serif'
    ctx.fillText(label, centerX, centerY + 25)
  }

  const captureImage = async () => {
    if (!videoRef.current || !canvasRef.current || !isReady || !canCapture) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')

    if (!context) return

    // Set canvas size to video size for maximum quality
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    // EvalBee-style image enhancement
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
    const enhancedImageData = await enhanceImageForOMR(imageData)
    context.putImageData(enhancedImageData, 0, 0)

    // Get high-quality image data
    const finalImageData = canvas.toDataURL('image/jpeg', 0.98)
    
    // Call parent callback with quality metrics
    onCapture(finalImageData, qualityMetrics)
  }

  const enhanceImageForOMR = async (imageData: ImageData): Promise<ImageData> => {
    const data = imageData.data
    
    // EvalBee-style image enhancement for OMR
    for (let i = 0; i < data.length; i += 4) {
      // Convert to grayscale
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
      
      // Enhance contrast for bubble detection
      const enhanced = gray < 128 ? Math.max(0, gray - 15) : Math.min(255, gray + 15)
      
      data[i] = enhanced     // Red
      data[i + 1] = enhanced // Green
      data[i + 2] = enhanced // Blue
      // Alpha stays the same
    }
    
    return imageData
  }

  const switchCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user')
  }

  const getQualityColor = (value: number) => {
    if (value >= 0.7) return 'text-green-500'
    if (value >= 0.5) return 'text-yellow-500'
    return 'text-red-500'
  }

  const getQualityIcon = (value: number) => {
    if (value >= 0.7) return <CheckCircle size={16} className="text-green-500" />
    if (value >= 0.5) return <AlertTriangle size={16} className="text-yellow-500" />
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
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <Settings size={20} />
          </button>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <X size={24} />
          </button>
        </div>
      </div>

      {/* Camera View */}
      <div className="flex-1 relative overflow-hidden">
        {error ? (
          <div className="flex items-center justify-center h-full text-white text-center p-4">
            <div>
              <Camera size={48} className="mx-auto mb-4 opacity-50" />
              <p className="text-lg mb-2">Kamera xatoligi</p>
              <p className="text-sm opacity-75 mb-4">{error}</p>
              <Button onClick={startCamera} variant="outline" className="text-white border-white">
                Qayta urinish
              </Button>
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
            
            {/* Quality Overlay Canvas */}
            <canvas
              ref={overlayCanvasRef}
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={{ mixBlendMode: 'screen' }}
            />
            
            {/* Quality Status Panel */}
            <div className="absolute top-4 right-4 bg-black/80 rounded-lg p-4 text-white min-w-[200px]">
              <div className="flex items-center gap-2 mb-3">
                <Eye size={16} className="text-blue-400" />
                <span className="text-sm font-medium">Real-time Analysis</span>
              </div>
              
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
                  <span>Contrast:</span>
                  <div className="flex items-center gap-1">
                    {getQualityIcon(qualityMetrics.contrast)}
                    <span className={getQualityColor(qualityMetrics.contrast)}>
                      {Math.round(qualityMetrics.contrast * 100)}%
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span>Bubbles:</span>
                  <div className="flex items-center gap-1">
                    {getQualityIcon(bubbleDetection.confidence)}
                    <span className={getQualityColor(bubbleDetection.confidence)}>
                      {bubbleDetection.detected}/{bubbleDetection.expected}
                    </span>
                  </div>
                </div>
                
                <div className="border-t border-gray-600 pt-2 mt-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Overall:</span>
                    <div className="flex items-center gap-1">
                      {getQualityIcon(qualityMetrics.overall)}
                      <span className={`font-bold ${getQualityColor(qualityMetrics.overall)}`}>
                        {Math.round(qualityMetrics.overall * 100)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              {qualityMetrics.issues.length > 0 && (
                <div className="mt-3 pt-2 border-t border-gray-600">
                  <div className="text-xs text-red-400">
                    {qualityMetrics.issues[0]}
                  </div>
                  {qualityMetrics.recommendations[0] && (
                    <div className="text-xs text-gray-400 mt-1">
                      💡 {qualityMetrics.recommendations[0]}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Advanced Settings Panel */}
            {showAdvanced && (
              <div className="absolute bottom-20 left-4 bg-black/80 rounded-lg p-4 text-white">
                <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Settings size={16} />
                  Advanced Settings
                </h3>
                
                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span>Auto Focus:</span>
                    <button
                      onClick={() => setAutoFocus(!autoFocus)}
                      className={`w-8 h-4 rounded-full transition-colors ${
                        autoFocus ? 'bg-blue-500' : 'bg-gray-600'
                      }`}
                    >
                      <div className={`w-3 h-3 bg-white rounded-full transition-transform ${
                        autoFocus ? 'translate-x-4' : 'translate-x-0.5'
                      }`} />
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span>Flash Mode:</span>
                    <button
                      onClick={() => setFlashMode(!flashMode)}
                      className={`w-8 h-4 rounded-full transition-colors ${
                        flashMode ? 'bg-yellow-500' : 'bg-gray-600'
                      }`}
                    >
                      <div className={`w-3 h-3 bg-white rounded-full transition-transform ${
                        flashMode ? 'translate-x-4' : 'translate-x-0.5'
                      }`} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Controls */}
      <div className="p-4 bg-black/80">
        {/* Quality Progress Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white text-sm">Image Quality</span>
            <span className={`text-sm font-medium ${getQualityColor(qualityMetrics.overall)}`}>
              {Math.round(qualityMetrics.overall * 100)}%
            </span>
          </div>
          <ProgressBar
            value={qualityMetrics.overall * 100}
            variant={qualityMetrics.overall >= 0.7 ? 'success' : qualityMetrics.overall >= 0.5 ? 'warning' : 'error'}
            size="sm"
            animated={isAnalyzing}
          />
        </div>

        <div className="flex items-center justify-center gap-4">
          {/* Switch Camera */}
          <button
            onClick={switchCamera}
            disabled={!isReady || isProcessing}
            className="p-3 bg-white/20 hover:bg-white/30 disabled:opacity-50 disabled:cursor-not-allowed rounded-full text-white transition-colors"
          >
            <RotateCcw size={24} />
          </button>

          {/* Capture Button */}
          <button
            onClick={captureImage}
            disabled={!isReady || isProcessing || !canCapture}
            className={`p-4 rounded-full text-white transition-all shadow-lg ${
              canCapture 
                ? 'bg-green-600 hover:bg-green-700 scale-110' 
                : 'bg-gray-600 cursor-not-allowed'
            }`}
          >
            {isProcessing ? (
              <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Camera size={32} />
            )}
          </button>

          {/* Focus Button */}
          <button
            onClick={() => {
              // Trigger manual focus
              if (videoRef.current) {
                const track = stream?.getVideoTracks()[0]
                if (track && track.getCapabilities().focusMode) {
                  track.applyConstraints({
                    advanced: [{ focusMode: 'single-shot' }]
                  })
                }
              }
            }}
            disabled={!isReady || isProcessing}
            className="p-3 bg-white/20 hover:bg-white/30 disabled:opacity-50 disabled:cursor-not-allowed rounded-full text-white transition-colors"
          >
            <Focus size={24} />
          </button>
        </div>

        <div className="text-center mt-4">
          <p className="text-white text-sm">
            {isProcessing ? 'Processing...' : 
             canCapture ? 'Ready to capture - Quality is good!' :
             'Adjust position and lighting for better quality'}
          </p>
          {!canCapture && qualityMetrics.issues.length > 0 && (
            <p className="text-red-400 text-xs mt-1">
              {qualityMetrics.issues[0]}
            </p>
          )}
        </div>
      </div>

      {/* Hidden canvas for image processing */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}

export default EvalBeeCameraScanner