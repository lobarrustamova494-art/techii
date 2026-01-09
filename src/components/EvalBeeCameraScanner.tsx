import React, { useRef, useEffect, useState, useCallback } from 'react'
import { 
  Camera, RotateCcw, X, CheckCircle, AlertTriangle, Focus, 
  Eye, Settings, Target
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
          width: { ideal: 4096, min: 2560 }, // Higher resolution for better quality
          height: { ideal: 3072, min: 1920 },
          frameRate: { ideal: 30, min: 24 },
          aspectRatio: { ideal: 4/3 }, // Better for document scanning
          // Advanced camera settings for professional quality
          whiteBalanceMode: 'manual',
          exposureMode: 'manual',
          focusMode: autoFocus ? 'continuous' : 'single-shot',
          // Image quality enhancements
          brightness: { ideal: 0 }, // Auto brightness
          contrast: { ideal: 1.2 }, // Slightly enhanced contrast
          saturation: { ideal: 0.8 }, // Reduced saturation for documents
          sharpness: { ideal: 1.1 } // Enhanced sharpness
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
      
      // Determine if capture is allowed - STRICT THRESHOLDS for 100% quality
      const canCaptureNow = (
        metrics.overall >= 0.95 &&     // 95%+ overall quality required
        metrics.focus >= 0.90 &&       // 90%+ focus required
        metrics.brightness >= 0.45 &&  // Optimal brightness range
        metrics.brightness <= 0.70 &&
        metrics.contrast >= 0.80 &&    // 80%+ contrast required
        metrics.skew <= 0.10 &&        // Maximum 10% skew allowed
        bubbles.confidence >= 0.85     // 85%+ bubble detection confidence
      )
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
    
    // 1. Advanced Focus Analysis (Multiple methods)
    const focus = calculateAdvancedFocus(grayscale, width, height)
    
    // 2. Optimal Brightness Analysis for OMR
    const brightness = calculateOptimalBrightness(grayscale)
    
    // 3. Enhanced Contrast Analysis
    const contrast = calculateEnhancedContrast(grayscale, width, height)
    
    // 4. Precise Skew Detection
    const skew = calculatePreciseSkew(grayscale, width, height)
    
    // 5. Paper Detection and Edge Quality
    const paperQuality = calculatePaperDetection(grayscale, width, height)
    
    // 6. Noise Level Analysis
    const noiseLevel = calculateNoiseLevel(grayscale, width, height)
    
    // 7. Resolution and Sharpness Check
    const resolution = calculateResolutionQuality(width, height)
    
    // 8. Advanced Overall Quality Score (weighted for OMR)
    const overall = (
      focus * 0.25 +           // Focus is critical for bubble detection
      brightness * 0.15 +      // Proper lighting
      contrast * 0.25 +        // High contrast needed for bubbles
      (1 - skew) * 0.15 +      // Straight alignment
      paperQuality * 0.10 +    // Paper detection
      (1 - noiseLevel) * 0.05 + // Low noise
      resolution * 0.05        // Good resolution
    )
    
    // 9. Generate Professional Issues and Recommendations
    const issues: string[] = []
    const recommendations: string[] = []
    
    // Focus analysis
    if (focus < 0.85) {
      issues.push('Fokus yetarli emas')
      if (focus < 0.6) {
        recommendations.push('🎯 Kamerani OMR varaqqa 20-30 sm masofada tutib, avtofokusni yoqing')
      } else {
        recommendations.push('🎯 Fokusni biroz yaxshilash uchun kamerani sekin harakat qildiring')
      }
    }
    
    // Brightness analysis
    if (brightness < 0.4 || brightness > 0.75) {
      issues.push('Yorug\'lik darajasi optimal emas')
      if (brightness < 0.4) {
        recommendations.push('💡 Ko\'proq yorug\'lik kerak - oyna yonida yoki lampani yoqing')
      } else {
        recommendations.push('💡 Juda yorqin - soyaga o\'ting yoki yorug\'likni kamaytiring')
      }
    }
    
    // Contrast analysis
    if (contrast < 0.7) {
      issues.push('Kontrast past')
      recommendations.push('📄 Oq qog\'ozni to\'q rangli sirt ustiga qo\'ying (masalan, qora stol)')
    }
    
    // Skew analysis
    if (skew > 0.15) {
      issues.push('Rasm qiyshaygan')
      recommendations.push('📐 Kamerani to\'g\'ridan-to\'g\'ri OMR varaq ustiga parallel qilib tutting')
    }
    
    // Paper detection
    if (paperQuality < 0.8) {
      issues.push('Qog\'oz chegaralari aniq emas')
      recommendations.push('📋 Butun OMR varaqni ramkaga sig\'dirib, atrofida biroz bo\'sh joy qoldiring')
    }
    
    // Noise analysis
    if (noiseLevel > 0.3) {
      issues.push('Rasm shovqinli')
      recommendations.push('🔧 Kamerani barqaror tutib, yaxshi yorug\'lik ta\'minlang')
    }
    
    // Resolution check
    if (resolution < 0.8) {
      issues.push('Rasm o\'lchami kichik')
      recommendations.push('📱 Kamerani yaqinroq olib boring yoki yuqori sifatli kamerani tanlang')
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

  // Advanced Focus Calculation using multiple edge detection methods
  const calculateAdvancedFocus = (grayscale: number[], width: number, height: number): number => {
    let laplacianVariance = 0
    let sobelVariance = 0
    let count = 0
    
    for (let y = 2; y < height - 2; y++) {
      for (let x = 2; x < width - 2; x++) {
        const idx = y * width + x
        
        // Laplacian operator (8-connected)
        const laplacian = 
          -grayscale[idx - width - 1] - grayscale[idx - width] - grayscale[idx - width + 1] +
          -grayscale[idx - 1] + 8 * grayscale[idx] - grayscale[idx + 1] +
          -grayscale[idx + width - 1] - grayscale[idx + width] - grayscale[idx + width + 1]
        
        // Sobel operator for edge detection
        const sobelX = 
          -grayscale[idx - width - 1] + grayscale[idx - width + 1] +
          -2 * grayscale[idx - 1] + 2 * grayscale[idx + 1] +
          -grayscale[idx + width - 1] + grayscale[idx + width + 1]
        
        const sobelY = 
          -grayscale[idx - width - 1] - 2 * grayscale[idx - width] - grayscale[idx - width + 1] +
          grayscale[idx + width - 1] + 2 * grayscale[idx + width] + grayscale[idx + width + 1]
        
        const sobelMagnitude = Math.sqrt(sobelX * sobelX + sobelY * sobelY)
        
        laplacianVariance += laplacian * laplacian
        sobelVariance += sobelMagnitude * sobelMagnitude
        count++
      }
    }
    
    const laplacianScore = Math.min(1, (laplacianVariance / count) / 2000)
    const sobelScore = Math.min(1, (sobelVariance / count) / 5000)
    
    // Combine both methods for more accurate focus measurement
    return (laplacianScore * 0.6 + sobelScore * 0.4)
  }

  // Optimal brightness calculation for OMR (paper should be bright, marks dark)
  const calculateOptimalBrightness = (grayscale: number[]): number => {
    const histogram = new Array(256).fill(0)
    
    // Build histogram
    grayscale.forEach(pixel => {
      histogram[Math.floor(pixel)]++
    })
    
    // Find peak (most common brightness - should be paper)
    let maxCount = 0
    let peakBrightness = 0
    for (let i = 0; i < 256; i++) {
      if (histogram[i] > maxCount) {
        maxCount = histogram[i]
        peakBrightness = i
      }
    }
    
    // Optimal range for OMR paper: 180-220 (bright but not overexposed)
    const optimalMin = 180
    const optimalMax = 220
    
    if (peakBrightness >= optimalMin && peakBrightness <= optimalMax) {
      return 1.0 // Perfect brightness
    } else if (peakBrightness < optimalMin) {
      return Math.max(0, peakBrightness / optimalMin)
    } else {
      return Math.max(0, 1 - (peakBrightness - optimalMax) / (255 - optimalMax))
    }
  }

  // Enhanced contrast calculation with local contrast analysis
  const calculateEnhancedContrast = (grayscale: number[], width: number, height: number): number => {
    let globalVariance = 0
    let localContrastSum = 0
    let localCount = 0
    
    const avg = grayscale.reduce((sum, val) => sum + val, 0) / grayscale.length
    
    // Global contrast
    grayscale.forEach(pixel => {
      globalVariance += Math.pow(pixel - avg, 2)
    })
    globalVariance /= grayscale.length
    
    // Local contrast analysis (important for bubble detection)
    const blockSize = 32
    for (let y = 0; y < height - blockSize; y += blockSize) {
      for (let x = 0; x < width - blockSize; x += blockSize) {
        let blockMin = 255
        let blockMax = 0
        
        for (let by = y; by < y + blockSize && by < height; by++) {
          for (let bx = x; bx < x + blockSize && bx < width; bx++) {
            const pixel = grayscale[by * width + bx]
            blockMin = Math.min(blockMin, pixel)
            blockMax = Math.max(blockMax, pixel)
          }
        }
        
        const localContrast = (blockMax - blockMin) / 255
        localContrastSum += localContrast
        localCount++
      }
    }
    
    const globalContrastScore = Math.min(1, Math.sqrt(globalVariance) / 100)
    const localContrastScore = localCount > 0 ? localContrastSum / localCount : 0
    
    // Combine global and local contrast
    return (globalContrastScore * 0.4 + localContrastScore * 0.6)
  }

  // Precise skew detection using Hough transform approximation
  const calculatePreciseSkew = (grayscale: number[], width: number, height: number): number => {
    // Edge detection first
    const edges: boolean[] = new Array(width * height).fill(false)
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x
        
        const sobelX = 
          -grayscale[idx - width - 1] + grayscale[idx - width + 1] +
          -2 * grayscale[idx - 1] + 2 * grayscale[idx + 1] +
          -grayscale[idx + width - 1] + grayscale[idx + width + 1]
        
        const sobelY = 
          -grayscale[idx - width - 1] - 2 * grayscale[idx - width] - grayscale[idx - width + 1] +
          grayscale[idx + width - 1] + 2 * grayscale[idx + width] + grayscale[idx + width + 1]
        
        const magnitude = Math.sqrt(sobelX * sobelX + sobelY * sobelY)
        edges[idx] = magnitude > 50 // Threshold for edge detection
      }
    }
    
    // Simplified Hough transform for horizontal lines
    const angleRange = 30 // Check angles from -15 to +15 degrees
    const angleStep = 1
    let maxVotes = 0
    let bestAngle = 0
    
    for (let angle = -angleRange/2; angle <= angleRange/2; angle += angleStep) {
      let votes = 0
      const radians = (angle * Math.PI) / 180
      const cosAngle = Math.cos(radians)
      const sinAngle = Math.sin(radians)
      
      // Sample points along potential lines
      for (let y = height * 0.2; y < height * 0.8; y += 10) {
        for (let x = width * 0.1; x < width * 0.9; x += 10) {
          const idx = Math.floor(y) * width + Math.floor(x)
          if (edges[idx]) {
            // Check if this point lies on a line with the current angle
            let lineVotes = 0
            for (let t = -width/4; t < width/4; t += 5) {
              const px = x + t * cosAngle
              const py = y + t * sinAngle
              if (px >= 0 && px < width && py >= 0 && py < height) {
                const pidx = Math.floor(py) * width + Math.floor(px)
                if (edges[pidx]) lineVotes++
              }
            }
            votes += lineVotes
          }
        }
      }
      
      if (votes > maxVotes) {
        maxVotes = votes
        bestAngle = angle
      }
    }
    
    // Return skew as a value between 0 (no skew) and 1 (maximum skew)
    return Math.abs(bestAngle) / (angleRange/2)
  }

  // Paper detection and edge quality
  const calculatePaperDetection = (grayscale: number[], width: number, height: number): number => {
    // Detect paper edges by finding rectangular boundaries
    const edges: number[] = new Array(width * height).fill(0)
    
    // Edge detection
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x
        
        const gx = -grayscale[idx - 1] + grayscale[idx + 1]
        const gy = -grayscale[idx - width] + grayscale[idx + width]
        
        edges[idx] = Math.sqrt(gx * gx + gy * gy)
      }
    }
    
    // Find strong vertical and horizontal edges (paper boundaries)
    let verticalEdges = 0
    let horizontalEdges = 0
    
    // Check for vertical edges (left and right paper boundaries)
    for (let x = width * 0.1; x < width * 0.9; x++) {
      let verticalStrength = 0
      for (let y = height * 0.1; y < height * 0.9; y++) {
        verticalStrength += edges[Math.floor(y) * width + Math.floor(x)]
      }
      if (verticalStrength > height * 10) verticalEdges++
    }
    
    // Check for horizontal edges (top and bottom paper boundaries)
    for (let y = height * 0.1; y < height * 0.9; y++) {
      let horizontalStrength = 0
      for (let x = width * 0.1; x < width * 0.9; x++) {
        horizontalStrength += edges[Math.floor(y) * width + Math.floor(x)]
      }
      if (horizontalStrength > width * 10) horizontalEdges++
    }
    
    // Paper should have clear boundaries
    const verticalScore = Math.min(1, verticalEdges / (width * 0.1))
    const horizontalScore = Math.min(1, horizontalEdges / (height * 0.1))
    
    return (verticalScore + horizontalScore) / 2
  }

  // Noise level calculation
  const calculateNoiseLevel = (grayscale: number[], width: number, height: number): number => {
    let noiseSum = 0
    let count = 0
    
    // Calculate local variance to detect noise
    const windowSize = 5
    for (let y = windowSize; y < height - windowSize; y += windowSize) {
      for (let x = windowSize; x < width - windowSize; x += windowSize) {
        let localSum = 0
        let localSumSq = 0
        let localCount = 0
        
        for (let dy = -windowSize/2; dy <= windowSize/2; dy++) {
          for (let dx = -windowSize/2; dx <= windowSize/2; dx++) {
            const pixel = grayscale[(y + dy) * width + (x + dx)]
            localSum += pixel
            localSumSq += pixel * pixel
            localCount++
          }
        }
        
        const localMean = localSum / localCount
        const localVariance = (localSumSq / localCount) - (localMean * localMean)
        
        // High variance in small windows indicates noise
        noiseSum += Math.sqrt(localVariance)
        count++
      }
    }
    
    const avgNoise = count > 0 ? noiseSum / count : 0
    return Math.min(1, avgNoise / 50) // Normalize noise level
  }

  // Resolution quality check
  const calculateResolutionQuality = (width: number, height: number): number => {
    const totalPixels = width * height
    const minRecommended = 1920 * 1080 // 2MP minimum for good OMR
    const optimal = 3840 * 2160 // 4K optimal
    
    if (totalPixels >= optimal) {
      return 1.0
    } else if (totalPixels >= minRecommended) {
      return 0.7 + 0.3 * (totalPixels - minRecommended) / (optimal - minRecommended)
    } else {
      return Math.max(0.3, totalPixels / minRecommended * 0.7)
    }
  }

  const detectBubbleLayout = async (
    imageData: ImageData, 
    expectedQuestions: number
  ): Promise<BubbleDetection> => {
    
    const { data, width, height } = imageData
    
    // Convert to grayscale
    const grayscale = new Array(width * height)
    for (let i = 0; i < data.length; i += 4) {
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
      grayscale[i / 4] = gray
    }
    
    // Advanced bubble detection using multiple methods
    const bubbleDetectionResults = await performAdvancedBubbleDetection(
      grayscale, 
      width, 
      height, 
      expectedQuestions
    )
    
    return bubbleDetectionResults
  }

  const performAdvancedBubbleDetection = async (
    grayscale: number[],
    width: number,
    height: number,
    expectedQuestions: number
  ): Promise<BubbleDetection> => {
    
    // 1. Adaptive thresholding for better bubble detection
    const binaryImage = applyAdaptiveThreshold(grayscale, width, height)
    
    // 2. Detect circular patterns (bubbles)
    const circularPatterns = detectCircularPatterns(binaryImage, width, height)
    
    // 3. Analyze pattern layout and grouping
    const layoutAnalysis = analyzePatternLayout(circularPatterns, expectedQuestions)
    
    // 4. Validate bubble characteristics
    const validBubbles = validateBubbleCharacteristics(circularPatterns, grayscale, width, height)
    
    // 5. Calculate confidence based on multiple factors
    const confidence = calculateBubbleConfidence(
      validBubbles.length,
      expectedQuestions,
      layoutAnalysis.regularity,
      layoutAnalysis.alignment
    )
    
    // 6. Determine layout type
    let layout: 'single' | 'double' | 'triple' = 'triple'
    if (expectedQuestions <= 25) layout = 'single'
    else if (expectedQuestions <= 50) layout = 'double'
    
    return {
      detected: validBubbles.length,
      expected: expectedQuestions,
      confidence,
      layout
    }
  }

  const applyAdaptiveThreshold = (grayscale: number[], width: number, height: number): boolean[] => {
    const binary = new Array(width * height).fill(false)
    const windowSize = 15
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x
        
        // Calculate local mean in window
        let sum = 0
        let count = 0
        
        for (let dy = -windowSize/2; dy <= windowSize/2; dy++) {
          for (let dx = -windowSize/2; dx <= windowSize/2; dx++) {
            const ny = y + dy
            const nx = x + dx
            
            if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
              sum += grayscale[ny * width + nx]
              count++
            }
          }
        }
        
        const localMean = sum / count
        const threshold = localMean - 10 // Adaptive threshold
        
        binary[idx] = grayscale[idx] < threshold
      }
    }
    
    return binary
  }

  const detectCircularPatterns = (binary: boolean[], width: number, height: number) => {
    const patterns = []
    const visited = new Array(width * height).fill(false)
    
    // Scan for connected components that might be bubbles
    for (let y = 10; y < height - 10; y++) {
      for (let x = 10; x < width - 10; x++) {
        const idx = y * width + x
        
        if (binary[idx] && !visited[idx]) {
          const component = floodFill(binary, visited, x, y, width, height)
          
          if (component.length > 20 && component.length < 500) { // Size filter for bubbles
            const bounds = calculateBounds(component)
            const aspectRatio = bounds.width / bounds.height
            const circularity = calculateCircularity(component, bounds)
            
            // Check if it looks like a bubble
            if (aspectRatio > 0.7 && aspectRatio < 1.3 && circularity > 0.6) {
              patterns.push({
                center: { x: bounds.centerX, y: bounds.centerY },
                radius: Math.max(bounds.width, bounds.height) / 2,
                area: component.length,
                circularity,
                aspectRatio
              })
            }
          }
        }
      }
    }
    
    return patterns
  }

  const floodFill = (binary: boolean[], visited: boolean[], startX: number, startY: number, width: number, height: number) => {
    const stack = [{ x: startX, y: startY }]
    const component = []
    
    while (stack.length > 0) {
      const { x, y } = stack.pop()!
      const idx = y * width + x
      
      if (x < 0 || x >= width || y < 0 || y >= height || visited[idx] || !binary[idx]) {
        continue
      }
      
      visited[idx] = true
      component.push({ x, y })
      
      // Add 8-connected neighbors
      stack.push(
        { x: x - 1, y: y - 1 }, { x: x, y: y - 1 }, { x: x + 1, y: y - 1 },
        { x: x - 1, y: y }, { x: x + 1, y: y },
        { x: x - 1, y: y + 1 }, { x: x, y: y + 1 }, { x: x + 1, y: y + 1 }
      )
    }
    
    return component
  }

  const calculateBounds = (component: { x: number, y: number }[]) => {
    let minX = Infinity, maxX = -Infinity
    let minY = Infinity, maxY = -Infinity
    
    component.forEach(({ x, y }) => {
      minX = Math.min(minX, x)
      maxX = Math.max(maxX, x)
      minY = Math.min(minY, y)
      maxY = Math.max(maxY, y)
    })
    
    return {
      minX, maxX, minY, maxY,
      width: maxX - minX + 1,
      height: maxY - minY + 1,
      centerX: (minX + maxX) / 2,
      centerY: (minY + maxY) / 2
    }
  }

  const calculateCircularity = (component: { x: number, y: number }[], bounds: any): number => {
    const area = component.length
    const perimeter = calculatePerimeter(component, bounds)
    
    if (perimeter === 0) return 0
    
    // Circularity = 4π * area / perimeter²
    const circularity = (4 * Math.PI * area) / (perimeter * perimeter)
    return Math.min(1, circularity)
  }

  const calculatePerimeter = (component: { x: number, y: number }[], bounds: any): number => {
    // Simplified perimeter calculation
    const { centerX, centerY } = bounds
    let perimeter = 0
    
    component.forEach(({ x, y }) => {
      const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2)
      perimeter += distance
    })
    
    return perimeter / component.length * 2 * Math.PI
  }

  const analyzePatternLayout = (patterns: any[], expectedQuestions: number) => {
    if (patterns.length < 2) {
      return { regularity: 0, alignment: 0 }
    }
    
    // Sort patterns by position (top to bottom, left to right)
    patterns.sort((a, b) => {
      if (Math.abs(a.center.y - b.center.y) < 20) {
        return a.center.x - b.center.x
      }
      return a.center.y - b.center.y
    })
    
    // Calculate spacing regularity
    const spacings = []
    for (let i = 1; i < patterns.length; i++) {
      const dx = patterns[i].center.x - patterns[i-1].center.x
      const dy = patterns[i].center.y - patterns[i-1].center.y
      const spacing = Math.sqrt(dx * dx + dy * dy)
      spacings.push(spacing)
    }
    
    const avgSpacing = spacings.reduce((sum, s) => sum + s, 0) / spacings.length
    const spacingVariance = spacings.reduce((sum, s) => sum + Math.pow(s - avgSpacing, 2), 0) / spacings.length
    const regularity = Math.max(0, 1 - Math.sqrt(spacingVariance) / avgSpacing)
    
    // Calculate alignment (how well patterns align in rows/columns)
    const yPositions = patterns.map(p => p.center.y)
    const uniqueRows = [...new Set(yPositions.map(y => Math.round(y / 20) * 20))]
    const alignment = Math.min(1, uniqueRows.length / Math.sqrt(expectedQuestions))
    
    return { regularity, alignment }
  }

  const validateBubbleCharacteristics = (patterns: any[], grayscale: number[], width: number, height: number) => {
    return patterns.filter(pattern => {
      const { center, radius } = pattern
      
      // Check if bubble has proper intensity characteristics
      let darkPixels = 0
      let totalPixels = 0
      
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const distance = Math.sqrt(dx * dx + dy * dy)
          if (distance <= radius) {
            const x = Math.round(center.x + dx)
            const y = Math.round(center.y + dy)
            
            if (x >= 0 && x < width && y >= 0 && y < height) {
              const idx = y * width + x
              const intensity = grayscale[idx]
              
              if (intensity < 100) darkPixels++ // Dark pixels (potential marks)
              totalPixels++
            }
          }
        }
      }
      
      const darkRatio = totalPixels > 0 ? darkPixels / totalPixels : 0
      
      // Valid bubble should have reasonable size and not be completely filled
      return (
        radius >= 8 && radius <= 25 && // Reasonable bubble size
        darkRatio < 0.8 && // Not completely filled (would be a mark)
        totalPixels > 50 // Minimum size
      )
    })
  }

  const calculateBubbleConfidence = (
    detected: number,
    expected: number,
    regularity: number,
    alignment: number
  ): number => {
    if (expected === 0) return 0
    
    const detectionRatio = Math.min(1, detected / expected)
    const overDetectionPenalty = detected > expected ? (detected - expected) / expected * 0.5 : 0
    
    const confidence = (
      detectionRatio * 0.5 +
      regularity * 0.25 +
      alignment * 0.25
    ) - overDetectionPenalty
    
    return Math.max(0, Math.min(1, confidence))
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
            
            {/* Enhanced Quality Status Panel with 100% Quality Guidance */}
            <div className="absolute top-4 right-4 bg-black/90 rounded-xl p-4 text-white min-w-[280px] max-w-[320px] shadow-2xl border border-white/20">
              <div className="flex items-center gap-2 mb-3">
                <Eye size={16} className="text-blue-400" />
                <span className="text-sm font-medium">EvalBee Quality Control</span>
                {qualityMetrics.overall >= 0.95 && (
                  <div className="ml-auto">
                    <CheckCircle size={16} className="text-green-400" />
                  </div>
                )}
              </div>
              
              {/* Overall Quality Progress */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium">Overall Quality</span>
                  <span className={`text-sm font-bold ${
                    qualityMetrics.overall >= 0.95 ? 'text-green-400' :
                    qualityMetrics.overall >= 0.80 ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {Math.round(qualityMetrics.overall * 100)}%
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${
                      qualityMetrics.overall >= 0.95 ? 'bg-green-500' :
                      qualityMetrics.overall >= 0.80 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.round(qualityMetrics.overall * 100)}%` }}
                  />
                </div>
                {qualityMetrics.overall >= 0.95 && (
                  <div className="text-xs text-green-400 mt-1 font-medium">
                    ✨ Perfect Quality - Ready to Capture!
                  </div>
                )}
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
                    {qualityMetrics.focus < 0.90 && (
                      <span className="text-yellow-400 ml-1">📍</span>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span>Brightness:</span>
                  <div className="flex items-center gap-1">
                    {getQualityIcon(qualityMetrics.brightness)}
                    <span className={getQualityColor(qualityMetrics.brightness)}>
                      {Math.round(qualityMetrics.brightness * 100)}%
                    </span>
                    {(qualityMetrics.brightness < 0.45 || qualityMetrics.brightness > 0.70) && (
                      <span className="text-yellow-400 ml-1">💡</span>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span>Contrast:</span>
                  <div className="flex items-center gap-1">
                    {getQualityIcon(qualityMetrics.contrast)}
                    <span className={getQualityColor(qualityMetrics.contrast)}>
                      {Math.round(qualityMetrics.contrast * 100)}%
                    </span>
                    {qualityMetrics.contrast < 0.80 && (
                      <span className="text-yellow-400 ml-1">🎨</span>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span>Alignment:</span>
                  <div className="flex items-center gap-1">
                    {getQualityIcon(1 - qualityMetrics.skew)}
                    <span className={getQualityColor(1 - qualityMetrics.skew)}>
                      {Math.round((1 - qualityMetrics.skew) * 100)}%
                    </span>
                    {qualityMetrics.skew > 0.10 && (
                      <span className="text-yellow-400 ml-1">📐</span>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span>Bubbles:</span>
                  <div className="flex items-center gap-1">
                    {getQualityIcon(bubbleDetection.confidence)}
                    <span className={getQualityColor(bubbleDetection.confidence)}>
                      {bubbleDetection.detected}/{bubbleDetection.expected}
                    </span>
                    {bubbleDetection.confidence < 0.85 && (
                      <span className="text-yellow-400 ml-1">🎯</span>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Real-time Guidance */}
              {qualityMetrics.overall < 0.95 && (
                <div className="mt-3 pt-3 border-t border-gray-600">
                  <div className="text-xs font-medium text-yellow-400 mb-2">
                    📋 Steps to 100% Quality:
                  </div>
                  <div className="space-y-1 text-xs">
                    {qualityMetrics.focus < 0.90 && (
                      <div className="flex items-start gap-2">
                        <span className="text-blue-400">1.</span>
                        <span className="text-gray-300">Tap screen to focus on OMR sheet</span>
                      </div>
                    )}
                    {(qualityMetrics.brightness < 0.45 || qualityMetrics.brightness > 0.70) && (
                      <div className="flex items-start gap-2">
                        <span className="text-blue-400">{qualityMetrics.focus >= 0.90 ? '1.' : '2.'}</span>
                        <span className="text-gray-300">
                          {qualityMetrics.brightness < 0.45 ? 'Add more light' : 'Reduce bright light'}
                        </span>
                      </div>
                    )}
                    {qualityMetrics.contrast < 0.80 && (
                      <div className="flex items-start gap-2">
                        <span className="text-blue-400">
                          {[qualityMetrics.focus >= 0.90, qualityMetrics.brightness >= 0.45 && qualityMetrics.brightness <= 0.70].filter(Boolean).length + 1}.
                        </span>
                        <span className="text-gray-300">Place paper on dark surface</span>
                      </div>
                    )}
                    {qualityMetrics.skew > 0.10 && (
                      <div className="flex items-start gap-2">
                        <span className="text-blue-400">
                          {[qualityMetrics.focus >= 0.90, qualityMetrics.brightness >= 0.45 && qualityMetrics.brightness <= 0.70, qualityMetrics.contrast >= 0.80].filter(Boolean).length + 1}.
                        </span>
                        <span className="text-gray-300">Hold camera straight above paper</span>
                      </div>
                    )}
                    {bubbleDetection.confidence < 0.85 && (
                      <div className="flex items-start gap-2">
                        <span className="text-blue-400">
                          {[qualityMetrics.focus >= 0.90, qualityMetrics.brightness >= 0.45 && qualityMetrics.brightness <= 0.70, qualityMetrics.contrast >= 0.80, qualityMetrics.skew <= 0.10].filter(Boolean).length + 1}.
                        </span>
                        <span className="text-gray-300">Ensure all bubbles are visible</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Success Message */}
              {qualityMetrics.overall >= 0.95 && canCapture && (
                <div className="mt-3 pt-3 border-t border-green-600">
                  <div className="text-xs text-green-400 font-medium flex items-center gap-2">
                    <CheckCircle size={14} />
                    Perfect! Tap capture button below
                  </div>
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

          {/* Enhanced Capture Button with Quality Indication */}
          <div className="relative">
            <button
              onClick={captureImage}
              disabled={!isReady || isProcessing || !canCapture}
              className={`relative p-6 rounded-full text-white transition-all duration-300 shadow-2xl ${
                canCapture && qualityMetrics.overall >= 0.95
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
                  {canCapture && qualityMetrics.overall >= 0.95 && (
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
                    qualityMetrics.overall >= 0.95 ? '#10B981' :
                    qualityMetrics.overall >= 0.80 ? '#F59E0B' : '#EF4444'
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
                qualityMetrics.overall >= 0.95 ? 'bg-green-500 text-white' :
                qualityMetrics.overall >= 0.80 ? 'bg-yellow-500 text-black' : 'bg-red-500 text-white'
              }`}>
                {Math.round(qualityMetrics.overall * 100)}%
              </div>
            </div>
          </div>

          {/* Focus Button */}
          <button
            onClick={() => {
              // Trigger manual focus (simplified for compatibility)
              if (videoRef.current && stream) {
                const track = stream.getVideoTracks()[0]
                if (track) {
                  // Simple focus trigger without unsupported API
                  console.log('Focus triggered')
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