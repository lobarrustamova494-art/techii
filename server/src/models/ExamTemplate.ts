import mongoose, { Schema, Document } from 'mongoose'
import { Types } from 'mongoose'

export interface IExamTemplate extends Document {
  _id: Types.ObjectId
  examId: Types.ObjectId
  name: string
  description: string
  
  // Template configuration
  layout: {
    paperSize: 'a4' | 'letter'
    orientation: 'portrait' | 'landscape'
    dpi: number
    dimensions: {
      width: number
      height: number
    }
  }
  
  // Alignment marks configuration (8 black rectangles on sides)
  alignmentMarks: {
    leftSide: Array<{
      id: string
      position: { x: number; y: number }  // Relative position (0-1)
      size: { width: number; height: number }
      expectedBrightness: number
      tolerance: number
    }>
    rightSide: Array<{
      id: string
      position: { x: number; y: number }  // Relative position (0-1)
      size: { width: number; height: number }
      expectedBrightness: number
      tolerance: number
    }>
  }
  
  // Question layout configuration
  questionLayout: {
    totalQuestions: number
    structure: 'continuous' | 'subject_in_column'
    questionsPerColumn?: number
    startPosition: { x: number; y: number }
    questionSpacing: { horizontal: number; vertical: number }
    
    // Answer options configuration
    options: string[]  // ['A', 'B', 'C', 'D', 'E']
    optionSpacing: number
    bubbleRadius: number
    
    // Question number markers
    questionMarkers: {
      enabled: boolean
      size: { width: number; height: number }
      offset: { x: number; y: number } // Offset from question start
    }
  }
  
  // Subject and section mapping for subject_in_column structure
  subjectMapping?: Array<{
    subjectId: string
    subjectName: string
    sections: Array<{
      sectionId: string
      sectionName: string
      startQuestion: number
      endQuestion: number
      questionType: string
      position: { x: number; y: number }
    }>
  }>
  
  // Coordinate calibration data
  coordinateSystem: {
    referencePoints: Array<{
      id: string
      name: string
      expectedPosition: { x: number; y: number }
      actualPosition?: { x: number; y: number }
      confidence?: number
    }>
    calibrationMatrix?: number[][]
    transformationParams?: {
      scale: { x: number; y: number }
      rotation: number
      translation: { x: number; y: number }
      skew?: { x: number; y: number }
    }
  }
  
  // Cached question coordinates (calculated from template)
  questionCoordinates?: {
    [questionNumber: string]: {
      markerPosition: { x: number; y: number }
      bubblePositions: {
        [option: string]: { x: number; y: number }
      }
    }
  }
  
  createdBy: Types.ObjectId
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

const examTemplateSchema = new Schema<IExamTemplate>({
  examId: {
    type: Schema.Types.ObjectId,
    ref: 'Exam',
    required: [true, 'Imtihon ID kiritish majburiy'],
    unique: true
  },
  name: {
    type: String,
    required: [true, 'Shablon nomi kiritish majburiy'],
    trim: true,
    maxlength: [200, 'Shablon nomi 200 belgidan oshmasligi kerak']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Tavsif 500 belgidan oshmasligi kerak']
  },
  layout: {
    paperSize: {
      type: String,
      enum: ['a4', 'letter'],
      default: 'a4'
    },
    orientation: {
      type: String,
      enum: ['portrait', 'landscape'],
      default: 'portrait'
    },
    dpi: {
      type: Number,
      default: 200
    },
    dimensions: {
      width: { type: Number, required: true },
      height: { type: Number, required: true }
    }
  },
  alignmentMarks: {
    leftSide: [{
      id: { type: String, required: true },
      position: {
        x: { type: Number, required: true, min: 0, max: 1 },
        y: { type: Number, required: true, min: 0, max: 1 }
      },
      size: {
        width: { type: Number, required: true },
        height: { type: Number, required: true }
      },
      expectedBrightness: { type: Number, default: 50 },
      tolerance: { type: Number, default: 30 }
    }],
    rightSide: [{
      id: { type: String, required: true },
      position: {
        x: { type: Number, required: true, min: 0, max: 1 },
        y: { type: Number, required: true, min: 0, max: 1 }
      },
      size: {
        width: { type: Number, required: true },
        height: { type: Number, required: true }
      },
      expectedBrightness: { type: Number, default: 50 },
      tolerance: { type: Number, default: 30 }
    }]
  },
  questionLayout: {
    totalQuestions: {
      type: Number,
      required: [true, 'Jami savollar soni kiritish majburiy'],
      min: [1, 'Kamida 1 ta savol bo\'lishi kerak']
    },
    structure: {
      type: String,
      enum: ['continuous', 'subject_in_column'],
      default: 'continuous'
    },
    questionsPerColumn: { type: Number },
    startPosition: {
      x: { type: Number, required: true },
      y: { type: Number, required: true }
    },
    questionSpacing: {
      horizontal: { type: Number, required: true },
      vertical: { type: Number, required: true }
    },
    options: [{
      type: String,
      required: true
    }],
    optionSpacing: {
      type: Number,
      default: 18
    },
    bubbleRadius: {
      type: Number,
      default: 15
    },
    questionMarkers: {
      enabled: { type: Boolean, default: true },
      size: {
        width: { type: Number, default: 6 },
        height: { type: Number, default: 6 }
      },
      offset: {
        x: { type: Number, default: -35 },
        y: { type: Number, default: 0 }
      }
    }
  },
  subjectMapping: [{
    subjectId: { type: String, required: true },
    subjectName: { type: String, required: true },
    sections: [{
      sectionId: { type: String, required: true },
      sectionName: { type: String, required: true },
      startQuestion: { type: Number, required: true },
      endQuestion: { type: Number, required: true },
      questionType: { type: String, required: true },
      position: {
        x: { type: Number, required: true },
        y: { type: Number, required: true }
      }
    }]
  }],
  coordinateSystem: {
    referencePoints: [{
      id: { type: String, required: true },
      name: { type: String, required: true },
      expectedPosition: {
        x: { type: Number, required: true },
        y: { type: Number, required: true }
      },
      actualPosition: {
        x: { type: Number },
        y: { type: Number }
      },
      confidence: { type: Number }
    }],
    calibrationMatrix: [[Number]],
    transformationParams: {
      scale: {
        x: { type: Number },
        y: { type: Number }
      },
      rotation: { type: Number },
      translation: {
        x: { type: Number },
        y: { type: Number }
      },
      skew: {
        x: { type: Number },
        y: { type: Number }
      }
    }
  },
  questionCoordinates: {
    type: Schema.Types.Mixed
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
})

// Indexes
examTemplateSchema.index({ examId: 1 })
examTemplateSchema.index({ createdBy: 1 })
examTemplateSchema.index({ isActive: 1 })

const ExamTemplate = mongoose.model<IExamTemplate>('ExamTemplate', examTemplateSchema)

export default ExamTemplate