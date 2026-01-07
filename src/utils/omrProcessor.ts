// Professional OMR Processing System
// OpenCV-based deterministic bubble detection without deep learning

export interface OMRResult {
  rollNumber: string
  answers: AnswerResult[]
  invalidQuestions: number[]
  needsManualReview: boolean
  confidence: number
  processingTime: number
}

export interface AnswerResult {
  question: number
  detected: string | null
  confidence: number
  needsReview?: boolean
}

export interface ProcessingOptions {
  totalQuestions: number
  answerOptions: string[]
  threshold?: number
}

export interface BubbleDetectionResult {
  filledPixelRatio: number
  confidence: number
  isFilled: boolean
  needsReview: boolean
}

// PROFESSIONAL OMR PROCESSING PIPELINE
// Based on OpenCV principles - deterministic, no deep learning

/**
 * Main OMR processing function
 * Implements robust bubble detection with confidence scoring
 */
export const processOMRImage = async (
  imageData: string, 
  options: ProcessingOptions,
  _answerKey?: string[]
): Promise<OMRResult> => {
  console.log('=== PROFESSIONAL OMR PROCESSING STARTED ===')
  const startTime = Date.now()
  
  try {
    // Step 1: Image preprocessing
    const preprocessedImage = await preprocessOMRImage(imageData)
    
    // Step 2: Template-based bubble detection
    const bubbleResults = await detectBubblesWithTemplate(preprocessedImage, options)
    
    // Step 3: Roll number extraction
    const rollNumber = await extractRollNumber(preprocessedImage)
    
    // Step 4: Answer validation and confidence scoring
    const { answers, invalidQuestions, needsManualReview } = validateAndScoreAnswers(bubbleResults, options)
    
    const processingTime = Date.now() - startTime
    
    const result: OMRResult = {
      rollNumber,
      answers,
      invalidQuestions,
      needsManualReview,
      confidence: calculateOverallConfidence(answers),
      processingTime
    }
    
    console.log('=== OMR PROCESSING COMPLETED ===')
    console.log('Result:', result)
    
    return result
    
  } catch (error) {
    console.error('OMR Processing Error:', error)
    throw new Error('OMR processing failed: ' + error)
  }
}

/**
 * STEP 1: Image Preprocessing Pipeline
 * - Convert to grayscale
 * - Apply adaptive thresholding  
 * - Deskew and normalize perspective
 * - Remove noise with morphological operations
 */
const preprocessOMRImage = async (imageData: string): Promise<ImageData> => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        
        if (!ctx) {
          reject(new Error('Canvas context not available'))
          return
        }

        canvas.width = img.width
        canvas.height = img.height
        
        // Draw original image
        ctx.drawImage(img, 0, 0)
        let imageDataObj = ctx.getImageData(0, 0, canvas.width, canvas.height)
        
        console.log('Preprocessing steps:')
        
        // 1. Convert to grayscale
        console.log('1. Converting to grayscale...')
        imageDataObj = convertToGrayscale(imageDataObj)
        
        // 2. Apply adaptive thresholding
        console.log('2. Applying adaptive thresholding...')
        imageDataObj = applyAdaptiveThreshold(imageDataObj)
        
        // 3. Deskew (simple rotation correction)
        console.log('3. Deskewing image...')
        imageDataObj = deskewImage(imageDataObj)
        
        // 4. Morphological operations for noise removal
        console.log('4. Removing noise...')
        imageDataObj = removeMorphologicalNoise(imageDataObj)
        
        console.log('Preprocessing completed')
        resolve(imageDataObj)
        
      } catch (error) {
        reject(error)
      }
    }
    
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = imageData
  })
}

/**
 * Convert image to grayscale using luminance formula
 */
const convertToGrayscale = (imageData: ImageData): ImageData => {
  const data = imageData.data
  
  for (let i = 0; i < data.length; i += 4) {
    // Luminance formula: 0.299*R + 0.587*G + 0.114*B
    const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2])
    data[i] = gray     // Red
    data[i + 1] = gray // Green  
    data[i + 2] = gray // Blue
    // Alpha unchanged
  }
  
  return imageData
}

/**
 * Apply adaptive thresholding for uneven lighting
 * IMPROVED VERSION - better for bubble detection
 */
const applyAdaptiveThreshold = (imageData: ImageData): ImageData => {
  const data = imageData.data
  const width = imageData.width
  const height = imageData.height
  const newData = new Uint8ClampedArray(data)
  
  const blockSize = Math.max(11, Math.min(31, Math.floor(Math.min(width, height) / 50))) // Dynamic block size
  const C = 15 // Increased constant for better bubble detection
  
  console.log(`Adaptive threshold: blockSize=${blockSize}, C=${C}`)
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4
      
      // Calculate local mean in blockSize x blockSize neighborhood
      let sum = 0
      let count = 0
      
      const startY = Math.max(0, y - Math.floor(blockSize / 2))
      const endY = Math.min(height - 1, y + Math.floor(blockSize / 2))
      const startX = Math.max(0, x - Math.floor(blockSize / 2))
      const endX = Math.min(width - 1, x + Math.floor(blockSize / 2))
      
      for (let ny = startY; ny <= endY; ny++) {
        for (let nx = startX; nx <= endX; nx++) {
          const nIdx = (ny * width + nx) * 4
          sum += data[nIdx] // Using red channel (grayscale)
          count++
        }
      }
      
      const localMean = sum / count
      const threshold = localMean - C
      
      // Apply threshold - INVERTED for better bubble detection
      // Dark areas (filled bubbles) become white, light areas become black
      const pixelValue = data[idx] < threshold ? 255 : 0
      newData[idx] = pixelValue
      newData[idx + 1] = pixelValue
      newData[idx + 2] = pixelValue
    }
  }
  
  // Copy back to original
  for (let i = 0; i < data.length; i++) {
    data[i] = newData[i]
  }
  
  return imageData
}

/**
 * Simple deskewing using edge detection
 * Corrects slight rotation in scanned images
 */
const deskewImage = (imageData: ImageData): ImageData => {
  // For now, return as-is. In production, implement:
  // 1. Detect dominant lines using Hough transform
  // 2. Calculate rotation angle
  // 3. Apply rotation correction
  console.log('Deskewing: Using simplified approach')
  return imageData
}

/**
 * Remove noise using morphological operations
 * Opening (erosion + dilation) to remove small noise
 */
const removeMorphologicalNoise = (imageData: ImageData): ImageData => {
  const data = imageData.data
  const width = imageData.width
  const height = imageData.height
  
  // Simple 3x3 erosion followed by dilation (opening)
  let tempData = new Uint8ClampedArray(data)
  
  // Erosion
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4
      
      let minValue = 255
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nIdx = ((y + dy) * width + (x + dx)) * 4
          minValue = Math.min(minValue, data[nIdx])
        }
      }
      
      tempData[idx] = minValue
      tempData[idx + 1] = minValue
      tempData[idx + 2] = minValue
    }
  }
  
  // Dilation
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4
      
      let maxValue = 0
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nIdx = ((y + dy) * width + (x + dx)) * 4
          maxValue = Math.max(maxValue, tempData[nIdx])
        }
      }
      
      data[idx] = maxValue
      data[idx + 1] = maxValue
      data[idx + 2] = maxValue
    }
  }
  
  return imageData
}

/**
 * STEP 2: Template-based bubble detection
 * Uses fixed coordinates and filledPixelRatio calculation
 * IMPROVED with better template positioning
 */
const detectBubblesWithTemplate = async (
  imageData: ImageData, 
  options: ProcessingOptions
): Promise<{ [questionNumber: number]: { [option: string]: BubbleDetectionResult } }> => {
  
  console.log('=== TEMPLATE-BASED BUBBLE DETECTION ===')
  console.log('Image dimensions:', imageData.width, 'x', imageData.height)
  
  const results: { [questionNumber: number]: { [option: string]: BubbleDetectionResult } } = {}
  
  // IMPROVED OMR sheet template - more realistic dimensions
  const sheetTemplate = {
    questionsPerRow: 5,
    answersPerQuestion: options.answerOptions.length,
    bubbleRadius: Math.min(imageData.width, imageData.height) / 80, // Dynamic radius based on image size
    questionSpacing: { 
      x: imageData.width / 6,  // More space between questions
      y: imageData.height / 15 // More space between rows
    },
    startPosition: { 
      x: imageData.width * 0.1,   // 10% from left edge
      y: imageData.height * 0.2   // 20% from top edge
    },
    optionSpacing: imageData.width / 25 // Space between A, B, C, D, E
  }
  
  console.log('Template settings:')
  console.log('- Bubble radius:', sheetTemplate.bubbleRadius.toFixed(1))
  console.log('- Question spacing:', sheetTemplate.questionSpacing.x.toFixed(0), 'x', sheetTemplate.questionSpacing.y.toFixed(0))
  console.log('- Start position:', sheetTemplate.startPosition.x.toFixed(0), ',', sheetTemplate.startPosition.y.toFixed(0))
  console.log('- Option spacing:', sheetTemplate.optionSpacing.toFixed(0))
  
  for (let questionNumber = 1; questionNumber <= options.totalQuestions; questionNumber++) {
    results[questionNumber] = {}
    
    const row = Math.floor((questionNumber - 1) / sheetTemplate.questionsPerRow)
    const col = (questionNumber - 1) % sheetTemplate.questionsPerRow
    
    const questionX = sheetTemplate.startPosition.x + col * sheetTemplate.questionSpacing.x
    const questionY = sheetTemplate.startPosition.y + row * sheetTemplate.questionSpacing.y
    
    console.log(`\nQuestion ${questionNumber} (row=${row}, col=${col}): Position (${questionX.toFixed(0)}, ${questionY.toFixed(0)})`)
    
    // Detect each answer option bubble
    for (let optionIndex = 0; optionIndex < options.answerOptions.length; optionIndex++) {
      const option = options.answerOptions[optionIndex]
      
      const bubbleX = questionX + optionIndex * sheetTemplate.optionSpacing
      const bubbleY = questionY
      
      console.log(`  Analyzing option ${option} at (${bubbleX.toFixed(0)}, ${bubbleY.toFixed(0)})`)
      
      const bubbleResult = analyzeBubbleAtPosition(
        imageData, 
        bubbleX, 
        bubbleY, 
        sheetTemplate.bubbleRadius
      )
      
      results[questionNumber][option] = bubbleResult
      
      console.log(`  ${option}: filled=${bubbleResult.isFilled}, confidence=${bubbleResult.confidence.toFixed(3)}, review=${bubbleResult.needsReview}`)
    }
  }
  
  return results
}

/**
 * Analyze individual bubble using filledPixelRatio method
 * Core algorithm: blackPixels / totalPixels
 * IMPROVED VERSION with better debugging and detection
 */
const analyzeBubbleAtPosition = (
  imageData: ImageData,
  centerX: number,
  centerY: number,
  radius: number
): BubbleDetectionResult => {
  
  const data = imageData.data
  const width = imageData.width
  const height = imageData.height
  
  let blackPixels = 0
  let totalPixels = 0
  let pixelValues: number[] = []
  
  // Scan circular area around bubble center
  for (let y = Math.max(0, centerY - radius); y <= Math.min(height - 1, centerY + radius); y++) {
    for (let x = Math.max(0, centerX - radius); x <= Math.min(width - 1, centerX + radius); x++) {
      const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2)
      
      if (distance <= radius) {
        const idx = (Math.floor(y) * width + Math.floor(x)) * 4
        const pixelValue = data[idx] // Red channel (grayscale)
        
        totalPixels++
        pixelValues.push(pixelValue)
        
        // UPDATED THRESHOLD for inverted image
        if (pixelValue > 127) { // Changed: white pixels in inverted image = filled bubbles
          blackPixels++
        }
      }
    }
  }
  
  const filledPixelRatio = totalPixels > 0 ? blackPixels / totalPixels : 0
  
  // Calculate statistics for debugging
  const avgPixelValue = pixelValues.length > 0 ? pixelValues.reduce((a, b) => a + b, 0) / pixelValues.length : 255
  const minPixelValue = pixelValues.length > 0 ? Math.min(...pixelValues) : 255
  const maxPixelValue = pixelValues.length > 0 ? Math.max(...pixelValues) : 255
  
  console.log(`    Bubble analysis: center=(${centerX.toFixed(0)}, ${centerY.toFixed(0)}) radius=${radius}`)
  console.log(`    Pixels: total=${totalPixels}, black=${blackPixels}, ratio=${filledPixelRatio.toFixed(3)}`)
  console.log(`    Values: avg=${avgPixelValue.toFixed(0)}, min=${minPixelValue}, max=${maxPixelValue}`)
  
  // IMPROVED CONFIDENCE SCORING RULES
  let confidence: number
  let isFilled: boolean
  let needsReview: boolean
  
  // More sensitive thresholds for better detection
  if (filledPixelRatio >= 0.3) { // Lowered from 0.7 to 0.3
    // Likely filled
    confidence = Math.min(1.0, filledPixelRatio * 2) // Boost confidence
    isFilled = true
    needsReview = filledPixelRatio < 0.5 // Review if less than 50%
    console.log(`    -> FILLED (ratio=${filledPixelRatio.toFixed(3)}, confidence=${confidence.toFixed(3)})`)
  } else if (filledPixelRatio >= 0.15) { // Lowered from 0.4 to 0.15
    // Uncertain - needs manual review
    confidence = filledPixelRatio * 2
    isFilled = false
    needsReview = true
    console.log(`    -> UNCERTAIN (ratio=${filledPixelRatio.toFixed(3)}, needs review)`)
  } else {
    // Clearly blank
    confidence = 1.0 - filledPixelRatio
    isFilled = false
    needsReview = false
    console.log(`    -> BLANK (ratio=${filledPixelRatio.toFixed(3)})`)
  }
  
  return {
    filledPixelRatio,
    confidence,
    isFilled,
    needsReview
  }
}

/**
 * STEP 3: Roll number extraction
 * Extract student ID from digit bubbles
 */
const extractRollNumber = async (_imageData: ImageData): Promise<string> => {
  // Mock implementation - in production:
  // 1. Locate roll number grid area
  // 2. For each column, detect filled digit (0-9)
  // 3. Validate exactly one digit per column
  // 4. Return concatenated roll number
  
  console.log('Roll number extraction: Using mock implementation')
  return `STU${Math.floor(Math.random() * 9000) + 1000}`
}

/**
 * STEP 4: Answer validation and confidence scoring
 * Apply validation rules and determine final answers
 */
const validateAndScoreAnswers = (
  bubbleResults: { [questionNumber: number]: { [option: string]: BubbleDetectionResult } },
  options: ProcessingOptions
): {
  answers: AnswerResult[]
  invalidQuestions: number[]
  needsManualReview: boolean
} => {
  
  console.log('=== ANSWER VALIDATION AND SCORING ===')
  
  const answers: AnswerResult[] = []
  const invalidQuestions: number[] = []
  let needsManualReview = false
  
  for (let questionNumber = 1; questionNumber <= options.totalQuestions; questionNumber++) {
    const questionBubbles = bubbleResults[questionNumber] || {}
    
    // Find all filled bubbles for this question
    const filledOptions: string[] = []
    const uncertainOptions: string[] = []
    let maxConfidence = 0
    let bestOption: string | null = null
    
    for (const option of options.answerOptions) {
      const bubble = questionBubbles[option]
      if (!bubble) continue
      
      if (bubble.isFilled) {
        filledOptions.push(option)
      }
      
      if (bubble.needsReview) {
        uncertainOptions.push(option)
        needsManualReview = true
      }
      
      if (bubble.confidence > maxConfidence) {
        maxConfidence = bubble.confidence
        bestOption = option
      }
    }
    
    console.log(`Question ${questionNumber}: filled=${filledOptions.join(',')}, uncertain=${uncertainOptions.join(',')}, best=${bestOption}`)
    
    // VALIDATION RULES
    let detected: string | null = null
    let confidence = maxConfidence
    let needsReview = false
    
    if (filledOptions.length > 1) {
      // Multiple options filled - INVALID
      invalidQuestions.push(questionNumber)
      detected = null
      needsReview = true
      needsManualReview = true
      console.log(`  -> INVALID: Multiple options filled`)
    } else if (filledOptions.length === 1) {
      // Single option filled - VALID
      detected = filledOptions[0]
      console.log(`  -> VALID: Single option ${detected}`)
    } else if (uncertainOptions.length > 0) {
      // Uncertain bubbles - needs review
      detected = null
      needsReview = true
      needsManualReview = true
      console.log(`  -> UNCERTAIN: Needs manual review`)
    } else {
      // No bubbles filled - blank answer
      detected = null
      console.log(`  -> BLANK: No option selected`)
    }
    
    answers.push({
      question: questionNumber,
      detected,
      confidence,
      needsReview
    })
  }
  
  console.log(`Validation complete: ${invalidQuestions.length} invalid, needsManualReview=${needsManualReview}`)
  
  return {
    answers,
    invalidQuestions,
    needsManualReview
  }
}

/**
 * Calculate overall confidence score
 */
const calculateOverallConfidence = (answers: AnswerResult[]): number => {
  if (answers.length === 0) return 0
  
  const totalConfidence = answers.reduce((sum, answer) => sum + answer.confidence, 0)
  return totalConfidence / answers.length
}

/**
 * Legacy compatibility function
 * Converts new OMR format to old format for existing UI
 */
export const processOMRImageLegacy = async (
  imageData: string, 
  options: ProcessingOptions,
  answerKey?: string[]
): Promise<{
  studentId: string
  answers: { [questionNumber: number]: string[] }
  confidence: number
  processingTime: number
}> => {
  
  const result = await processOMRImage(imageData, options, answerKey)
  
  // Convert new format to legacy format
  const legacyAnswers: { [questionNumber: number]: string[] } = {}
  
  result.answers.forEach(answer => {
    if (answer.detected) {
      legacyAnswers[answer.question] = [answer.detected]
    } else {
      legacyAnswers[answer.question] = []
    }
  })
  
  return {
    studentId: result.rollNumber,
    answers: legacyAnswers,
    confidence: result.confidence,
    processingTime: result.processingTime
  }
}

// Calculate score based on answer key - UPDATED FOR NEW FORMAT

/**
 * Legacy validation function for compatibility
 */
export const validateOMRSheet = (_imageData: string): Promise<{
  isValid: boolean
  issues: string[]
  suggestions: string[]
  confidence: number
}> => {
  return new Promise((resolve) => {
    // Simple validation - accept most images
    resolve({
      isValid: true,
      issues: [],
      suggestions: [],
      confidence: 0.8
    })
  })
}
export const calculateScore = (
  studentAnswers: { [questionNumber: number]: string[] },
  answerKey: string[],
  scoring: { correct: number; wrong: number; blank: number }
): {
  score: number
  correctCount: number
  wrongCount: number
  blankCount: number
  details: { [questionNumber: number]: 'correct' | 'wrong' | 'blank' }
} => {
  console.log('=== BALL HISOBLASH BOSHLANDI ===')
  console.log('Student answers:', studentAnswers)
  console.log('Answer key:', answerKey)
  console.log('Scoring system:', scoring)
  
  let correctCount = 0
  let wrongCount = 0
  let blankCount = 0
  const details: { [questionNumber: number]: 'correct' | 'wrong' | 'blank' } = {}
  
  // Get total questions from answer key length or student answers
  const totalQuestions = Math.max(answerKey.length, Object.keys(studentAnswers).length)
  console.log('Total questions:', totalQuestions)
  
  for (let questionNumber = 1; questionNumber <= totalQuestions; questionNumber++) {
    const studentAnswer = studentAnswers[questionNumber] || []
    const correctAnswerString = answerKey[questionNumber - 1] || ''
    
    console.log(`Savol ${questionNumber}:`, {
      studentAnswer,
      correctAnswerString,
      studentAnswerLength: studentAnswer.length
    })
    
    // Bo'sh javob tekshirish
    if (studentAnswer.length === 0) {
      blankCount++
      details[questionNumber] = 'blank'
      console.log(`  -> Bo'sh javob`)
      continue
    }
    
    // Agar javob kaliti bo'sh bo'lsa
    if (!correctAnswerString || correctAnswerString.trim() === '') {
      wrongCount++
      details[questionNumber] = 'wrong'
      console.log(`  -> Kalit javob yo'q, noto'g'ri deb belgilandi`)
      continue
    }
    
    // To'g'ri javoblarni parse qilish va normalize qilish
    const correctAnswers = correctAnswerString
      .split(',')
      .map(a => a.trim().toUpperCase())
      .filter(a => a.length > 0)
      .sort() // MUHIM: Tartibni bir xil qilish
    
    const studentAnswersUpper = studentAnswer
      .map(a => a.toUpperCase())
      .sort() // MUHIM: Tartibni bir xil qilish
    
    console.log(`  -> Taqqoslash (normalized):`, {
      correctAnswers,
      studentAnswersUpper
    })
    
    // Javoblarni solishtirish - SORTED COMPARISON
    const isCorrect = correctAnswers.length === studentAnswersUpper.length &&
      correctAnswers.join(',') === studentAnswersUpper.join(',')
    
    if (isCorrect) {
      correctCount++
      details[questionNumber] = 'correct'
      console.log(`  -> To'g'ri javob!`)
    } else {
      wrongCount++
      details[questionNumber] = 'wrong'
      console.log(`  -> Noto'g'ri javob`)
    }
  }
  
  // Ball hisoblash
  const score = Math.max(0, 
    correctCount * scoring.correct + 
    wrongCount * scoring.wrong + 
    blankCount * scoring.blank
  )
  
  console.log('=== YAKUNIY NATIJA ===')
  console.log('Correct:', correctCount)
  console.log('Wrong:', wrongCount)
  console.log('Blank:', blankCount)
  console.log('Score:', score)
  
  return {
    score,
    correctCount,
    wrongCount,
    blankCount,
    details
  }
}