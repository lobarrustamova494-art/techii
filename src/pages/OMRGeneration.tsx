import React, { useState, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Download, Eye, Save } from 'lucide-react'
import Header from '@/components/layout/Header'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import OMRSheet from '@/components/OMRSheet'
import { ExamData } from '@/types'
import { exportToPDF } from '@/utils/exportUtils'
import { apiService } from '@/services/api'
import { useAuth } from '@/contexts/AuthContext'

interface OMRConfig {
  selectedExam: string
  paperSize: 'a4' | 'letter'
  includeLogo: boolean
  prefillStudentId: boolean
  compactLayout: boolean
  structure: 'continuous' | 'subject_in_column'
}

const OMRGeneration: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const examData = location.state?.examData as ExamData | undefined
  const printRef = useRef<HTMLDivElement>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)
  
  const [config, setConfig] = useState<OMRConfig>({
    selectedExam: examData ? 'current_exam' : '',
    paperSize: 'a4',
    includeLogo: true,
    prefillStudentId: false,
    compactLayout: false,
    structure: 'continuous'
  })

  const handleSaveExam = async () => {
    if (!examData || !user) {
      alert('Ma\'lumotlar yoki foydalanuvchi topilmadi!')
      return
    }

    setIsSaving(true)
    
    try {
      const examToSave = {
        name: examData.name || 'Yangi Imtihon',
        date: examData.date,
        examSets: examData.examSets,
        subjects: examData.subjects,
        totalQuestions: examData.subjects.reduce((total, subject) => 
          total + subject.sections.reduce((sectionTotal, section) => sectionTotal + section.questionCount, 0), 0
        ),
        duration: 90,
        answerPattern: 'ABCD' as const,
        scoring: {
          correct: 4,
          wrong: -1,
          blank: 0
        },
        answerKey: [],
        config: config,
        structure: config.structure,
        paperSize: config.paperSize,
        includeLogo: config.includeLogo,
        prefillStudentId: config.prefillStudentId,
        compactLayout: config.compactLayout
      }

      console.log('Exam data to save:', JSON.stringify(examToSave, null, 2))

      const response = await apiService.createExam(examToSave)
      
      if (response.success) {
        alert('Imtihon muvaffaqiyatli saqlandi!')
        navigate('/', { replace: true })
      } else {
        throw new Error(response.message || 'Saqlashda xatolik')
      }
    } catch (error: any) {
      console.error('Imtihon saqlashda xatolik:', error)
      alert(error.message || 'Imtihon saqlashda xatolik yuz berdi!')
    } finally {
      setIsSaving(false)
    }
  }

  const handleGenerate = () => {
    if (!examData) {
      alert('Imtihon ma\'lumotlari topilmadi!')
      return
    }
    setShowPreview(true)
  }

  const handleDownloadPDF = async () => {
    if (!printRef.current || !examData) {
      alert('Ma\'lumotlar topilmadi!')
      return
    }

    setIsExporting(true)
    setExportProgress(0)

    try {
      const omrElement = printRef.current.querySelector('.omr-sheet') as HTMLElement
      
      if (omrElement) {
        // Store original styles
        const originalStyle = omrElement.style.cssText
        const originalClassList = omrElement.className
        
        // Apply print-optimized styles temporarily
        omrElement.style.cssText = `
          ${originalStyle}
          background: white !important;
          color: black !important;
          font-family: Arial, sans-serif !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
          box-shadow: none !important;
          transform: none !important;
          position: relative !important;
        `
        
        // Ensure all child elements have proper styles
        const allElements = omrElement.querySelectorAll('*')
        const originalStyles: string[] = []
        
        allElements.forEach((el: any, index) => {
          originalStyles[index] = el.style.cssText
          
          // Force visibility for all elements
          el.style.webkitPrintColorAdjust = 'exact'
          el.style.printColorAdjust = 'exact'
          el.style.colorAdjust = 'exact'
          
          if (el.classList.contains('border-black')) {
            el.style.borderColor = '#000000'
            el.style.borderStyle = 'solid'
          }
          if (el.classList.contains('bg-black')) {
            el.style.backgroundColor = '#000000'
          }
          if (el.classList.contains('rounded-full')) {
            el.style.borderRadius = '50%'
            el.style.display = 'flex'
            el.style.alignItems = 'center'
            el.style.justifyContent = 'center'
            el.style.position = 'relative'
            
            // Force text inside circles to be visible
            const textElement = el.querySelector('span')
            if (textElement) {
              textElement.style.position = 'absolute'
              textElement.style.top = '0'
              textElement.style.left = '0'
              textElement.style.right = '0'
              textElement.style.bottom = '0'
              textElement.style.display = 'flex'
              textElement.style.alignItems = 'center'
              textElement.style.justifyContent = 'center'
              textElement.style.color = '#000000'
              textElement.style.fontWeight = '700'
              textElement.style.zIndex = '999'
              textElement.style.textAlign = 'center'
              textElement.style.margin = '0'
              textElement.style.padding = '0'
              textElement.style.transform = 'none'
              
              // Set appropriate font size and line-height based on circle size
              if (el.classList.contains('w-5')) {
                textElement.style.fontSize = '12px'
                textElement.style.lineHeight = '18px'
                textElement.style.width = '20px'
                textElement.style.height = '20px'
                textElement.style.top = '-8px'
              } else if (el.classList.contains('w-4')) {
                textElement.style.fontSize = '9px'
                textElement.style.lineHeight = '14px'
                textElement.style.width = '16px'
                textElement.style.height = '16px'
                textElement.style.top = '-8px'
              }
            }
          }
          
          // Ensure all spans are visible
          if (el.tagName === 'SPAN') {
            el.style.color = '#000000'
            el.style.fontWeight = '700'
            el.style.display = 'block'
            
            // If span is inside a circle, make it centered
            if (el.parentElement?.classList.contains('rounded-full')) {
              el.style.position = 'absolute'
              el.style.top = '-8px'
              el.style.left = '0'
              el.style.right = '0'
              el.style.bottom = '0'
              el.style.display = 'flex'
              el.style.alignItems = 'center'
              el.style.justifyContent = 'center'
              el.style.zIndex = '999'
              el.style.textAlign = 'center'
              el.style.margin = '0'
              el.style.padding = '0'
              el.style.transform = 'none'
            }
          }
          
          if (el.classList.contains('font-bold')) {
            el.style.fontWeight = '700'
          }
        })
        
        // Wait a bit for styles to apply
        await new Promise(resolve => setTimeout(resolve, 100))
        
        await exportToPDF(omrElement, {
          filename: `${examData.name}_OMR_varaq`,
          format: config.paperSize,
          onProgress: (progress) => {
            setExportProgress(progress)
          }
        })
        
        // Restore original styles
        omrElement.style.cssText = originalStyle
        omrElement.className = originalClassList
        
        allElements.forEach((el: any, index) => {
          el.style.cssText = originalStyles[index]
        })
        
        alert('PDF muvaffaqiyatli yuklab olindi!')
      }
    } catch (error) {
      console.error('PDF yuklab olishda xatolik:', error)
      alert('PDF yuklab olishda xatolik yuz berdi!')
    } finally {
      setIsExporting(false)
      setExportProgress(0)
    }
  }

  const toggleConfig = (key: keyof OMRConfig) => {
    setConfig(prev => ({
      ...prev,
      [key]: !prev[key as keyof typeof prev]
    }))
  }

  if (showPreview && examData) {
    return (
      <div className="min-h-screen bg-gray-100">
        <div className="bg-white shadow-sm border-b p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <Button variant="outline" onClick={() => setShowPreview(false)}>
            Orqaga
          </Button>
          <h2 className="text-lg font-bold text-center flex-1">OMR Varaq - Oldindan ko'rish</h2>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button 
              onClick={handleDownloadPDF}
              disabled={isExporting}
              className="relative overflow-hidden w-full sm:w-auto"
            >
              {isExporting && (
                <div 
                  className="absolute inset-0 bg-blue-600 transition-all duration-300 ease-out"
                  style={{ width: `${exportProgress}%` }}
                />
              )}
              <div className="relative flex items-center justify-center">
                {isExporting ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <Download size={16} className="mr-2" />
                )}
                {isExporting 
                  ? `Yuklanmoqda... ${exportProgress}%` 
                  : 'PDF yuklab olish'
                }
              </div>
            </Button>
          </div>
        </div>
        
        <div className="p-4 sm:p-8 overflow-auto">
          <div ref={printRef}>
            <OMRSheet
              examData={examData}
              structure={config.structure}
              includeLogo={config.includeLogo}
              prefillStudentId={config.prefillStudentId}
              compactLayout={config.compactLayout}
              paperSize={config.paperSize}
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark">
      <Header
        user={user ? {
          id: user.id,
          name: user.name,
          phone: user.phone,
          avatar: user.avatar || '',
          isOnline: true
        } : { id: '1', name: '', phone: '', avatar: '', isOnline: false }}
        title="OMR Varaq Yaratish"
        showBack
        showHome
        onBack={() => navigate(-1)}
      />

      <div className="max-w-4xl mx-auto p-4 pb-24 px-4 sm:px-6 lg:px-8">
        {/* Exam Info */}
        {examData && (
          <Card className="mb-6 p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Imtihon Ma'lumotlari
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <span className="text-sm text-slate-600 dark:text-slate-400">Nomi:</span>
                <p className="font-medium break-words">{examData.name}</p>
              </div>
              <div>
                <span className="text-sm text-slate-600 dark:text-slate-400">Sana:</span>
                <p className="font-medium">{examData.date}</p>
              </div>
              <div>
                <span className="text-sm text-slate-600 dark:text-slate-400">To'plamlar:</span>
                <p className="font-medium">{examData.examSets}</p>
              </div>
              <div>
                <span className="text-sm text-slate-600 dark:text-slate-400">Mavzular:</span>
                <p className="font-medium">{examData.subjects.length}</p>
              </div>
            </div>
          </Card>
        )}

        {/* Configuration */}
        <Card className="mb-6 p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Sozlamalar
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm sm:text-base">Logo qo'shish</span>
              <button
                onClick={() => toggleConfig('includeLogo')}
                className={`w-12 h-6 rounded-full transition-colors ${
                  config.includeLogo ? 'bg-primary' : 'bg-gray-300'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                  config.includeLogo ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>
            
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <span className="text-sm sm:text-base">Qog'oz o'lchami</span>
              <select
                value={config.paperSize}
                onChange={(e) => setConfig(prev => ({ ...prev, paperSize: e.target.value as 'a4' | 'letter' }))}
                className="px-3 py-2 border border-slate-300 rounded-lg w-full sm:w-auto"
              >
                <option value="a4">A4</option>
                <option value="letter">Letter</option>
              </select>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <span className="text-sm sm:text-base">Tuzilish</span>
              <select
                value={config.structure}
                onChange={(e) => setConfig(prev => ({ ...prev, structure: e.target.value as 'continuous' | 'subject_in_column' }))}
                className="px-3 py-2 border border-slate-300 rounded-lg w-full sm:w-auto"
              >
                <option value="continuous">Ketma-ket</option>
                <option value="subject_in_column">Mavzu bo'yicha</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Button onClick={handleGenerate} disabled={!examData} className="w-full sm:w-auto">
            <Eye size={16} className="mr-2" />
            Oldindan ko'rish
          </Button>
          
          <Button onClick={handleSaveExam} disabled={!examData || isSaving} className="w-full sm:w-auto">
            {isSaving ? (
              <>
                <LoadingSpinner size="sm" />
                Saqlanmoqda...
              </>
            ) : (
              <>
                <Save size={16} className="mr-2" />
                Imtihonni saqlash
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default OMRGeneration