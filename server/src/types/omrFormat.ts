/**
 * OMR Sheet Format Metadata
 * Bu interface AI ga OMR varaq formatini tushuntirish uchun ishlatiladi
 */

export interface OMRFormatMetadata {
  // Asosiy format ma'lumotlari
  paperSize: 'a4' | 'letter'
  structure: 'continuous' | 'subject_in_column'
  totalQuestions: number
  
  // Javoblar grid ma'lumotlari
  answerGrid: {
    layout: AnswerGridLayout
    questionMapping: QuestionMapping[]
    bubbleSpecs: BubbleSpecification
  }
  
  // Talaba ma'lumotlari qismi
  studentInfo: {
    idBubbles: StudentIdBubbles
    nameField: FieldPosition
    groupField: FieldPosition
  }
  
  // Imtihon to'plami qismi
  examSets: {
    count: number
    options: string[] // ['A', 'B', 'C', 'D']
    position: FieldPosition
  }
  
  // Alignment marklari
  alignmentMarks: AlignmentMark[]
  
  // Qo'shimcha ma'lumotlar
  metadata: {
    examName: string
    examDate: string
    subjects: SubjectInfo[]
    instructions: string
  }
}

export interface AnswerGridLayout {
  type: 'continuous' | 'subject_grouped'
  columns: number // Nechta ustunda joylashgan
  questionsPerColumn: number
  startPosition: Position
  spacing: Spacing
}

export interface QuestionMapping {
  questionNumber: number
  globalPosition: number // Umumiy tartib raqami
  subjectIndex: number
  sectionIndex: number
  localQuestionNumber: number // Mavzu ichidagi raqam
  questionType: string
  optionsCount: number
  options: string[] // ['A', 'B', 'C', 'D', 'E']
  position: Position
  bubblePositions: BubblePosition[]
}

export interface BubblePosition {
  option: string // 'A', 'B', 'C', etc.
  position: Position
  size: Size
}

export interface BubbleSpecification {
  diameter: number // mm
  borderWidth: number // mm
  fillThreshold: number // 0.6 = 60%
  spacing: {
    horizontal: number // mm
    vertical: number // mm
  }
}

export interface StudentIdBubbles {
  digitCount: 8 // 8 xonali ID
  digitsPerColumn: 10 // 0-9 raqamlar
  position: Position
  bubbleSize: Size
  columnSpacing: number
}

export interface FieldPosition {
  position: Position
  size: Size
  type: 'text_field' | 'bubble_grid'
}

export interface AlignmentMark {
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'middle-left' | 'middle-right'
  coordinates: Position
  size: Size
  shape: 'square' | 'circle'
}

export interface Position {
  x: number // mm yoki pixel
  y: number // mm yoki pixel
  unit: 'mm' | 'px'
}

export interface Size {
  width: number
  height: number
  unit: 'mm' | 'px'
}

export interface Spacing {
  horizontal: number
  vertical: number
  unit: 'mm' | 'px'
}

export interface SubjectInfo {
  name: string
  sections: SectionInfo[]
  questionRange: {
    start: number
    end: number
  }
}

export interface SectionInfo {
  name: string
  questionCount: number
  questionType: string
  questionRange: {
    start: number
    end: number
  }
}

/**
 * AI ga berish uchun format tavsifi
 */
export interface OMRFormatDescription {
  formatVersion: string
  description: string
  layout: OMRFormatMetadata
  aiInstructions: {
    scanningOrder: string
    bubbleDetection: string
    coordinateSystem: string
    qualityChecks: string[]
  }
}