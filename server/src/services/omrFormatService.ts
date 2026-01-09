import { OMRFormatMetadata, OMRFormatDescription, QuestionMapping, BubblePosition } from '../types/omrFormat.js'
import { IExam } from '../types/index.js'

/**
 * OMR Format Service
 * OMR varaq formatini tahlil qilish va AI ga tushuntirish uchun metadata yaratish
 */
export class OMRFormatService {
  
  /**
   * Exam ma'lumotlaridan OMR format metadata yaratish
   */
  static generateFormatMetadata(exam: IExam): OMRFormatMetadata {
    const totalQuestions = this.calculateTotalQuestions(exam)
    const questionMapping = this.generateQuestionMapping(exam)
    
    return {
      paperSize: exam.paperSize || 'a4',
      structure: exam.structure || 'continuous',
      totalQuestions,
      
      answerGrid: {
        layout: this.generateAnswerGridLayout(exam, totalQuestions),
        questionMapping,
        bubbleSpecs: {
          diameter: 5, // 5mm
          borderWidth: 0.5, // 0.5mm
          fillThreshold: 0.6, // 60%
          spacing: {
            horizontal: 8, // 8mm
            vertical: 6  // 6mm
          }
        }
      },
      
      studentInfo: {
        idBubbles: {
          digitCount: 8,
          digitsPerColumn: 10,
          position: { x: 50, y: 80, unit: 'mm' },
          bubbleSize: { width: 5, height: 5, unit: 'mm' },
          columnSpacing: 8
        },
        nameField: {
          position: { x: 20, y: 50, unit: 'mm' },
          size: { width: 80, height: 8, unit: 'mm' },
          type: 'text_field'
        },
        groupField: {
          position: { x: 120, y: 50, unit: 'mm' },
          size: { width: 60, height: 8, unit: 'mm' },
          type: 'text_field'
        }
      },
      
      examSets: {
        count: exam.examSets || 2,
        options: this.generateExamSetOptions(exam.examSets || 2),
        position: {
          position: { x: 50, y: 120, unit: 'mm' },
          size: { width: 100, height: 15, unit: 'mm' },
          type: 'bubble_grid'
        }
      },
      
      alignmentMarks: [
        {
          position: 'top-left',
          coordinates: { x: 5, y: 5, unit: 'mm' },
          size: { width: 4, height: 4, unit: 'mm' },
          shape: 'square'
        },
        {
          position: 'top-right',
          coordinates: { x: 200, y: 5, unit: 'mm' },
          size: { width: 4, height: 4, unit: 'mm' },
          shape: 'square'
        },
        {
          position: 'bottom-left',
          coordinates: { x: 5, y: 290, unit: 'mm' },
          size: { width: 4, height: 4, unit: 'mm' },
          shape: 'square'
        },
        {
          position: 'bottom-right',
          coordinates: { x: 200, y: 290, unit: 'mm' },
          size: { width: 4, height: 4, unit: 'mm' },
          shape: 'square'
        },
        {
          position: 'middle-left',
          coordinates: { x: 5, y: 148, unit: 'mm' },
          size: { width: 4, height: 4, unit: 'mm' },
          shape: 'square'
        },
        {
          position: 'middle-right',
          coordinates: { x: 200, y: 148, unit: 'mm' },
          size: { width: 4, height: 4, unit: 'mm' },
          shape: 'square'
        }
      ],
      
      metadata: {
        examName: exam.name,
        examDate: exam.date,
        subjects: this.extractSubjectInfo(exam),
        instructions: 'Doiralarni to\'liq qora qalam bilan to\'ldiring. Har bir savol uchun faqat bitta javobni belgilang.'
      }
    }
  }
  
  /**
   * AI ga berish uchun to'liq format tavsifi yaratish
   */
  static generateAIFormatDescription(exam: IExam): OMRFormatDescription {
    const metadata = this.generateFormatMetadata(exam)
    
    return {
      formatVersion: '1.0',
      description: 'Stitch OMR System - Professional Exam Answer Sheet Format',
      layout: metadata,
      aiInstructions: {
        scanningOrder: this.generateScanningOrderInstructions(metadata),
        bubbleDetection: this.generateBubbleDetectionInstructions(metadata),
        coordinateSystem: this.generateCoordinateSystemInstructions(metadata),
        qualityChecks: [
          'Alignment marks barcha 6 ta joyda mavjudligini tekshiring',
          'Javoblar grid to\'g\'ri joylashganini tasdiqlang',
          'Har bir savol uchun to\'g\'ri miqdorda variant mavjudligini tekshiring',
          'Talaba ID qismida 8 ta ustun mavjudligini tasdiqlang',
          'Imtihon to\'plami belgilanganini tekshiring'
        ]
      }
    }
  }
  
  /**
   * Jami savollar sonini hisoblash
   */
  private static calculateTotalQuestions(exam: IExam): number {
    if (typeof exam.subjects === 'number') {
      return exam.totalQuestions || 0
    }
    
    if (Array.isArray(exam.subjects)) {
      return exam.subjects.reduce((total, subject) => {
        if (subject.sections && Array.isArray(subject.sections)) {
          return total + subject.sections.reduce((sectionTotal: number, section: any) => 
            sectionTotal + (section.questionCount || 0), 0
          )
        }
        return total
      }, 0)
    }
    
    return exam.totalQuestions || 0
  }
  
  /**
   * Savollar xaritasini yaratish
   */
  private static generateQuestionMapping(exam: IExam): QuestionMapping[] {
    const mapping: QuestionMapping[] = []
    
    if (!Array.isArray(exam.subjects)) {
      // Agar subjects array bo'lmasa, oddiy ketma-ket tartib
      const totalQuestions = exam.totalQuestions || 0
      for (let i = 1; i <= totalQuestions; i++) {
        mapping.push({
          questionNumber: i,
          globalPosition: i,
          subjectIndex: 0,
          sectionIndex: 0,
          localQuestionNumber: i,
          questionType: 'multiple_choice_4',
          optionsCount: 4,
          options: ['A', 'B', 'C', 'D'],
          position: this.calculateQuestionPosition(i, exam.structure || 'continuous'),
          bubblePositions: this.generateBubblePositions(i, ['A', 'B', 'C', 'D'], exam.structure || 'continuous')
        })
      }
      return mapping
    }
    
    let questionCounter = 1
    
    exam.subjects.forEach((subject, subjectIndex) => {
      if (subject.sections && Array.isArray(subject.sections)) {
        subject.sections.forEach((section: any, sectionIndex: number) => {
          const optionsCount = this.getOptionsCount(section.questionType || 'multiple_choice_4')
          const options = this.getOptionLetters(optionsCount)
          
          for (let i = 0; i < (section.questionCount || 0); i++) {
            mapping.push({
              questionNumber: questionCounter,
              globalPosition: questionCounter,
              subjectIndex,
              sectionIndex,
              localQuestionNumber: i + 1,
              questionType: section.questionType || 'multiple_choice_4',
              optionsCount,
              options,
              position: this.calculateQuestionPosition(questionCounter, exam.structure || 'continuous'),
              bubblePositions: this.generateBubblePositions(questionCounter, options, exam.structure || 'continuous')
            })
            questionCounter++
          }
        })
      }
    })
    
    return mapping
  }
  
  /**
   * Savol pozitsiyasini hisoblash
   */
  private static calculateQuestionPosition(questionNumber: number, structure: string) {
    const baseX = 20 // mm
    const baseY = 150 // mm (javoblar qismi boshlanishi)
    const rowHeight = 6 // mm
    const columnWidth = 45 // mm
    
    if (structure === 'continuous') {
      // 4 ustunli layout
      const questionsPerColumn = Math.ceil(questionNumber / 4)
      const column = Math.floor((questionNumber - 1) / questionsPerColumn)
      const row = (questionNumber - 1) % questionsPerColumn
      
      return {
        x: baseX + (column * columnWidth),
        y: baseY + (row * rowHeight),
        unit: 'mm' as const
      }
    } else {
      // subject_in_column layout
      const row = questionNumber - 1
      return {
        x: baseX,
        y: baseY + (row * rowHeight),
        unit: 'mm' as const
      }
    }
  }
  
  /**
   * Bubble pozitsiyalarini yaratish
   */
  private static generateBubblePositions(questionNumber: number, options: string[], structure: string): BubblePosition[] {
    const questionPos = this.calculateQuestionPosition(questionNumber, structure)
    const bubbleSpacing = 8 // mm
    const questionNumberWidth = 15 // mm
    
    return options.map((option, index) => ({
      option,
      position: {
        x: questionPos.x + questionNumberWidth + (index * bubbleSpacing),
        y: questionPos.y,
        unit: 'mm' as const
      },
      size: {
        width: 5,
        height: 5,
        unit: 'mm' as const
      }
    }))
  }
  
  /**
   * Answer grid layout yaratish
   */
  private static generateAnswerGridLayout(exam: IExam, totalQuestions: number) {
    const structure = exam.structure || 'continuous'
    
    if (structure === 'continuous') {
      const columns = 4
      const questionsPerColumn = Math.ceil(totalQuestions / columns)
      
      return {
        type: 'continuous' as const,
        columns,
        questionsPerColumn,
        startPosition: { x: 20, y: 150, unit: 'mm' as const },
        spacing: { horizontal: 45, vertical: 6, unit: 'mm' as const }
      }
    } else {
      return {
        type: 'subject_grouped' as const,
        columns: 3,
        questionsPerColumn: totalQuestions,
        startPosition: { x: 20, y: 150, unit: 'mm' as const },
        spacing: { horizontal: 60, vertical: 6, unit: 'mm' as const }
      }
    }
  }
  
  /**
   * Exam set options yaratish
   */
  private static generateExamSetOptions(count: number): string[] {
    const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']
    return letters.slice(0, Math.max(count, 4)) // Kamida 4 ta option
  }
  
  /**
   * Subject ma'lumotlarini ajratib olish
   */
  private static extractSubjectInfo(exam: IExam) {
    if (!Array.isArray(exam.subjects)) {
      return [{
        name: 'Umumiy',
        sections: [{
          name: 'Asosiy qism',
          questionCount: exam.totalQuestions || 0,
          questionType: 'multiple_choice_4',
          questionRange: { start: 1, end: exam.totalQuestions || 0 }
        }],
        questionRange: { start: 1, end: exam.totalQuestions || 0 }
      }]
    }
    
    let questionCounter = 1
    
    return exam.subjects.map(subject => {
      const startQuestion = questionCounter
      const sections = subject.sections?.map((section: any) => {
        const sectionStart = questionCounter
        const sectionEnd = questionCounter + (section.questionCount || 0) - 1
        questionCounter += section.questionCount || 0
        
        return {
          name: section.name || 'Bo\'lim',
          questionCount: section.questionCount || 0,
          questionType: section.questionType || 'multiple_choice_4',
          questionRange: { start: sectionStart, end: sectionEnd }
        }
      }) || []
      
      const endQuestion = questionCounter - 1
      
      return {
        name: subject.name || 'Mavzu',
        sections,
        questionRange: { start: startQuestion, end: endQuestion }
      }
    })
  }
  
  /**
   * Scanning order instructions yaratish
   */
  private static generateScanningOrderInstructions(metadata: OMRFormatMetadata): string {
    const { structure, totalQuestions } = metadata
    
    if (structure === 'continuous') {
      return `
CONTINUOUS LAYOUT SCANNING ORDER:
1. Savollar 4 ustunda joylashgan (1-${Math.ceil(totalQuestions/4)}, ${Math.ceil(totalQuestions/4)+1}-${Math.ceil(totalQuestions*2/4)}, ...)
2. Har bir ustunda yuqoridan pastga tartib bilan skanerlang
3. Birinchi ustun: 1-${Math.ceil(totalQuestions/4)} savollar
4. Ikkinchi ustun: ${Math.ceil(totalQuestions/4)+1}-${Math.ceil(totalQuestions*2/4)} savollar
5. Uchinchi ustun: ${Math.ceil(totalQuestions*2/4)+1}-${Math.ceil(totalQuestions*3/4)} savollar
6. To'rtinchi ustun: ${Math.ceil(totalQuestions*3/4)+1}-${totalQuestions} savollar

BUBBLE DETECTION ORDER (har bir savol uchun):
- Chapdan o'ngga: A, B, C, D, E (mavjud variantlar)
- Eng qora (eng kam reflektans) bubble ni tanlang
- Agar hech qaysi bubble 60% dan ko'p to'ldirilmagan bo'lsa - BLANK deb belgilang
      `
    } else {
      return `
SUBJECT-IN-COLUMN LAYOUT SCANNING ORDER:
1. Har bir mavzu alohida blokda joylashgan
2. Mavzular yuqoridan pastga tartib bilan
3. Har bir mavzu ichida bo'limlar chapdan o'ngga
4. Bo'lim ichida savollar yuqoridan pastga

MAVZULAR TARTIBI:
${metadata.metadata.subjects.map((subject, index) => 
  `${index + 1}. ${subject.name}: ${subject.questionRange.start}-${subject.questionRange.end} savollar`
).join('\n')}

BUBBLE DETECTION ORDER (har bir savol uchun):
- Chapdan o'ngga: A, B, C, D, E (mavjud variantlar)
- Eng qora bubble ni tanlang
- 60%+ to'ldirilgan bubble ni MARKED deb hisoblang
      `
    }
  }
  
  /**
   * Bubble detection instructions yaratish
   */
  private static generateBubbleDetectionInstructions(metadata: OMRFormatMetadata): string {
    const { bubbleSpecs } = metadata.answerGrid
    
    return `
BUBBLE DETECTION SPECIFICATIONS:
- Bubble diameter: ${bubbleSpecs.diameter}mm
- Border width: ${bubbleSpecs.borderWidth}mm
- Fill threshold: ${bubbleSpecs.fillThreshold * 100}%
- Horizontal spacing: ${bubbleSpecs.spacing.horizontal}mm
- Vertical spacing: ${bubbleSpecs.spacing.vertical}mm

DETECTION ALGORITHM:
1. Locate bubble center coordinates
2. Extract circular area (${bubbleSpecs.diameter}mm diameter)
3. Ignore border pixels (${bubbleSpecs.borderWidth}mm width)
4. Count dark pixels in inner area
5. Calculate fill percentage: (dark_pixels / total_inner_pixels) * 100
6. Apply threshold: ${bubbleSpecs.fillThreshold * 100}%+ = FILLED

QUALITY CRITERIA:
- Perfect fill: 80-100% (clear answer)
- Good fill: 60-80% (acceptable answer)
- Partial fill: 40-60% (accept if darkest in row)
- Light mark: 20-40% (reject unless only mark)
- Empty: 0-20% (clearly empty)

MULTIPLE MARKS HANDLING:
- If multiple bubbles >60% filled: select darkest
- If no bubble >60% filled: select darkest if >40%
- If all bubbles <40% filled: mark as BLANK
    `
  }
  
  /**
   * Coordinate system instructions yaratish
   */
  private static generateCoordinateSystemInstructions(metadata: OMRFormatMetadata): string {
    return `
COORDINATE SYSTEM:
- Origin: Top-left corner of paper
- Units: Millimeters (mm)
- Paper size: ${metadata.paperSize.toUpperCase()} (${metadata.paperSize === 'a4' ? '210x297mm' : '216x279mm'})

ALIGNMENT MARKS (for calibration):
${metadata.alignmentMarks.map(mark => 
  `- ${mark.position}: (${mark.coordinates.x}, ${mark.coordinates.y}) ${mark.coordinates.unit}`
).join('\n')}

KEY AREAS:
- Student ID: (${metadata.studentInfo.idBubbles.position.x}, ${metadata.studentInfo.idBubbles.position.y}) ${metadata.studentInfo.idBubbles.position.unit}
- Exam Sets: (${metadata.examSets.position.position.x}, ${metadata.examSets.position.position.y}) ${metadata.examSets.position.position.unit}
- Answer Grid: (${metadata.answerGrid.layout.startPosition.x}, ${metadata.answerGrid.layout.startPosition.y}) ${metadata.answerGrid.layout.startPosition.unit}

CALIBRATION PROCESS:
1. Detect all 6 alignment marks
2. Calculate rotation angle and skew
3. Establish coordinate transformation matrix
4. Apply corrections to all bubble coordinates
5. Verify grid alignment accuracy
    `
  }
  
  /**
   * Question type dan options count olish
   */
  private static getOptionsCount(questionType: string): number {
    if (questionType.startsWith('multiple_choice_')) {
      const parts = questionType.split('_')
      return parseInt(parts[2] || '4') || 4
    }
    if (questionType === 'true_false') return 2
    return 4 // default
  }
  
  /**
   * Options count dan harflar olish
   */
  private static getOptionLetters(count: number): string[] {
    const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']
    return letters.slice(0, count)
  }
}