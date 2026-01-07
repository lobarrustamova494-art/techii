import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, Minus, Plus } from 'lucide-react'
import Header from '@/components/layout/Header'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'

interface Subject {
  id: string
  name: string
  sections: Section[]
}

interface Section {
  id: string
  name: string
  questionCount: number
  questionType: 'multiple_choice_3' | 'multiple_choice_4' | 'multiple_choice_5' | 'multiple_choice_6' | 'multiple_choice_7' | 'multiple_choice_8' | 'multiple_choice_9' | 'multiple_choice_10' | 'true_false' | 'matrix' | 'numerical' | 'subjective'
  correctScore: number
  wrongScore: number
}

interface ExamData {
  name: string
  date: string
  examSets: number
  subjects: Subject[]
}

const ExamCreation: React.FC = () => {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(1)
  
  const [examData, setExamData] = useState<ExamData>({
    name: 'Yangi Imtihon',
    date: '2024-01-15',
    examSets: 2,
    subjects: []
  })

  // Step 1: Basic exam info and subjects
  const addSubject = () => {
    const newSubject: Subject = {
      id: Date.now().toString(),
      name: `Mavzu ${examData.subjects.length + 1}`,
      sections: [{
        id: Date.now().toString() + '_1',
        name: 'Bo\'lim 1',
        questionCount: 10,
        questionType: 'multiple_choice_4',
        correctScore: 1.0,
        wrongScore: -0.25
      }]
    }
    setExamData(prev => ({
      ...prev,
      subjects: [...prev.subjects, newSubject]
    }))
  }

  const removeSubject = (subjectId: string) => {
    setExamData(prev => ({
      ...prev,
      subjects: prev.subjects.filter(s => s.id !== subjectId)
    }))
  }

  const addSection = (subjectId: string) => {
    setExamData(prev => ({
      ...prev,
      subjects: prev.subjects.map(subject => 
        subject.id === subjectId && subject.sections.length < 10
          ? {
              ...subject,
              sections: [...subject.sections, {
                id: Date.now().toString(),
                name: `Bo'lim ${subject.sections.length + 1}`,
                questionCount: 10,
                questionType: 'multiple_choice_4',
                correctScore: 1.0,
                wrongScore: -0.25
              }]
            }
          : subject
      )
    }))
  }

  const updateSubjectName = (subjectId: string, name: string) => {
    setExamData(prev => ({
      ...prev,
      subjects: prev.subjects.map(subject => 
        subject.id === subjectId ? { ...subject, name } : subject
      )
    }))
  }

  const updateSectionData = (subjectId: string, sectionId: string, field: keyof Section, value: any) => {
    setExamData(prev => ({
      ...prev,
      subjects: prev.subjects.map(subject => 
        subject.id === subjectId 
          ? {
              ...subject,
              sections: subject.sections.map(section =>
                section.id === sectionId ? { ...section, [field]: value } : section
              )
            }
          : subject
      )
    }))
  }

  const questionTypeOptions = [
    { value: 'multiple_choice_3', label: '3 ta variant' },
    { value: 'multiple_choice_4', label: '4 ta variant' },
    { value: 'multiple_choice_5', label: '5 ta variant' },
    { value: 'multiple_choice_6', label: '6 ta variant' },
    { value: 'multiple_choice_7', label: '7 ta variant' },
    { value: 'multiple_choice_8', label: '8 ta variant' },
    { value: 'multiple_choice_9', label: '9 ta variant' },
    { value: 'multiple_choice_10', label: '10 ta variant' },
    { value: 'true_false', label: 'To\'g\'ri/Noto\'g\'ri' },
    { value: 'matrix', label: 'Matritsa' },
    { value: 'numerical', label: 'Raqamli' },
    { value: 'subjective', label: 'Subjektiv' }
  ]

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1)
    } else {
      // Final step - navigate to OMR generation
      navigate('/omr-generation', { state: { examData } })
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    } else {
      navigate('/')
    }
  }

  const renderStep1 = () => (
    <div className="space-y-6">
      {/* Basic Details */}
      <div>
        <h3 className="px-4 pb-2 text-sm font-semibold text-gray-500 uppercase tracking-wider dark:text-gray-400">
          Imtihon ma'lumotlari
        </h3>
        <Card className="mx-4 p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <Input
              label="Imtihon nomi"
              placeholder="masalan: Fizika oraliq nazorat 2024"
              value={examData.name}
              onChange={(e) => setExamData(prev => ({ ...prev, name: e.target.value }))}
            />
          </div>
          <div className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-800 cursor-pointer">
            <span className="text-base font-medium text-slate-900 dark:text-gray-200">Sana</span>
            <div className="flex items-center gap-2">
              <span className="text-primary dark:text-blue-400 text-base">{examData.date}</span>
              <Calendar size={20} className="text-gray-400" />
            </div>
          </div>
        </Card>
      </div>

      {/* Exam Sets */}
      <div>
        <h3 className="px-4 pb-2 text-sm font-semibold text-gray-500 uppercase tracking-wider dark:text-gray-400">
          Imtihon to'plamlari
        </h3>
        <Card className="mx-4 p-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-base font-medium text-slate-900 dark:text-gray-200">To'plamlar soni</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">Maksimal 10 ta to'plam</span>
            </div>
            <div className="flex items-center gap-3 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              <Button
                size="sm"
                variant="secondary"
                className="w-8 h-8 p-0"
                onClick={() => setExamData(prev => ({ ...prev, examSets: Math.max(1, prev.examSets - 1) }))}
              >
                <Minus size={16} />
              </Button>
              <span className="text-base font-semibold w-6 text-center text-slate-900 dark:text-white">
                {examData.examSets}
              </span>
              <Button
                size="sm"
                variant="secondary"
                className="w-8 h-8 p-0"
                onClick={() => setExamData(prev => ({ ...prev, examSets: Math.min(10, prev.examSets + 1) }))}
              >
                <Plus size={16} />
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Subjects */}
      <div>
        <div className="flex items-center justify-between px-4 pb-2">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider dark:text-gray-400">
            Mavzular
          </h3>
          <Button size="sm" onClick={addSubject}>
            <Plus size={16} className="mr-1" />
            Mavzu qo'shish
          </Button>
        </div>

        {examData.subjects.length === 0 ? (
          <Card className="mx-4 p-8 text-center">
            <p className="text-gray-500 dark:text-gray-400 mb-4">Hali mavzu qo'shilmagan</p>
            <Button onClick={addSubject}>
              <Plus size={16} className="mr-2" />
              Birinchi mavzuni qo'shish
            </Button>
          </Card>
        ) : (
          <div className="space-y-3 px-4">
            {examData.subjects.map((subject) => (
              <Card key={subject.id} className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <Input
                    value={subject.name}
                    onChange={(e) => updateSubjectName(subject.id, e.target.value)}
                    className="font-medium"
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeSubject(subject.id)}
                    className="text-red-500 hover:text-red-600"
                  >
                    <Minus size={16} />
                  </Button>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Bo'limlar ({subject.sections.length}/10)</span>
                    {subject.sections.length < 10 && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => addSection(subject.id)}
                      >
                        <Plus size={14} className="mr-1" />
                        Bo'lim
                      </Button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    {subject.sections.map((section) => (
                      <div key={section.id} className="bg-gray-50 dark:bg-gray-800 rounded p-2 text-center">
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                          {section.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="px-4">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
          Bo'limlar sozlamalari
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Har bir bo'lim uchun savol turi va baholash tizimini belgilang
        </p>
      </div>

      <div className="space-y-4 px-4">
        {examData.subjects.map((subject) => (
          <Card key={subject.id} className="p-4">
            <h4 className="font-semibold text-slate-900 dark:text-white mb-4">{subject.name}</h4>
            
            <div className="space-y-4">
              {subject.sections.map((section) => (
                <div key={section.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <h5 className="font-medium text-slate-900 dark:text-white mb-3">{section.name}</h5>
                  
                  <div className="grid grid-cols-1 gap-4">
                    {/* Question Count */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Savollar soni
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={section.questionCount}
                        onChange={(e) => updateSectionData(subject.id, section.id, 'questionCount', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-slate-900 dark:text-white"
                      />
                    </div>

                    {/* Question Type */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Savol turi
                      </label>
                      <select
                        value={section.questionType}
                        onChange={(e) => updateSectionData(subject.id, section.id, 'questionType', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-slate-900 dark:text-white"
                      >
                        {questionTypeOptions.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Scoring */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          To'g'ri javob bali
                        </label>
                        <input
                          type="number"
                          min="1.0"
                          max="20.0"
                          step="0.1"
                          value={section.correctScore}
                          onChange={(e) => updateSectionData(subject.id, section.id, 'correctScore', parseFloat(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Noto'g'ri javob bali
                        </label>
                        <input
                          type="number"
                          min="-5.0"
                          max="0.0"
                          step="0.1"
                          value={section.wrongScore}
                          onChange={(e) => updateSectionData(subject.id, section.id, 'wrongScore', parseFloat(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  )

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="px-4">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
          Javoblar varaqasi
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          OMR varaq tuzilishini tanlang
        </p>
      </div>

      <Card className="mx-4 p-4">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tuzilish
            </label>
            <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-slate-900 dark:text-white">
              <option value="continuous">Continuous</option>
              <option value="subject_in_column">Subject in column</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Yorliq
            </label>
            <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-slate-900 dark:text-white">
              <option value="default">Default</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Sarlavha
            </label>
            <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-slate-900 dark:text-white">
              <option value="default">Default</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Preview */}
      <Card className="mx-4 p-4">
        <h4 className="font-medium text-slate-900 dark:text-white mb-4">Oldindan ko'rish</h4>
        <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 min-h-[200px] flex items-center justify-center">
          <span className="text-gray-500 dark:text-gray-400">OMR varaq namunasi</span>
        </div>
      </Card>
    </div>
  )

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen text-slate-900 dark:text-white font-display overflow-x-hidden">
      <Header 
        user={{ id: '1', name: '', phone: '', avatar: '', isOnline: false }}
        title={`Imtihon yaratish (${currentStep}/3)`}
        showBack
        showHome
        onBack={handleBack}
        actions={
          <Button variant="ghost" onClick={handleNext} className="text-primary hover:text-blue-600 -mr-2">
            {currentStep === 3 ? 'Yakunlash' : 'Keyingisi'}
          </Button>
        }
      />

      <div className="max-w-md mx-auto pb-24">
        {/* Progress indicator */}
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-2">
            {[1, 2, 3].map((step) => (
              <div
                key={step}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step <= currentStep
                    ? 'bg-primary text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                }`}
              >
                {step}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>Ma'lumotlar</span>
            <span>Sozlamalar</span>
            <span>Varaq</span>
          </div>
        </div>

        {/* Step content */}
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
      </div>
    </div>
  )
}

export default ExamCreation