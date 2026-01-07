import React, { useState, useEffect } from 'react'
import { CheckCircle, Clock, Plus, Calendar, FileText, MoreVertical } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Header from '@/components/layout/Header'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import SkeletonLoader from '@/components/ui/SkeletonLoader'
import { Exam } from '@/types'
import { apiService } from '@/services/api'
import { useAuth } from '@/contexts/AuthContext'

const Dashboard: React.FC = () => {
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuth()
  const [exams, setExams] = useState<Exam[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchExams = async () => {
      if (!isAuthenticated) {
        setLoading(false)
        return
      }

      try {
        const response = await apiService.getExams()
        if (response.success && response.data) {
          setExams(response.data.exams || [])
        }
      } catch (error) {
        console.error('Imtihonlarni yuklashda xatolik:', error)
        // Xatolik bo'lsa mock ma'lumotlar bilan ishlash
        const mockExams: Exam[] = [
          {
            id: '1',
            name: 'Matematika - 9-sinf',
            date: '2024-01-15',
            totalQuestions: 25,
            duration: 90,
            answerPattern: 'ABCD',
            scoring: { correct: 4, wrong: -1, blank: 0 },
            answerKey: []
          }
        ]
        setExams(mockExams)
      } finally {
        setLoading(false)
      }
    }

    fetchExams()
  }, [isAuthenticated])

  const userForHeader = user ? {
    id: user.id,
    name: user.name,
    phone: user.phone,
    avatar: user.avatar || 'https://lh3.googleusercontent.com/aida-public/AB6AXuA94U697wToZmrmBb82sHacOY7RKuQYGB8CALrxdtziv9D9OwJyB9yxZ-Ct7V2qAMuXvrb54z3Js7rGPFG93YHFrc2T5Pv7daZJ-WI5gdPPLwqNm9ct3vlpkj3BTx8MZ_H3MNRrjRFxEina0hqKPXlz1pTikI2Tq7rRFFhQMnZidIIPLZFwHrLdx-TkAr_Uu4Q0CCmzY5XKD3z_IltwD-ZJ81Fhg2bwst4rPbeJ0lQx40fMipe3uORBGrklY11ySWo4QViEZNjtfl_o',
    isOnline: true
  } : {
    id: '1',
    name: 'Foydalanuvchi',
    phone: '',
    avatar: '',
    isOnline: false
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('uz-UZ', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  const quickActions = [
    {
      title: 'Imtihon yaratish',
      icon: Plus,
      color: 'bg-primary/10 text-primary',
      onClick: () => navigate('/exam-creation')
    },
    {
      title: 'Loading Demo',
      icon: Clock,
      color: 'bg-blue-500/10 text-blue-500',
      onClick: () => navigate('/loading-demo')
    }
  ]

  return (
    <div className="relative flex h-full min-h-screen w-full flex-col overflow-x-hidden bg-background-light dark:bg-background-dark text-slate-900 dark:text-white">
      <Header user={userForHeader} showHome={false} />
      


      {/* Quick Actions */}
      <section className="mt-6 px-4">
        <h3 className="text-slate-900 dark:text-white text-lg font-bold leading-tight mb-3">Imtihon yaratish</h3>
        <div className="grid grid-cols-1 gap-3">
          {quickActions.map((action, index) => (
            <Button
              key={index}
              variant="outline"
              className="flex flex-col items-center justify-center gap-2 h-auto p-6 hover:border-primary/50"
              onClick={action.onClick}
            >
              <div className={`flex items-center justify-center size-12 rounded-full mb-1 ${action.color}`}>
                <action.icon size={24} />
              </div>
              <h2 className="text-slate-900 dark:text-white text-sm font-bold">{action.title}</h2>
            </Button>
          ))}
        </div>
      </section>

      {/* Yaratilgan imtihonlar */}
      <section className="mt-8 px-4 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-slate-900 dark:text-white text-lg font-bold leading-tight">Yaratilgan imtihonlar</h3>
          <button 
            className="text-primary text-sm font-medium"
            onClick={() => navigate('/exam-creation')}
          >
            Yangi yaratish
          </button>
        </div>
        
        {loading ? (
          <div className="space-y-4">
            <SkeletonLoader variant="list" lines={3} />
          </div>
        ) : exams.length === 0 ? (
          <Card className="flex flex-col items-center justify-center py-12 text-center">
            <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-full mb-4">
              <FileText size={32} className="text-slate-400" />
            </div>
            <h4 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              Hali imtihon yaratilmagan
            </h4>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 max-w-sm">
              Birinchi imtihoningizni yaratish uchun pastdagi tugmani bosing
            </p>
            <Button onClick={() => navigate('/exam-creation')}>
              <Plus size={16} className="mr-2" />
              Imtihon yaratish
            </Button>
          </Card>
        ) : (
          <div className="space-y-3">
            {exams.slice(0, 5).map((exam) => (
              <Card key={exam.id} className="p-0 overflow-hidden">
                <div 
                  className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  onClick={() => navigate(`/exam-detail/${exam.id}`)}
                >
                  <div className="flex items-start gap-3 flex-1">
                    <div className="mt-0.5 flex-shrink-0 size-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileText size={20} className="text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                        {exam.name}
                      </h4>
                      <div className="flex items-center gap-4 mt-1">
                        <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                          <Calendar size={12} />
                          {formatDate(exam.date)}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                          <CheckCircle size={12} />
                          {exam.totalQuestions} savol
                        </div>
                        <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                          <Clock size={12} />
                          {exam.duration} daqiqa
                        </div>
                      </div>
                    </div>
                  </div>
                  <button 
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    onClick={(e) => {
                      e.stopPropagation()
                      // Menu actions can be added here
                    }}
                  >
                    <MoreVertical size={16} className="text-slate-400" />
                  </button>
                </div>
              </Card>
            ))}
            
            {exams.length > 5 && (
              <div className="text-center pt-2">
                <button 
                  className="text-primary text-sm font-medium hover:underline"
                  onClick={() => navigate('/exams')}
                >
                  Barcha imtihonlarni ko'rish ({exams.length})
                </button>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  )
}

export default Dashboard