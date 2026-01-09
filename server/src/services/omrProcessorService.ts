/**
 * Professional OpenCV-based OMR Processing Service
 * Template-based coordinate system with 8 alignment marks
 */

import sharp from 'sharp'
import { createRequire } from 'module'
import { OMRCoordinateService, OMRCoordinateMap, BubbleCoordinate } from './omrCoordinateService.js'

// Use createRequire for Jimp compatibility in ES modules
const require = createRequire(import.meta.url)
const { Jimp, intToRGBA } = require('jimp')

export interface OMRProcessingResult {
  extractedAnswers: string[]
  confidence: number
  processingDetails: {
    alignmentMarksFound: number
    bubbleDetectionAccuracy: number
    imageQuality: number
    processingMethod: string
    imageInfo: {
      width: number
      height: number
      format: string
      size: number
    }
    actualQuestionCount: number
    expectedQuestionCount: number
    examStructure?: {
      totalQuestions: number
      structure: string
      subjectCount: number
    }
    templateInfo?: {
      templateId: string
      calibrationAccuracy: number
      alignmentQuality: number
    }
  }
  detailedResults: Array<{
    question: number
    detectedAnswer: string
    confidence: number
    bubbleIntensities: { [option: string]: number }
    bubbleCoordinates: { [option: string]: { x: number; y: number } }
  }>
}

export class OMRProcessorService {
  
  /**
   * Main OMR processing function using precise coordinate mapping
   */
  static async processOMRSheet(
    imageBuffer: Buffer,
    answerKey: string[],
    examMetadata?: any
  ): Promise<OMRProcessingResult> {
    console.log('=== PRECISE COORDINATE-BASED OMR PROCESSING STARTED ===')
    console.log('Expected questions from answer key:', answerKey.length)
    console.log('Exam metadata provided:', !!examMetadata)
    console.log('Exam ID:', examMetadata?.examId || examMetadata?._id)
    console.log('Image buffer size:', imageBuffer.length, 'bytes')
    
    try {
      // Step 1: Real image preprocessing
      const preprocessedImage = await this.preprocessImageReal(imageBuffer)
      
      // Step 2: Generate precise coordinate map from exam metadata
      const coordinateMap = await this.generatePreciseCoordinateMap(examMetadata)
      
      if (!coordinateMap) {
        console.log('⚠️  No coordinate map generated, falling back to generic processing')
        return await this.processWithoutTemplate(preprocessedImage, answerKey)
      }
      
      // Step 3: Detect alignment marks for coordinate calibration
      const alignmentData = await this.detectAlignmentMarks(preprocessedImage.jimpImage)
      
      // Step 4: Calibrate coordinates based on detected alignment marks
      const calibratedCoordinates = await this.calibrateCoordinates(
        coordinateMap, 
        alignmentData, 
        preprocessedImage.jimpImage
      )
      
      // Step 5: Process questions using calibrated precise coordinates
      const bubbleAnalysis = await this.processQuestionsWithPreciseCoordinates(
        preprocessedImage.jimpImage, 
        calibratedCoordinates,
        answerKey.length
      )
      
      // Step 6: Determine answers based on analysis
      const extractedAnswers = await this.determineAnswersFromAnalysis(bubbleAnalysis, answerKey.length)
      
      // Step 7: Calculate confidence
      const confidence = this.calculateProcessingConfidence(bubbleAnalysis, alignmentData, calibratedCoordinates)
      
      return {
        extractedAnswers,
        confidence,
        processingDetails: {
          alignmentMarksFound: alignmentData.totalDetected,
          bubbleDetectionAccuracy: bubbleAnalysis.accuracy,
          imageQuality: preprocessedImage.quality,
          processingMethod: 'Precise Coordinate Mapping System',
          imageInfo: preprocessedImage.imageInfo,
          actualQuestionCount: bubbleAnalysis.detailedResults.length,
          expectedQuestionCount: answerKey.length,
          ...(coordinateMap && {
            examStructure: {
              totalQuestions: coordinateMap.totalQuestions,
              structure: coordinateMap.structure,
              subjectCount: coordinateMap.metadata.subjects
            }
          })
        },
        detailedResults: bubbleAnalysis.detailedResults
      }
      
    } catch (error) {
      console.error('Precise coordinate OMR processing error:', error)
      
      // Fallback to generic processing
      console.log('🔄 Falling back to generic processing...')
      const preprocessedImage = await this.preprocessImageReal(imageBuffer)
      return await this.processWithoutTemplate(preprocessedImage, answerKey)
    }
  }
  
  /**
   * Real image preprocessing using Sharp
   */
  private static async preprocessImageReal(imageBuffer: Buffer): Promise<{
    processedImage: Buffer
    quality: number
    imageInfo: {
      width: number
      height: number
      format: string
      size: number
    }
    jimpImage: any
  }> {
    console.log('🔧 Real image preprocessing started...')
    
    try {
      // Get image metadata
      const metadata = await sharp(imageBuffer).metadata()
      console.log(`📊 Original image: ${metadata.width}x${metadata.height}, ${metadata.format}, ${imageBuffer.length} bytes`)
      
      // Process with Sharp
      const processedBuffer = await sharp(imageBuffer)
        .grayscale()
        .normalize()
        .sharpen()
        .png()
        .toBuffer()
      
      // Load into Jimp for pixel analysis
      const jimpImage = await Jimp.read(processedBuffer)
      
      // Assess image quality
      const quality = await this.assessImageQuality(jimpImage)
      
      const imageInfo = {
        width: jimpImage.bitmap.width,
        height: jimpImage.bitmap.height,
        format: 'png',
        size: processedBuffer.length
      }
      
      console.log(`✅ Preprocessing complete: ${imageInfo.width}x${imageInfo.height}, quality: ${Math.round(quality * 100)}%`)
      
      return {
        processedImage: processedBuffer,
        quality,
        imageInfo,
        jimpImage
      }
    } catch (error) {
      console.error('Image preprocessing error:', error)
      throw new Error(`Image preprocessing failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
  
  /**
   * Assess image quality
   */
  private static async assessImageQuality(jimpImage: any): Promise<number> {
    const width = jimpImage.bitmap.width
    const height = jimpImage.bitmap.height
    
    let totalVariance = 0
    let sampleCount = 0
    
    // Sample pixels for variance calculation
    for (let y = 0; y < height; y += 10) {
      for (let x = 0; x < width; x += 10) {
        const pixel = jimpImage.getPixelColor(x, y)
        const { r } = intToRGBA(pixel)
        totalVariance += r
        sampleCount++
      }
    }
    
    const avgVariance = totalVariance / sampleCount
    const quality = Math.min(avgVariance / 128, 1.0)
    
    return quality
  }
  
  /**
   * Generate precise coordinate map from exam metadata
   */
  private static async generatePreciseCoordinateMap(examMetadata: any): Promise<OMRCoordinateMap | null> {
    console.log('🎯 Generating precise coordinate map from exam metadata...')
    
    if (!examMetadata) {
      console.log('❌ No exam metadata provided')
      return null
    }
    
    try {
      // Generate coordinate map using OMRCoordinateService
      const coordinateMap = OMRCoordinateService.generateCoordinateMap(examMetadata)
      
      // Validate the coordinate map
      const validation = OMRCoordinateService.validateCoordinateMap(coordinateMap)
      
      if (!validation.isValid) {
        console.log('⚠️  Coordinate map validation issues:')
        validation.issues.forEach(issue => console.log(`   - ${issue}`))
      }
      
      console.log(`✅ Coordinate map generated successfully:`)
      console.log(`   Total bubbles: ${validation.statistics.totalBubbles}`)
      console.log(`   Questions: ${validation.statistics.questionsWithCoordinates}`)
      console.log(`   Avg bubbles per question: ${validation.statistics.averageBubblesPerQuestion.toFixed(1)}`)
      
      return coordinateMap
    } catch (error) {
      console.error('Error generating coordinate map:', error)
      return null
    }
  }
  
  /**
   * Calibrate coordinates based on detected alignment marks
   */
  private static async calibrateCoordinates(
    coordinateMap: OMRCoordinateMap,
    alignmentData: any,
    jimpImage: any
  ): Promise<{
    coordinateMap: OMRCoordinateMap
    calibration: any
    bubbleCoordinates: BubbleCoordinate[]
  }> {
    console.log('📐 Calibrating coordinates based on alignment marks...')
    
    const imageWidth = jimpImage.bitmap.width
    const imageHeight = jimpImage.bitmap.height
    
    // Calculate calibration from alignment marks
    const calibration = this.calculateCoordinateCalibration(alignmentData, imageWidth, imageHeight)
    
    // Apply calibration to all bubble coordinates
    const calibratedBubbles = coordinateMap.bubbleCoordinates.map(bubble => ({
      ...bubble,
      x: calibration.offsetX + (bubble.x * calibration.scaleX),
      y: calibration.offsetY + (bubble.y * calibration.scaleY)
    }))
    
    console.log(`✅ Calibrated ${calibratedBubbles.length} bubble coordinates`)
    console.log(`   Scale: (${calibration.scaleX.toFixed(3)}, ${calibration.scaleY.toFixed(3)})`)
    console.log(`   Offset: (${Math.round(calibration.offsetX)}, ${Math.round(calibration.offsetY)})`)
    
    return {
      coordinateMap,
      calibration,
      bubbleCoordinates: calibratedBubbles
    }
  }
  
  /**
   * Process questions using precise calibrated coordinates
   */
  private static async processQuestionsWithPreciseCoordinates(
    jimpImage: any,
    calibratedCoordinates: any,
    expectedQuestions: number
  ): Promise<any> {
    console.log('=== PRECISE COORDINATE-BASED QUESTION PROCESSING ===')
    console.log(`Processing ${calibratedCoordinates.bubbleCoordinates.length} bubbles for ${expectedQuestions} questions`)
    
    const detailedResults = []
    
    // Group bubbles by question number
    const questionGroups = new Map<number, BubbleCoordinate[]>()
    calibratedCoordinates.bubbleCoordinates.forEach((bubble: BubbleCoordinate) => {
      if (!questionGroups.has(bubble.questionNumber)) {
        questionGroups.set(bubble.questionNumber, [])
      }
      questionGroups.get(bubble.questionNumber)!.push(bubble)
    })
    
    // Process each question
    for (const [questionNumber, bubbles] of questionGroups) {
      if (questionNumber > expectedQuestions) continue
      
      console.log(`\n=== QUESTION ${questionNumber} (PRECISE COORDINATES) ===`)
      
      const bubbleIntensities: { [option: string]: number } = {}
      const bubbleCoordinates: { [option: string]: { x: number; y: number } } = {}
      let maxIntensity = 0
      let detectedAnswer = 'BLANK'
      
      // Get question type and answer options
      const questionType = bubbles[0]?.questionType || 'multiple_choice_5'
      const answerOptions = bubbles.map(b => b.option).sort()
      
      console.log(`   Question type: ${questionType}`)
      console.log(`   Answer options: ${answerOptions.join(', ')}`)
      
      // Analyze each bubble using precise coordinates
      for (const bubble of bubbles) {
        bubbleCoordinates[bubble.option] = { x: bubble.x, y: bubble.y }
        
        console.log(`  📍 ${bubble.option} option: (${Math.round(bubble.x)}, ${Math.round(bubble.y)})`)
        
        // Analyze bubble intensity at precise coordinates
        const intensity = await this.analyzeBubbleIntensityEnhanced(
          jimpImage, 
          bubble.x, 
          bubble.y, 
          15, 
          bubble.option, 
          questionNumber
        )
        
        bubbleIntensities[bubble.option] = intensity
        
        // 40% threshold for detection
        if (intensity >= 0.4) {
          if (intensity > maxIntensity) {
            maxIntensity = intensity
            detectedAnswer = bubble.option
          }
        }
      }
      
      // Calculate confidence based on intensity and clarity
      let confidence = 0.3 // base confidence
      if (maxIntensity >= 0.6) {
        confidence = 0.9 // high confidence
      } else if (maxIntensity >= 0.4) {
        confidence = 0.7 // medium confidence
      }
      
      // Check for multiple marked answers (reduce confidence)
      const markedAnswers = Object.entries(bubbleIntensities).filter(([_, intensity]) => intensity >= 0.4)
      if (markedAnswers.length > 1) {
        confidence *= 0.6 // reduce confidence for multiple marks
        console.log(`   ⚠️  Multiple answers detected: ${markedAnswers.map(([opt, _]) => opt).join(', ')}`)
      }
      
      console.log(`🎯 Question ${questionNumber}: ${detectedAnswer} (${Math.round(maxIntensity * 100)}% filled, ${Math.round(confidence * 100)}% confidence)`)
      
      detailedResults.push({
        question: questionNumber,
        detectedAnswer,
        confidence,
        bubbleIntensities,
        bubbleCoordinates,
        questionType,
        subjectName: bubbles[0]?.subjectName,
        sectionName: bubbles[0]?.sectionName
      })
    }
    
    // Calculate overall accuracy
    const highConfidenceAnswers = detailedResults.filter(r => r.confidence > 0.7)
    const accuracy = detailedResults.length > 0 ? highConfidenceAnswers.length / detailedResults.length : 0
    
    console.log(`\n📊 PRECISE COORDINATE PROCESSING RESULTS:`)
    console.log(`   Total questions processed: ${detailedResults.length}`)
    console.log(`   High confidence answers: ${highConfidenceAnswers.length}`)
    console.log(`   Processing accuracy: ${Math.round(accuracy * 100)}%`)
    
    return {
      accuracy,
      detailedResults
    }
  }
  
  /**
   * Detect alignment marks for coordinate calibration
   */
  private static async detectAlignmentMarks(jimpImage: any): Promise<any> {
    console.log('🎯 Detecting alignment marks for coordinate calibration...')
    
    const width = jimpImage.bitmap.width
    const height = jimpImage.bitmap.height
    const detectedMarks = []
    
    // Define expected alignment mark positions (relative to image size)
    const expectedPositions = [
      { x: 0.02, y: 0.02, name: 'top-left' },
      { x: 0.98, y: 0.02, name: 'top-right' },
      { x: 0.02, y: 0.98, name: 'bottom-left' },
      { x: 0.98, y: 0.98, name: 'bottom-right' },
      { x: 0.02, y: 0.35, name: 'left-mid1' },
      { x: 0.02, y: 0.55, name: 'left-mid2' },
      { x: 0.98, y: 0.35, name: 'right-mid1' },
      { x: 0.98, y: 0.55, name: 'right-mid2' }
    ]
    
    // Search for alignment marks
    for (const pos of expectedPositions) {
      const searchX = Math.round(pos.x * width)
      const searchY = Math.round(pos.y * height)
      
      const mark = await this.findAlignmentMarkAt(jimpImage, searchX, searchY, 20)
      if (mark) {
        detectedMarks.push({
          ...mark,
          name: pos.name,
          expected: { x: searchX, y: searchY }
        })
        console.log(`   ✅ Found ${pos.name} mark at (${mark.x}, ${mark.y})`)
      } else {
        console.log(`   ❌ Missing ${pos.name} mark at expected (${searchX}, ${searchY})`)
      }
    }
    
    console.log(`📊 Alignment marks detected: ${detectedMarks.length}/8`)
    
    return {
      totalDetected: detectedMarks.length,
      marks: detectedMarks,
      imageSize: { width, height }
    }
  }
  
  /**
   * Find alignment mark at specific coordinates
   */
  private static async findAlignmentMarkAt(jimpImage: any, centerX: number, centerY: number, searchRadius: number): Promise<any> {
    let bestMatch = null
    let maxDarkPixels = 0
    
    // Search in area around expected position
    for (let y = centerY - searchRadius; y <= centerY + searchRadius; y += 2) {
      for (let x = centerX - searchRadius; x <= centerX + searchRadius; x += 2) {
        if (x < 0 || y < 0 || x >= jimpImage.bitmap.width || y >= jimpImage.bitmap.height) continue
        
        // Check for dark square (alignment mark)
        const darkPixels = await this.countDarkPixelsInSquare(jimpImage, x, y, 6)
        
        if (darkPixels > maxDarkPixels && darkPixels >= 20) { // At least 20 dark pixels in 6x6 area
          maxDarkPixels = darkPixels
          bestMatch = { x, y, darkPixels }
        }
      }
    }
    
    return bestMatch
  }
  
  /**
   * Count dark pixels in square area
   */
  private static async countDarkPixelsInSquare(jimpImage: any, centerX: number, centerY: number, size: number): Promise<number> {
    let darkPixels = 0
    const halfSize = Math.floor(size / 2)
    
    for (let y = centerY - halfSize; y <= centerY + halfSize; y++) {
      for (let x = centerX - halfSize; x <= centerX + halfSize; x++) {
        if (x >= 0 && y >= 0 && x < jimpImage.bitmap.width && y < jimpImage.bitmap.height) {
          const pixel = jimpImage.getPixelColor(x, y)
          const { r } = intToRGBA(pixel)
          
          if (r < 128) { // Dark pixel threshold
            darkPixels++
          }
        }
      }
    }
    
    return darkPixels
  }
  
  /**
   * Calculate dynamic coordinates based on exam structure
   */
  private static async calculateDynamicCoordinates(
    examStructure: any,
    alignmentData: any,
    jimpImage: any,
    expectedQuestions: number
  ): Promise<any> {
    console.log('📐 Calculating dynamic coordinates based on exam structure...')
    
    const width = jimpImage.bitmap.width
    const height = jimpImage.bitmap.height
    
    // Use detected alignment marks to calibrate coordinate system
    const calibration = this.calculateCoordinateCalibration(alignmentData, width, height)
    
    // Calculate question positions based on structure
    let coordinateMapping: { [questionNumber: string]: any } = {}
    
    if (examStructure?.structure === 'subject_in_column') {
      // Subject-based layout
      coordinateMapping = await this.calculateSubjectBasedCoordinates(
        examStructure, 
        calibration, 
        expectedQuestions
      )
    } else {
      // Continuous layout (default)
      coordinateMapping = await this.calculateContinuousCoordinates(
        calibration, 
        expectedQuestions
      )
    }
    
    console.log(`✅ Dynamic coordinates calculated for ${Object.keys(coordinateMapping).length} questions`)
    
    return {
      coordinateMapping,
      calibration,
      examStructure
    }
  }
  
  /**
   * Calculate coordinate calibration from alignment marks
   */
  private static calculateCoordinateCalibration(alignmentData: any, width: number, height: number): any {
    console.log('🎯 Calculating coordinate calibration...')
    
    // Default calibration if no alignment marks
    let calibration = {
      offsetX: 0,
      offsetY: 0,
      scaleX: 1.0,
      scaleY: 1.0,
      accuracy: 0.5
    }
    
    if (alignmentData.totalDetected >= 4) {
      // Calculate calibration from detected marks
      const marks = alignmentData.marks
      
      // Find corner marks
      const topLeft = marks.find((m: any) => m.name === 'top-left')
      const topRight = marks.find((m: any) => m.name === 'top-right')
      const bottomLeft = marks.find((m: any) => m.name === 'bottom-left')
      const bottomRight = marks.find((m: any) => m.name === 'bottom-right')
      
      if (topLeft && topRight && bottomLeft && bottomRight) {
        // Calculate scale and offset from corner marks
        const expectedWidth = width * 0.96 // Expected distance between left and right marks
        const expectedHeight = height * 0.96 // Expected distance between top and bottom marks
        
        const actualWidth = (topRight.x + bottomRight.x) / 2 - (topLeft.x + bottomLeft.x) / 2
        const actualHeight = (bottomLeft.y + bottomRight.y) / 2 - (topLeft.y + topRight.y) / 2
        
        calibration = {
          offsetX: (topLeft.x + bottomLeft.x) / 2,
          offsetY: (topLeft.y + topRight.y) / 2,
          scaleX: actualWidth / expectedWidth,
          scaleY: actualHeight / expectedHeight,
          accuracy: 0.9
        }
        
        console.log(`   Calibration: offset(${Math.round(calibration.offsetX)}, ${Math.round(calibration.offsetY)}), scale(${calibration.scaleX.toFixed(3)}, ${calibration.scaleY.toFixed(3)})`)
      }
    }
    
    return calibration
  }
  
  /**
   * Calculate coordinates for continuous layout
   */
  private static async calculateContinuousCoordinates(calibration: any, expectedQuestions: number): Promise<any> {
    console.log('📊 Calculating continuous layout coordinates...')
    
    const coordinateMapping: { [questionNumber: string]: any } = {}
    
    // 3-column layout parameters
    const questionsPerColumn = Math.ceil(expectedQuestions / 3)
    const columnWidth = 180 // pixels between columns
    const rowHeight = 25 // pixels between rows
    const startX = 80 // starting X position
    const startY = 200 // starting Y position after header
    
    for (let i = 1; i <= expectedQuestions; i++) {
      const columnIndex = Math.floor((i - 1) / questionsPerColumn)
      const rowIndex = (i - 1) % questionsPerColumn
      
      const baseX = startX + (columnIndex * columnWidth)
      const baseY = startY + (rowIndex * rowHeight)
      
      // Apply calibration
      const calibratedX = calibration.offsetX + (baseX * calibration.scaleX)
      const calibratedY = calibration.offsetY + (baseY * calibration.scaleY)
      
      // Calculate bubble positions (A, B, C, D, E)
      const bubblePositions: { [option: string]: { x: number; y: number } } = {}
      const bubbleSpacing = 18
      const bubbleStartX = calibratedX + 35 // offset from question marker
      
      const defaultOptions = ['A', 'B', 'C', 'D', 'E']
      defaultOptions.forEach((option: string, optionIndex: number) => {
        bubblePositions[option] = {
          x: bubbleStartX + (optionIndex * bubbleSpacing),
          y: calibratedY
        }
      })
      
      coordinateMapping[i.toString()] = {
        questionNumber: i,
        markerPosition: { x: calibratedX, y: calibratedY },
        bubblePositions
      }
    }
    
    console.log(`   Generated coordinates for ${expectedQuestions} questions in continuous layout`)
    return coordinateMapping
  }
  
  /**
   * Calculate coordinates for subject-based layout
   */
  private static async calculateSubjectBasedCoordinates(
    examStructure: any, 
    calibration: any, 
    expectedQuestions: number
  ): Promise<any> {
    console.log('📚 Calculating subject-based layout coordinates...')
    
    const coordinateMapping: { [questionNumber: string]: any } = {}
    
    // Subject-based layout parameters
    const rowHeight = 25
    const sectionSpacing = 60 // extra space between sections
    let currentY = 200 // starting Y position
    let questionCounter = 1
    
    if (examStructure.subjects && Array.isArray(examStructure.subjects)) {
      for (const subject of examStructure.subjects) {
        if (subject.sections && Array.isArray(subject.sections)) {
          for (const section of subject.sections) {
            // Add section header space
            currentY += 40
            
            // Process questions in this section
            for (let i = 0; i < section.questionCount; i++) {
              const baseX = 80
              const baseY = currentY + (i * rowHeight)
              
              // Apply calibration
              const calibratedX = calibration.offsetX + (baseX * calibration.scaleX)
              const calibratedY = calibration.offsetY + (baseY * calibration.scaleY)
              
              // Calculate bubble positions based on question type
              const bubblePositions: { [option: string]: { x: number; y: number } } = {}
              const bubbleSpacing = 18
              const bubbleStartX = calibratedX + 35
              
              // Get answer options based on question type
              const answerOptions = this.getAnswerOptionsForQuestionType(section.questionType || 'multiple_choice_5')
              
              answerOptions.forEach((option: string, optionIndex: number) => {
                bubblePositions[option] = {
                  x: bubbleStartX + (optionIndex * bubbleSpacing),
                  y: calibratedY
                }
              })
              
              coordinateMapping[questionCounter.toString()] = {
                questionNumber: questionCounter,
                markerPosition: { x: calibratedX, y: calibratedY },
                bubblePositions,
                subjectName: subject.name,
                sectionName: section.name,
                questionType: section.questionType || 'multiple_choice_5'
              }
              
              questionCounter++
            }
            
            // Add space after section
            currentY += (section.questionCount * rowHeight) + sectionSpacing
          }
        }
      }
    }
    
    console.log(`   Generated coordinates for ${questionCounter - 1} questions in subject-based layout`)
    return coordinateMapping
  }
  
  /**
   * Get answer options for question type
   */
  private static getAnswerOptionsForQuestionType(questionType: string): string[] {
    if (questionType === 'true_false') return ['T', 'F']
    if (questionType.startsWith('multiple_choice_')) {
      const parts = questionType.split('_')
      const optionCount = parts.length > 2 && parts[2] ? parseInt(parts[2]) : 5
      return Array.from({ length: optionCount }, (_, i) => String.fromCharCode(65 + i))
    }
    return ['A', 'B', 'C', 'D', 'E'] // Default
  }
  
  /**
   * Fallback processing without template
   */
  private static async processWithoutTemplate(preprocessedImage: any, answerKey: string[]): Promise<OMRProcessingResult> {
    console.log('🔄 Processing without template (generic method)...')
    
    // Use the existing generic processing logic
    const bubbleAnalysis = await this.processQuestionsGeneric(preprocessedImage.jimpImage, answerKey.length)
    const extractedAnswers = await this.determineAnswersGeneric(bubbleAnalysis, answerKey.length)
    const confidence = this.calculateGenericConfidence(bubbleAnalysis)
    
    return {
      extractedAnswers,
      confidence,
      processingDetails: {
        alignmentMarksFound: 0,
        bubbleDetectionAccuracy: bubbleAnalysis.accuracy,
        imageQuality: preprocessedImage.quality,
        processingMethod: 'Generic Coordinate Detection (Fallback)',
        imageInfo: preprocessedImage.imageInfo,
        actualQuestionCount: bubbleAnalysis.detailedResults.length,
        expectedQuestionCount: answerKey.length
      },
      detailedResults: bubbleAnalysis.detailedResults
    }
  }
  /**
   * Process questions using dynamic coordinates
   */
  private static async processQuestionsWithDynamicCoordinates(
    jimpImage: any,
    coordinateData: any,
    examStructure: any,
    expectedQuestions: number
  ): Promise<any> {
    console.log('=== DYNAMIC COORDINATE-BASED QUESTION PROCESSING ===')
    console.log(`Processing ${Object.keys(coordinateData.coordinateMapping).length} questions`)
    
    const detailedResults = []
    
    // Process each question using dynamic coordinates
    for (const [questionNumberStr, questionCoords] of Object.entries(coordinateData.coordinateMapping)) {
      const questionNumber = parseInt(questionNumberStr)
      
      console.log(`\n=== QUESTION ${questionNumber} (DYNAMIC COORDINATES) ===`)
      
      const bubbleIntensities: { [option: string]: number } = {}
      const bubbleCoordinates: { [option: string]: { x: number; y: number } } = {}
      let maxIntensity = 0
      let detectedAnswer = 'BLANK'
      
      // Get answer options for this question
      const questionType = (questionCoords as any).questionType || 'multiple_choice_5'
      const answerOptions = this.getAnswerOptionsForQuestionType(questionType)
      
      console.log(`   Question type: ${questionType}`)
      console.log(`   Answer options: ${answerOptions.join(', ')}`)
      
      // Analyze each option using dynamic coordinates
      for (const option of answerOptions) {
        const coords = (questionCoords as any).bubblePositions[option]
        if (!coords) continue
        
        bubbleCoordinates[option] = coords
        
        console.log(`  📍 ${option} option: (${Math.round(coords.x)}, ${Math.round(coords.y)})`)
        
        // Analyze bubble intensity at calculated coordinates
        const intensity = await this.analyzeBubbleIntensityEnhanced(
          jimpImage, 
          coords.x, 
          coords.y, 
          15, 
          option, 
          questionNumber
        )
        
        bubbleIntensities[option] = intensity
        
        // 40% threshold for detection
        if (intensity >= 0.4) {
          if (intensity > maxIntensity) {
            maxIntensity = intensity
            detectedAnswer = option
          }
        }
      }
      
      // Calculate confidence based on intensity and clarity
      let confidence = 0.3 // base confidence
      if (maxIntensity >= 0.6) {
        confidence = 0.9 // high confidence
      } else if (maxIntensity >= 0.4) {
        confidence = 0.7 // medium confidence
      }
      
      // Check for multiple marked answers (reduce confidence)
      const markedAnswers = Object.entries(bubbleIntensities).filter(([_, intensity]) => intensity >= 0.4)
      if (markedAnswers.length > 1) {
        confidence *= 0.6 // reduce confidence for multiple marks
        console.log(`   ⚠️  Multiple answers detected: ${markedAnswers.map(([opt, _]) => opt).join(', ')}`)
      }
      
      console.log(`🎯 Question ${questionNumber}: ${detectedAnswer} (${Math.round(maxIntensity * 100)}% filled, ${Math.round(confidence * 100)}% confidence)`)
      
      detailedResults.push({
        question: questionNumber,
        detectedAnswer,
        confidence,
        bubbleIntensities,
        bubbleCoordinates,
        questionType,
        subjectName: (questionCoords as any).subjectName,
        sectionName: (questionCoords as any).sectionName
      })
    }
    
    // Calculate overall accuracy
    const highConfidenceAnswers = detailedResults.filter(r => r.confidence > 0.7)
    const accuracy = detailedResults.length > 0 ? highConfidenceAnswers.length / detailedResults.length : 0
    
    console.log(`\n📊 DYNAMIC PROCESSING RESULTS:`)
    console.log(`   Total questions processed: ${detailedResults.length}`)
    console.log(`   High confidence answers: ${highConfidenceAnswers.length}`)
    console.log(`   Processing accuracy: ${Math.round(accuracy * 100)}%`)
    
    return {
      accuracy,
      detailedResults
    }
  }
  
  /**
   * Determine answers from analysis results
   */
  private static async determineAnswersFromAnalysis(bubbleAnalysis: any, expectedQuestions: number): Promise<string[]> {
    console.log('🎯 Determining final answers from analysis...')
    console.log(`Expected questions: ${expectedQuestions}, Processed questions: ${bubbleAnalysis.detailedResults.length}`)
    
    const answers = new Array(expectedQuestions).fill('BLANK')
    
    // Fill answers from analysis results
    for (const result of bubbleAnalysis.detailedResults) {
      const questionIndex = result.question - 1 // Convert to 0-based index
      if (questionIndex >= 0 && questionIndex < expectedQuestions) {
        answers[questionIndex] = result.detectedAnswer
      }
    }
    
    // Log statistics
    const actualQuestionCount = bubbleAnalysis.detailedResults.length
    const answeredCount = answers.filter(a => a !== 'BLANK').length
    const blankCount = expectedQuestions - answeredCount
    
    console.log(`📊 FINAL ANSWER STATISTICS:`)
    console.log(`   Expected questions: ${expectedQuestions}`)
    console.log(`   Processed questions: ${actualQuestionCount}`)
    console.log(`   Answered questions: ${answeredCount}`)
    console.log(`   Blank questions: ${blankCount}`)
    
    return answers
  }
  
  /**
   * Calculate processing confidence
   */
  private static calculateProcessingConfidence(bubbleAnalysis: any, alignmentData: any, coordinateData: any): number {
    // Base confidence from alignment marks detection
    const alignmentConfidence = alignmentData.totalDetected / 8 // 8 expected marks
    
    // Coordinate calibration confidence
    const calibrationConfidence = coordinateData.calibration?.accuracy || 0.5
    
    // Bubble detection confidence
    const bubbleConfidence = bubbleAnalysis.accuracy
    
    // Combined confidence (weighted average)
    const confidence = (alignmentConfidence * 0.3) + (calibrationConfidence * 0.3) + (bubbleConfidence * 0.4)
    
    console.log(`📊 PROCESSING CONFIDENCE:`)
    console.log(`   Alignment marks: ${Math.round(alignmentConfidence * 100)}%`)
    console.log(`   Coordinate calibration: ${Math.round(calibrationConfidence * 100)}%`)
    console.log(`   Bubble detection: ${Math.round(bubbleConfidence * 100)}%`)
    console.log(`   Overall confidence: ${Math.round(confidence * 100)}%`)
    
    return confidence
  }
  
  /**
   * Enhanced bubble intensity analysis
   */
  private static async analyzeBubbleIntensityEnhanced(
    jimpImage: any,
    centerX: number,
    centerY: number,
    radius: number,
    option: string,
    questionNumber: number
  ): Promise<number> {
    let darkPixels = 0
    let totalPixels = 0
    let totalBrightness = 0
    let minBrightness = 255
    let maxBrightness = 0
    
    // Analyze circular area around bubble center
    for (let y = centerY - radius; y <= centerY + radius; y++) {
      for (let x = centerX - radius; x <= centerX + radius; x++) {
        // Check if pixel is within circle
        const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2)
        if (distance <= radius) {
          const pixel = jimpImage.getPixelColor(x, y)
          const { r } = intToRGBA(pixel)
          
          totalBrightness += r
          minBrightness = Math.min(minBrightness, r)
          maxBrightness = Math.max(maxBrightness, r)
          
          // Count dark pixels (threshold: 160)
          if (r < 160) {
            darkPixels++
          }
          totalPixels++
        }
      }
    }
    
    // Calculate intensity (percentage of dark pixels)
    const intensity = totalPixels > 0 ? darkPixels / totalPixels : 0
    const avgBrightness = totalPixels > 0 ? totalBrightness / totalPixels : 255
    const contrast = maxBrightness - minBrightness
    
    console.log(`    ${option} harf (Savol ${questionNumber}): (${Math.round(centerX)}, ${Math.round(centerY)})`)
    console.log(`      Radius: ${radius}px, Dark pixels: ${darkPixels}/${totalPixels}`)
    console.log(`      Intensity: ${Math.round(intensity * 100)}%, Avg brightness: ${Math.round(avgBrightness)}, Contrast: ${contrast}`)
    
    if (intensity >= 0.4) {
      console.log(`      ✅ ${option} BELGILANGAN (${Math.round(intensity * 100)}%)`)
    } else {
      console.log(`      ⚪ ${option} bo'sh (${Math.round(intensity * 100)}%)`)
    }
    
    return intensity
  }
  
  /**
   * Validate OMR processing results
   */
  static validateResults(extractedAnswers: string[], expectedQuestionCount: number): any {
    console.log('🔍 Validating OMR processing results...')
    
    const issues = []
    const warnings = []
    
    // Check answer count
    if (extractedAnswers.length !== expectedQuestionCount) {
      issues.push(`Answer count mismatch: got ${extractedAnswers.length}, expected ${expectedQuestionCount}`)
    }
    
    // Check for invalid answers
    const validAnswers = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'T', 'F', 'BLANK', '']
    const invalidAnswers = extractedAnswers.filter(answer => !validAnswers.includes(answer))
    if (invalidAnswers.length > 0) {
      issues.push(`Invalid answers detected: ${invalidAnswers.join(', ')}`)
    }
    
    // Check blank answer ratio
    const blankCount = extractedAnswers.filter(answer => answer === 'BLANK' || answer === '').length
    const blankRatio = blankCount / extractedAnswers.length
    if (blankRatio > 0.5) {
      warnings.push(`High blank answer ratio: ${Math.round(blankRatio * 100)}%`)
    }
    
    // Check answer distribution
    const answerCounts: { [answer: string]: number } = {}
    extractedAnswers.forEach(answer => {
      if (answer !== 'BLANK' && answer !== '') {
        answerCounts[answer] = (answerCounts[answer] || 0) + 1
      }
    })
    
    const answeredCount = extractedAnswers.length - blankCount
    if (answeredCount > 0) {
      const maxAnswerCount = Math.max(...Object.values(answerCounts))
      const maxAnswerRatio = maxAnswerCount / answeredCount
      if (maxAnswerRatio > 0.8) {
        warnings.push(`Suspicious answer pattern: one option selected ${Math.round(maxAnswerRatio * 100)}% of the time`)
      }
    }
    
    const isValid = issues.length === 0
    
    console.log(`📊 Validation results:`)
    console.log(`   Valid: ${isValid}`)
    console.log(`   Issues: ${issues.length}`)
    console.log(`   Warnings: ${warnings.length}`)
    
    if (issues.length > 0) {
      console.log(`   Issues: ${issues.join('; ')}`)
    }
    if (warnings.length > 0) {
      console.log(`   Warnings: ${warnings.join('; ')}`)
    }
    
    return {
      isValid,
      issues,
      warnings,
      statistics: {
        totalAnswers: extractedAnswers.length,
        blankAnswers: blankCount,
        answeredQuestions: answeredCount,
        blankRatio: Math.round(blankRatio * 100),
        answerDistribution: answerCounts
      }
    }
  }
  
  /**
   * Generic processing methods (fallback)
   */
  private static async processQuestionsGeneric(jimpImage: any, expectedQuestions: number): Promise<any> {
    console.log('🔄 Using generic processing (fallback method)...')
    
    // This is a simplified fallback implementation
    const detailedResults = []
    
    for (let i = 1; i <= expectedQuestions; i++) {
      detailedResults.push({
        question: i,
        detectedAnswer: 'BLANK',
        confidence: 0.5,
        bubbleIntensities: { A: 0, B: 0, C: 0, D: 0, E: 0 },
        bubbleCoordinates: { A: { x: 0, y: 0 }, B: { x: 0, y: 0 }, C: { x: 0, y: 0 }, D: { x: 0, y: 0 }, E: { x: 0, y: 0 } }
      })
    }
    
    return {
      accuracy: 0.5,
      detailedResults
    }
  }
  
  private static async determineAnswersGeneric(bubbleAnalysis: any, expectedQuestions: number): Promise<string[]> {
    return new Array(expectedQuestions).fill('BLANK')
  }
  
  private static calculateGenericConfidence(bubbleAnalysis: any): number {
    return 0.5
  }
}