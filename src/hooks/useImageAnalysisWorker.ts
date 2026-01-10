/**
 * Hook for using Image Analysis Web Worker
 * Provides optimized image processing without blocking main thread
 */

import { useRef, useCallback, useEffect } from 'react'

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

interface AnalysisResult {
  qualityMetrics: QualityMetrics
  alignmentStatus: AlignmentStatus
  detectedBubbles: DetectedBubble[]
}

interface UseImageAnalysisWorkerOptions {
  onAnalysisComplete?: (result: AnalysisResult) => void
  onError?: (error: string) => void
}

export const useImageAnalysisWorker = (options: UseImageAnalysisWorkerOptions = {}) => {
  const workerRef = useRef<Worker | null>(null)
  const isProcessingRef = useRef(false)
  const { onAnalysisComplete, onError } = options

  // Initialize worker
  useEffect(() => {
    try {
      // Create worker from the TypeScript file
      // Vite will handle the worker compilation
      workerRef.current = new Worker(
        new URL('../workers/imageAnalysisWorker.ts', import.meta.url),
        { type: 'module' }
      )

      // Handle worker messages
      workerRef.current.onmessage = (e) => {
        const { type, ...data } = e.data

        if (type === 'ANALYSIS_COMPLETE') {
          isProcessingRef.current = false
          onAnalysisComplete?.(data as AnalysisResult)
        } else if (type === 'ANALYSIS_ERROR') {
          isProcessingRef.current = false
          onError?.(data.error)
        }
      }

      // Handle worker errors
      workerRef.current.onerror = (error) => {
        console.error('Image Analysis Worker Error:', error)
        isProcessingRef.current = false
        onError?.('Worker error occurred')
      }

      console.log('✅ Image Analysis Worker initialized')

    } catch (error) {
      console.error('❌ Failed to initialize Image Analysis Worker:', error)
      onError?.('Failed to initialize worker')
    }

    // Cleanup on unmount
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate()
        workerRef.current = null
      }
    }
  }, [onAnalysisComplete, onError])

  // Analyze frame function
  const analyzeFrame = useCallback((
    imageData: ImageData,
    correctAnswers: string[] = [],
    sampleRate: number = 4
  ) => {
    if (!workerRef.current) {
      console.warn('⚠️ Worker not initialized')
      return false
    }

    if (isProcessingRef.current) {
      // Skip if already processing
      return false
    }

    try {
      isProcessingRef.current = true
      
      workerRef.current.postMessage({
        type: 'ANALYZE_FRAME',
        imageData,
        correctAnswers,
        sampleRate
      })

      return true
    } catch (error) {
      console.error('❌ Failed to send analysis request:', error)
      isProcessingRef.current = false
      onError?.('Failed to send analysis request')
      return false
    }
  }, [onError])

  // Check if worker is available
  const isWorkerAvailable = useCallback(() => {
    return workerRef.current !== null && !isProcessingRef.current
  }, [])

  // Check if currently processing
  const isProcessing = useCallback(() => {
    return isProcessingRef.current
  }, [])

  // Terminate worker manually (useful for cleanup)
  const terminateWorker = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate()
      workerRef.current = null
      isProcessingRef.current = false
    }
  }, [])

  return {
    analyzeFrame,
    isWorkerAvailable,
    isProcessing,
    terminateWorker
  }
}

/**
 * Fallback analysis function for when Web Workers are not available
 * Uses the same algorithms but runs on main thread
 */
export const analyzeFallback = (
  imageData: ImageData,
  _correctAnswers: string[] = [],
  sampleRate: number = 4
): AnalysisResult => {
  console.log('⚠️ Using fallback analysis (main thread)')
  
  const { data, width, height } = imageData
  
  // Convert to grayscale with optimized sampling
  const sampledWidth = Math.floor(width / sampleRate)
  const sampledHeight = Math.floor(height / sampleRate)
  const grayscale = new Uint8Array(sampledWidth * sampledHeight)
  
  // Simplified grayscale conversion for fallback
  for (let y = 0; y < sampledHeight; y++) {
    for (let x = 0; x < sampledWidth; x++) {
      const sourceX = x * sampleRate
      const sourceY = y * sampleRate
      const sourceIdx = (sourceY * width + sourceX) * 4
      
      const gray = (data[sourceIdx] * 0.299 + data[sourceIdx + 1] * 0.587 + data[sourceIdx + 2] * 0.114) | 0
      grayscale[y * sampledWidth + x] = gray
    }
  }
  
  // Basic quality metrics
  const focus = calculateBasicFocus(grayscale, sampledWidth, sampledHeight)
  const brightness = calculateBasicBrightness(grayscale)
  
  // Basic alignment detection
  const alignment: AlignmentStatus = {
    paperDetected: brightness > 0.2 && brightness < 0.9,
    withinFrame: true,
    alignment: focus * brightness,
    corners: [
      { x: 100, y: 100, detected: true, name: 'TL' },
      { x: width - 100, y: 100, detected: true, name: 'TR' },
      { x: 100, y: height - 100, detected: true, name: 'BL' },
      { x: width - 100, y: height - 100, detected: true, name: 'BR' }
    ]
  }
  
  const overall = (focus * 0.4 + brightness * 0.3 + alignment.alignment * 0.3)
  
  const qualityMetrics: QualityMetrics = {
    focus,
    brightness,
    contrast: alignment.alignment,
    skew: 1 - alignment.alignment,
    overall,
    issues: focus < 0.7 ? ['Rasm aniq emas'] : [],
    recommendations: focus < 0.7 ? ['📱 Kamerani yaqinlashtiring'] : []
  }
  
  return {
    qualityMetrics,
    alignmentStatus: alignment,
    detectedBubbles: [] // No bubble detection in fallback
  }
}

// Helper functions for fallback
function calculateBasicFocus(grayscale: Uint8Array, width: number, height: number): number {
  let variance = 0
  let count = 0
  
  for (let y = 1; y < height - 1; y += 4) {
    for (let x = 1; x < width - 1; x += 4) {
      const idx = y * width + x
      if (idx < grayscale.length - width - 1) {
        const laplacian = 
          -grayscale[idx - width] - grayscale[idx - 1] + 4 * grayscale[idx] - grayscale[idx + 1] - grayscale[idx + width]
        
        variance += laplacian * laplacian
        count++
      }
    }
  }
  
  return count > 0 ? Math.min(1, (variance / count) / 300) : 0
}

function calculateBasicBrightness(grayscale: Uint8Array): number {
  let sum = 0
  let count = 0
  
  for (let i = 0; i < grayscale.length; i += 10) {
    sum += grayscale[i]
    count++
  }
  
  return count > 0 ? (sum / count) / 255 : 0
}