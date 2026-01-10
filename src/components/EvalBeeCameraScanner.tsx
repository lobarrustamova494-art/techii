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

  // EvalBee SUPER SIMPLE: Faqat 2 ta narsa - FOCUS va 4 NUQTA
  const performLightweightAnalysis = useCallback((imageData: ImageData) => {
    const { data, width, height } = imageData
    
    // Skip analysis if processing or not ready
    if (isProcessing || !isReady) return
    
    // SUPER SIMPLE: Faqat focus tekshiramiz (brightness emas!)
    // 1. Grayscale conversion (minimal sampling)
    const sampleRate = 20 // Katta sampling - tezroq
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
    
    // 2. FAQAT FOCUS CHECK - boshqa hech narsa
    const focus = calculateLaplacianVariance(grayscale, sampledWidth, sampledHeight)
    
    // 3. FAQAT 4 NUQTA CHECK - paper detection emas, nuqta detection
    const corners = detectCornerMarkers(grayscale, sampledWidth, sampledHeight, sampleRate)
    const cornersFound = corners.filter(c => c.detected).length
    
    // SUPER SIMPLE LOGIC: Faqat 2 ta shart
    const focusGood = focus >= 0.3 // Juda past - tiniq bo'lsa bas
    const cornersGood = cornersFound >= 3 // 4 tadan 3 tasi ko'rinsa bas
    
    // Update state
    const overall = focusGood && cornersGood ? 1.0 : 0.0 // Yoki 100% yoki 0%
    
    const newQualityMetrics = {
      focus,
      brightness: 0.5, // Brightness tekshirmaymiz
      contrast: cornersFound / 4, // Nechta nuqta topildi
      skew: 0,
      overall,
      issues: [],
      recommendations: []
    }
    
    const newAlignmentStatus = {
      paperDetected: cornersGood,
      withinFrame: true,
      alignment: cornersFound / 4,
      corners
    }
    
    setQualityMetrics(newQualityMetrics)
    setAlignmentStatus(newAlignmentStatus)
    
    // SUPER SIMPLE: Agar ikkalasi ham yaxshi bo'lsa - DARHOL rasm ol
    const canCaptureNow = focusGood && cornersGood
    setCanCapture(canCaptureNow)
    
    // INSTANT CAPTURE - hech qanday kutish yo'q!
    if (canCaptureNow && autoScanCountdown === 0) {
      console.log('🎯 EvalBee SIMPLE: Focus + 4 nuqta OK - DARHOL rasm olish!')
      setAutoScanCountdown(1)
      
      // DARHOL rasm ol - 0.1 soniya
      setTimeout(() => {
        if (canCapture && !isProcessing) {
          console.log('📸 EvalBee SIMPLE: INSTANT capture!')
          captureImage()
        }
        setAutoScanCountdown(0)
      }, 100) // 0.1 soniya - darhol!
    }
    
    // Simple guide
    drawSimpleGuide(newAlignmentStatus)
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


  // EvalBee SUPER SIMPLE: 4 ta nuqtani topish - boshqa hech narsa
  const detectCornerMarkers = (grayscale: number[], width: number, height: number, sampleRate: number = 1): { x: number, y: number, detected: boolean, name: string }[] => {
    // 4 ta burchakda qora nuqtalarni qidiramiz
    const cornerRegions = [
      { name: 'TL', x: 0.1, y: 0.1, detected: false }, // Top-Left
      { name: 'TR', x: 0.9, y: 0.1, detected: false }, // Top-Right  
      { name: 'BL', x: 0.1, y: 0.9, detected: false }, // Bottom-Left
      { name: 'BR', x: 0.9, y: 0.9, detected: false }  // Bottom-Right
    ]
    
    // Har bir burchakda qora nuqta borligini tekshiramiz
    cornerRegions.forEach(corner => {
      const centerX = Math.floor(width * corner.x)
      const centerY = Math.floor(height * corner.y)
      const searchRadius = Math.min(width, height) * 0.05 // 5% radius
      
      let darkPixels = 0
      let totalPixels = 0
      
      // Kichik doira ichida qora pixellarni qidiramiz
      for (let dy = -searchRadius; dy <= searchRadius; dy += 3) {
        for (let dx = -searchRadius; dx <= searchRadius; dx += 3) {
          const x = centerX + dx
          const y = centerY + dy
          
          if (x >= 0 && x < width && y >= 0 && y < height) {
            const idx = Math.floor(y) * width + Math.floor(x)
            if (idx < grayscale.length) {
              const pixel = grayscale[idx]
              if (pixel < 100) { // Qora pixel (100 dan past)
                darkPixels++
              }
              totalPixels++
            }
          }
        }
      }
      
      // Agar 30% dan ko'p qora pixel bo'lsa - nuqta topildi
      corner.detected = totalPixels > 0 && (darkPixels / totalPixels) > 0.3
    })
    
    // Koordinatalarni qaytaramiz
    return cornerRegions.map(corner => ({
      x: corner.x * width * sampleRate,
      y: corner.y * height * sampleRate,
      detected: corner.detected,
      name: corner.name
    }))
  }
  // EvalBee SUPER SIMPLE Guide: Faqat 4 ta nuqta ko'rsatish
  const drawSimpleGuide = (alignment: AlignmentStatus) => {
    if (!overlayCanvasRef.current) return
    
    const canvas = overlayCanvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    // SUPER SIMPLE: Faqat 4 ta doira - nuqtalar uchun
    const cornerSize = 40
    const corners = [
      { x: canvas.width * 0.1, y: canvas.height * 0.1, name: 'TL' },
      { x: canvas.width * 0.9, y: canvas.height * 0.1, name: 'TR' },
      { x: canvas.width * 0.1, y: canvas.height * 0.9, name: 'BL' },
      { x: canvas.width * 0.9, y: canvas.height * 0.9, name: 'BR' }
    ]
    
    // Har bir burchakda doira chizamiz
    corners.forEach((corner, index) => {
      const detected = alignment.corners[index]?.detected || false
      
      ctx.beginPath()
      ctx.arc(corner.x, corner.y, cornerSize, 0, 2 * Math.PI)
      
      // Rang: topilgan nuqta - yashil, topilmagan - qizil
      ctx.strokeStyle = detected ? '#10B981' : '#EF4444'
      ctx.fillStyle = detected ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'
      ctx.lineWidth = 4
      
      ctx.fill()
      ctx.stroke()
      
      // Nuqta belgisi
      ctx.fillStyle = detected ? '#10B981' : '#EF4444'
      ctx.font = 'bold 16px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(detected ? '✓' : '○', corner.x, corner.y + 6)
    })
    
    // Markazda oddiy xabar
    const cornersFound = alignment.corners.filter(c => c.detected).length
    const message = cornersFound >= 3 ? 'TAYYOR!' : `${cornersFound}/4 NUQTA`
    
    ctx.fillStyle = cornersFound >= 3 ? '#10B981' : '#EF4444'
    ctx.font = 'bold 24px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(message, canvas.width / 2, canvas.height / 2)
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
            
            {/* SUPER SIMPLE UI: Faqat 4 ta doira - nuqtalar uchun */}
            <div className="absolute inset-0 z-15 pointer-events-none">
              {/* 4 ta burchakda doiralar */}
              <div className="absolute" style={{ left: '10%', top: '10%' }}>
                <div className={`w-20 h-20 rounded-full border-4 flex items-center justify-center text-2xl font-bold transition-all duration-300 ${
                  alignmentStatus.corners[0]?.detected 
                    ? 'border-green-400 bg-green-400/20 text-green-400' 
                    : 'border-red-400 bg-red-400/20 text-red-400'
                }`}>
                  {alignmentStatus.corners[0]?.detected ? '✓' : '○'}
                </div>
              </div>
              
              <div className="absolute" style={{ right: '10%', top: '10%' }}>
                <div className={`w-20 h-20 rounded-full border-4 flex items-center justify-center text-2xl font-bold transition-all duration-300 ${
                  alignmentStatus.corners[1]?.detected 
                    ? 'border-green-400 bg-green-400/20 text-green-400' 
                    : 'border-red-400 bg-red-400/20 text-red-400'
                }`}>
                  {alignmentStatus.corners[1]?.detected ? '✓' : '○'}
                </div>
              </div>
              
              <div className="absolute" style={{ left: '10%', bottom: '10%' }}>
                <div className={`w-20 h-20 rounded-full border-4 flex items-center justify-center text-2xl font-bold transition-all duration-300 ${
                  alignmentStatus.corners[2]?.detected 
                    ? 'border-green-400 bg-green-400/20 text-green-400' 
                    : 'border-red-400 bg-red-400/20 text-red-400'
                }`}>
                  {alignmentStatus.corners[2]?.detected ? '✓' : '○'}
                </div>
              </div>
              
              <div className="absolute" style={{ right: '10%', bottom: '10%' }}>
                <div className={`w-20 h-20 rounded-full border-4 flex items-center justify-center text-2xl font-bold transition-all duration-300 ${
                  alignmentStatus.corners[3]?.detected 
                    ? 'border-green-400 bg-green-400/20 text-green-400' 
                    : 'border-red-400 bg-red-400/20 text-red-400'
                }`}>
                  {alignmentStatus.corners[3]?.detected ? '✓' : '○'}
                </div>
              </div>
              
              {/* Markazda oddiy status */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className={`px-8 py-4 rounded-full text-xl font-bold transition-all duration-300 ${
                  alignmentStatus.corners.filter(c => c.detected).length >= 3
                    ? 'bg-green-500/90 text-white' 
                    : 'bg-red-500/90 text-white'
                }`}>
                  {alignmentStatus.corners.filter(c => c.detected).length >= 3 
                    ? '✅ TAYYOR!' 
                    : `${alignmentStatus.corners.filter(c => c.detected).length}/4 NUQTA`
                  }
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
            
            {/* Frame Status Indicator - SUPER SIMPLE */}
            <div className="absolute top-16 left-1/2 transform -translate-x-1/2 z-20">
              <div className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                alignmentStatus.corners.filter(c => c.detected).length >= 3
                  ? 'bg-green-500/90 text-white' 
                  : 'bg-blue-500/90 text-white'
              }`}>
                {alignmentStatus.corners.filter(c => c.detected).length >= 3
                  ? '✅ 4 nuqta topildi - TAYYOR!' 
                  : `📄 ${alignmentStatus.corners.filter(c => c.detected).length}/4 nuqta ko'rinib tursin`
                }
              </div>
            </div>
          </>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/80 to-transparent p-6 z-20">
        {/* EvalBee SUPER SIMPLE Status - Faqat 2 ta holat */}
        <div className="text-center mb-6">
          {alignmentStatus.corners.filter(c => c.detected).length < 3 ? (
            <div className="space-y-2">
              <p className="text-blue-400 text-lg font-medium">📄 4 ta nuqtani ko'rsating</p>
              <p className="text-white/70 text-sm">Varaq burchaklaridagi qora nuqtalar ko'rinsin</p>
            </div>
          ) : qualityMetrics.focus < 0.3 ? (
            <div className="space-y-2">
              <p className="text-yellow-400 text-lg font-medium">📱 Biroz yaqinroq qiling</p>
              <p className="text-white/70 text-sm">Rasm tiniq bo'lishi kerak</p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-green-400 text-lg font-medium">✨ TAYYOR - Darhol suratga olinadi!</p>
              <p className="text-green-300 text-sm">Focus: ✓ | 4 nuqta: ✓</p>
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

        {/* SUPER SIMPLE Stats */}
        {alignmentStatus.corners.filter(c => c.detected).length > 0 && (
          <div className="flex justify-center gap-6 mt-4 text-xs text-white/60">
            <div className="text-center">
              <div className="text-white font-medium">{qualityMetrics.focus >= 0.3 ? '✓' : '○'}</div>
              <div>Focus</div>
            </div>
            <div className="text-center">
              <div className="text-white font-medium">{alignmentStatus.corners.filter(c => c.detected).length}/4</div>
              <div>Nuqtalar</div>
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