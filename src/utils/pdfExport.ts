/**
 * Lazy-loaded PDF Export Utilities
 * Dynamically imports heavy PDF libraries only when needed
 */

// Type definitions for better TypeScript support
interface PDFExportOptions {
  filename?: string
  quality?: number
  format?: 'a4' | 'letter'
  orientation?: 'portrait' | 'landscape'
}

interface ExamResult {
  examTitle: string
  studentName?: string
  extractedAnswers: string[]
  correctAnswers: string[]
  score?: number
  totalQuestions: number
  processingTime?: number
  confidence?: number
}

/**
 * Dynamically import jsPDF and html2canvas
 * This prevents these heavy libraries from being included in the main bundle
 */
const loadPDFLibraries = async () => {
  console.log('📦 Loading PDF libraries dynamically...')
  
  const [jsPDFModule, html2canvasModule] = await Promise.all([
    import('jspdf'),
    import('html2canvas')
  ])
  
  console.log('✅ PDF libraries loaded successfully')
  
  return {
    jsPDF: jsPDFModule.default,
    html2canvas: html2canvasModule.default
  }
}

/**
 * Export exam results to PDF
 * Lazy loads PDF libraries only when this function is called
 */
export const exportResultsToPDF = async (
  results: ExamResult,
  options: PDFExportOptions = {}
): Promise<void> => {
  try {
    console.log('📄 Starting PDF export...')
    
    // Dynamically load PDF libraries
    const { jsPDF } = await loadPDFLibraries()
    
    const {
      filename = `${results.examTitle}_results.pdf`,
      format = 'a4',
      orientation = 'portrait'
    } = options
    
    // Create PDF document
    const pdf = new jsPDF({
      orientation,
      unit: 'mm',
      format
    })
    
    // Add title
    pdf.setFontSize(20)
    pdf.text(results.examTitle, 20, 30)
    
    // Add student info if available
    if (results.studentName) {
      pdf.setFontSize(14)
      pdf.text(`Student: ${results.studentName}`, 20, 45)
    }
    
    // Add summary
    pdf.setFontSize(12)
    let yPosition = results.studentName ? 60 : 50
    
    if (results.score !== undefined) {
      pdf.text(`Score: ${results.score}/${results.totalQuestions}`, 20, yPosition)
      yPosition += 10
    }
    
    if (results.confidence !== undefined) {
      pdf.text(`Confidence: ${Math.round(results.confidence * 100)}%`, 20, yPosition)
      yPosition += 10
    }
    
    if (results.processingTime !== undefined) {
      pdf.text(`Processing Time: ${results.processingTime.toFixed(2)}s`, 20, yPosition)
      yPosition += 10
    }
    
    yPosition += 10
    
    // Add answers table
    pdf.text('Answers:', 20, yPosition)
    yPosition += 10
    
    // Table headers
    pdf.setFontSize(10)
    pdf.text('Q#', 20, yPosition)
    pdf.text('Your Answer', 40, yPosition)
    pdf.text('Correct Answer', 80, yPosition)
    pdf.text('Status', 120, yPosition)
    yPosition += 8
    
    // Draw line under headers
    pdf.line(20, yPosition - 2, 180, yPosition - 2)
    
    // Add answers
    for (let i = 0; i < results.totalQuestions; i++) {
      if (yPosition > 270) { // Start new page if needed
        pdf.addPage()
        yPosition = 20
      }
      
      const questionNum = (i + 1).toString()
      const userAnswer = results.extractedAnswers[i] || 'BLANK'
      const correctAnswer = results.correctAnswers[i] || 'N/A'
      const isCorrect = userAnswer === correctAnswer
      const status = userAnswer === 'BLANK' ? 'BLANK' : isCorrect ? '✓' : '✗'
      
      // Set color based on status
      if (isCorrect && userAnswer !== 'BLANK') {
        pdf.setTextColor(0, 128, 0) // Green
      } else if (userAnswer === 'BLANK') {
        pdf.setTextColor(128, 128, 128) // Gray
      } else {
        pdf.setTextColor(255, 0, 0) // Red
      }
      
      pdf.text(questionNum, 20, yPosition)
      pdf.text(userAnswer, 40, yPosition)
      pdf.text(correctAnswer, 80, yPosition)
      pdf.text(status, 120, yPosition)
      
      yPosition += 6
      
      // Reset color
      pdf.setTextColor(0, 0, 0)
    }
    
    // Save PDF
    pdf.save(filename)
    
    console.log('✅ PDF export completed successfully')
    
  } catch (error) {
    console.error('❌ PDF export failed:', error)
    throw new Error(`PDF export failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Export DOM element to PDF
 * Useful for exporting complex layouts
 */
export const exportElementToPDF = async (
  element: HTMLElement,
  options: PDFExportOptions = {}
): Promise<void> => {
  try {
    console.log('📄 Starting element to PDF export...')
    
    // Dynamically load PDF libraries
    const { jsPDF, html2canvas } = await loadPDFLibraries()
    
    const {
      filename = 'export.pdf',
      quality = 0.8,
      format = 'a4',
      orientation = 'portrait'
    } = options
    
    // Convert element to canvas
    console.log('🖼️ Converting element to canvas...')
    const canvas = await html2canvas(element, {
      scale: 2, // Higher resolution
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff'
    })
    
    // Create PDF
    const pdf = new jsPDF({
      orientation,
      unit: 'mm',
      format
    })
    
    // Calculate dimensions
    const imgWidth = format === 'a4' ? 210 : 216 // A4 or Letter width in mm
    const pageHeight = format === 'a4' ? 297 : 279 // A4 or Letter height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width
    let heightLeft = imgHeight
    
    let position = 0
    
    // Add image to PDF (handle multiple pages if needed)
    pdf.addImage(canvas.toDataURL('image/jpeg', quality), 'JPEG', 0, position, imgWidth, imgHeight)
    heightLeft -= pageHeight
    
    while (heightLeft >= 0) {
      position = heightLeft - imgHeight
      pdf.addPage()
      pdf.addImage(canvas.toDataURL('image/jpeg', quality), 'JPEG', 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight
    }
    
    // Save PDF
    pdf.save(filename)
    
    console.log('✅ Element to PDF export completed successfully')
    
  } catch (error) {
    console.error('❌ Element to PDF export failed:', error)
    throw new Error(`Element to PDF export failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Check if PDF libraries are available
 * Useful for showing/hiding PDF export buttons
 */
export const isPDFExportAvailable = (): boolean => {
  try {
    // Check if we're in a browser environment
    return typeof window !== 'undefined' && typeof document !== 'undefined'
  } catch {
    return false
  }
}

/**
 * Get estimated PDF file size
 * Helps users understand the export size before generating
 */
export const estimatePDFSize = (results: ExamResult): string => {
  // Rough estimation based on content
  const baseSize = 50 // KB for basic PDF structure
  const answerSize = results.totalQuestions * 0.1 // KB per answer
  const totalSize = baseSize + answerSize
  
  if (totalSize < 1024) {
    return `${Math.round(totalSize)} KB`
  } else {
    return `${(totalSize / 1024).toFixed(1)} MB`
  }
}