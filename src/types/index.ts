export interface User {
  id: string
  name: string
  phone?: string
  avatar: string
  isOnline: boolean
}

export interface ExamStats {
  totalStudents: number
  examsCompleted: number
  pendingEvaluations: number
}

export interface Activity {
  id: string
  title: string
  description: string
  timestamp: string
  type: 'success' | 'info' | 'warning' | 'error'
  icon: string
}

export interface Exam {
  id: string
  name: string
  date: string
  totalQuestions: number
  duration: number
  answerPattern: 'ABCD' | 'ABCDE'
  scoring: {
    correct: number
    wrong: number
    blank: number
  }
  answerKey: string[]
  subjects?: any[]
  examSets?: number
  structure?: 'continuous' | 'subject_in_column'
  paperSize?: 'a4' | 'letter'
  includeLogo?: boolean
  prefillStudentId?: boolean
  compactLayout?: boolean
}

export interface Subject {
  id: string
  name: string
  sections: Section[]
}

export interface Section {
  id: string
  name: string
  questionCount: number
  questionType: 'multiple_choice_3' | 'multiple_choice_4' | 'multiple_choice_5' | 'multiple_choice_6' | 'multiple_choice_7' | 'multiple_choice_8' | 'multiple_choice_9' | 'multiple_choice_10' | 'true_false' | 'matrix' | 'numerical' | 'subjective'
  correctScore: number
  wrongScore: number
}

export interface ExamData {
  name: string
  date: string
  examSets: number
  subjects: Subject[]
}

export interface UploadFile {
  id: string
  name: string
  size: number
  status: 'ready' | 'uploading' | 'error' | 'completed'
  progress?: number
  thumbnail?: string
}