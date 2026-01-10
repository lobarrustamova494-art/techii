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

  // SODDA DETECTION: Faqat varaq borligini tekshirish
  const performLightweightAnalysis = useCallback((imageData: ImageData) => {
    const { data, width, height } = imageData
    
    if (isProcessing || !isReady) return
    
    // Juda sodda: faqat focus tekshiramiz
    const sampleRate = 25 // Katta sampling - tez
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
    
    // Faqat focus
    const focus = calculateLaplacianVariance(grayscale, sampledWidth, sampledHeight)
    
    // Sodda varaq detection - ramka ichida oq pixel bor-yo'q
    const frameLeft = Math.floor(sampledWidth * 0.15)
    const frameRight = Math.floor(sampledWidth * 0.85)
    const frameTop = Math.floor(sampledHeight * 0.2)
    const frameBottom = Math.floor(sampledHeight * 0.8)
    
    let whitePixels = 0
    let totalPixels = 0
    
    for (let y = frameTop; y < frameBottom; y += 5) {
      for (let x = frameLeft; x < frameRight; x += 5) {
        const idx = y * sampledWidth + x
        if (idx < grayscale.length) {
          const pixel = grayscale[idx]
          if (pixel > 150) whitePixels++ // Oq pixel (varaq)
          totalPixels++
        }
      }
    }
    
    const paperRatio = totalPixels > 0 ? whitePixels / totalPixels : 0
    const paperDetected = paperRatio > 0.3 // 30% oq pixel bo'lsa varaq bor
    
    // Sodda logic
    const focusGood = focus >= 0.25 // Juda past threshold
    const canCaptureNow = focusGood && paperDetected
    
    setQualityMetrics({
      focus,
      brightness: 0.5,
      contrast: paperRatio,
      skew: 0,
      overall: canCaptureNow ? 1 : 0,
      issues: [],
      recommendations: []
    })
    
    setAlignmentStatus({
      paperDetected,
      withinFrame: true,
      alignment: paperRatio,
      corners: [
        { x: 0, y: 0, detected: paperDetected, name: 'TL' },
        { x: 0, y: 0, detected: paperDetected, name: 'TR' },
        { x: 0, y: 0, detected: paperDetected, name: 'BL' },
        { x: 0, y: 0, detected: paperDetected, name: 'BR' }
      ]
    })
    
    setCanCapture(canCaptureNow)
    
    // Instant capture
    if (canCaptureNow && autoScanCountdown === 0) {
      setAutoScanCountdown(1)
      setTimeout(() => {
        if (canCapture && !isProcessing) {
          captureImage()
        }
        setAutoScanCountdown(0)
      }, 100)
    }
  }, [isProcessing, isReady, canCapture, autoScanCountdown])

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
    
    // Capture SINGLE frame - TO'G'RI HOLAT (mirror yo'q)
    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    console.log('🖼️ SINGLE frame captured - to\'g\'ri holatda')

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
            {/* Video Element - Full Screen - TO'G'RI HOLAT */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover"
              style={{ 
                // Mirror effect olib tashlandi - to'g'ri holat
                backgroundColor: '#000'
              }}
            />
            
            {/* Overlay Canvas for Guides - TO'G'RI HOLAT */}
            <canvas
              ref={overlayCanvasRef}
              className="absolute inset-0 w-full h-full pointer-events-none z-10"
              // Mirror effect olib tashlandi - to'g'ri holat
            />
            
            {/* SODDA RAMKA: Faqat zarur narsalar */}
            <div className="absolute inset-0 z-15 pointer-events-none">
              
              {/* Tashqi hudud qoralashtirish */}
              <div className="absolute inset-0 bg-black/50"></div>
              
              {/* Markazda oddiy to'rtburchak */}
              <div 
                className="absolute bg-transparent border-2 border-white rounded-lg"
                style={{
                  left: '15%',
                  top: '20%', 
                  width: '70%',
                  height: '60%',
                  boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)'
                }}
              >
                {/* Faqat 4 ta burchak belgisi */}
                <div className="absolute -top-1 -left-1 w-6 h-6 border-l-3 border-t-3 border-white"></div>
                <div className="absolute -top-1 -right-1 w-6 h-6 border-r-3 border-t-3 border-white"></div>
                <div className="absolute -bottom-1 -left-1 w-6 h-6 border-l-3 border-b-3 border-white"></div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 border-r-3 border-b-3 border-white"></div>
              </div>
              
              {/* Oddiy status */}
              <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2">
                <div className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  canCapture
                    ? 'bg-green-500 text-white' 
                    : 'bg-red-500 text-white'
                }`}>
                  {canCapture ? '✅ TAYYOR' : '📄 RAMKAGA QO\'YING'}
                </div>
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
                  // Mirror effect olib tashlandi - to'g'ri holat
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
            
            {/* Sodda Status */}
            <div className="absolute top-16 left-1/2 transform -translate-x-1/2 z-20">
              <div className={`px-4 py-2 rounded-lg text-sm font-medium ${
                canCapture
                  ? 'bg-green-500 text-white' 
                  : 'bg-red-500 text-white'
              }`}>
                {canCapture ? '✅ TAYYOR' : '📄 VARAQNI RAMKAGA QO\'YING'}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/80 to-transparent p-6 z-20">
        {/* Sodda Status Text */}
        <div className="text-center mb-6">
          {!canCapture ? (
            <div className="space-y-2">
              <p className="text-red-400 text-lg font-medium">📄 Varaqni ramkaga qo'ying</p>
              <p className="text-white/70 text-sm">Tiniq rasm uchun</p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-green-400 text-lg font-medium">✅ TAYYOR - Avtomatik rasm olinadi</p>
              <p className="text-green-300 text-sm">Tiniq va ramka ichida</p>
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

        {/* Sodda Stats */}
        {alignmentStatus.paperDetected && (
          <div className="flex justify-center gap-6 mt-4 text-xs text-white/60">
            <div className="text-center">
              <div className="text-white font-medium">{qualityMetrics.focus >= 0.25 ? '✓' : '○'}</div>
              <div>Focus</div>
            </div>
            <div className="text-center">
              <div className="text-white font-medium">{alignmentStatus.paperDetected ? '✓' : '○'}</div>
              <div>Varaq</div>
            </div>
            <div className="text-center">
              <div className="text-white font-medium">{canCapture ? 'TAYYOR' : 'KUTISH'}</div>
              <div>Holat</div>
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