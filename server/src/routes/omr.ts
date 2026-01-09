import { Router } from 'express'
import { Request, Response } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { OMRProcessorService } from '../services/omrProcessorService.js'
import { OMRCoordinateService } from '../services/omrCoordinateService.js'
import { pythonOMRService } from '../services/pythonOMRService.js'
import { authenticate } from '../middleware/auth.js'
import Joi from 'joi'

const router = Router()

// Multer configuration for OMR image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/omr'
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, 'omr-' + uniqueSuffix + path.extname(file.originalname))
  }
})

const fileFilter = (req: any, file: any, cb: any) => {
  // Accept only image files
  if (file.mimetype.startsWith('image/')) {
    cb(null, true)
  } else {
    cb(new Error('Faqat rasm fayllari qabul qilinadi'), false)
  }
}

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
})

// OMR processing validation schema
const omrProcessingSchema = Joi.object({
  answerKey: Joi.array().items(
    Joi.string().allow('').optional() // Allow empty strings in answer key
  ).required().messages({
    'array.base': 'Javob kalitlari array bo\'lishi kerak',
    'any.required': 'Javob kalitlari majburiy'
  }),
  scoring: Joi.object({
    correct: Joi.number().required(),
    wrong: Joi.number().required(),
    blank: Joi.number().required()
  }).optional().default({ correct: 1, wrong: 0, blank: 0 }).messages({
    'object.base': 'Baholash tizimi obyekt bo\'lishi kerak'
  }),
  examId: Joi.string().optional().messages({
    'string.base': 'Imtihon ID si string bo\'lishi kerak'
  }),
  examData: Joi.object().allow(null).optional().messages({
    'object.base': 'Imtihon ma\'lumotlari obyekt bo\'lishi kerak'
  }),
  debug: Joi.boolean().optional().default(false)
})
/**
 * POST /api/omr/process
 * Hybrid OMR processing - tries Python first, falls back to Node.js
 */
router.post('/process', upload.single('image'), async (req: Request, res: Response) => {
  console.log('🔥 HYBRID OMR PROCESSING ENDPOINT HIT')
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'OMR rasm fayli topilmadi'
      })
    }

    // Check if Python server is available
    console.log('🔍 Checking Python OMR processor availability...')
    const pythonAvailable = await pythonOMRService.isAvailable()
    console.log(`Python processor available: ${pythonAvailable}`)
    
    if (pythonAvailable) {
      console.log('🐍 Using Python OMR processor (primary method)')
      return await processWithPython(req, res)
    } else {
      console.log('🟡 Python processor unavailable, using Node.js OMR (fallback)')
      return await processWithNodeJS(req, res)
    }

  } catch (error) {
    console.error('Hybrid OMR processing error:', error)
    // Fallback to Node.js processing
    return await processWithNodeJS(req, res)
  }
})

/**
 * POST /api/omr/process-python
 * Python-based OMR sheet processing with ultra-precision
 */
router.post('/process-python', upload.single('image'), async (req: Request, res: Response) => {
  return await processWithPython(req, res)
})

/**
 * POST /api/omr/process-nodejs  
 * Node.js OpenCV-based OMR sheet processing with precise coordinates
 */
router.post('/process-nodejs', upload.single('image'), async (req: Request, res: Response) => {
  return await processWithNodeJS(req, res)
})

/**
 * GET /api/omr/python-status
 * Check Python OMR server status
 */
router.get('/python-status', authenticate, async (req: Request, res: Response) => {
  try {
    const connectionTest = await pythonOMRService.testConnection()
    
    if (connectionTest.success) {
      res.json({
        success: true,
        message: 'Python OMR server holati',
        data: {
          available: true,
          status: connectionTest.status,
          server_url: 'http://localhost:5000'
        }
      })
    } else {
      res.json({
        success: false,
        message: 'Python OMR server mavjud emas',
        data: {
          available: false,
          error: connectionTest.error,
          fallback_available: true
        }
      })
    }
  } catch (error) {
    console.error('Python OMR status error:', error)
    res.status(500).json({
      success: false,
      message: 'Server xatosi'
    })
  }
})
/**
 * POST /api/omr/generate-coordinates
 * Generate precise coordinate map for an exam
 */
router.post('/generate-coordinates', authenticate, async (req: Request, res: Response) => {
  try {
    const { examId } = req.body

    if (!examId) {
      return res.status(400).json({
        success: false,
        message: 'Exam ID majburiy'
      })
    }

    console.log('=== COORDINATE MAP GENERATION REQUEST ===')
    console.log('Exam ID:', examId)

    // Get exam metadata
    let examMetadata = null
    try {
      const Exam = (await import('../models/Exam.js')).default
      examMetadata = await Exam.findById(examId)
      
      if (!examMetadata) {
        return res.status(404).json({
          success: false,
          message: 'Imtihon topilmadi'
        })
      }
      
      console.log('Exam loaded:', examMetadata.name)
    } catch (examError) {
      console.error('Error loading exam:', examError)
      return res.status(500).json({
        success: false,
        message: 'Imtihon ma\'lumotlarini yuklashda xatolik'
      })
    }

    // Generate coordinate map
    const coordinateMap = OMRCoordinateService.generateCoordinateMap(examMetadata)
    
    // Validate coordinate map
    const validation = OMRCoordinateService.validateCoordinateMap(coordinateMap)
    
    console.log('=== COORDINATE MAP GENERATED ===')
    console.log(`Total bubbles: ${validation.statistics.totalBubbles}`)
    console.log(`Questions: ${validation.statistics.questionsWithCoordinates}`)
    console.log(`Valid: ${validation.isValid}`)

    res.json({
      success: true,
      message: 'Koordinata xaritasi muvaffaqiyatli yaratildi',
      data: {
        coordinateMap,
        validation,
        statistics: validation.statistics
      }
    })

  } catch (error) {
    console.error('Coordinate generation error:', error)
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Koordinata yaratishda xatolik'
    })
  }
})

/**
 * GET /api/omr/coordinates/:examId
 * Get coordinate map for an exam
 */
router.get('/coordinates/:examId', authenticate, async (req: Request, res: Response) => {
  try {
    const { examId } = req.params

    console.log('=== GET COORDINATE MAP REQUEST ===')
    console.log('Exam ID:', examId)

    // Get exam metadata
    let examMetadata = null
    try {
      const Exam = (await import('../models/Exam.js')).default
      examMetadata = await Exam.findById(examId)
      
      if (!examMetadata) {
        return res.status(404).json({
          success: false,
          message: 'Imtihon topilmadi'
        })
      }
    } catch (examError) {
      console.error('Error loading exam:', examError)
      return res.status(500).json({
        success: false,
        message: 'Imtihon ma\'lumotlarini yuklashda xatolik'
      })
    }

    // Generate coordinate map
    const coordinateMap = OMRCoordinateService.generateCoordinateMap(examMetadata)
    
    // Validate coordinate map
    const validation = OMRCoordinateService.validateCoordinateMap(coordinateMap)

    res.json({
      success: true,
      message: 'Koordinata xaritasi olindi',
      data: {
        coordinateMap,
        validation,
        examInfo: {
          name: examMetadata.name,
          date: examMetadata.date,
          structure: examMetadata.structure,
          paperSize: examMetadata.paperSize
        }
      }
    })

  } catch (error) {
    console.error('Get coordinates error:', error)
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Koordinata olishda xatolik'
    })
  }
})
/**
 * GET /api/omr/status
 * OMR processing service status
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    // Check Python server status
    const pythonStatus = await pythonOMRService.testConnection()
    
    res.json({
      success: true,
      message: 'OMR processing service holati',
      data: {
        nodejs: {
          available: true,
          method: 'OpenCV Computer Vision',
          features: [
            'Alignment mark detection',
            'Bubble intensity analysis',
            'Multi-threshold processing',
            'Quality assessment',
            'Format-aware processing'
          ],
          accuracy: '85-95%',
          processingTime: '1-3 seconds'
        },
        python: {
          available: pythonStatus.success,
          method: 'Python OpenCV Ultra-Precision',
          features: pythonStatus.status?.features || [],
          accuracy: pythonStatus.status?.accuracy || 'Unknown',
          processingTime: pythonStatus.status?.processing_time || 'Unknown',
          error: pythonStatus.error || null
        },
        hybrid: {
          enabled: true,
          primaryMethod: 'Python',
          fallbackMethod: 'Node.js'
        },
        supportedFormats: ['JPG', 'PNG', 'WebP', 'TIFF'],
        maxFileSize: '10MB'
      }
    })
  } catch (error) {
    console.error('OMR status error:', error)
    res.status(500).json({
      success: false,
      message: 'Server xatosi'
    })
  }
})

// Helper function for Python processing
async function processWithPython(req: Request, res: Response) {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'OMR rasm fayli topilmadi'
      })
    }

    console.log('=== PYTHON OMR PROCESSING ===')
    console.log('File:', req.file.filename, req.file.size, 'bytes')
    console.log('Raw request body:', req.body)
    
    let parsedData
    try {
      parsedData = {
        answerKey: JSON.parse(req.body.answerKey || '[]'),
        scoring: JSON.parse(req.body.scoring || '{}'),
        examId: req.body.examId,
        examData: req.body.examData ? JSON.parse(req.body.examData) : null,
        debug: req.body.debug === 'true'
      }
      console.log('Parsed data:', parsedData)
      console.log('Exam data from request:', parsedData.examData ? 'PROVIDED' : 'NOT PROVIDED')
    } catch (parseError) {
      console.error('JSON parse error:', parseError)
      console.error('Raw answerKey:', req.body.answerKey)
      console.error('Raw scoring:', req.body.scoring)
      console.error('Raw examData:', req.body.examData)
      return res.status(400).json({
        success: false,
        message: 'JSON parse xatosi',
        error: parseError instanceof Error ? parseError.message : 'Unknown parse error'
      })
    }

    const { error, value } = omrProcessingSchema.validate(parsedData)
    if (error) {
      console.error('Validation error details:', error.details)
      console.error('Validation error message:', error.message)
      console.error('Validated data:', parsedData)
      return res.status(400).json({
        success: false,
        message: 'Validatsiya xatosi',
        errors: error.details.map(detail => detail.message)
      })
    }

    const { answerKey, scoring, examId, examData, debug } = value
    const cleanedAnswerKey = answerKey.filter((answer: string) => answer && answer.trim() !== '')
    
    if (cleanedAnswerKey.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Hech bo\'lmaganda bitta javob kaliti bo\'lishi kerak'
      })
    }

    // Read image file
    const imagePath = req.file.path
    const imageBuffer = fs.readFileSync(imagePath)

    // Get exam metadata - prioritize examData from request, then try examId
    let examMetadata = null
    if (examData) {
      examMetadata = examData
      console.log('Using exam data from request:', examMetadata.name)
    } else if (examId) {
      try {
        const Exam = (await import('../models/Exam.js')).default
        examMetadata = await Exam.findById(examId)
        console.log('Exam metadata loaded from DB:', examMetadata?.name)
      } catch (examError) {
        console.warn('Could not load exam metadata from DB:', examError)
      }
    } else {
      console.log('No exam data or examId provided')
    }

    // Process with Python OMR server
    const startTime = Date.now()
    const processingResult = await pythonOMRService.processOMRSheet(
      imageBuffer,
      cleanedAnswerKey,
      examMetadata,
      scoring,
      debug
    )
    const processingTime = Date.now() - startTime
    processingResult.processingDetails.processingTime = processingTime

    // Handle result
    return handleOMRResult(res, processingResult, cleanedAnswerKey, scoring, imagePath)

  } catch (error) {
    // Clean up file if error occurs
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path)
    }
    
    console.error('Python OMR processing error:', error)
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'OMR qayta ishlashda xatolik'
    })
  }
}
// Helper function for Node.js processing
async function processWithNodeJS(req: Request, res: Response) {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'OMR rasm fayli topilmadi'
      })
    }

    console.log('=== NODE.JS OMR PROCESSING ===')
    console.log('File:', req.file.filename, req.file.size, 'bytes')
    console.log('Raw request body:', req.body)
    
    let parsedData
    try {
      parsedData = {
        answerKey: JSON.parse(req.body.answerKey || '[]'),
        scoring: JSON.parse(req.body.scoring || '{}'),
        examId: req.body.examId
      }
      console.log('Parsed data:', parsedData)
    } catch (parseError) {
      console.error('JSON parse error:', parseError)
      console.error('Raw answerKey:', req.body.answerKey)
      console.error('Raw scoring:', req.body.scoring)
      return res.status(400).json({
        success: false,
        message: 'JSON parse xatosi',
        error: parseError instanceof Error ? parseError.message : 'Unknown parse error'
      })
    }

    const { error, value } = omrProcessingSchema.validate(parsedData)
    if (error) {
      console.error('Validation error details:', error.details)
      console.error('Validation error message:', error.message)
      console.error('Validated data:', parsedData)
      return res.status(400).json({
        success: false,
        message: 'Validatsiya xatosi',
        errors: error.details.map(detail => detail.message)
      })
    }

    const { answerKey, scoring, examId } = value
    const cleanedAnswerKey = answerKey.filter((answer: string) => answer && answer.trim() !== '')
    
    if (cleanedAnswerKey.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Hech bo\'lmaganda bitta javob kaliti bo\'lishi kerak'
      })
    }

    // Read image file
    const imagePath = req.file.path
    const imageBuffer = fs.readFileSync(imagePath)

    // Get exam metadata if examId provided
    let examMetadata = null
    if (examId) {
      try {
        const Exam = (await import('../models/Exam.js')).default
        examMetadata = await Exam.findById(examId)
        console.log('Exam metadata loaded:', examMetadata?.name)
      } catch (examError) {
        console.warn('Could not load exam metadata:', examError)
      }
    }

    // Process OMR sheet using OpenCV-based service
    const startTime = Date.now()
    const processingResult = await OMRProcessorService.processOMRSheet(
      imageBuffer,
      cleanedAnswerKey,
      examMetadata
    )
    const processingTime = Date.now() - startTime
    
    // Add processing time and python flag to processing details
    const updatedProcessingDetails = {
      ...processingResult.processingDetails,
      processingTime,
      pythonServerUsed: false
    }

    // Handle result with updated processing details
    const resultWithUpdatedDetails = {
      ...processingResult,
      processingDetails: updatedProcessingDetails
    }
    return handleOMRResult(res, resultWithUpdatedDetails, cleanedAnswerKey, scoring, imagePath)

  } catch (error) {
    // Clean up file if error occurs
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path)
    }
    
    console.error('Node.js OMR processing error:', error)
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'OMR qayta ishlashda xatolik'
    })
  }
}

// Helper function to handle OMR processing results
function handleOMRResult(res: Response, processingResult: any, cleanedAnswerKey: string[], scoring: any, imagePath: string) {
  try {
    // Validate results
    const validation = OMRProcessorService.validateResults(
      processingResult.extractedAnswers,
      cleanedAnswerKey.length
    )

    if (!validation.isValid) {
      console.warn('Processing validation issues:', validation.issues)
    }

    // Calculate scoring
    let correctCount = 0
    let wrongCount = 0
    let blankCount = 0

    const detailedResults = processingResult.extractedAnswers.map((answer: string, index: number) => {
      const correctAnswer = cleanedAnswerKey[index]
      let isCorrect = false

      if (answer === 'BLANK' || answer === '') {
        blankCount++
      } else if (answer === correctAnswer) {
        correctCount++
        isCorrect = true
      } else {
        wrongCount++
      }

      return {
        question: index + 1,
        studentAnswer: answer,
        correctAnswer,
        isCorrect,
        points: isCorrect ? scoring.correct : (answer === 'BLANK' ? scoring.blank : scoring.wrong),
        confidence: processingResult.detailedResults[index]?.confidence || 0
      }
    })

    const totalScore = (correctCount * scoring.correct) + 
                      (wrongCount * scoring.wrong) + 
                      (blankCount * scoring.blank)

    const percentage = ((correctCount / cleanedAnswerKey.length) * 100).toFixed(1)

    // Clean up uploaded file
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath)
    }

    // Prepare response
    const response = {
      extractedAnswers: processingResult.extractedAnswers,
      answerKey: cleanedAnswerKey,
      results: detailedResults,
      summary: {
        totalQuestions: cleanedAnswerKey.length,
        correctAnswers: correctCount,
        wrongAnswers: wrongCount,
        blankAnswers: blankCount,
        totalScore,
        percentage: parseFloat(percentage),
        grade: calculateGrade(parseFloat(percentage))
      },
      confidence: processingResult.confidence,
      processingDetails: {
        ...processingResult.processingDetails,
        validation: validation
      }
    }

    console.log('=== OMR PROCESSING COMPLETED ===')
    console.log(`Method: ${processingResult.processingDetails.processingMethod}`)
    console.log(`Confidence: ${Math.round(processingResult.confidence * 100)}%`)
    console.log(`Score: ${correctCount}/${cleanedAnswerKey.length} (${percentage}%)`)
    console.log(`Processing time: ${processingResult.processingDetails.processingTime}ms`)

    res.json({
      success: true,
      message: 'OMR varaq muvaffaqiyatli qayta ishlandi',
      data: response
    })

  } catch (error) {
    console.error('Result handling error:', error)
    throw error
  }
}

/**
 * Helper function to calculate grade
 */
function calculateGrade(percentage: number): string {
  if (percentage >= 90) return 'A'
  if (percentage >= 80) return 'B'
  if (percentage >= 70) return 'C'
  if (percentage >= 60) return 'D'
  return 'F'
}

export default router