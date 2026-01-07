import mongoose, { Schema } from 'mongoose'
import { ISubject, ISection } from '../types/index.js'

const sectionSchema = new Schema<ISection>({
  name: {
    type: String,
    required: [true, 'Bo\'lim nomi kiritish majburiy'],
    trim: true,
    maxlength: [100, 'Bo\'lim nomi 100 belgidan oshmasligi kerak']
  },
  questionCount: {
    type: Number,
    required: [true, 'Savollar soni kiritish majburiy'],
    min: [1, 'Kamida 1 ta savol bo\'lishi kerak'],
    max: [100, 'Maksimal 100 ta savol bo\'lishi mumkin']
  },
  questionType: {
    type: String,
    required: [true, 'Savol turi kiritish majburiy'],
    enum: [
      'multiple_choice_3',
      'multiple_choice_4', 
      'multiple_choice_5',
      'multiple_choice_6',
      'multiple_choice_7',
      'multiple_choice_8',
      'multiple_choice_9',
      'multiple_choice_10',
      'true_false',
      'matrix',
      'numerical',
      'subjective'
    ]
  },
  correctScore: {
    type: Number,
    required: [true, 'To\'g\'ri javob bali kiritish majburiy'],
    min: [0.1, 'To\'g\'ri javob bali 0.1 dan kam bo\'lmasligi kerak'],
    max: [20, 'To\'g\'ri javob bali 20 dan oshmasligi kerak']
  },
  wrongScore: {
    type: Number,
    required: [true, 'Noto\'g\'ri javob bali kiritish majburiy'],
    min: [-5, 'Noto\'g\'ri javob bali -5 dan kam bo\'lmasligi kerak'],
    max: [0, 'Noto\'g\'ri javob bali 0 dan oshmasligi kerak']
  }
}, { _id: true })

const subjectSchema = new Schema<ISubject>({
  name: {
    type: String,
    required: [true, 'Mavzu nomi kiritish majburiy'],
    trim: true,
    maxlength: [200, 'Mavzu nomi 200 belgidan oshmasligi kerak']
  },
  sections: {
    type: [sectionSchema],
    required: [true, 'Kamida bitta bo\'lim bo\'lishi kerak'],
    validate: {
      validator: function(sections: ISection[]) {
        return sections.length > 0 && sections.length <= 10
      },
      message: 'Mavzuda 1 dan 10 tagacha bo\'lim bo\'lishi mumkin'
    }
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
subjectSchema.index({ createdBy: 1, createdAt: -1 })
subjectSchema.index({ name: 'text' })

// Virtual for total questions
subjectSchema.virtual('totalQuestions').get(function(this: any) {
  return this.sections.reduce((total: any, section: any) => total + section.questionCount, 0)
})

export default mongoose.model<ISubject>('Subject', subjectSchema)