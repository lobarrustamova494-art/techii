import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Key, Save, Check } from 'lucide-react'
import Header from '@/components/layout/Header'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { useAuth } from '@/contexts/AuthContext'
import { apiService } from '@/services/api'
import { Exam } from '@/types'

interface AnswerKey {
  questionNumber: number
  correctAnswers: string[]
}

const ExamKeys: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [exam, setExam] = useState<Exam | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [answerKeys, setAnswerKeys] = useState<AnswerKey[]>([])

  const answerOptions = ['A', 'B', 'C', 'D', 'E']

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
          const examData = response.data.exam
          setExam(examData)
          
          // Initialize answer keys
          const totalQuestions = getTotalQuestions(examData)
          const initialKeys: AnswerKey[] = []
          
          for (let i = 1; i <= totalQuestions; i++) {
            initialKeys.push({
              questionNumber: i,
              correctAnswers: examData.answerKey && examData.answerKey[i - 1] 
                ? examData.answerKey[i - 1].split(',') 
                : []
            })
          }
          
          setAnswerKeys(initialKeys)
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

  const getTotalQuestions = (examData: Exam) => {
    if (!examData || !examData.subjects) return 0
    return examData.subjects.reduce((total: number, subject: any) => {
      return total + subject.sections.reduce((sectionTotal: number, section: any) => {
        return sectionTotal + section.questionCount
      }, 0)
    }, 0)
  }

  const toggleAnswer = (questionNumber: number, answer: string) => {
    setAnswerKeys(prev => prev.map(key => {
      if (key.questionNumber === questionNumber) {
        const currentAnswers = key.correctAnswers
        const isSelected = currentAnswers.includes(answer)
        
        return {
          ...key,
          correctAnswers: isSelected
            ? currentAnswers.filter(a => a !== answer)
            : [...currentAnswers, answer].sort()
        }
      }
      return key
    }))
  }

  const handleSave = async () => {
    if (!exam || !id) return

    setSaving(true)
    try {
      // Convert answer keys to string array format
      const answerKeyArray = answerKeys.map(key => key.correctAnswers.join(','))
      
      // Faqat answerKey ni yuborish
      const updateData = {
        answerKey: answerKeyArray
      }

      console.log('Saving answer keys:', updateData)

      const response = await apiService.updateExam(id, updateData)
      
      if (response.success) {
        alert('Kalitlar muvaffaqiyatli saqlandi!')
        navigate(`/exam-detail/${id}`)
      } else {
        throw new Error(response.message || 'Saqlashda xatolik')
      }
    } catch (error: any) {
      console.error('Kalitlarni saqlashda xatolik:', error)
      alert(error.message || 'Kalitlarni saqlashda xatolik yuz berdi!')
    } finally {
      setSaving(false)
    }
  }

  const getCompletedCount = () => {
    return answerKeys.filter(key => key.correctAnswers.length > 0).length
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" centered />
          <p className="mt-4 text-slate-600 dark:text-slate-400">Imtihon ma'lumotlari yuklanmoqda...</p>
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
          title="Kalitlarni belgilash"
          showBack
          showHome
          onBack={() => navigate(`/exam-detail/${id}`)}
        />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="p-4 bg-red-100 dark:bg-red-900/30 rounded-full mb-4 inline-block">
              <Key size={32} className="text-red-600 dark:text-red-400" />
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
        title="Kalitlarni belgilash"
        showBack
        showHome
        onBack={() => navigate(`/exam-detail/${id}`)}
      />

      <div className="max-w-4xl mx-auto p-4 pb-24">
        {/* Progress */}
        <Card className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                {exam.name}
              </h1>
              <p className="text-slate-600 dark:text-slate-400 mt-1">
                To'g'ri javoblarni belgilang (bir nechta variant mumkin)
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-primary">
                {getCompletedCount()}/{answerKeys.length}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Belgilangan
              </div>
            </div>
          </div>
          
          {/* Progress bar */}
          <div className="mt-4 bg-slate-200 dark:bg-slate-700 rounded-full h-2">
            <div 
              className="bg-primary rounded-full h-2 transition-all duration-300"
              style={{ width: `${(getCompletedCount() / answerKeys.length) * 100}%` }}
            />
          </div>
        </Card>

        {/* Answer Keys Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {answerKeys.map((answerKey) => (
            <Card key={answerKey.questionNumber} className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-slate-900 dark:text-white">
                  Savol {answerKey.questionNumber}
                </h3>
                {answerKey.correctAnswers.length > 0 && (
                  <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                    <Check size={16} />
                    <span className="text-xs">{answerKey.correctAnswers.length}</span>
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-5 gap-2">
                {answerOptions.map((option) => {
                  const isSelected = answerKey.correctAnswers.includes(option)
                  return (
                    <button
                      key={option}
                      onClick={() => toggleAnswer(answerKey.questionNumber, option)}
                      className={`
                        aspect-square rounded-lg border-2 font-semibold text-sm transition-all
                        ${isSelected
                          ? 'border-primary bg-primary text-white shadow-lg scale-105'
                          : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-primary hover:bg-primary/5'
                        }
                      `}
                    >
                      {option}
                    </button>
                  )
                })}
              </div>
              
              {answerKey.correctAnswers.length > 0 && (
                <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  Belgilangan: {answerKey.correctAnswers.join(', ')}
                </div>
              )}
            </Card>
          ))}
        </div>

        {/* Save Button */}
        <div className="sticky bottom-4 bg-background-light dark:bg-background-dark p-4 -mx-4 border-t border-slate-200 dark:border-slate-700">
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => navigate(`/exam-detail/${id}`)}
              className="flex-1"
            >
              Bekor qilish
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || getCompletedCount() === 0}
              className="flex-1 flex items-center justify-center gap-2"
            >
              {saving ? (
                <LoadingSpinner size="sm" />
              ) : (
                <Save size={20} />
              )}
              {saving ? 'Saqlanmoqda...' : 'Saqlash'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ExamKeys