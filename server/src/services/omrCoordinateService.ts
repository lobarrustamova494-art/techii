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
  
  // Layout constants (in pixels at 300 DPI) - Yangi format bo'yicha
  private static readonly PADDING = 177        // 15mm padding
  private static readonly HEADER_HEIGHT = 120  // Header section height
  private static readonly STUDENT_ID_HEIGHT = 80 // Student ID section height
  private static readonly ROW_HEIGHT = 33      // Height between question rows (28px * 300/254)
  private static readonly COLUMN_WIDTH = 236   // Width between columns (200px * 300/254)
  private static readonly BUBBLE_SIZE = 16     // Bubble diameter
  private static readonly BUBBLE_SPACING = 26  // Space between bubbles (22px * 300/254)
  private static readonly MARKER_OFFSET = 47   // Offset from marker to first bubble (40px * 300/254)
  private static readonly QUESTIONS_PER_COLUMN = 14 // Har ustunda 14 ta savol
  private static readonly ANSWER_OPTIONS = ['A', 'B', 'C', 'D'] // 4 ta javob varianti
  
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
   * Generate alignment mark coordinates - Yangi format bo'yicha
   */
  private static generateAlignmentMarks(width: number, height: number): Array<{ name: string; x: number; y: number }> {
    const marks = []
    
    // Har ustun chap tomonida 3 tadan qora to'rtburchak
    const columnsCount = 4 // Maksimal ustunlar soni
    const columnWidth = this.COLUMN_WIDTH
    const startX = this.PADDING + 20 // Chap chetdan 20px
    
    for (let col = 0; col < columnsCount; col++) {
      const columnX = startX + (col * columnWidth)
      
      // Har ustun uchun 3 ta alignment mark
      marks.push(
        { name: `C${col + 1}_T`, x: columnX, y: 150 },  // Top
        { name: `C${col + 1}_M`, x: columnX, y: 400 },  // Middle  
        { name: `C${col + 1}_B`, x: columnX, y: 650 }   // Bottom
      )
    }
    
    // Har savol yonida bittadan qora to'rtburchak (faqat birinchi ustun uchun namuna)
    const questionsPerColumn = this.QUESTIONS_PER_COLUMN
    const startY = this.PADDING + this.HEADER_HEIGHT + 50
    
    for (let q = 0; q < questionsPerColumn; q++) {
      const questionY = startY + (q * this.ROW_HEIGHT)
      marks.push({
        name: `Q${q + 1}_M`,
        x: startX + 30, // Savol yonida
        y: questionY
      })
    }
    
    console.log('📍 Generated alignment marks (New Format):')
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
   * Generate coordinates for continuous layout - Yangi format bo'yicha
   */
  private static generateContinuousCoordinates(examData: any, width: number, height: number): BubbleCoordinate[] {
    console.log('📊 Generating continuous layout coordinates (New Format)...')
    
    const coordinates: BubbleCoordinate[] = []
    
    // Flatten all questions
    const allQuestions = this.flattenQuestions(examData)
    const totalQuestions = allQuestions.length
    
    // Yangi format parametrlari
    const questionsPerColumn = this.QUESTIONS_PER_COLUMN // 14 ta savol har ustunda
    const columnsNeeded = Math.ceil(totalQuestions / questionsPerColumn)
    const startX = this.PADDING + this.MARKER_OFFSET + 70  // Alignment belgilari + savol raqami uchun joy
    const startY = this.PADDING + this.HEADER_HEIGHT + 50  // Header dan keyin
    
    console.log(`   Total questions: ${totalQuestions}`)
    console.log(`   Questions per column: ${questionsPerColumn}`)
    console.log(`   Columns needed: ${columnsNeeded}`)
    console.log(`   Start position: (${startX}, ${startY})`)
    
    for (let i = 0; i < totalQuestions; i++) {
      const question = allQuestions[i]
      if (!question) continue
      
      const columnIndex = Math.floor(i / questionsPerColumn)
      const rowIndex = i % questionsPerColumn
      
      // Calculate question position
      const questionX = startX + (columnIndex * this.COLUMN_WIDTH)
      const questionY = startY + (rowIndex * this.ROW_HEIGHT)
      
      console.log(`   Q${question.questionNumber}: Column ${columnIndex + 1}, Row ${rowIndex + 1}, Position (${questionX}, ${questionY})`)
      
      // Generate coordinates for each answer option (A, B, C, D)
      this.ANSWER_OPTIONS.forEach((option, optionIndex) => {
        const bubbleX = questionX + (optionIndex * this.BUBBLE_SPACING)
        const bubbleY = questionY
        
        coordinates.push({
          x: bubbleX,
          y: bubbleY,
          option,
          questionNumber: question.questionNumber,
          questionType: question.questionType || 'multiple_choice_4',
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
   * Get answer options for question type - Yangi format bo'yicha
   */
  private static getAnswerOptions(questionType: string): string[] {
    // Yangi format bo'yicha har doim A, B, C, D
    if (questionType === 'true_false') return ['A', 'B'] // T/F ni A/B sifatida
    
    // Har qanday multiple choice uchun A, B, C, D
    return this.ANSWER_OPTIONS // ['A', 'B', 'C', 'D']
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