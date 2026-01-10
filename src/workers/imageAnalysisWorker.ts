/**
 * Web Worker for Image Analysis
 * Offloads heavy image processing from main thread
 */

// Types for worker communication
interface ImageAnalysisRequest {
  type: 'ANALYZE_FRAME'
  imageData: ImageData
  correctAnswers: string[]
  sampleRate: number
}

interface ImageAnalysisResponse {
  type: 'ANALYSIS_COMPLETE'
  qualityMetrics: {
    focus: number
    brightness: number
    contrast: number
    skew: number
    overall: number
    issues: string[]
    recommendations: string[]
  }
  alignmentStatus: {
    paperDetected: boolean
    withinFrame: boolean
    alignment: number
    corners: { x: number, y: number, detected?: boolean, name?: string }[]
  }
  detectedBubbles: Array<{
    x: number
    y: number
    option: string
    questionNumber: number
    isFilled: boolean
    isCorrect: boolean
    confidence: number
  }>
}

// Worker message handler
self.onmessage = function(e: MessageEvent<ImageAnalysisRequest>) {
  const { type, imageData, correctAnswers, sampleRate } = e.data
  
  if (type === 'ANALYZE_FRAME') {
    try {
      const result = analyzeFrame(imageData, correctAnswers, sampleRate)
      
      const response: ImageAnalysisResponse = {
        type: 'ANALYSIS_COMPLETE',
        ...result
      }
      
      self.postMessage(response)
    } catch (error) {
      self.postMessage({
        type: 'ANALYSIS_ERROR',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }
}

/**
 * Main frame analysis function
 * Optimized for Web Worker environment
 */
function analyzeFrame(
  imageData: ImageData, 
  correctAnswers: string[], 
  sampleRate: number
) {
  const { data, width, height } = imageData
  
  // Convert to grayscale with optimized sampling
  const sampledWidth = Math.floor(width / sampleRate)
  const sampledHeight = Math.floor(height / sampleRate)
  const grayscale = new Uint8Array(sampledWidth * sampledHeight)
  
  // Vectorized grayscale conversion
  for (let y = 0; y < sampledHeight; y++) {
    for (let x = 0; x < sampledWidth; x++) {
      const sourceX = x * sampleRate
      const sourceY = y * sampleRate
      const sourceIdx = (sourceY * width + sourceX) * 4
      
      // Optimized grayscale formula
      const gray = (data[sourceIdx] * 0.299 + data[sourceIdx + 1] * 0.587 + data[sourceIdx + 2] * 0.114) | 0
      grayscale[y * sampledWidth + x] = gray
    }
  }
  
  // Calculate quality metrics
  const focus = calculateFastFocus(grayscale, sampledWidth, sampledHeight)
  const brightness = calculateFastBrightness(grayscale)
  const alignment = detectPaperAlignment(grayscale, sampledWidth, sampledHeight, sampleRate)
  
  // Bubble detection (only when paper detected)
  let bubbles: any[] = []
  if (alignment.paperDetected && correctAnswers.length > 0) {
    bubbles = detectBubbles(grayscale, sampledWidth, sampledHeight, alignment, sampleRate, correctAnswers)
  }
  
  // Calculate overall quality
  const overall = (focus * 0.4 + brightness * 0.3 + alignment.alignment * 0.3)
  
  const qualityMetrics = {
    focus,
    brightness,
    contrast: alignment.alignment,
    skew: 1 - alignment.alignment,
    overall,
    issues: generateIssues(focus, brightness, alignment),
    recommendations: generateRecommendations(focus, brightness, alignment)
  }
  
  return {
    qualityMetrics,
    alignmentStatus: alignment,
    detectedBubbles: bubbles
  }
}

/**
 * Optimized focus calculation using Laplacian variance
 */
function calculateFastFocus(grayscale: Uint8Array, width: number, height: number): number {
  let variance = 0
  let count = 0
  
  // Sample every 8th pixel for better performance
  for (let y = 2; y < height - 2; y += 8) {
    for (let x = 2; x < width - 2; x += 8) {
      const idx = y * width + x
      if (idx < grayscale.length - width - 1) {
        // Laplacian kernel: [-1 -1 -1; -1 8 -1; -1 -1 -1]
        const laplacian = 
          -grayscale[idx - width - 1] - grayscale[idx - width] - grayscale[idx - width + 1] +
          -grayscale[idx - 1] + 8 * grayscale[idx] - grayscale[idx + 1] +
          -grayscale[idx + width - 1] - grayscale[idx + width] - grayscale[idx + width + 1]
        
        variance += laplacian * laplacian
        count++
      }
    }
  }
  
  return count > 0 ? Math.min(1, (variance / count) / 500) : 0
}

/**
 * Optimized brightness calculation
 */
function calculateFastBrightness(grayscale: Uint8Array): number {
  // Sample every 20th pixel for better performance
  let sum = 0
  let count = 0
  
  for (let i = 0; i < grayscale.length; i += 20) {
    sum += grayscale[i]
    count++
  }
  
  return count > 0 ? (sum / count) / 255 : 0
}

/**
 * Paper alignment detection with corner markers
 */
function detectPaperAlignment(
  grayscale: Uint8Array, 
  width: number, 
  height: number, 
  sampleRate: number
) {
  // Define corner marker positions
  const markerSize = Math.floor(30 / sampleRate)
  const margin = Math.floor(80 / sampleRate)
  
  const cornerMarkers = [
    { x: margin, y: margin, name: 'TL', detected: false },
    { x: width - margin, y: margin, name: 'TR', detected: false },
    { x: margin, y: height - margin, name: 'BL', detected: false },
    { x: width - margin, y: height - margin, name: 'BR', detected: false }
  ]
  
  let detectedMarkers = 0
  
  // Detect dark rectangular markers in corners
  for (const marker of cornerMarkers) {
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
  }
  
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

/**
 * Optimized bubble detection
 */
function detectBubbles(
  grayscale: Uint8Array,
  width: number,
  height: number,
  alignment: any,
  sampleRate: number,
  correctAnswers: string[]
) {
  const bubbles: any[] = []
  
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

/**
 * Generate quality issues
 */
function generateIssues(focus: number, brightness: number, alignment: any): string[] {
  const issues = []
  
  if (focus < 0.7) issues.push('Rasm aniq emas')
  if (brightness < 0.3) issues.push('Yorug\'lik kam')
  if (brightness > 0.8) issues.push('Juda yorqin')
  if (!alignment.paperDetected) issues.push('Qog\'oz topilmadi')
  if (alignment.alignment < 0.8) issues.push('Qog\'oz qiyshaygan')
  
  return issues
}

/**
 * Generate quality recommendations
 */
function generateRecommendations(focus: number, brightness: number, alignment: any): string[] {
  const recommendations = []
  
  if (focus < 0.7) recommendations.push('📱 Kamerani yaqinlashtiring va fokusni sozlang')
  if (brightness < 0.3) recommendations.push('💡 Ko\'proq yorug\'lik kerak')
  if (brightness > 0.8) recommendations.push('🌤️ Yorug\'likni kamaytiring')
  if (!alignment.paperDetected) recommendations.push('📄 OMR varaqni ramkaga joylashtiring')
  if (alignment.alignment < 0.8) recommendations.push('📐 Qog\'ozni to\'g\'ri joylashtiring')
  
  return recommendations
}

// Export for TypeScript
export {}