import { Router } from 'express'
import { Request, Response } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { AIService } from '../services/aiService.js'
import { authenticate } from '../middleware/auth.js'
import Joi from 'joi'

const router = Router()

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/images'
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

// Rasm tahlili uchun validation schema
const imageAnalysisSchema = Joi.object({
  image: Joi.string().required().messages({
    'string.empty': 'Rasm base64 formatida bo\'lishi kerak',
    'any.required': 'Rasm majburiy'
  }),
  prompt: Joi.string().optional().messages({
    'string.base': 'Prompt matn bo\'lishi kerak'
  })
})

// Matn tahlili uchun validation schema
const textAnalysisSchema = Joi.object({
  text: Joi.string().required().min(1).messages({
    'string.empty': 'Matn bo\'sh bo\'lmasligi kerak',
    'any.required': 'Matn majburiy',
    'string.min': 'Matn kamida 1 ta belgi bo\'lishi kerak'
  }),
  context: Joi.string().optional().messages({
    'string.base': 'Kontekst matn bo\'lishi kerak'
  })
})

// Savol tahlili uchun validation schema
const questionAnalysisSchema = Joi.object({
  questions: Joi.array().items(Joi.string().min(1)).min(1).required().messages({
    'array.base': 'Savollar array bo\'lishi kerak',
    'array.min': 'Kamida 1 ta savol bo\'lishi kerak',
    'any.required': 'Savollar majburiy'
  })
})

/**
 * POST /api/ai/upload-image
 * Rasm yuklash va tahlil qilish
 */
router.post('/upload-image', authenticate, upload.single('image'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Rasm fayli topilmadi'
      })
    }

    // Convert uploaded file to base64
    const imagePath = req.file.path
    const imageBuffer = fs.readFileSync(imagePath)
    const base64Image = imageBuffer.toString('base64')

    // Optional prompt from request body
    const prompt = req.body.prompt || undefined

    // Analyze image with AI
    const result = await AIService.analyzeImage(base64Image, prompt)

    // Clean up uploaded file
    fs.unlinkSync(imagePath)

    res.json({
      success: true,
      message: 'Rasm muvaffaqiyatli yuklandi va tahlil qilindi',
      data: {
        ...result,
        originalName: req.file.originalname,
        fileSize: req.file.size
      }
    })

  } catch (error) {
    // Clean up file if error occurs
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path)
    }
    
    console.error('Rasm yuklash va tahlil xatosi:', error)
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server xatosi'
    })
  }
})

/**
 * POST /api/ai/upload-omr
 * OMR rasm yuklash va tahlil qilish
 */
router.post('/upload-omr', authenticate, upload.single('image'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'OMR rasm fayli topilmadi'
      })
    }

    // Validate required fields
    const { answerKey, scoring } = req.body
    
    if (!answerKey) {
      return res.status(400).json({
        success: false,
        message: 'Javob kalitlari majburiy'
      })
    }

    if (!scoring) {
      return res.status(400).json({
        success: false,
        message: 'Baholash tizimi majburiy'
      })
    }

    // Parse JSON strings if needed
    const parsedAnswerKey = typeof answerKey === 'string' ? JSON.parse(answerKey) : answerKey
    const parsedScoring = typeof scoring === 'string' ? JSON.parse(scoring) : scoring

    // Convert uploaded file to base64
    const imagePath = req.file.path
    const imageBuffer = fs.readFileSync(imagePath)
    const base64Image = imageBuffer.toString('base64')

    // Analyze OMR sheet with AI
    const result = await AIService.analyzeOMRSheet(base64Image, parsedAnswerKey, parsedScoring)

    // Clean up uploaded file
    fs.unlinkSync(imagePath)

    res.json({
      success: true,
      message: 'OMR varaq muvaffaqiyatli yuklandi va tahlil qilindi',
      data: {
        ...result,
        originalName: req.file.originalname,
        fileSize: req.file.size
      }
    })

  } catch (error) {
    // Clean up file if error occurs
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path)
    }
    
    console.error('OMR yuklash va tahlil xatosi:', error)
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server xatosi'
    })
  }
})

/**
 * POST /api/ai/analyze-image
 * Rasmni tahlil qilish
 */
router.post('/analyze-image', authenticate, async (req: Request, res: Response) => {
  try {
    const { error, value } = imageAnalysisSchema.validate(req.body)
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validatsiya xatosi',
        errors: error.details.map(detail => detail.message)
      })
    }

    const { image, prompt } = value

    // Let the AI service handle base64 validation
    const result = await AIService.analyzeImage(image, prompt)

    res.json({
      success: true,
      message: 'Rasm muvaffaqiyatli tahlil qilindi',
      data: result
    })

  } catch (error) {
    console.error('Rasm tahlil xatosi:', error)
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server xatosi'
    })
  }
})

// OMR tahlili uchun validation schema
const omrAnalysisSchema = Joi.object({
  image: Joi.string().required().messages({
    'string.empty': 'Rasm base64 formatida bo\'lishi kerak',
    'any.required': 'Rasm majburiy'
  }),
  answerKey: Joi.array().items(Joi.string()).required().messages({
    'array.base': 'Javob kalitlari array bo\'lishi kerak',
    'any.required': 'Javob kalitlari majburiy'
  }),
  scoring: Joi.object({
    correct: Joi.number().required(),
    wrong: Joi.number().required(),
    blank: Joi.number().required()
  }).required().messages({
    'any.required': 'Baholash tizimi majburiy'
  })
})

/**
 * POST /api/ai/analyze-omr
 * OMR varaqni tahlil qilish va natijalarni hisoblash (format-aware)
 */
router.post('/analyze-omr', authenticate, async (req: Request, res: Response) => {
  try {
    // Extended validation schema for format-aware analysis
    const extendedOMRSchema = omrAnalysisSchema.keys({
      examId: Joi.string().optional().messages({
        'string.base': 'Imtihon ID si string bo\'lishi kerak'
      })
    })

    const { error, value } = extendedOMRSchema.validate(req.body)
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validatsiya xatosi',
        errors: error.details.map(detail => detail.message)
      })
    }

    const { image, answerKey, scoring, examId } = value

    // Get exam format information if examId provided
    let exam = null
    if (examId) {
      try {
        const Exam = (await import('../models/Exam.js')).default
        exam = await Exam.findById(examId)
        console.log('Found exam for format analysis:', exam?.name)
      } catch (examError) {
        console.warn('Could not load exam for format analysis:', examError)
      }
    }

    // Analyze OMR sheet with format awareness
    const result = await AIService.analyzeOMRSheetWithFormat(image, answerKey, scoring, exam)

    res.json({
      success: true,
      message: 'OMR varaq muvaffaqiyatli tahlil qilindi (format-aware)',
      data: result
    })

  } catch (error) {
    console.error('OMR tahlil xatosi:', error)
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server xatosi'
    })
  }
})

/**
 * POST /api/ai/analyze-text
 * Matnni tahlil qilish va yaxshilash
 */
router.post('/analyze-text', authenticate, async (req: Request, res: Response) => {
  try {
    const { error, value } = textAnalysisSchema.validate(req.body)
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validatsiya xatosi',
        errors: error.details.map(detail => detail.message)
      })
    }

    const { text, context } = value

    const result = await AIService.analyzeText(text, context)

    res.json({
      success: true,
      message: 'Matn muvaffaqiyatli tahlil qilindi',
      data: result
    })

  } catch (error) {
    console.error('Matn tahlil xatosi:', error)
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server xatosi'
    })
  }
})

/**
 * POST /api/ai/analyze-questions
 * Imtihon savollarini tahlil qilish
 */
router.post('/analyze-questions', authenticate, async (req: Request, res: Response) => {
  try {
    const { error, value } = questionAnalysisSchema.validate(req.body)
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validatsiya xatosi',
        errors: error.details.map(detail => detail.message)
      })
    }

    const { questions } = value

    const result = await AIService.analyzeExamQuestions(questions)

    res.json({
      success: true,
      message: 'Savollar muvaffaqiyatli tahlil qilindi',
      data: result
    })

  } catch (error) {
    console.error('Savol tahlil xatosi:', error)
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server xatosi'
    })
  }
})

/**
 * GET /api/ai/status
 * AI service holatini tekshirish
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const hasApiKey = !!process.env.GROQ_API_KEY
    
    console.log('=== AI STATUS CHECK ===')
    console.log('GROQ_API_KEY exists:', hasApiKey)
    console.log('GROQ_API_KEY length:', process.env.GROQ_API_KEY?.length || 0)
    
    res.json({
      success: true,
      message: 'AI service holati',
      data: {
        available: hasApiKey,
        provider: 'Groq',
        models: [
          'llama-3.2-11b-vision-preview',
          'llama-3.2-1b-preview',
          'llama-3.1-70b-versatile',
          'llama-3.1-8b-instant'
        ],
        features: [
          'Rasm tahlili',
          'Matn yaxshilash',
          'Savol tahlili'
        ]
      }
    })

  } catch (error) {
    console.error('AI status xatosi:', error)
    res.status(500).json({
      success: false,
      message: 'Server xatosi'
    })
  }
})

export default router