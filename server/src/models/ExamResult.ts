import mongoose, { Schema } from 'mongoose'
import { IExamResult } from '../types/index.js'

const examResultSchema = new Schema<IExamResult>({
  examId: {
    type: Schema.Types.ObjectId,
    ref: 'Exam',
    required: [true, 'Imtihon ID si kiritish majburiy']
  } as any,
  studentId: {
    type: Schema.Types.ObjectId,
    ref: 'Student',
    required: [true, 'O\'quvchi ID si kiritish majburiy']
  } as any,
  answers: {
    type: Map,
    of: String,
    required: [true, 'Javoblar kiritish majburiy']
  },
  score: {
    type: Number,
    required: [true, 'Ball kiritish majburiy'],
    min: [0, 'Ball manfiy bo\'lmasligi kerak']
  },
  totalQuestions: {
    type: Number,
    required: [true, 'Jami savollar soni kiritish majburiy'],
    min: [1, 'Kamida 1 ta savol bo\'lishi kerak']
  },
  correctAnswers: {
    type: Number,
    required: [true, 'To\'g\'ri javoblar soni kiritish majburiy'],
    min: [0, 'To\'g\'ri javoblar soni manfiy bo\'lmasligi kerak']
  },
  wrongAnswers: {
    type: Number,
    required: [true, 'Noto\'g\'ri javoblar soni kiritish majburiy'],
    min: [0, 'Noto\'g\'ri javoblar soni manfiy bo\'lmasligi kerak']
  },
  blankAnswers: {
    type: Number,
    required: [true, 'Bo\'sh javoblar soni kiritish majburiy'],
    min: [0, 'Bo\'sh javoblar soni manfiy bo\'lmasligi kerak']
  },
  submittedAt: {
    type: Date,
    required: [true, 'Topshirish vaqti kiritish majburiy'],
    default: Date.now
  },
  evaluatedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
})

// Indexes
examResultSchema.index({ examId: 1, studentId: 1 }, { unique: true })
examResultSchema.index({ examId: 1, score: -1 })
examResultSchema.index({ studentId: 1, submittedAt: -1 })

// Virtual populate exam and student details
examResultSchema.virtual('examDetails', {
  ref: 'Exam',
  localField: 'examId',
  foreignField: '_id',
  justOne: true
})

examResultSchema.virtual('studentDetails', {
  ref: 'Student',
  localField: 'studentId',
  foreignField: '_id',
  justOne: true
})

// Virtual for percentage
examResultSchema.virtual('percentage').get(function(this: any) {
  if (this.totalQuestions > 0) {
    return Math.round((this.correctAnswers / this.totalQuestions) * 100)
  }
  return 0
})

export default mongoose.model<IExamResult>('ExamResult', examResultSchema)