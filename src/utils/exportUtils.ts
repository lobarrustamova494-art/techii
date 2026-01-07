import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

export interface ExportOptions {
  filename: string
  quality?: number
  format?: 'a4' | 'letter'
  onProgress?: (progress: number) => void
}

// PDF export function
export const exportToPDF = async (
  element: HTMLElement, 
  options: ExportOptions
): Promise<void> => {
  try {
    options.onProgress?.(10)
    
    // Create canvas from HTML element with better error handling
    const canvas = await html2canvas(element, {
      scale: 2, // Reduced scale for better compatibility
      useCORS: true,
      allowTaint: false,
      backgroundColor: '#ffffff',
      logging: false,
      width: element.scrollWidth,
      height: element.scrollHeight,
      imageTimeout: 15000,
      foreignObjectRendering: false, // Disable for better text rendering
      onclone: (clonedDoc) => {
        // Apply comprehensive styles to ensure proper rendering
        const style = clonedDoc.createElement('style')
        style.textContent = `
          * { 
            -webkit-print-color-adjust: exact !important; 
            print-color-adjust: exact !important; 
            color-adjust: exact !important;
            box-sizing: border-box !important;
            font-family: Arial, sans-serif !important;
          }
          
          /* Ensure all text is visible */
          span, div, p {
            color: #000000 !important;
            font-weight: inherit !important;
            text-align: inherit !important;
            line-height: inherit !important;
          }
          
          /* Border and background colors */
          .border-black { 
            border-color: #000000 !important; 
            border-style: solid !important;
          }
          .bg-black { background-color: #000000 !important; }
          .bg-gray-200 { background-color: #e5e7eb !important; }
          .bg-gray-100 { background-color: #f3f4f6 !important; }
          .bg-white { background-color: #ffffff !important; }
          
          /* Border styles */
          .border-2 { border-width: 2px !important; }
          .border { border-width: 1px !important; }
          .rounded-full { border-radius: 50% !important; }
          
          /* Typography - force visibility */
          .text-xs { 
            font-size: 0.75rem !important; 
            line-height: 1rem !important; 
            color: #000000 !important;
          }
          .text-sm { 
            font-size: 0.875rem !important; 
            line-height: 1.25rem !important; 
            color: #000000 !important;
          }
          .text-\\[10px\\] { 
            font-size: 10px !important; 
            line-height: 12px !important; 
            color: #000000 !important;
          }
          .font-bold { font-weight: 700 !important; }
          .text-center { text-align: center !important; }
          
          /* Layout */
          .flex { display: flex !important; }
          .items-center { align-items: center !important; }
          .justify-center { justify-content: center !important; }
          
          /* Sizing - ensure circles maintain size */
          .w-5 { width: 1.25rem !important; min-width: 1.25rem !important; }
          .h-5 { height: 1.25rem !important; min-height: 1.25rem !important; }
          .w-4 { width: 1rem !important; min-width: 1rem !important; }
          .h-4 { height: 1rem !important; min-height: 1rem !important; }
          
          /* Force text inside circles to be visible */
          .rounded-full {
            position: relative !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
          }
          
          .rounded-full span {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            z-index: 999 !important;
            color: #000000 !important;
            font-weight: 700 !important;
            text-align: center !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            margin: 0 !important;
            padding: 0 !important;
            box-sizing: border-box !important;
            transform: none !important;
          }
          
          /* Specific overrides for different circle sizes */
          .w-5.h-5.rounded-full {
            width: 20px !important;
            height: 20px !important;
            border: 2px solid #000000 !important;
            border-radius: 50% !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            position: relative !important;
          }
          
          .w-4.h-4.rounded-full {
            width: 16px !important;
            height: 16px !important;
            border: 2px solid #000000 !important;
            border-radius: 50% !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            position: relative !important;
          }
          
          .w-5.h-5.rounded-full span {
            font-size: 12px !important;
            line-height: 18px !important;
            color: #000000 !important;
            font-weight: 700 !important;
            position: absolute !important;
            top: -8px !important;
            left: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 20px !important;
            height: 20px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            text-align: center !important;
            transform: none !important;
          }
          
          .w-4.h-4.rounded-full span {
            font-size: 9px !important;
            line-height: 14px !important;
            color: #000000 !important;
            font-weight: 700 !important;
            position: absolute !important;
            top: -8px !important;
            left: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 16px !important;
            height: 16px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            text-align: center !important;
            transform: none !important;
          }
        `
        clonedDoc.head.appendChild(style)
        
        // Force all elements to render properly
        const allElements = clonedDoc.querySelectorAll('*')
        allElements.forEach((el: any) => {
          if (el.style) {
            el.style.webkitPrintColorAdjust = 'exact'
            el.style.printColorAdjust = 'exact'
            el.style.colorAdjust = 'exact'
          }
          
          // Ensure text in circles is visible
          if (el.classList && el.classList.contains('rounded-full')) {
            const span = el.querySelector('span')
            if (span) {
              span.style.color = '#000000'
              span.style.fontWeight = '700'
              span.style.zIndex = '999'
              span.style.position = 'relative'
            }
          }
        })
        
        options.onProgress?.(30)
      }
    })

    options.onProgress?.(60)

    // Convert to PNG with maximum quality
    const imgData = canvas.toDataURL('image/png', 1.0)
    
    // Validate the image data
    if (!imgData || imgData === 'data:,') {
      throw new Error('Failed to generate image data')
    }
    
    // Create PDF with exact dimensions
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: options.format === 'letter' ? 'letter' : 'a4',
      compress: false // Don't compress for better quality
    })

    options.onProgress?.(80)

    // Get exact page dimensions
    const pdfWidth = pdf.internal.pageSize.getWidth()
    const pdfHeight = pdf.internal.pageSize.getHeight()
    
    // Use full page dimensions for OMR sheets with high quality
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST')
    
    options.onProgress?.(95)
    
    // Save PDF
    pdf.save(`${options.filename}.pdf`)
    
    options.onProgress?.(100)
  } catch (error) {
    console.error('PDF export error:', error)
    throw new Error('PDF yaratishda xatolik yuz berdi')
  }
}

// WebP export function
export const exportToWebP = async (
  element: HTMLElement,
  options: ExportOptions
): Promise<void> => {
  try {
    options.onProgress?.(10)
    
    // Create canvas from HTML element
    const canvas = await html2canvas(element, {
      scale: 2, // Higher resolution
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      width: element.scrollWidth,
      height: element.scrollHeight,
      onclone: () => {
        options.onProgress?.(40)
      }
    })

    options.onProgress?.(70)

    // Convert to WebP
    const webpData = canvas.toDataURL('image/webp', options.quality || 0.9)
    
    options.onProgress?.(90)
    
    // Create download link
    const link = document.createElement('a')
    link.download = `${options.filename}.webp`
    link.href = webpData
    
    // Trigger download
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    options.onProgress?.(100)
  } catch (error) {
    console.error('WebP export error:', error)
    throw new Error('WebP yaratishda xatolik yuz berdi')
  }
}

// Multi-page PDF export for multiple OMR sheets
export const exportMultiPagePDF = async (
  elements: HTMLElement[],
  options: ExportOptions
): Promise<void> => {
  try {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: options.format === 'letter' ? 'letter' : 'a4',
      compress: false // Don't compress for better quality
    })

    const pdfWidth = pdf.internal.pageSize.getWidth()
    const pdfHeight = pdf.internal.pageSize.getHeight()
    const totalElements = elements.length

    for (let i = 0; i < elements.length; i++) {
      const element = elements[i]
      const progress = Math.round((i / totalElements) * 80) + 10
      options.onProgress?.(progress)
      
      // Create canvas for each element with high quality
      const canvas = await html2canvas(element, {
        scale: 3, // Higher resolution for print
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        width: element.scrollWidth,
        height: element.scrollHeight,
        onclone: (clonedDoc) => {
          // Ensure print styles are applied
          const style = clonedDoc.createElement('style')
          style.textContent = `
            * { -webkit-print-color-adjust: exact !important; color-adjust: exact !important; }
            .border-black { border-color: #000000 !important; }
            .bg-black { background-color: #000000 !important; }
            .bg-gray-200 { background-color: #e5e7eb !important; }
            .bg-gray-100 { background-color: #f3f4f6 !important; }
          `
          clonedDoc.head.appendChild(style)
        }
      })

      const imgData = canvas.toDataURL('image/png', 1.0) // Maximum quality
      
      // Add new page if not first page
      if (i > 0) {
        pdf.addPage()
      }

      // Use full page for OMR sheets
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST')
    }

    options.onProgress?.(95)

    // Save PDF
    pdf.save(`${options.filename}.pdf`)
    
    options.onProgress?.(100)
  } catch (error) {
    console.error('Multi-page PDF export error:', error)
    throw new Error('Ko\'p sahifali PDF yaratishda xatolik yuz berdi')
  }
}

// Export all sheets as separate WebP files
export const exportMultipleWebP = async (
  elements: HTMLElement[],
  baseFilename: string,
  options: Omit<ExportOptions, 'filename'>
): Promise<void> => {
  try {
    const totalElements = elements.length
    
    for (let i = 0; i < elements.length; i++) {
      const element = elements[i]
      const filename = `${baseFilename}_${String.fromCharCode(65 + i)}_toplam`
      const progress = Math.round((i / totalElements) * 90) + 5
      options.onProgress?.(progress)
      
      await exportToWebP(element, {
        ...options,
        filename,
        onProgress: undefined // Don't show individual progress for batch export
      })
      
      // Small delay between downloads to avoid browser blocking
      await new Promise(resolve => setTimeout(resolve, 500))
    }
    
    options.onProgress?.(100)
  } catch (error) {
    console.error('Multiple WebP export error:', error)
    throw new Error('Ko\'p fayl WebP yaratishda xatolik yuz berdi')
  }
}