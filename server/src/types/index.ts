import { Document, Types } from 'mongoose'
import { Request } from 'express'

export interface IUser extends Document {
  _id: Types.ObjectId
  name: string
  phone: string
  password: string
  role: 'admin' | 'teacher' | 'student'
  avatar?: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  comparePassword(candidatePassword: string): Promise<boolean>
}

export interface ISubject extends Document {
  _id: Types.ObjectId
  name: string
  sections: ISection[]
  createdBy: Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

export interface ISection {
  _id: string
  name: string
  questionCount: number
  questionType: 'multiple_choice_3' | 'multiple_choice_4' | 'multiple_choice_5' | 'multiple_choice_6' | 'multiple_choice_7' | 'multiple_choice_8' | 'multiple_choice_9' | 'multiple_choice_10' | 'true_false' | 'matrix' | 'numerical' | 'subjective'
  correctScore: number
  wrongScore: number
}

export interface IExam extends Document {
  _id: Types.ObjectId
  name: string
  date: string
  examSets: number
  subjects: any[] // Mixed type for full subject objects
  totalQuestions?: number
  duration?: number
  answerPattern?: 'ABCD' | 'ABCDE'
  scoring?: {
    correct: number
    wrong: number
    blank: number
  }
  answerKey?: string[]
  config?: any
  structure: 'continuous' | 'subject_in_column'
  paperSize: 'a4' | 'letter'
  includeLogo: boolean
  prefillStudentId: boolean
  compactLayout: boolean
  createdBy: Types.ObjectId
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface IOMRSheet extends Document {
  _id: Types.ObjectId
  examId: Types.ObjectId
  setLetter: string // A, B, C, D
  filePath: string
  fileType: 'pdf' | 'webp'
  createdBy: Types.ObjectId
  createdAt: Date
}

export interface IStudent extends Document {
  _id: Types.ObjectId
  name: string
  rollNumber: string
  email?: string
  class: string
  section?: string
  isActive: boolean
  createdBy: Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

export interface IExamResult extends Document {
  _id: Types.ObjectId
  examId: Types.ObjectId
  studentId: Types.ObjectId
  answers: { [questionNumber: number]: string }
  score: number
  totalQuestions: number
  correctAnswers: number
  wrongAnswers: number
  blankAnswers: number
  submittedAt: Date
  evaluatedAt?: Date
  createdAt: Date
}

export interface ApiResponse<T = any> {
  success: boolean
  message: string
  data?: T
  error?: string
}

export interface PaginationQuery {
  page?: number
  limit?: number
  search?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    currentPage: number
    totalPages: number
    totalItems: number
    itemsPerPage: number
    hasNext: boolean
    hasPrev: boolean
  }
}

// Extended Request interface for authentication
export interface AuthRequest extends Request {
  user?: IUser
}