/**
 * Exam Template Service
 * Manages exam templates and coordinate calibration for template-based OMR processing
 */

import ExamTemplate, { IExamTemplate } from '../models/ExamTemplate.js'
import { IExam } from '../types/index.js'
import { Types } from 'mongoose'

export interface TemplateCalibrationData {
  templateId: string
  calibrationAccuracy: number
  alignmentQuality: number
  coordinateMapping: {
    [questionNumber: string]: {
      markerPosition: { x: number; y: number }
      bubblePositions: {
        [option: string]: { x: number; y: number }
      }
    }
  }
  transformationMatrix: number[][]
  imageInfo: {
    width: number
    height: number
  }
}

interface AlignmentMark {
  id: string
  position: { x: number; y: number }
  confidence?: number
}

export class ExamTemplateService {
  
  /**
   * Create a new exam template based on exam data
   */
  static async createTemplateFromExam(exam: IExam): Promise<IExamTemplate> {
    console.log(`📋 Creating template for exam: ${exam.name}`)
    
    // Calculate total questions from exam subjects
    const totalQuestions = this.calculateTotalQuestions(exam)
    
    // Generate alignment marks (8 marks - 4 on each side)
    const alignmentMarks = this.generateAlignmentMarks()
    
    // Generate question layout based on exam structure
    const questionLayout = this.generateQuestionLayout(exam, totalQuestions)
    
    // Generate subject mapping for subject_in_column structure
    const subjectMapping = exam.structure === 'subject_in_column' 
      ? this.generateSubjectMapping(exam) 
      : undefined
    
    // Calculate question coordinates
    const questionCoordinates = this.calculateQuestionCoordinates(questionLayout, subjectMapping)
    
    const templateData: Partial<IExamTemplate> = {
      examId: exam._id,
      name: `Template for ${exam.name}`,
      description: `Auto-generated template for ${totalQuestions} questions`,
      
      layout: {
        paperSize: exam.paperSize || 'a4',
        orientation: 'portrait',
        dpi: 200,
        dimensions: exam.paperSize === 'letter' 
          ? { width: 1700, height: 2200 }  // Letter at 200 DPI
          : { width: 1654, height: 2339 }  // A4 at 200 DPI
      },
      
      alignmentMarks,
      questionLayout,
      ...(subjectMapping && { subjectMapping }),
      
      coordinateSystem: {
        referencePoints: this.generateReferencePoints(alignmentMarks)
      },
      
      questionCoordinates,
      createdBy: exam.createdBy,
      isActive: true
    }
    
    const template = new ExamTemplate(templateData)
    await template.save()
    
    console.log(`✅ Template created: ${template._id}`)
    console.log(`   Total questions: ${totalQuestions}`)
    console.log(`   Structure: ${exam.structure}`)
    console.log(`   Paper size: ${exam.paperSize}`)
    
    return template
  }
  
  /**
   * Get template by exam ID
   */
  static async getTemplateByExamId(examId: string | Types.ObjectId): Promise<IExamTemplate | null> {
    console.log(`🔍 Looking for template for exam: ${examId}`)
    
    const template = await ExamTemplate.findOne({ 
      examId: new Types.ObjectId(examId.toString()),
      isActive: true 
    })
    
    if (template) {
      console.log(`✅ Template found: ${template._id}`)
    } else {
      console.log(`❌ No template found for exam: ${examId}`)
    }
    
    return template
  }
  
  /**
   * Calculate total questions from exam subjects
   */
  private static calculateTotalQuestions(exam: IExam): number {
    if (!exam.subjects || !Array.isArray(exam.subjects)) {
      return exam.totalQuestions || 30
    }
    
    return exam.subjects.reduce((total: number, subject: any) => {
      if (!subject.sections || !Array.isArray(subject.sections)) {
        return total
      }
      return total + subject.sections.reduce((sectionTotal: number, section: any) => {
        return sectionTotal + (section.questionCount || 0)
      }, 0)
    }, 0)
  }
  
  /**
   * Generate 8 alignment marks (4 on each side)
   */
  private static generateAlignmentMarks() {
    return {
      leftSide: [
        { id: 'L1', position: { x: 0.024, y: 0.102 }, size: { width: 12, height: 12 }, expectedBrightness: 50, tolerance: 30 },
        { id: 'L2', position: { x: 0.024, y: 0.324 }, size: { width: 12, height: 12 }, expectedBrightness: 50, tolerance: 30 },
        { id: 'L3', position: { x: 0.024, y: 0.555 }, size: { width: 12, height: 12 }, expectedBrightness: 50, tolerance: 30 },
        { id: 'L4', position: { x: 0.024, y: 0.782 }, size: { width: 12, height: 12 }, expectedBrightness: 50, tolerance: 30 }
      ],
      rightSide: [
        { id: 'R1', position: { x: 0.976, y: 0.102 }, size: { width: 12, height: 12 }, expectedBrightness: 50, tolerance: 30 },
        { id: 'R2', position: { x: 0.976, y: 0.324 }, size: { width: 12, height: 12 }, expectedBrightness: 50, tolerance: 30 },
        { id: 'R3', position: { x: 0.976, y: 0.555 }, size: { width: 12, height: 12 }, expectedBrightness: 50, tolerance: 30 },
        { id: 'R4', position: { x: 0.976, y: 0.782 }, size: { width: 12, height: 12 }, expectedBrightness: 50, tolerance: 30 }
      ]
    }
  }
  
  /**
   * Generate question layout based on exam structure
   */
  private static generateQuestionLayout(exam: IExam, totalQuestions: number) {
    const baseLayout = {
      totalQuestions,
      structure: exam.structure || 'continuous',
      startPosition: { x: 0.15, y: 0.25 },
      questionSpacing: { horizontal: 0, vertical: 0.025 },
      options: ['A', 'B', 'C', 'D', 'E'],
      optionSpacing: 18,
      bubbleRadius: 15,
      questionMarkers: {
        enabled: true,
        size: { width: 6, height: 6 },
        offset: { x: -35, y: 0 }
      }
    }
    
    if (exam.structure === 'continuous') {
      // 3-column layout for continuous structure
      const questionsPerColumn = Math.ceil(totalQuestions / 3)
      return { ...baseLayout, questionsPerColumn }
    }
    
    return baseLayout
  }
  
  /**
   * Generate subject mapping for subject_in_column structure
   */
  private static generateSubjectMapping(exam: IExam) {
    if (!exam.subjects || !Array.isArray(exam.subjects)) {
      return []
    }
    
    const mapping: any[] = []
    let questionCounter = 1
    let yPosition = 0.25
    
    for (const subject of exam.subjects) {
      if (!subject.sections || !Array.isArray(subject.sections)) {
        continue
      }
      
      const subjectMapping: any = {
        subjectId: subject.id,
        subjectName: subject.name,
        sections: []
      }
      
      for (const section of subject.sections) {
        const startQuestion = questionCounter
        const endQuestion = questionCounter + section.questionCount - 1
        
        subjectMapping.sections.push({
          sectionId: section.id,
          sectionName: section.name,
          startQuestion,
          endQuestion,
          questionType: section.questionType,
          position: { x: 0.15, y: yPosition }
        })
        
        questionCounter += section.questionCount
        yPosition += (section.questionCount * 0.025) + 0.05 // Space between sections
      }
      
      mapping.push(subjectMapping)
      yPosition += 0.08 // Space between subjects
    }
    
    return mapping
  }
  
  /**
   * Calculate question coordinates based on layout
   */
  private static calculateQuestionCoordinates(questionLayout: any, subjectMapping?: any) {
    const coordinates: any = {}
    
    if (questionLayout.structure === 'continuous') {
      // 3-column continuous layout
      const questionsPerColumn = questionLayout.questionsPerColumn || Math.ceil(questionLayout.totalQuestions / 3)
      
      for (let i = 1; i <= questionLayout.totalQuestions; i++) {
        const columnIndex = Math.floor((i - 1) / questionsPerColumn)
        const rowInColumn = (i - 1) % questionsPerColumn
        
        const x = questionLayout.startPosition.x + (columnIndex * 0.28) // 28% spacing between columns
        const y = questionLayout.startPosition.y + (rowInColumn * questionLayout.questionSpacing.vertical)
        
        coordinates[i.toString()] = {
          markerPosition: { 
            x: x + questionLayout.questionMarkers.offset.x / 1000, // Convert px to relative
            y: y + questionLayout.questionMarkers.offset.y / 1000 
          },
          bubblePositions: {}
        }
        
        // Calculate bubble positions for each option
        for (let optionIndex = 0; optionIndex < questionLayout.options.length; optionIndex++) {
          const option = questionLayout.options[optionIndex]
          coordinates[i.toString()].bubblePositions[option] = {
            x: x + (optionIndex * questionLayout.optionSpacing / 1000), // Convert px to relative
            y: y
          }
        }
      }
    } else if (questionLayout.structure === 'subject_in_column' && subjectMapping) {
      // Subject-based layout
      for (const subject of subjectMapping) {
        for (const section of subject.sections) {
          for (let i = section.startQuestion; i <= section.endQuestion; i++) {
            const rowInSection = i - section.startQuestion
            const x = section.position.x
            const y = section.position.y + (rowInSection * questionLayout.questionSpacing.vertical)
            
            coordinates[i.toString()] = {
              markerPosition: { 
                x: x + questionLayout.questionMarkers.offset.x / 1000,
                y: y + questionLayout.questionMarkers.offset.y / 1000 
              },
              bubblePositions: {}
            }
            
            // Calculate bubble positions for each option
            for (let optionIndex = 0; optionIndex < questionLayout.options.length; optionIndex++) {
              const option = questionLayout.options[optionIndex]
              coordinates[i.toString()].bubblePositions[option] = {
                x: x + (optionIndex * questionLayout.optionSpacing / 1000),
                y: y
              }
            }
          }
        }
      }
    }
    
    return coordinates
  }
  
  /**
   * Generate reference points from alignment marks
   */
  private static generateReferencePoints(alignmentMarks: any) {
    const referencePoints = []
    
    // Add left side marks as reference points
    for (const mark of alignmentMarks.leftSide) {
      referencePoints.push({
        id: mark.id,
        name: `Left Side Mark ${mark.id}`,
        expectedPosition: mark.position
      })
    }
    
    // Add right side marks as reference points
    for (const mark of alignmentMarks.rightSide) {
      referencePoints.push({
        id: mark.id,
        name: `Right Side Mark ${mark.id}`,
        expectedPosition: mark.position
      })
    }
    
    return referencePoints
  }
  
  /**
   * Calibrate template coordinates using detected alignment marks
   */
  static async calibrateTemplate(
    template: IExamTemplate,
    detectedMarks: AlignmentMark[],
    imageWidth: number,
    imageHeight: number
  ): Promise<TemplateCalibrationData> {
    console.log(`🎯 Calibrating template coordinates...`)
    console.log(`Template: ${template._id}`)
    console.log(`Image size: ${imageWidth}x${imageHeight}`)
    console.log(`Detected marks: ${detectedMarks.length}`)
    
    // Calculate transformation matrix from detected marks
    const transformationMatrix = this.calculateTransformationMatrix(
      template.alignmentMarks,
      detectedMarks,
      imageWidth,
      imageHeight
    )
    
    // Apply transformation to question coordinates
    const coordinateMapping: any = {}
    
    if (template.questionCoordinates) {
      for (const [questionNumber, coords] of Object.entries(template.questionCoordinates)) {
        const transformedCoords = this.transformCoordinates(coords as any, transformationMatrix, imageWidth, imageHeight)
        coordinateMapping[questionNumber] = transformedCoords
      }
    }
    
    // Calculate calibration accuracy
    const calibrationAccuracy = Math.min(detectedMarks.length / 8, 1.0) // 8 expected marks
    const alignmentQuality = detectedMarks.reduce((sum: number, mark: AlignmentMark) => sum + (mark.confidence || 0.8), 0) / detectedMarks.length
    
    console.log(`✅ Calibration completed:`)
    console.log(`   Accuracy: ${Math.round(calibrationAccuracy * 100)}%`)
    console.log(`   Alignment quality: ${Math.round(alignmentQuality * 100)}%`)
    console.log(`   Coordinate mapping: ${Object.keys(coordinateMapping).length} questions`)
    
    return {
      templateId: template._id.toString(),
      calibrationAccuracy,
      alignmentQuality,
      coordinateMapping,
      transformationMatrix,
      imageInfo: { width: imageWidth, height: imageHeight }
    }
  }
  
  /**
   * Calculate transformation matrix from alignment marks
   */
  private static calculateTransformationMatrix(
    templateMarks: any,
    detectedMarks: AlignmentMark[],
    imageWidth: number,
    imageHeight: number
  ): number[][] {
    // Simple transformation matrix calculation
    // In production, use more sophisticated algorithms like perspective transformation
    
    const allTemplateMarks = [...templateMarks.leftSide, ...templateMarks.rightSide]
    
    // Find scale factors
    let scaleX = 1.0
    let scaleY = 1.0
    let translateX = 0
    let translateY = 0
    
    if (detectedMarks.length >= 2 && detectedMarks[0]) {
      // Calculate scale based on detected marks
      const firstDetected = detectedMarks[0]
      const firstTemplate = allTemplateMarks.find((m: any) => m.id === firstDetected.id)
      
      if (firstTemplate) {
        scaleX = firstDetected.position.x / (firstTemplate.position.x * imageWidth)
        scaleY = firstDetected.position.y / (firstTemplate.position.y * imageHeight)
        translateX = firstDetected.position.x - (firstTemplate.position.x * imageWidth * scaleX)
        translateY = firstDetected.position.y - (firstTemplate.position.y * imageHeight * scaleY)
      }
    }
    
    // Return transformation matrix
    return [
      [scaleX, 0, translateX],
      [0, scaleY, translateY],
      [0, 0, 1]
    ]
  }
  
  /**
   * Transform coordinates using transformation matrix
   */
  private static transformCoordinates(coords: any, matrix: number[][], imageWidth: number, imageHeight: number) {
    const transformedCoords: any = {
      markerPosition: this.applyTransformation(coords.markerPosition, matrix, imageWidth, imageHeight),
      bubblePositions: {}
    }
    
    for (const [option, position] of Object.entries(coords.bubblePositions)) {
      transformedCoords.bubblePositions[option] = this.applyTransformation(position as any, matrix, imageWidth, imageHeight)
    }
    
    return transformedCoords
  }
  
  /**
   * Apply transformation matrix to a point
   */
  private static applyTransformation(point: { x: number; y: number }, matrix: number[][], imageWidth: number, imageHeight: number) {
    // Convert relative coordinates to absolute
    const absoluteX = point.x * imageWidth
    const absoluteY = point.y * imageHeight
    
    // Apply transformation - check matrix validity
    if (!matrix[0] || !matrix[1] || matrix[0].length < 3 || matrix[1].length < 3) {
      // Return original point if matrix is invalid
      return {
        x: Math.round(absoluteX),
        y: Math.round(absoluteY)
      }
    }
    
    const row0 = matrix[0]
    const row1 = matrix[1]
    const transformedX = (row0[0] || 0) * absoluteX + (row0[1] || 0) * absoluteY + (row0[2] || 0)
    const transformedY = (row1[0] || 0) * absoluteX + (row1[1] || 0) * absoluteY + (row1[2] || 0)
    
    return {
      x: Math.round(transformedX),
      y: Math.round(transformedY)
    }
  }
  
  /**
   * Update template with calibration data
   */
  static async updateTemplateCalibration(
    templateId: string,
    calibrationData: TemplateCalibrationData
  ): Promise<void> {
    console.log(`💾 Updating template calibration: ${templateId}`)
    
    // Check if transformation matrix is valid
    if (!calibrationData.transformationMatrix[0] || !calibrationData.transformationMatrix[1]) {
      console.warn('Invalid transformation matrix, skipping calibration update')
      return
    }
    
    await ExamTemplate.findByIdAndUpdate(templateId, {
      'coordinateSystem.calibrationMatrix': calibrationData.transformationMatrix,
      'coordinateSystem.transformationParams': {
        scale: { 
          x: calibrationData.transformationMatrix[0][0] || 1.0, 
          y: calibrationData.transformationMatrix[1][1] || 1.0 
        },
        rotation: 0,
        translation: { 
          x: calibrationData.transformationMatrix[0][2] || 0, 
          y: calibrationData.transformationMatrix[1][2] || 0 
        }
      },
      updatedAt: new Date()
    })
    
    console.log(`✅ Template calibration updated`)
  }
}