import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Calendar, Clock, FileText, Users, Key, ScanLine, Download, ChevronDown } from 'lucide-react'
import Header from '@/components/layout/Header'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import LoadingButton from '@/components/ui/LoadingButton'
import ProgressBar from '@/components/ui/ProgressBar'
import SkeletonLoader from '@/components/ui/SkeletonLoader'
import OMRSheet from '@/components/OMRSheet'
import { useAuth } from '@/contexts/AuthContext'
import { apiService } from '@/services/api'
import { Exam, ExamData } from '@/types'
import { exportToPDF } from '@/utils/exportUtils'

const ExamDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [exam, setExam] = useState<Exam | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [downloading, setDownloading] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [showDownloadOptions, setShowDownloadOptions] = useState(false)
  const examContentRef = useRef<HTMLDivElement>(null)
  const omrSheetsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fetchExam = async () => {
      if (!id) {
        setError('Imtihon ID si topilmadi')
        setLoading(false)
        return
      }

      try {
        const response = await apiService.getExam(id)
        if (response.success && response.data) {
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

  useEffect(() => {
    const handleClickOutside = () => {
      if (showDownloadOptions) {
        setShowDownloadOptions(false)
      }
    }

    if (showDownloadOptions) {
      document.addEventListener('click', handleClickOutside)
    }

    return () => {
      document.removeEventListener('click', handleClickOutside)
    }
  }, [showDownloadOptions])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('uz-UZ', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  const getTotalQuestions = () => {
    if (!exam || !exam.subjects) return 0
    return exam.subjects.reduce((total: number, subject: any) => {
      return total + subject.sections.reduce((sectionTotal: number, section: any) => {
        return sectionTotal + section.questionCount
      }, 0)
    }, 0)
  }

  const handleSetKeys = () => {
    navigate(`/exam-keys/${id}`)
  }

  const handleScanExam = () => {
    navigate(`/exam-scanner/${id}`)
  }

  const handleDownloadPDF = async () => {
    if (!examContentRef.current || !exam) return

    setDownloading(true)
    setDownloadProgress(0)

    try {
      await exportToPDF(examContentRef.current, {
        filename: `${exam.name}_tafsilotlar`,
        format: 'a4',
        onProgress: (progress) => {
          setDownloadProgress(progress)
        }
      })
    } catch (error) {
      console.error('PDF yuklab olishda xatolik:', error)
      alert('PDF yuklab olishda xatolik yuz berdi')
    } finally {
      setDownloading(false)
      setDownloadProgress(0)
    }
  }

  const handleDownloadOMRSheets = async () => {
    if (!omrSheetsRef.current || !exam) return

    setDownloading(true)
    setDownloadProgress(0)

    try {
      // Get only the first OMR sheet element (single sheet)
      const omrElement = omrSheetsRef.current.querySelector('.omr-sheet') as HTMLElement
      
      if (omrElement) {
        await exportToPDF(omrElement, {
          filename: `${exam.name}_OMR_varaq`,
          format: exam.paperSize || 'a4',
          onProgress: (progress) => {
            setDownloadProgress(progress)
          }
        })
      }
    } catch (error) {
      console.error('OMR varaqni yuklab olishda xatolik:', error)
      alert('OMR varaqni yuklab olishda xatolik yuz berdi')
    } finally {
      setDownloading(false)
      setDownloadProgress(0)
    }
  }

  const convertExamToExamData = (exam: Exam): ExamData => {
    return {
      name: exam.name,
      date: exam.date,
      examSets: exam.examSets || 1,
      subjects: exam.subjects || []
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark">
        <Header user={{
          id: user?.id || '1',
          name: user?.name || 'Guest',
          phone: user?.phone,
          avatar: user?.avatar || '',
          isOnline: true
        }} />
        <div className="container mx-auto px-4 py-6">
          <div className="space-y-6">
            <SkeletonLoader variant="rectangular" height="60px" />
            <SkeletonLoader variant="card" />
            <SkeletonLoader variant="text" lines={4} />
          </div>
        </div>
      </div>
    )
  }

  if (error || !exam) {
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
          title="Imtihon tafsilotlari"
          showBack
          showHome
          onBack={() => navigate('/')}
        />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="p-4 bg-red-100 dark:bg-red-900/30 rounded-full mb-4 inline-block">
              <FileText size={32} className="text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
              Xatolik yuz berdi
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mb-4">{error}</p>
            <Button onClick={() => navigate('/')}>
              Bosh sahifaga qaytish
            </Button>
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
        title="Imtihon tafsilotlari"
        showBack
        showHome
        onBack={() => navigate('/')}
      />

      <div className="max-w-4xl mx-auto p-4 pb-24">
        <div ref={examContentRef} className="space-y-6">
          {/* Imtihon asosiy ma'lumotlari */}
          <Card className="mb-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-primary/10 rounded-lg">
              <FileText size={24} className="text-primary" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                {exam.name}
              </h1>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                  <Calendar size={16} />
                  <span>{formatDate(exam.date)}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                  <Clock size={16} />
                  <span>{exam.duration || 90} daqiqa</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                  <FileText size={16} />
                  <span>{exam.totalQuestions || getTotalQuestions()} ta savol</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                  <Users size={16} />
                  <span>{exam.examSets} ta to'plam</span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Kalitlar holati */}
        <Card className="mb-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Imtihon holati
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${exam.answerKey && exam.answerKey.length > 0 ? 'bg-green-100 dark:bg-green-900/30' : 'bg-yellow-100 dark:bg-yellow-900/30'}`}>
                <Key size={20} className={exam.answerKey && exam.answerKey.length > 0 ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'} />
              </div>
              <div>
                <div className="font-medium text-slate-900 dark:text-white">
                  Kalitlar
                </div>
                <div className={`text-sm ${exam.answerKey && exam.answerKey.length > 0 ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
                  {exam.answerKey && exam.answerKey.length > 0 ? 'Belgilangan' : 'Belgilanmagan'}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <ScanLine size={20} className="text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <div className="font-medium text-slate-900 dark:text-white">
                  Tekshirishga tayyor
                </div>
                <div className={`text-sm ${exam.answerKey && exam.answerKey.length > 0 ? 'text-green-600 dark:text-green-400' : 'text-slate-500 dark:text-slate-400'}`}>
                  {exam.answerKey && exam.answerKey.length > 0 ? 'Ha' : 'Kalitlar kerak'}
                </div>
              </div>
            </div>
          </div>
        </Card>
        {/* Mavzular */}
        <Card className="mb-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Imtihon mavzulari
          </h2>
          <div className="space-y-4">
            {exam.subjects && exam.subjects.map((subject: any, index: number) => (
              <div key={subject.id || index} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                <h3 className="font-medium text-slate-900 dark:text-white mb-3">
                  {subject.name}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {subject.sections && subject.sections.map((section: any, sectionIndex: number) => (
                    <div key={section.id || sectionIndex} className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
                      <div className="text-sm font-medium text-slate-900 dark:text-white">
                        {section.name}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {section.questionCount} ta savol
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        To'g'ri: +{section.correctScore}, Noto'g'ri: {section.wrongScore}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Sozlamalar */}
        <Card className="mb-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Imtihon sozlamalari
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="text-sm text-slate-600 dark:text-slate-400">Tuzilish</div>
              <div className="text-sm font-medium text-slate-900 dark:text-white">
                {exam.structure === 'continuous' ? 'Ketma-ket' : 'Mavzu bo\'yicha ustunlar'}
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-slate-600 dark:text-slate-400">Qog'oz o'lchami</div>
              <div className="text-sm font-medium text-slate-900 dark:text-white">
                {exam.paperSize === 'a4' ? 'A4' : 'Letter'}
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-slate-600 dark:text-slate-400">Logo</div>
              <div className="text-sm font-medium text-slate-900 dark:text-white">
                {exam.includeLogo ? 'Ha' : 'Yo\'q'}
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-slate-600 dark:text-slate-400">Ixcham tartib</div>
              <div className="text-sm font-medium text-slate-900 dark:text-white">
                {exam.compactLayout ? 'Ha' : 'Yo\'q'}
              </div>
            </div>
          </div>
        </Card>

        {/* Asosiy tugmalar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button
            onClick={handleSetKeys}
            className="flex items-center justify-center gap-3 h-16"
            variant="outline"
          >
            <Key size={24} />
            <div className="text-left">
              <div className="font-semibold">Kalitlarni belgilash</div>
              <div className="text-xs opacity-75">To'g'ri javoblarni kiritish</div>
            </div>
          </Button>

          <Button
            onClick={handleScanExam}
            className="flex items-center justify-center gap-3 h-16"
          >
            <ScanLine size={24} />
            <div className="text-left">
              <div className="font-semibold">Imtihonni tekshirish</div>
              <div className="text-xs opacity-75">Javob varaqlarini skanerlash</div>
            </div>
          </Button>

          <div className="relative">
            <LoadingButton
              onClick={(e) => {
                e.stopPropagation()
                setShowDownloadOptions(!showDownloadOptions)
              }}
              loading={downloading}
              loadingText="Yuklanmoqda..."
              className="flex items-center justify-center gap-3 h-16 w-full"
              variant="outline"
              icon={<Download size={24} />}
            >
              <div className="text-left">
                <div className="font-semibold">Yuklab olish</div>
                <div className="text-xs opacity-75">PDF yoki OMR varaq</div>
              </div>
              <ChevronDown size={16} className={`transition-transform ${showDownloadOptions ? 'rotate-180' : ''}`} />
            </LoadingButton>

            {downloading && downloadProgress > 0 && (
              <div className="mt-2">
                <ProgressBar 
                  value={downloadProgress} 
                  size="sm" 
                  variant="default"
                  showLabel={true}
                  label="Yuklanish jarayoni"
                />
              </div>
            )}

            {showDownloadOptions && (
              <div 
                className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-10"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => {
                    handleDownloadPDF()
                    setShowDownloadOptions(false)
                  }}
                  className="w-full px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700 rounded-t-lg"
                >
                  <div className="font-medium">Imtihon tafsilotlari</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Ma'lumotlar va sozlamalar</div>
                </button>
                <button
                  onClick={() => {
                    handleDownloadOMRSheets()
                    setShowDownloadOptions(false)
                  }}
                  className="w-full px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700 rounded-b-lg border-t border-slate-200 dark:border-slate-700"
                >
                  <div className="font-medium">OMR varaq</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Javob varaqini chop etish uchun</div>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Hidden OMR Sheet for PDF generation - Single sheet only */}
        {exam.subjects && exam.subjects.length > 0 && (
          <div ref={omrSheetsRef} style={{ position: 'absolute', left: '-9999px', top: '0' }}>
            <OMRSheet
              examData={convertExamToExamData(exam)}
              structure={exam.structure || 'continuous'}
              includeLogo={exam.includeLogo || false}
              prefillStudentId={exam.prefillStudentId || false}
              compactLayout={exam.compactLayout || false}
              paperSize={exam.paperSize || 'a4'}
            />
          </div>
        )}
        </div>
      </div>
    </div>
  )
}

export default ExamDetail