import { Request, Response, NextFunction } from 'express'
import Joi from 'joi'

export const validate = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    console.log('Validation request body:', JSON.stringify(req.body, null, 2))
    
    const { error } = schema.validate(req.body, { abortEarly: false })
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }))
      
      console.log('Validation errors:', errors)
      
      return res.status(400).json({
        success: false,
        message: 'Ma\'lumotlar validatsiya xatoligi',
        errors
      })
    }
    
    next()
  }
}

// Validation schemas
export const schemas = {
  // User schemas
  register: Joi.object({
    name: Joi.string().min(2).max(100).required().messages({
      'string.min': 'Ism kamida 2 belgidan iborat bo\'lishi kerak',
      'string.max': 'Ism 100 belgidan oshmasligi kerak',
      'any.required': 'Ism kiritish majburiy'
    }),
    phone: Joi.string().pattern(/^\+998\d{9}$/).required().messages({
      'string.pattern.base': 'Telefon raqam formati noto\'g\'ri (+998XXXXXXXXX)',
      'any.required': 'Telefon raqam kiritish majburiy'
    }),
    password: Joi.string().min(6).required().messages({
      'string.min': 'Parol kamida 6 belgidan iborat bo\'lishi kerak',
      'any.required': 'Parol kiritish majburiy'
    }),
    role: Joi.string().valid('admin', 'teacher', 'student').default('teacher')
  }),

  login: Joi.object({
    phone: Joi.string().pattern(/^\+998\d{9}$/).required().messages({
      'string.pattern.base': 'Telefon raqam formati noto\'g\'ri (+998XXXXXXXXX)',
      'any.required': 'Telefon raqam kiritish majburiy'
    }),
    password: Joi.string().required().messages({
      'any.required': 'Parol kiritish majburiy'
    })
  }),

  // Subject schemas
  createSubject: Joi.object({
    name: Joi.string().min(2).max(200).required().messages({
      'string.min': 'Mavzu nomi kamida 2 belgidan iborat bo\'lishi kerak',
      'string.max': 'Mavzu nomi 200 belgidan oshmasligi kerak',
      'any.required': 'Mavzu nomi kiritish majburiy'
    }),
    sections: Joi.array().min(1).max(10).items(
      Joi.object({
        name: Joi.string().min(2).max(100).required(),
        questionCount: Joi.number().min(1).max(100).required(),
        questionType: Joi.string().valid(
          'multiple_choice_3', 'multiple_choice_4', 'multiple_choice_5',
          'multiple_choice_6', 'multiple_choice_7', 'multiple_choice_8',
          'multiple_choice_9', 'multiple_choice_10', 'true_false',
          'matrix', 'numerical', 'subjective'
        ).required(),
        correctScore: Joi.number().min(0.1).max(20).required(),
        wrongScore: Joi.number().min(-5).max(0).required()
      })
    ).required().messages({
      'array.min': 'Kamida bitta bo\'lim bo\'lishi kerak',
      'array.max': 'Maksimal 10 ta bo\'lim bo\'lishi mumkin'
    })
  }),

  // Exam schemas
  createExam: Joi.object({
    name: Joi.string().min(1).max(200).required().messages({
      'string.min': 'Imtihon nomi kamida 1 belgidan iborat bo\'lishi kerak',
      'string.max': 'Imtihon nomi 200 belgidan oshmasligi kerak',
      'any.required': 'Imtihon nomi kiritish majburiy',
      'string.empty': 'Imtihon nomi bo\'sh bo\'lishi mumkin emas'
    }),
    date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required().messages({
      'string.pattern.base': 'Sana formati YYYY-MM-DD bo\'lishi kerak',
      'any.required': 'Sana kiritish majburiy'
    }),
    examSets: Joi.number().min(1).max(10).required().messages({
      'number.min': 'Kamida 1 ta to\'plam bo\'lishi kerak',
      'number.max': 'Maksimal 10 ta to\'plam bo\'lishi mumkin',
      'any.required': 'To\'plamlar soni kiritish majburiy'
    }),
    subjects: Joi.array().min(1).items(
      Joi.object({
        id: Joi.string().required(),
        name: Joi.string().min(1).max(200).required(),
        sections: Joi.array().min(1).items(
          Joi.object({
            id: Joi.string().required(),
            name: Joi.string().min(1).max(100).required(),
            questionCount: Joi.number().min(1).max(100).required(),
            questionType: Joi.string().valid(
              'multiple_choice_3', 'multiple_choice_4', 'multiple_choice_5',
              'multiple_choice_6', 'multiple_choice_7', 'multiple_choice_8',
              'multiple_choice_9', 'multiple_choice_10', 'true_false',
              'matrix', 'numerical', 'subjective'
            ).required(),
            correctScore: Joi.number().min(0.1).max(20).required(),
            wrongScore: Joi.number().min(-5).max(0).required()
          })
        ).required()
      })
    ).required().messages({
      'array.min': 'Kamida bitta mavzu bo\'lishi kerak',
      'any.required': 'Mavzular kiritish majburiy'
    }),
    totalQuestions: Joi.number().min(1).optional(),
    duration: Joi.number().min(1).optional(),
    answerPattern: Joi.string().valid('ABCD', 'ABCDE').optional(),
    scoring: Joi.object({
      correct: Joi.number().required(),
      wrong: Joi.number().required(),
      blank: Joi.number().required()
    }).optional(),
    answerKey: Joi.array().optional(),
    config: Joi.object().optional(),
    structure: Joi.string().valid('continuous', 'subject_in_column').default('continuous'),
    paperSize: Joi.string().valid('a4', 'letter').default('a4'),
    includeLogo: Joi.boolean().default(true),
    prefillStudentId: Joi.boolean().default(false),
    compactLayout: Joi.boolean().default(false)
  }),

  updateExam: Joi.object({
    name: Joi.string().min(2).max(200).optional(),
    date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional(),
    examSets: Joi.number().min(1).max(10).optional(),
    subjects: Joi.array().min(1).optional(),
    totalQuestions: Joi.number().min(1).optional(),
    duration: Joi.number().min(1).optional(),
    answerPattern: Joi.string().valid('ABCD', 'ABCDE').optional(),
    scoring: Joi.object({
      correct: Joi.number().required(),
      wrong: Joi.number().required(),
      blank: Joi.number().required()
    }).optional(),
    answerKey: Joi.array().optional(),
    config: Joi.object().optional(),
    structure: Joi.string().valid('continuous', 'subject_in_column').optional(),
    paperSize: Joi.string().valid('a4', 'letter').optional(),
    includeLogo: Joi.boolean().optional(),
    prefillStudentId: Joi.boolean().optional(),
    compactLayout: Joi.boolean().optional()
  }),

  // Student schemas
  createStudent: Joi.object({
    name: Joi.string().min(2).max(100).required().messages({
      'string.min': 'Ism kamida 2 belgidan iborat bo\'lishi kerak',
      'string.max': 'Ism 100 belgidan oshmasligi kerak',
      'any.required': 'Ism kiritish majburiy'
    }),
    rollNumber: Joi.string().min(1).max(20).required().messages({
      'string.min': 'Roll raqami kamida 1 belgidan iborat bo\'lishi kerak',
      'string.max': 'Roll raqami 20 belgidan oshmasligi kerak',
      'any.required': 'Roll raqami kiritish majburiy'
    }),
    email: Joi.string().email().optional().allow('').messages({
      'string.email': 'Email formati noto\'g\'ri'
    }),
    class: Joi.string().min(1).max(50).required().messages({
      'string.min': 'Sinf nomi kamida 1 belgidan iborat bo\'lishi kerak',
      'string.max': 'Sinf nomi 50 belgidan oshmasligi kerak',
      'any.required': 'Sinf kiritish majburiy'
    }),
    section: Joi.string().max(10).optional().allow('').messages({
      'string.max': 'Bo\'lim nomi 10 belgidan oshmasligi kerak'
    })
  })
}