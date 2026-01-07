import mongoose, { Schema } from 'mongoose'
import { IExam } from '../types/index.js'

const examSchema = new Schema<IExam>({
  name: {
    type: String,
    required: [true, 'Imtihon nomi kiritish majburiy'],
    trim: true,
    maxlength: [200, 'Imtihon nomi 200 belgidan oshmasligi kerak']
  },
  date: {
    type: String,
    required: [true, 'Imtihon sanasi kiritish majburiy'],
    match: [/^\d{4}-\d{2}-\d{2}$/, 'Sana formati YYYY-MM-DD bo\'lishi kerak']
  },
  examSets: {
    type: Number,
    required: [true, 'Imtihon to\'plamlari soni kiritish majburiy'],
    min: [1, 'Kamida 1 ta to\'plam bo\'lishi kerak'],
    max: [10, 'Maksimal 10 ta to\'plam bo\'lishi mumkin']
  },
  subjects: {
    type: Schema.Types.Mixed,
    required: [true, 'Mavzular kiritish majburiy']
  },
  totalQuestions: {
    type: Number,
    min: [1, 'Kamida 1 ta savol bo\'lishi kerak']
  },
  duration: {
    type: Number,
    min: [1, 'Davomiylik kamida 1 daqiqa bo\'lishi kerak']
  },
  answerPattern: {
    type: String,
    enum: ['ABCD', 'ABCDE'],
    default: 'ABCD'
  },
  scoring: {
    correct: { type: Number, default: 4 },
    wrong: { type: Number, default: -1 },
    blank: { type: Number, default: 0 }
  },
  answerKey: [{
    type: String
  }],
  config: {
    type: Schema.Types.Mixed
  },
  structure: {
    type: String,
    required: [true, 'Tuzilish turi kiritish majburiy'],
    enum: ['continuous', 'subject_in_column'],
    default: 'continuous'
  },
  paperSize: {
    type: String,
    required: [true, 'Qog\'oz o\'lchami kiritish majburiy'],
    enum: ['a4', 'letter'],
    default: 'a4'
  },
  includeLogo: {
    type: Boolean,
    default: true
  },
  prefillStudentId: {
    type: Boolean,
    default: false
  },
  compactLayout: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  } as any,
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
})

// Indexes
examSchema.index({ createdBy: 1, createdAt: -1 })
examSchema.index({ date: 1, isActive: 1 })
examSchema.index({ name: 'text' })

// Virtual populate subjects
examSchema.virtual('subjectDetails', {
  ref: 'Subject',
  localField: 'subjects',
  foreignField: '_id'
})

export default mongoose.model<IExam>('Exam', examSchema)