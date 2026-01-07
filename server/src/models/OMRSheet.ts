import mongoose, { Schema } from 'mongoose'
import { IOMRSheet } from '../types/index.js'

const omrSheetSchema = new Schema<IOMRSheet>({
  examId: {
    type: Schema.Types.ObjectId,
    ref: 'Exam',
    required: [true, 'Imtihon ID si kiritish majburiy']
  } as any,
  setLetter: {
    type: String,
    required: [true, 'To\'plam harfi kiritish majburiy'],
    enum: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'],
    maxlength: [1, 'To\'plam harfi bitta belgi bo\'lishi kerak']
  },
  filePath: {
    type: String,
    required: [true, 'Fayl yo\'li kiritish majburiy'],
    trim: true
  },
  fileType: {
    type: String,
    required: [true, 'Fayl turi kiritish majburiy'],
    enum: ['pdf', 'webp']
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
omrSheetSchema.index({ examId: 1, setLetter: 1 })
omrSheetSchema.index({ createdBy: 1, createdAt: -1 })

// Virtual populate exam details
omrSheetSchema.virtual('examDetails', {
  ref: 'Exam',
  localField: 'examId',
  foreignField: '_id',
  justOne: true
})

export default mongoose.model<IOMRSheet>('OMRSheet', omrSheetSchema)