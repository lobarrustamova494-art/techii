/**
 * Exam Template System for OMR Processing
 * Each exam has its own template with specific layout and coordinates
 */

export interface ExamTemplate {
  id: string
  name: string
  description: string
  createdAt: Date
  updatedAt: Date
  
  // Template configuration
  layout: {
    paperSize: 'A4' | 'Letter' | 'Legal'
    orientation: 'portrait' | 'landscape'
    dpi: number
    dimensions: {
      width: number
      height: number
    }
  }
  
  // Alignment marks configuration (8 black rectangles on sides)
  alignmentMarks: {
    leftSide: AlignmentMark[]   // 4 marks on left side
    rightSide: AlignmentMark[]  // 4 marks on right side
  }
  
  // Question layout configuration
  questionLayout: {
    totalQuestions: number
    questionsPerRow?: number
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
  
  // Coordinate calibration
  coordinateSystem: {
    referencePoints: ReferencePoint[]
    calibrationMatrix?: number[][]
    transformationParams?: TransformationParams
  }
}

export interface AlignmentMark {
  id: string
  position: { x: number; y: number }  // Relative position (0-1)
  size: { width: number; height: number }
  expectedBrightness: number
  tolerance: number
}

export interface ReferencePoint {
  id: string
  name: string
  expectedPosition: { x: number; y: number }
  actualPosition?: { x: number; y: number }
  confidence?: number
}

export interface TransformationParams {
  scale: { x: number; y: number }
  rotation: number
  translation: { x: number; y: number }
  skew?: { x: number; y: number }
}

// Template creation and management
export interface CreateExamTemplateRequest {
  name: string
  description: string
  examId: string
  layout: ExamTemplate['layout']
  questionCount: number
  options: string[]
}

export interface TemplateCalibrationData {
  templateId: string
  detectedMarks: AlignmentMark[]
  coordinateMapping: { [questionNumber: number]: QuestionCoordinates }
  calibrationAccuracy: number
}

export interface QuestionCoordinates {
  questionNumber: number
  markerPosition: { x: number; y: number }
  bubblePositions: { [option: string]: { x: number; y: number } }
  confidence: number
}