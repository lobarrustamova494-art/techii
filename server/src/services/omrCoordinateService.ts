/**
 * OMR Coordinate Service
 * Generates precise pixel coordinates for OMR sheet bubbles
 */

export interface BubbleCoordinate {
  x: number
  y: number
  option: string
  questionNumber: number
  questionType: string
  subjectName?: string
  sectionName?: string
}

export interface OMRCoordinateMap {
  paperSize: 'a4' | 'letter'
  structure: 'continuous' | 'subject_in_column'
  totalQuestions: number
  alignmentMarks: Array<{
    name: string
    x: number
    y: number
  }>
  bubbleCoordinates: BubbleCoordinate[]
  metadata: {
    examName: string
    examDate: string
    examSets: number
    subjects: number
  }
}

export class OMRCoordinateService {
  
  // A4 paper dimensions in pixels (at 300 DPI)
  private static readonly A4_WIDTH = 2480  // 210mm at 300 DPI
  private static readonly A4_HEIGHT = 3508 // 297mm at 300 DPI
  
  // Letter paper dimensions in pixels (at 300 DPI)
  private static readonly LETTER_WIDTH = 2550  // 8.5in at 300 DPI
  private static readonly LETTER_HEIGHT = 3300 // 11in at 300 DPI
  
  // Layout constants (in pixels at 300 DPI)
  private static readonly PADDING = 177        // 15mm padding
  private static readonly HEADER_HEIGHT = 120  // Header section height
  private static readonly STUDENT_ID_HEIGHT = 80 // Student ID section height
  private static readonly ROW_HEIGHT = 30      // Height between question rows
  private static readonly COLUMN_WIDTH = 212   // Width between columns (180px * 300/254)
  private static readonly BUBBLE_SIZE = 16     // Bubble diameter
  private static readonly BUBBLE_SPACING = 21  // Space between bubbles (18px * 300/254)
  private static readonly MARKER_OFFSET = 41   // Offset from marker to first bubble (35px * 300/254)
  
  /**
   * Generate precise coordinate map for an exam
   */
  static generateCoordinateMap(examData: any): OMRCoordinateMap {
    console.log('🎯 Generating precise OMR coordinate map...')
    console.log(`Exam: ${examData.name}`)
    console.log(`Structure: ${examData.structure || 'continuous'}`)
    console.log(`Paper size: ${examData.paperSize || 'a4'}`)
    
    const paperSize = examData.paperSize || 'a4'
    const structure = examData.structure || 'continuous'
    
    // Get paper dimensions
    const { width, height } = this.getPaperDimensions(paperSize)
    
    // Generate alignment marks
    const alignmentMarks = this.generateAlignmentMarks(width, height)
    
    // Calculate total questions
    const totalQuestions = this.calculateTotalQuestions(examData)
    
    // Generate bubble coordinates based on structure
    const bubbleCoordinates = structure === 'continuous' 
      ? this.generateContinuousCoordinates(examData, width, height)
      : this.generateSubjectBasedCoordinates(examData, width, height)
    
    console.log(`✅ Generated coordinates for ${bubbleCoordinates.length} bubbles`)
    console.log(`   Alignment marks: ${alignmentMarks.length}`)
    console.log(`   Total questions: ${totalQuestions}`)
    
    return {
      paperSize,
      structure,
      totalQuestions,
      alignmentMarks,
      bubbleCoordinates,
      metadata: {
        examName: examData.name,
        examDate: examData.date,
        examSets: examData.examSets || 1,
        subjects: examData.subjects?.length || 0
      }
    }
  }
  
  /**
   * Get paper dimensions based on paper size
   */
  private static getPaperDimensions(paperSize: 'a4' | 'letter'): { width: number; height: number } {
    return paperSize === 'a4' 
      ? { width: this.A4_WIDTH, height: this.A4_HEIGHT }
      : { width: this.LETTER_WIDTH, height: this.LETTER_HEIGHT }
  }
  
  /**
   * Generate alignment mark coordinates
   */
  private static generateAlignmentMarks(width: number, height: number): Array<{ name: string; x: number; y: number }> {
    const marks = [
      // Left side marks
      { name: 'L1', x: 47, y: 120 },   // 4mm from left, top position
      { name: 'L2', x: 47, y: 382 },   // 4mm from left, mid-top position
      { name: 'L3', x: 47, y: 655 },   // 4mm from left, mid-bottom position
      { name: 'L4', x: 47, y: 922 },   // 4mm from left, bottom position
      
      // Right side marks
      { name: 'R1', x: width - 47, y: 120 },   // 4mm from right, top position
      { name: 'R2', x: width - 47, y: 382 },   // 4mm from right, mid-top position
      { name: 'R3', x: width - 47, y: 655 },   // 4mm from right, mid-bottom position
      { name: 'R4', x: width - 47, y: 922 },   // 4mm from right, bottom position
    ]
    
    console.log('📍 Generated alignment marks:')
    marks.forEach(mark => {
      console.log(`   ${mark.name}: (${mark.x}, ${mark.y})`)
    })
    
    return marks
  }
  
  /**
   * Calculate total questions from exam data
   */
  private static calculateTotalQuestions(examData: any): number {
    if (!examData.subjects || !Array.isArray(examData.subjects)) return 0
    
    return examData.subjects.reduce((total: number, subject: any) => {
      if (!subject.sections || !Array.isArray(subject.sections)) return total
      return total + subject.sections.reduce((sectionTotal: number, section: any) => {
        return sectionTotal + (section.questionCount || 0)
      }, 0)
    }, 0)
  }
  
  /**
   * Generate coordinates for continuous layout (3-column)
   */
  private static generateContinuousCoordinates(examData: any, width: number, height: number): BubbleCoordinate[] {
    console.log('📊 Generating continuous layout coordinates...')
    
    const coordinates: BubbleCoordinate[] = []
    
    // Flatten all questions
    const allQuestions = this.flattenQuestions(examData)
    const totalQuestions = allQuestions.length
    
    // 3-column layout parameters
    const questionsPerColumn = Math.ceil(totalQuestions / 3)
    const startX = this.PADDING + 94  // Starting X position (80px + padding adjustment)
    const startY = this.PADDING + this.HEADER_HEIGHT + 118  // Starting Y after header (200px + adjustments)
    
    console.log(`   Questions per column: ${questionsPerColumn}`)
    console.log(`   Start position: (${startX}, ${startY})`)
    
    for (let i = 0; i < totalQuestions; i++) {
      const question = allQuestions[i]
      if (!question) continue // Skip if question is undefined
      
      const columnIndex = Math.floor(i / questionsPerColumn)
      const rowIndex = i % questionsPerColumn
      
      // Calculate question position
      const questionX = startX + (columnIndex * this.COLUMN_WIDTH)
      const questionY = startY + (rowIndex * this.ROW_HEIGHT)
      
      // Get answer options for this question
      const answerOptions = this.getAnswerOptions(question.questionType)
      
      // Generate coordinates for each answer option
      answerOptions.forEach((option, optionIndex) => {
        const bubbleX = questionX + this.MARKER_OFFSET + (optionIndex * this.BUBBLE_SPACING)
        const bubbleY = questionY
        
        coordinates.push({
          x: bubbleX,
          y: bubbleY,
          option,
          questionNumber: question.questionNumber,
          questionType: question.questionType,
          subjectName: question.subjectName,
          sectionName: question.sectionName
        })
      })
    }
    
    console.log(`   Generated ${coordinates.length} bubble coordinates`)
    return coordinates
  }
  
  /**
   * Generate coordinates for subject-based layout
   */
  private static generateSubjectBasedCoordinates(examData: any, width: number, height: number): BubbleCoordinate[] {
    console.log('📚 Generating subject-based layout coordinates...')
    
    const coordinates: BubbleCoordinate[] = []
    
    const startX = this.PADDING + 94
    let currentY = this.PADDING + this.HEADER_HEIGHT + 118
    let questionCounter = 1
    
    if (!examData.subjects || !Array.isArray(examData.subjects)) {
      return coordinates
    }
    
    for (const subject of examData.subjects) {
      // Add space for subject header
      currentY += 47  // Subject header space
      
      if (!subject.sections || !Array.isArray(subject.sections)) continue
      
      for (const section of subject.sections) {
        // Add space for section header
        currentY += 35  // Section header space
        
        // Add space for answer options header
        currentY += 12  // Answer options header space
        
        // Process questions in this section
        for (let i = 0; i < section.questionCount; i++) {
          const questionY = currentY + (i * this.ROW_HEIGHT)
          
          // Get answer options for this question type
          const answerOptions = this.getAnswerOptions(section.questionType)
          
          // Generate coordinates for each answer option
          answerOptions.forEach((option, optionIndex) => {
            const bubbleX = startX + this.MARKER_OFFSET + (optionIndex * this.BUBBLE_SPACING)
            const bubbleY = questionY
            
            coordinates.push({
              x: bubbleX,
              y: bubbleY,
              option,
              questionNumber: questionCounter,
              questionType: section.questionType,
              subjectName: subject.name,
              sectionName: section.name
            })
          })
          
          questionCounter++
        }
        
        // Add space after section
        currentY += (section.questionCount * this.ROW_HEIGHT) + 71  // Section spacing
      }
    }
    
    console.log(`   Generated ${coordinates.length} bubble coordinates`)
    return coordinates
  }
  
  /**
   * Flatten all questions from exam data
   */
  private static flattenQuestions(examData: any): Array<{
    questionNumber: number
    subjectName: string
    sectionName: string
    questionType: string
  }> {
    const questions: Array<{
      questionNumber: number
      subjectName: string
      sectionName: string
      questionType: string
    }> = []
    
    if (!examData.subjects || !Array.isArray(examData.subjects)) {
      return questions
    }
    
    let questionCounter = 1
    
    examData.subjects.forEach((subject: any) => {
      if (!subject.sections || !Array.isArray(subject.sections)) return
      
      subject.sections.forEach((section: any) => {
        for (let i = 0; i < section.questionCount; i++) {
          questions.push({
            questionNumber: questionCounter++,
            subjectName: subject.name,
            sectionName: section.name,
            questionType: section.questionType
          })
        }
      })
    })
    
    return questions
  }
  
  /**
   * Get answer options for question type
   */
  private static getAnswerOptions(questionType: string): string[] {
    if (questionType === 'true_false') return ['T', 'F']
    if (questionType.startsWith('multiple_choice_')) {
      const parts = questionType.split('_')
      const optionCount = parts.length > 2 && parts[2] ? parseInt(parts[2]) : 5
      return Array.from({ length: optionCount }, (_, i) => String.fromCharCode(65 + i))
    }
    return ['A', 'B', 'C', 'D', 'E'] // Default
  }
  
  /**
   * Get bubble coordinates for a specific question and option
   */
  static getBubbleCoordinate(
    coordinateMap: OMRCoordinateMap, 
    questionNumber: number, 
    option: string
  ): BubbleCoordinate | null {
    return coordinateMap.bubbleCoordinates.find(
      coord => coord.questionNumber === questionNumber && coord.option === option
    ) || null
  }
  
  /**
   * Get all coordinates for a specific question
   */
  static getQuestionCoordinates(
    coordinateMap: OMRCoordinateMap, 
    questionNumber: number
  ): BubbleCoordinate[] {
    return coordinateMap.bubbleCoordinates.filter(
      coord => coord.questionNumber === questionNumber
    )
  }
  
  /**
   * Validate coordinate map
   */
  static validateCoordinateMap(coordinateMap: OMRCoordinateMap): {
    isValid: boolean
    issues: string[]
    statistics: {
      totalBubbles: number
      questionsWithCoordinates: number
      averageBubblesPerQuestion: number
    }
  } {
    const issues: string[] = []
    
    // Check if we have coordinates
    if (coordinateMap.bubbleCoordinates.length === 0) {
      issues.push('No bubble coordinates found')
    }
    
    // Check alignment marks
    if (coordinateMap.alignmentMarks.length !== 8) {
      issues.push(`Expected 8 alignment marks, found ${coordinateMap.alignmentMarks.length}`)
    }
    
    // Group by question number
    const questionGroups = new Map<number, BubbleCoordinate[]>()
    coordinateMap.bubbleCoordinates.forEach(coord => {
      if (!questionGroups.has(coord.questionNumber)) {
        questionGroups.set(coord.questionNumber, [])
      }
      questionGroups.get(coord.questionNumber)!.push(coord)
    })
    
    // Check for missing questions
    const maxQuestion = Math.max(...coordinateMap.bubbleCoordinates.map(c => c.questionNumber))
    for (let i = 1; i <= maxQuestion; i++) {
      if (!questionGroups.has(i)) {
        issues.push(`Missing coordinates for question ${i}`)
      }
    }
    
    // Check for duplicate coordinates
    const coordStrings = coordinateMap.bubbleCoordinates.map(c => `${c.x},${c.y}`)
    const uniqueCoords = new Set(coordStrings)
    if (coordStrings.length !== uniqueCoords.size) {
      issues.push('Duplicate coordinates detected')
    }
    
    const statistics = {
      totalBubbles: coordinateMap.bubbleCoordinates.length,
      questionsWithCoordinates: questionGroups.size,
      averageBubblesPerQuestion: questionGroups.size > 0 
        ? coordinateMap.bubbleCoordinates.length / questionGroups.size 
        : 0
    }
    
    return {
      isValid: issues.length === 0,
      issues,
      statistics
    }
  }
  
  /**
   * Export coordinate map to JSON
   */
  static exportCoordinateMap(coordinateMap: OMRCoordinateMap): string {
    return JSON.stringify(coordinateMap, null, 2)
  }
  
  /**
   * Import coordinate map from JSON
   */
  static importCoordinateMap(jsonString: string): OMRCoordinateMap {
    return JSON.parse(jsonString)
  }
}