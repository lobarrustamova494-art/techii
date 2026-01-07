import mongoose, { Schema } from 'mongoose'
import bcrypt from 'bcryptjs'
import { IUser } from '../types/index.js'

const userSchema = new Schema<IUser>({
  name: {
    type: String,
    required: [true, 'Ism kiritish majburiy'],
    trim: true,
    maxlength: [100, 'Ism 100 belgidan oshmasligi kerak']
  },
  phone: {
    type: String,
    required: [true, 'Telefon raqam kiritish majburiy'],
    unique: true,
    trim: true,
    match: [/^\+998\d{9}$/, 'Telefon raqam formati noto\'g\'ri (+998XXXXXXXXX)']
  },
  password: {
    type: String,
    required: [true, 'Parol kiritish majburiy'],
    minlength: [6, 'Parol kamida 6 belgidan iborat bo\'lishi kerak'],
    select: false
  },
  role: {
    type: String,
    enum: ['admin', 'teacher', 'student'],
    default: 'teacher'
  },
  avatar: {
    type: String,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
})

// Index for better performance
userSchema.index({ role: 1, isActive: 1 })

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next()
  
  try {
    const salt = await bcrypt.genSalt(12)
    this.password = await bcrypt.hash(this.password, salt)
    next()
  } catch (error) {
    next(error as Error)
  }
})

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password)
}

// Remove password from JSON output
userSchema.methods.toJSON = function() {
  const userObject = this.toObject()
  delete userObject.password
  return userObject
}

export default mongoose.model<IUser>('User', userSchema)