/**
 * Alignment Detection Service
 * Detects 8 black rectangles on paper sides for coordinate calibration
 */

import { createRequire } from 'module'
import { AlignmentMark } from '../types/examTemplate.js'

const require = createRequire(import.meta.url)
const { Jimp, intToRGBA } = require('jimp')

export interface DetectedAlignment {
  leftSideMarks: AlignmentMark[]
  rightSideMarks: AlignmentMark[]
  totalDetected: number
  calibrationQuality: number
  imageInfo: {
    width: number
    height: number
  }
}

export class AlignmentDetectionService {
  
  /**
   * Detect all 8 alignment marks (4 on each side)
   */
  static async detectAlignmentMarks(jimpImage: any): Promise<DetectedAlignment> {
    console.log('🎯 8 ta alignment mark ni aniqlash boshlandi...')
    
    const width = jimpImage.bitmap.width
    const height = jimpImage.bitmap.height
    
    console.log(`📏 Rasm o'lchami: ${width}x${height}`)
    
    // Detect marks on left side
    const leftSideMarks = await this.detectSideMarks(jimpImage, 'left', width, height)
    
    // Detect marks on right side  
    const rightSideMarks = await this.detectSideMarks(jimpImage, 'right', width, height)
    
    const totalDetected = leftSideMarks.length + rightSideMarks.length
    const calibrationQuality = totalDetected / 8 // 8 expected marks
    
    console.log(`\n📊 ALIGNMENT MARKS NATIJALARI:`)
    console.log(`   Chap tomon: ${leftSideMarks.length}/4 ta mark`)
    console.log(`   O'ng tomon: ${rightSideMarks.length}/4 ta mark`)
    console.log(`   Jami topilgan: ${totalDetected}/8 ta`)
    console.log(`   Kalibrlash sifati: ${Math.round(calibrationQuality * 100)}%`)
    
    return {
      leftSideMarks,
      rightSideMarks,
      totalDetected,
      calibrationQuality,
      imageInfo: { width, height }
    }
  }
  
  /**
   * Detect alignment marks on one side (left or right)
   */
  private static async detectSideMarks(
    jimpImage: any,
    side: 'left' | 'right',
    imageWidth: number,
    imageHeight: number
  ): Promise<AlignmentMark[]> {
    console.log(`\n🔍 ${side === 'left' ? 'Chap' : "O'ng"} tomon marklarini qidirish...`)
    
    const marks: AlignmentMark[] = []
    
    // Define search area for this side
    const searchArea = this.getSearchArea(side, imageWidth, imageHeight)
    console.log(`   Qidiruv hududi: x=${searchArea.startX}-${searchArea.endX}, y=${searchArea.startY}-${searchArea.endY}`)
    
    // Mark detection parameters
    const markWidth = 15
    const markHeight = 15
    const darkThreshold = 80
    const minDarkRatio = 0.7
    
    // Scan for marks in this area
    for (let y = searchArea.startY; y < searchArea.endY - markHeight; y += 5) {
      for (let x = searchArea.startX; x < searchArea.endX - markWidth; x += 5) {
        
        const markInfo = await this.analyzeMarkCandidate(
          jimpImage, x, y, markWidth, markHeight, darkThreshold, minDarkRatio
        )
        
        if (markInfo.isValidMark) {
          // Check if this mark is too close to existing marks
          const tooClose = marks.some(existing => 
            Math.abs(existing.position.x - x) < 30 && Math.abs(existing.position.y - y) < 30
          )
          
          if (!tooClose) {
            const mark: AlignmentMark = {
              id: `${side.toUpperCase()}${marks.length + 1}`,
              position: { x: x + markWidth/2, y: y + markHeight/2 },
              size: { width: markWidth, height: markHeight },
              expectedBrightness: markInfo.avgBrightness,
              tolerance: 30
            }
            
            marks.push(mark)
            console.log(`   ✅ ${mark.id} topildi: (${Math.round(mark.position.x)}, ${Math.round(mark.position.y)}) - qora: ${Math.round(markInfo.darkRatio * 100)}%`)
            
            // Skip ahead to avoid duplicates
            y += markHeight + 10
            break
          }
        }
      }
    }
    
    // Sort marks by Y position (top to bottom)
    marks.sort((a, b) => a.position.y - b.position.y)
    
    // Update IDs after sorting
    marks.forEach((mark, index) => {
      mark.id = `${side.toUpperCase()}${index + 1}`
    })
    
    console.log(`   📍 ${side === 'left' ? 'Chap' : "O'ng"} tomonda ${marks.length} ta mark topildi`)
    
    return marks
  }
  
  /**
   * Get search area coordinates for a side
   */
  private static getSearchArea(side: 'left' | 'right', width: number, height: number) {
    if (side === 'left') {
      return {
        startX: 0,
        endX: Math.floor(width * 0.15), // First 15% of width
        startY: Math.floor(height * 0.02), // Skip top 2%
        endY: Math.floor(height * 0.98)  // Skip bottom 2%
      }
    } else {
      return {
        startX: Math.floor(width * 0.85), // Last 15% of width
        endX: width,
        startY: Math.floor(height * 0.02),
        endY: Math.floor(height * 0.98)
      }
    }
  }
  
  /**
   * Analyze a potential alignment mark
   */
  private static async analyzeMarkCandidate(
    jimpImage: any,
    startX: number,
    startY: number,
    markWidth: number,
    markHeight: number,
    darkThreshold: number,
    minDarkRatio: number
  ): Promise<{
    isValidMark: boolean
    darkRatio: number
    avgBrightness: number
    uniformity: number
  }> {
    let darkPixels = 0
    let totalPixels = 0
    let totalBrightness = 0
    const brightnessValues: number[] = []
    
    // Analyze all pixels in the mark area
    for (let y = startY; y < startY + markHeight; y++) {
      for (let x = startX; x < startX + markWidth; x++) {
        if (x >= 0 && x < jimpImage.bitmap.width && y >= 0 && y < jimpImage.bitmap.height) {
          const color = jimpImage.getPixelColor(x, y)
          const rgba = intToRGBA(color)
          const brightness = (rgba.r + rgba.g + rgba.b) / 3
          
          totalBrightness += brightness
          brightnessValues.push(brightness)
          
          if (brightness < darkThreshold) {
            darkPixels++
          }
          totalPixels++
        }
      }
    }
    
    const darkRatio = totalPixels > 0 ? darkPixels / totalPixels : 0
    const avgBrightness = totalPixels > 0 ? totalBrightness / totalPixels : 255
    
    // Calculate uniformity (consistency of darkness)
    const variance = brightnessValues.reduce((sum, val) => sum + Math.pow(val - avgBrightness, 2), 0) / brightnessValues.length
    const uniformity = 1 / (1 + Math.sqrt(variance) / 100)
    
    // Validation criteria for alignment marks
    const isValidMark = 
      darkRatio >= minDarkRatio &&           // Sufficient dark pixels
      avgBrightness < (darkThreshold + 20) && // Low average brightness
      uniformity > 0.5 &&                    // Good uniformity
      totalPixels > (markWidth * markHeight * 0.8) // Sufficient pixels analyzed
    
    return {
      isValidMark,
      darkRatio,
      avgBrightness,
      uniformity
    }
  }
  
  /**
   * Validate alignment mark quality
   */
  static validateAlignmentQuality(detectedAlignment: DetectedAlignment): {
    isValid: boolean
    issues: string[]
    recommendations: string[]
  } {
    const issues: string[] = []
    const recommendations: string[] = []
    
    // Check total marks detected
    if (detectedAlignment.totalDetected < 6) {
      issues.push(`Kam mark topildi: ${detectedAlignment.totalDetected}/8`)
      recommendations.push('Rasm sifatini yaxshilang yoki yorug\'likni sozlang')
    }
    
    // Check side balance
    const leftCount = detectedAlignment.leftSideMarks.length
    const rightCount = detectedAlignment.rightSideMarks.length
    
    if (Math.abs(leftCount - rightCount) > 2) {
      issues.push(`Tomonlar orasida nomutanosiblik: chap=${leftCount}, o'ng=${rightCount}`)
      recommendations.push('Qog\'ozni to\'g\'ri joylashtiring')
    }
    
    // Check calibration quality
    if (detectedAlignment.calibrationQuality < 0.75) {
      issues.push(`Past kalibrlash sifati: ${Math.round(detectedAlignment.calibrationQuality * 100)}%`)
      recommendations.push('Alignment marklarni aniqroq chop eting')
    }
    
    const isValid = issues.length === 0
    
    return { isValid, issues, recommendations }
  }
}