import mongoose, { Schema } from 'mongoose'
import { IStudent } from '../types/index.js'

const studentSchema = new Schema<IStudent>({
  name: {
    type: String,
    required: [true, 'O\'quvchi ismi kiritish majburiy'],
    trim: true,
    maxlength: [100, 'Ism 100 belgidan oshmasligi kerak']
  },
  rollNumber: {
    type: String,
    required: [true, 'Roll raqami kiritish majburiy'],
    unique: true,
    trim: true,
    maxlength: [20, 'Roll raqami 20 belgidan oshmasligi kerak']
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Email formati noto\'g\'ri'],
    sparse: true // Allow null/undefined but enforce uniqueness when present
  },
  class: {
    type: String,
    required: [true, 'Sinf kiritish majburiy'],
    trim: true,
    maxlength: [50, 'Sinf nomi 50 belgidan oshmasligi kerak']
  },
  section: {
    type: String,
    trim: true,
    maxlength: [10, 'Bo\'lim nomi 10 belgidan oshmasligi kerak']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  } as any
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
})

// Indexes
studentSchema.index({ rollNumber: 1 })
studentSchema.index({ class: 1, section: 1 })
studentSchema.index({ createdBy: 1, createdAt: -1 })
studentSchema.index({ name: 'text', rollNumber: 'text' })
studentSchema.index({ email: 1 }, { sparse: true })

export default mongoose.model<IStudent>('Student', studentSchema)