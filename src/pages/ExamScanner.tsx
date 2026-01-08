import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Check, X, AlertCircle, User, FileText, Camera, Brain, Zap, Upload, Image } from 'lucide-react'
import Header from '@/components/layout/Header'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import LoadingButton from '@/components/ui/LoadingButton'
import ProgressBar from '@/components/ui/ProgressBar'
import CameraScanner from '@/components/CameraScanner'
import { useAuth } from '@/contexts/AuthContext'
import { apiService } from '@/services/api'
import { AIService, OMRAnalysisResult } from '@/services/aiService'
import { Exam } from '@/types'
import { validateOMRSheet } from '@/utils/omrProcessor'

interface ScanResult {
  studentId: string
  studentName: string
  answers: { [questionNumber: number]: string[] }
  score: number
  totalQuestions: number
  correctAnswers: number
  wrongAnswers: number
  blankAnswers: number
  confidence: number
  processingTime: number
  scannedImage?: string
  aiAnalysis?: OMRAnalysisResult
  detailedResults?: Array<{
    questionNumber: number
    studentAnswer: string
    correctAnswer: string
    isCorrect: boolean
    score: number
  }>
}

const ExamScanner: React.FC = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropZoneRef = useRef<HTMLDivElement>(null)
  const [exam, setExam] = useState<Exam | null>(null)
  const [loading, setLoading] = useState(true)
  const [aiAnalyzing, setAiAnalyzing] = useState(false)
  const [analysisProgress, setAnalysisProgress] = useState(0)
  const [error, setError] = useState('')
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [showCamera, setShowCamera] = useState(false)
  const [scannedImage, setScannedImage] = useState<string | null>(null)
  const [uploadedFileName, setUploadedFileName] = useState<string>('')
  const [isDragOver, setIsDragOver] = useState(false)
  const [enhanceImage, setEnhanceImage] = useState(true)
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean
    issues: string[]
    suggestions: string[]
  } | null>(null)

  useEffect(() => {
    const fetchExam = async () => {
      if (!id) {
        setError('Imtihon ID topilmadi')
        setLoading(false)
        return
      }

      try {
        const response = await apiService.getExam(id)
        if (response.data?.exam) {
          setExam(response.data.exam)
        } else {
          setError('Imtihon topilmadi')
        }
      } catch (error: any) {
        console.error('Imtihon yuklashda xatolik:', error)
        setError('Imtihon yuklashda xatolik yuz berdi')
      } finally {
        setLoading(false)
      }
    }

    fetchExam()
  }, [id])

  const getTotalQuestions = (exam: Exam | null): number => {
    if (!exam) return 0
    if (exam.totalQuestions) return exam.totalQuestions
    
    // Calculate from subjects if totalQuestions is not set
    if (exam.subjects && Array.isArray(exam.subjects)) {
      return exam.subjects.reduce((total: number, subject: any) => {
        if (subject.sections && Array.isArray(subject.sections)) {
          return total + subject.sections.reduce((sectionTotal: number, section: any) => {
            return sectionTotal + (section.questionCount || 0)
          }, 0)
        }
        return total
      }, 0)
    }
    
    return 0
  }

  const handleCameraCapture = async (imageData: string) => {
    // Rasm sifatini yaxshilash (agar yoqilgan bo'lsa)
    let finalImage = imageData
    if (enhanceImage) {
      try {
        finalImage = await enhanceImageQuality(imageData)
        console.log('Camera image quality enhanced successfully')
      } catch (enhanceError) {
        console.warn('Camera image enhancement failed, using original:', enhanceError)
        finalImage = imageData
      }
    }
    
    setScannedImage(finalImage)
    setUploadedFileName('Kamera orqali olingan rasm')
    setShowCamera(false)
    
    try {
      const validation = await validateOMRSheet(finalImage)
      setValidationResult(validation)
      
      if (!validation.isValid) {
        return
      }
    
      // Avtomatik AI tahlil qilish
      await processWithAI(finalImage)
    } catch (error) {
      console.error('Validation error:', error)
      setError('Rasm validatsiyasida xatolik')
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    await processUploadedFile(file)
  }

  const processWithAIFile = async (file: File) => {
    if (!exam || !exam.answerKey || exam.answerKey.length === 0) {
      setError('Imtihon kalitlari belgilanmagan')
      return
    }

    console.log('=== AI TAHLIL BOSHLANDI (FILE UPLOAD) ===')
    console.log('File:', file.name, file.size, file.type)
    console.log('Exam data:', exam)
    console.log('Answer key:', exam.answerKey)
    console.log('Total questions expected:', exam.answerKey.length)
    console.log('Scoring:', exam.scoring)

    setAiAnalyzing(true)
    setAnalysisProgress(0)
    setError('')
    
    try {
      // Progress simulation with more realistic timing
      const progressInterval = setInterval(() => {
        setAnalysisProgress(prev => {
          if (prev >= 85) {
            clearInterval(progressInterval)
            return 85
          }
          return prev + 15
        })
      }, 800)

      const startTime = Date.now()
      
      // AI tahlil (file upload orqali)
      const aiResult = await AIService.uploadAndAnalyzeOMRSheet(
        file,
        exam.answerKey,
        exam.scoring || { correct: 1, wrong: 0, blank: 0 }
      )
      
      clearInterval(progressInterval)
      setAnalysisProgress(100)
      
      const processingTime = Date.now() - startTime
      
      console.log('AI Result (File Upload):', aiResult)
      console.log('Expected vs Actual questions:', exam.answerKey.length, 'vs', aiResult.extractedAnswers.length)
      
      // Validate results
      if (aiResult.extractedAnswers.length !== exam.answerKey.length) {
        console.warn(`Javoblar soni mos kelmaydi: kutilgan ${exam.answerKey.length}, topilgan ${aiResult.extractedAnswers.length}`)
      }
      
      // Natijani formatlash
      const result: ScanResult = {
        studentId: 'AI-UPLOAD-' + Date.now(),
        studentName: `AI Tahlil - ${file.name} (${exam.answerKey.length} savol)`,
        answers: {}, // AI dan kelgan javoblarni formatlash
        score: aiResult.totalScore,
        totalQuestions: exam.answerKey.length,
        correctAnswers: aiResult.correctAnswers,
        wrongAnswers: aiResult.wrongAnswers,
        blankAnswers: aiResult.blankAnswers,
        confidence: aiResult.confidence,
        processingTime,
        scannedImage: scannedImage || undefined,
        aiAnalysis: aiResult,
        detailedResults: aiResult.detailedResults
      }
      
      console.log('Final AI Result (File Upload):', result)
      setScanResult(result)
      
      // Show success message with details
      if (aiResult.confidence < 0.7) {
        const demoMode = aiResult.confidence < 0.9 ? 'Demo rejimida ishlayapti (OpenAI API key kerak haqiqiy tahlil uchun) - ' : ''
        setError(`${demoMode}Haqiqiy rasm tahlili uchun OpenAI API key sozlang.`)
      }
      
    } catch (error: any) {
      console.error('AI tahlil xatosi (file upload):', error)
      setError('AI tahlil qilishda xatolik yuz berdi: ' + error.message)
    } finally {
      setAiAnalyzing(false)
      setAnalysisProgress(0)
    }
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const files = e.dataTransfer.files
    if (files.length > 0) {
      const file = files[0]
      processUploadedFile(file)
    }
  }

  const processUploadedFile = async (file: File) => {
    // Fayl turini tekshirish
    if (!file.type.startsWith('image/')) {
      setError('Iltimos, rasm fayli tanlang (JPG, PNG, WebP)')
      return
    }

    // Fayl hajmini tekshirish (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      setError('Fayl hajmi 10MB dan kichik bo\'lishi kerak')
      return
    }

    try {
      setError('')
      setUploadedFileName(file.name)
      
      // Faylni base64 ga o'tkazish (preview uchun)
      const base64 = await AIService.fileToBase64(file)
      
      // Rasm sifatini yaxshilash (agar yoqilgan bo'lsa)
      let finalImage = base64
      if (enhanceImage) {
        try {
          finalImage = await enhanceImageQuality(base64)
          console.log('Image quality enhanced successfully')
        } catch (enhanceError) {
          console.warn('Image enhancement failed, using original:', enhanceError)
          finalImage = base64
        }
      }
      
      setScannedImage(finalImage)
      
      // Rasm validatsiyasi
      const validation = await validateOMRSheet(finalImage)
      setValidationResult(validation)
      
      if (!validation.isValid) {
        return
      }
    
      // Avtomatik AI tahlil qilish (file upload orqali)
      await processWithAIFile(file)
    } catch (error: any) {
      console.error('File upload error:', error)
      setError('Faylni yuklashda xatolik: ' + error.message)
    }
  }

  const enhanceImageQuality = async (base64Image: string): Promise<string> => {
    // Simple fallback - just return original image if enhancement fails
    try {
      // Check if we're in browser environment and have necessary APIs
      if (typeof window === 'undefined' || 
          typeof document === 'undefined' || 
          !document.createElement) {
        return base64Image
      }

      return new Promise((resolve) => {
        try {
          const img = document.createElement('img')
          
          img.onload = () => {
            try {
              const canvas = document.createElement('canvas')
              const ctx = canvas.getContext('2d')
              
              if (!ctx) {
                resolve(base64Image)
                return
              }

              // Set canvas size (limit to reasonable size)
              const maxSize = 2048
              const scale = Math.min(1.5, maxSize / Math.max(img.width, img.height))
              canvas.width = Math.floor(img.width * scale)
              canvas.height = Math.floor(img.height * scale)
              
              // Draw image
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
              
              // Convert back to base64 with high quality
              const enhancedBase64 = canvas.toDataURL('image/jpeg', 0.92)
              resolve(enhancedBase64)
            } catch (canvasError) {
              console.warn('Canvas processing failed:', canvasError)
              resolve(base64Image)
            }
          }
          
          img.onerror = (error) => {
            console.warn('Image load failed:', error)
            resolve(base64Image)
          }
          
          // Set image source
          img.src = base64Image
          
          // Timeout fallback
          setTimeout(() => {
            resolve(base64Image)
          }, 5000)
          
        } catch (error) {
          console.warn('Image enhancement setup failed:', error)
          resolve(base64Image)
        }
      })
    } catch (error) {
      console.warn('Image enhancement failed:', error)
      return base64Image
    }
  }

  const processWithAI = async (imageData: string) => {
    if (!exam || !exam.answerKey || exam.answerKey.length === 0) {
      setError('Imtihon kalitlari belgilanmagan')
      return
    }

    console.log('=== AI TAHLIL BOSHLANDI ===')
    console.log('Exam data:', exam)
    console.log('Answer key:', exam.answerKey)
    console.log('Total questions expected:', exam.answerKey.length)
    console.log('Scoring:', exam.scoring)

    setAiAnalyzing(true)
    setAnalysisProgress(0)
    setError('')
    
    try {
      // Progress simulation with more realistic timing
      const progressInterval = setInterval(() => {
        setAnalysisProgress(prev => {
          if (prev >= 85) {
            clearInterval(progressInterval)
            return 85
          }
          return prev + 15
        })
      }, 800)

      const startTime = Date.now()
      
      // AI tahlil
      const aiResult = await AIService.analyzeOMRSheet(
        imageData,
        exam.answerKey,
        exam.scoring || { correct: 1, wrong: 0, blank: 0 }
      )
      
      clearInterval(progressInterval)
      setAnalysisProgress(100)
      
      const processingTime = Date.now() - startTime
      
      console.log('AI Result:', aiResult)
      console.log('Expected vs Actual questions:', exam.answerKey.length, 'vs', aiResult.extractedAnswers.length)
      
      // Validate results
      if (aiResult.extractedAnswers.length !== exam.answerKey.length) {
        console.warn(`Javoblar soni mos kelmaydi: kutilgan ${exam.answerKey.length}, topilgan ${aiResult.extractedAnswers.length}`)
      }
      
      // Natijani formatlash
      const result: ScanResult = {
        studentId: 'AI-SCAN-' + Date.now(),
        studentName: `AI Tahlil (${exam.answerKey.length} savol)`,
        answers: {}, // AI dan kelgan javoblarni formatlash
        score: aiResult.totalScore,
        totalQuestions: exam.answerKey.length,
        correctAnswers: aiResult.correctAnswers,
        wrongAnswers: aiResult.wrongAnswers,
        blankAnswers: aiResult.blankAnswers,
        confidence: aiResult.confidence,
        processingTime,
        scannedImage: imageData,
        aiAnalysis: aiResult,
        detailedResults: aiResult.detailedResults
      }
      
      console.log('Final AI Result:', result)
      setScanResult(result)
      
      // Show success message with details
      if (aiResult.confidence < 0.7) {
        setError(`Diqqat: AI ishonch darajasi past (${Math.round(aiResult.confidence * 100)}%). Rasm sifatini yaxshilang yoki qayta suratga oling.`)
      }
      
    } catch (error: any) {
      console.error('AI tahlil xatosi:', error)
      setError('AI tahlil qilishda xatolik yuz berdi: ' + error.message)
    } finally {
      setAiAnalyzing(false)
      setAnalysisProgress(0)
    }
  }

  const handleSaveResult = async () => {
    if (!scanResult || !exam) return

    try {
      alert('Natija saqlandi!')
      navigate(`/exam-detail/${id}`)
    } catch (error) {
      console.error('Save error:', error)
      setError('Natijani saqlashda xatolik!')
    }
  }

  const resetScan = () => {
    setScanResult(null)
    setScannedImage(null)
    setUploadedFileName('')
    setValidationResult(null)
    setError('')
    setAnalysisProgress(0)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-slate-600 dark:text-slate-400">Imtihon yuklanmoqda...</p>
        </div>
      </div>
    )
  }

  if (error && !exam) {
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
          title="Imtihonni tekshirish"
          showBack
          showHome
          onBack={() => navigate(`/exam-detail/${id}`)}
        />
        
        <div className="max-w-4xl mx-auto p-4 pb-24 flex items-center justify-center min-h-[60vh]">
          <Card className="text-center p-8">
            <div className="flex justify-center mb-4">
              <AlertCircle size={48} className="text-red-500" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
              Xatolik yuz berdi
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mb-4">{error}</p>
            <Button onClick={() => navigate('/')}>
              Bosh sahifaga qaytish
            </Button>
          </Card>
        </div>
      </div>
    )
  }

  if (scanResult) {
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
          title="Skanerlash natijasi"
          showBack
          showHome
          onBack={() => navigate(`/exam-detail/${id}`)}
        />

        <div className="max-w-4xl mx-auto p-4 pb-24">
          <Card className="mb-6">
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="relative">
                  <Brain size={48} className="text-purple-600" />
                  <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                    <Check size={16} className="text-white" />
                  </div>
                </div>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                AI Tahlil Yakunlandi
              </h1>
              <div className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                Ishonch darajasi: {Math.round(scanResult.confidence * 100)}% | 
                Qayta ishlash vaqti: {Math.round(scanResult.processingTime / 1000)}s
                {scanResult.confidence < 0.9 && (
                  <span className="ml-2 text-blue-600 dark:text-blue-400">
                    (Demo rejim - OpenAI API key kerak haqiqiy tahlil uchun)
                  </span>
                )}
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="text-3xl font-bold text-blue-600">{scanResult.score}</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">Jami Ball</div>
                </div>
                <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="text-3xl font-bold text-green-600">{scanResult.correctAnswers}</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">To'g'ri</div>
                </div>
                <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <div className="text-3xl font-bold text-red-600">{scanResult.wrongAnswers}</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">Noto'g'ri</div>
                </div>
                <div className="text-center p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <div className="text-3xl font-bold text-slate-600">{scanResult.blankAnswers}</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">Bo'sh</div>
                </div>
              </div>

              {/* Foiz ko'rsatkichi */}
              <div className="mt-6">
                <div className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                  Natija: {Math.round((scanResult.correctAnswers / scanResult.totalQuestions) * 100)}%
                  <span className="text-sm font-normal text-slate-500 dark:text-slate-400 ml-2">
                    ({scanResult.totalQuestions} savoldan {scanResult.correctAnswers} ta to'g'ri)
                  </span>
                </div>
                <ProgressBar 
                  value={(scanResult.correctAnswers / scanResult.totalQuestions) * 100}
                  variant={
                    (scanResult.correctAnswers / scanResult.totalQuestions) >= 0.8 ? 'success' :
                    (scanResult.correctAnswers / scanResult.totalQuestions) >= 0.6 ? 'warning' : 'error'
                  }
                  size="lg"
                  showLabel={false}
                />
              </div>
            </div>
          </Card>

          {/* AI tahlil tafsilotlari */}
          {scanResult.detailedResults && scanResult.detailedResults.length > 0 && (
            <Card className="mb-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Brain size={20} className="text-purple-600" />
                AI Tahlil Tafsilotlari
                <span className="text-sm font-normal text-slate-500 dark:text-slate-400">
                  ({scanResult.detailedResults.length} savol tahlil qilindi)
                </span>
              </h3>
              
              {/* Statistika */}
              <div className="grid grid-cols-3 gap-4 mb-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{scanResult.correctAnswers}</div>
                  <div className="text-xs text-slate-500">To'g'ri javoblar</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{scanResult.wrongAnswers}</div>
                  <div className="text-xs text-slate-500">Noto'g'ri javoblar</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-slate-600">{scanResult.blankAnswers}</div>
                  <div className="text-xs text-slate-500">Bo'sh javoblar</div>
                </div>
              </div>
              
              <div className="max-h-64 overflow-y-auto">
                <div className="grid gap-2">
                  {scanResult.detailedResults.slice(0, 50).map((result, index) => (
                    <div 
                      key={index}
                      className={`flex items-center justify-between p-2 rounded text-sm ${
                        result.isCorrect 
                          ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200'
                          : result.studentAnswer === ''
                          ? 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                          : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200'
                      }`}
                    >
                      <span className="font-medium">
                        {result.questionNumber}-savol:
                      </span>
                      <div className="flex items-center gap-2">
                        <span>
                          {result.studentAnswer || 'Bo\'sh'} 
                          {result.correctAnswer && ` → ${result.correctAnswer}`}
                        </span>
                        <span className="font-bold">
                          {result.score > 0 ? '+' : ''}{result.score}
                        </span>
                      </div>
                    </div>
                  ))}
                  {scanResult.detailedResults.length > 50 && (
                    <div className="text-center text-sm text-slate-500 dark:text-slate-400 py-2">
                      ... va yana {scanResult.detailedResults.length - 50} ta savol
                    </div>
                  )}
                </div>
              </div>
            </Card>
          )}

          <Card className="mb-6">
            <div className="flex items-center gap-3">
              <User size={24} className="text-slate-600 dark:text-slate-400" />
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">
                  {scanResult.studentName}
                </h3>
                <p className="text-slate-500 dark:text-slate-400">
                  ID: {scanResult.studentId}
                </p>
              </div>
            </div>
          </Card>

          {scanResult.scannedImage && (
            <Card className="mb-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                Skanerlangan rasm
              </h3>
              <div className="relative">
                <img 
                  src={scanResult.scannedImage} 
                  alt="Skanerlangan OMR varaq"
                  className="w-full max-w-md mx-auto rounded-lg border border-slate-200 dark:border-slate-700"
                />
              </div>
            </Card>
          )}

          <div className="flex gap-4">
            <Button onClick={resetScan} variant="outline">
              Qayta skanerlash
            </Button>
            <Button onClick={handleSaveResult} className="flex-1">
              Natijani saqlash
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (showCamera) {
    return (
      <CameraScanner
        onCapture={handleCameraCapture}
        onClose={() => setShowCamera(false)}
        isScanning={aiAnalyzing}
      />
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
        title="Imtihonni tekshirish"
        showBack
        showHome
        onBack={() => navigate(`/exam-detail/${id}`)}
      />

      <div className="max-w-4xl mx-auto p-4 pb-24">
        <Card className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <FileText size={24} className="text-primary" />
            <div>
              <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
                {exam?.name}
              </h1>
              <p className="text-slate-600 dark:text-slate-400">
                {getTotalQuestions(exam)} ta savol
              </p>
            </div>
          </div>
          
          {!exam?.answerKey || exam.answerKey.length === 0 ? (
            <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <AlertCircle size={20} className="text-yellow-600 dark:text-yellow-400" />
              <span className="text-yellow-700 dark:text-yellow-300 text-sm">
                Diqqat: Imtihon kalitlari belgilanmagan. Avval kalitlarni belgilang.
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <Check size={20} className="text-green-600 dark:text-green-400" />
              <span className="text-green-700 dark:text-green-300 text-sm">
                Kalitlar belgilangan. Skanerlash uchun tayyor.
              </span>
            </div>
          )}
        </Card>

        {scannedImage && (
          <Card className="mb-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Image size={20} className="text-blue-600" />
              Yuklangan rasm
              {uploadedFileName && (
                <span className="text-sm font-normal text-slate-500 dark:text-slate-400">
                  ({uploadedFileName})
                </span>
              )}
            </h2>
            <div className="relative">
              <img 
                src={scannedImage} 
                alt="Yuklangan OMR varaq"
                className="w-full max-w-md mx-auto rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm"
              />
              <div className="absolute top-2 right-2">
                <button
                  onClick={() => {
                    setScannedImage(null)
                    setUploadedFileName('')
                    setValidationResult(null)
                  }}
                  className="p-1 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg transition-colors"
                  title="Rasmni o'chirish"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          </Card>
        )}

        {validationResult && !validationResult.isValid && (
          <Card className="mb-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Rasm sifati tekshiruvi
            </h2>
            <div className="space-y-3">
              {validationResult.issues.map((issue, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <AlertCircle size={16} className="text-yellow-600 dark:text-yellow-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">{issue}</p>
                    {validationResult.suggestions[index] && (
                      <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                        Tavsiya: {validationResult.suggestions[index]}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {error && (
          <Card className="mb-6">
            <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <AlertCircle size={20} className="text-red-600 dark:text-red-400" />
              <div>
                <p className="text-red-700 dark:text-red-300 font-medium">Xatolik yuz berdi</p>
                <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
              </div>
            </div>
          </Card>
        )}

        {aiAnalyzing && (
          <Card className="mb-6">
            <div className="flex items-center gap-4 p-4">
              <div className="flex-shrink-0">
                <div className="relative">
                  <Brain size={32} className="text-purple-600 animate-pulse" />
                  <Zap size={16} className="absolute -top-1 -right-1 text-yellow-500" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900 dark:text-white">
                  AI tomonidan tahlil qilinmoqda...
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                  Sun'iy intellekt OMR varaqni tahlil qilmoqda va javoblarni aniqlayapti
                </p>
                <ProgressBar 
                  value={analysisProgress} 
                  variant="default"
                  size="sm"
                  showLabel={true}
                  label="AI Tahlil"
                  animated={true}
                />
              </div>
            </div>
          </Card>
        )}

        <div className="space-y-4">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
          
          {/* Drag & Drop Zone */}
          <div
            ref={dropZoneRef}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleUploadClick}
            className={`
              relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200
              ${isDragOver 
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                : 'border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500'
              }
              ${aiAnalyzing ? 'pointer-events-none opacity-50' : ''}
            `}
          >
            <div className="flex flex-col items-center gap-4">
              <div className={`p-4 rounded-full ${isDragOver ? 'bg-blue-100 dark:bg-blue-800' : 'bg-slate-100 dark:bg-slate-800'}`}>
                <Upload size={32} className={isDragOver ? 'text-blue-600' : 'text-slate-600 dark:text-slate-400'} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                  {isDragOver ? 'Rasmni bu yerga tashlang' : 'OMR varaq rasmini yuklang'}
                </h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm mb-2">
                  Rasmni bu yerga sudrab tashlang yoki bosib tanlang
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-500">
                  JPG, PNG, WebP • Maksimal 10MB
                </p>
              </div>
            </div>
          </div>
          
          <div className="text-center text-slate-500 dark:text-slate-400">
            yoki
          </div>
          
          {/* Image enhancement toggle */}
          <div className="flex items-center justify-center gap-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <input
              type="checkbox"
              id="enhanceImage"
              checked={enhanceImage}
              onChange={(e) => setEnhanceImage(e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="enhanceImage" className="text-sm text-slate-700 dark:text-slate-300">
              Rasm sifatini avtomatik yaxshilash (tavsiya etiladi)
            </label>
          </div>
          
          <div className="text-center text-slate-500 dark:text-slate-400">
            yoki
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <LoadingButton
              onClick={() => setShowCamera(true)}
              loading={aiAnalyzing}
              loadingText="Tahlil qilinmoqda..."
              className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700"
              icon={<Camera size={20} />}
            >
              Kamera bilan skanerlash
            </LoadingButton>
            
            <LoadingButton
              onClick={handleUploadClick}
              loading={aiAnalyzing}
              loadingText="Tahlil qilinmoqda..."
              variant="outline"
              className="flex items-center justify-center gap-2 border-green-300 text-green-700 hover:bg-green-50"
              icon={<Upload size={20} />}
            >
              Fayl tanlash
            </LoadingButton>
          </div>
          
          {scannedImage && !scanResult && (
            <div className="flex justify-center">
              <LoadingButton
                onClick={() => processWithAI(scannedImage)}
                loading={aiAnalyzing}
                loadingText="AI tahlil qilinmoqda..."
                variant="primary"
                icon={<Brain size={20} />}
                className="w-full md:w-auto"
              >
                AI bilan qayta tahlil qilish
              </LoadingButton>
            </div>
          )}

          {!exam?.answerKey || exam.answerKey.length === 0 ? (
            <div className="text-center">
              <Button
                onClick={() => navigate(`/exam-keys/${id}`)}
                variant="outline"
                className="text-yellow-600 border-yellow-300 hover:bg-yellow-50"
              >
                Avval kalitlarni belgilang
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export default ExamScanner