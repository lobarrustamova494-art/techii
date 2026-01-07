import React from 'react'
import { ExamData } from '@/types'

interface OMRSheetProps {
  examData: ExamData
  structure: 'continuous' | 'subject_in_column'
  includeLogo: boolean
  prefillStudentId: boolean
  compactLayout: boolean
  paperSize: 'a4' | 'letter'
}

const OMRSheet: React.FC<OMRSheetProps> = ({
  examData,
  structure,
  includeLogo,
  paperSize
}) => {
  // Calculate total questions
  const totalQuestions = examData.subjects.reduce((total, subject) => 
    total + subject.sections.reduce((sectionTotal, section) => sectionTotal + section.questionCount, 0), 0
  )

  // Generate question numbers with subject/section mapping
  const generateQuestionMapping = () => {
    const mapping: Array<{
      questionNumber: number
      subjectIndex: number
      sectionIndex: number
      localQuestionNumber: number
      questionType: string
    }> = []
    
    let questionCounter = 1
    
    examData.subjects.forEach((subject, subjectIndex) => {
      subject.sections.forEach((section, sectionIndex) => {
        for (let i = 0; i < section.questionCount; i++) {
          mapping.push({
            questionNumber: questionCounter,
            subjectIndex,
            sectionIndex,
            localQuestionNumber: i + 1,
            questionType: section.questionType
          })
          questionCounter++
        }
      })
    })
    
    return mapping
  }

  const questionMapping = generateQuestionMapping()

  // Get options count based on question type
  const getOptionsCount = (questionType: string): number => {
    if (questionType.startsWith('multiple_choice_')) {
      return parseInt(questionType.split('_')[2])
    }
    if (questionType === 'true_false') return 2
    return 5 // default A, B, C, D, E
  }

  // Generate option letters
  const getOptionLetters = (count: number): string[] => {
    const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']
    return letters.slice(0, count)
  }

  const renderInstructions = () => (
    <div className="mb-6 border-2 border-black p-4">
      <h3 className="text-sm font-bold mb-3 text-center">DOIRACHANI BO'YASH NAMUNASI / ОБРАЗЕЦ ЗАКРАШИВАНИЯ КРУЖОЧКОВ</h3>
      
      <div className="flex items-center justify-center gap-8 mb-4">
        <div className="flex items-center gap-4">
          <span className="text-sm font-bold">To'g'ri / Правильно</span>
          <div className="w-6 h-6 border-2 border-black rounded-full bg-black"></div>
        </div>
        
        <div className="flex items-center gap-4">
          <span className="text-sm font-bold">Noto'g'ri / Неправильно</span>
          <div className="flex gap-2">
            <div className="w-6 h-6 border-2 border-black rounded-full"></div>
            <div className="w-6 h-6 border-2 border-black rounded-full">
              <div className="w-full h-full rounded-full bg-black opacity-50"></div>
            </div>
            <div className="w-6 h-6 border-2 border-black rounded-full relative">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-4 h-0.5 bg-black transform rotate-45"></div>
                <div className="w-4 h-0.5 bg-black transform -rotate-45 absolute"></div>
              </div>
            </div>
            <div className="w-6 h-6 border-2 border-black rounded-full">
              <div className="w-full h-full rounded-full border-4 border-black"></div>
            </div>
            <div className="w-6 h-6 border-2 border-black rounded-full bg-black">
              <div className="w-3 h-3 bg-white rounded-full mx-auto mt-1.5"></div>
            </div>
            <div className="w-6 h-6 border-2 border-black rounded-full relative">
              <div className="absolute inset-1 bg-black rounded-full"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-white text-xs">✓</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="text-xs text-center space-y-1">
        <p><strong>Ko'rsatmalar:</strong> Doiralarni to'liq qora qalam bilan to'ldiring. Har bir savol uchun faqat bitta javobni belgilang.</p>
        <p><strong>Инструкции:</strong> Полностью закрасьте кружочки черной ручкой. Отметьте только один ответ для каждого вопроса.</p>
      </div>
    </div>
  )

  const renderStudentInfo = () => (
    <div className="mb-6 border-2 border-black p-4">
      <div className="grid grid-cols-2 gap-6 mb-4">
        <div>
          <div className="text-sm font-bold mb-2">ISM FAMILIYA / ИМЯ ФАМИЛИЯ:</div>
          <div className="border-b-2 border-black h-6"></div>
        </div>
        <div>
          <div className="text-sm font-bold mb-2">GURUH / ГРУППА:</div>
          <div className="border-b-2 border-black h-6"></div>
        </div>
      </div>
      
      {/* Student ID Bubbles */}
      <div className="mt-4">
        <div className="text-sm font-bold mb-3 text-center">TALABA ID RAQAMI / СТУДЕНЧЕСКИЙ ID</div>
        <div className="flex justify-center gap-1">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="flex flex-col items-center">
              <div className="text-xs mb-1 font-bold">{i + 1}</div>
              <div className="space-y-0.5">
                {Array.from({ length: 10 }, (_, digit) => (
                  <div key={digit} className="w-5 h-5 border-2 border-black rounded-full flex items-center justify-center">
                    <span className="text-xs font-bold">{digit}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  const renderExamSets = () => {
    // Always show exam sets section, even if only one set
    const setsToShow = Math.max(examData.examSets, 4) // Show at least 4 options (A, B, C, D)
    
    return (
      <div className="mb-4 border-2 border-black p-3">
        <div className="text-sm font-bold mb-2 text-center">IMTIHON TO'PLAMI / ВАРИАНТ ЭКЗАМЕНА</div>
        <div className="flex justify-center gap-6">
          {Array.from({ length: setsToShow }, (_, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-sm font-bold">{String.fromCharCode(65 + i)}</span>
              <div className="w-5 h-5 border-2 border-black rounded-full"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const renderContinuousLayout = () => {
    // Calculate optimal layout for single page
    const questionsPerColumn = Math.ceil(totalQuestions / 4) // 4 columns max
    
    return (
      <div className="grid grid-cols-4 gap-8">
        {Array.from({ length: 4 }, (_, colIndex) => (
          <div key={colIndex} className="space-y-2">
            {questionMapping
              .slice(colIndex * questionsPerColumn, (colIndex + 1) * questionsPerColumn)
              .map((question) => {
                const section = examData.subjects[question.subjectIndex].sections[question.sectionIndex]
                const optionsCount = getOptionsCount(section.questionType)
                const options = getOptionLetters(optionsCount)
                
                return (
                  <div key={question.questionNumber} className="flex items-center gap-2">
                    <span className="text-sm font-bold w-8 text-right">
                      {question.questionNumber}.
                    </span>
                    <div className="flex gap-2">
                      {options.map((option) => (
                        <div key={option} className="flex flex-col items-center">
                          <div className="w-5 h-5 border-2 border-black rounded-full flex items-center justify-center">
                            <span className="text-xs font-bold">{option}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
          </div>
        ))}
      </div>
    )
  }

  const renderSubjectInColumnLayout = () => {
    return (
      <div className="space-y-4">
        {examData.subjects.map((subject, subjectIndex) => (
          <div key={subject.id} className="border-2 border-black p-3">
            <div className="text-sm font-bold text-center mb-3 bg-gray-200 p-2 border border-black">
              {subject.name}
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              {subject.sections.map((section, sectionIndex) => {
                let questionStart = 1
                // Calculate starting question number for this section
                for (let i = 0; i < subjectIndex; i++) {
                  questionStart += examData.subjects[i].sections.reduce((total, s) => total + s.questionCount, 0)
                }
                for (let i = 0; i < sectionIndex; i++) {
                  questionStart += subject.sections[i].questionCount
                }
                
                const optionsCount = getOptionsCount(section.questionType)
                const options = getOptionLetters(optionsCount)
                
                return (
                  <div key={section.id} className="space-y-1">
                    <div className="text-xs font-bold text-center bg-gray-100 p-1 border border-black">
                      {section.name}
                    </div>
                    {Array.from({ length: section.questionCount }, (_, i) => (
                      <div key={i} className="flex items-center gap-1">
                        <span className="text-xs font-bold w-6 text-right">
                          {questionStart + i}.
                        </span>
                        <div className="flex gap-1">
                          {options.map((option) => (
                            <div key={option} className="flex flex-col items-center">
                              <div className="w-4 h-4 border-2 border-black rounded-full flex items-center justify-center">
                                <span className="text-[10px] font-bold">{option}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className={`omr-sheet bg-white ${paperSize === 'a4' ? 'w-[210mm] min-h-[297mm]' : 'w-[8.5in] min-h-[11in]'} mx-auto shadow-lg print:shadow-none print:p-0 relative print:bg-white`} style={{ padding: '15mm' }}>
      {/* Header */}
      <div className="flex justify-between items-start mb-6 border-b-2 border-black pb-4">
        {includeLogo && (
          <div className="w-20 h-20 border-2 border-black flex items-center justify-center">
            <span className="text-sm font-bold text-center">LOGO</span>
          </div>
        )}
        
        <div className="flex-1 text-center mx-4">
          <h1 className="text-xl font-bold mb-2">{examData.name || 'IMTIHON NOMI'}</h1>
          <p className="text-sm font-bold">Sana: {examData.date}</p>
          <p className="text-sm mt-1">Jami savollar: {totalQuestions}</p>
        </div>
        
        <div className="w-20 h-24 border-2 border-black flex items-center justify-center">
          <span className="text-xs text-center font-bold">RASM<br/>JOYI</span>
        </div>
      </div>

      {/* Instructions */}
      {renderInstructions()}

      {/* Student Information */}
      {renderStudentInfo()}

      {/* Exam Sets */}
      {renderExamSets()}

      {/* Answer Grid */}
      <div className="border-2 border-black p-4 mb-4">
        <div className="text-sm font-bold text-center mb-4 bg-gray-200 p-2 border border-black">
          JAVOBLAR / ОТВЕТЫ
        </div>
        {structure === 'continuous' ? renderContinuousLayout() : renderSubjectInColumnLayout()}
      </div>

      {/* Footer */}
      <div className="mt-4 flex justify-between items-center text-xs border-t-2 border-black pt-2">
        <div className="font-bold">To'plamlar: {examData.examSets}</div>
        <div className="font-bold">Mavzular: {examData.subjects.length}</div>
        <div className="font-bold">Jami: {totalQuestions} savol</div>
      </div>

      {/* Alignment marks for scanning */}
      <div className="absolute top-2 left-2 w-4 h-4 bg-black"></div>
      <div className="absolute top-2 right-2 w-4 h-4 bg-black"></div>
      <div className="absolute bottom-2 left-2 w-4 h-4 bg-black"></div>
      <div className="absolute bottom-2 right-2 w-4 h-4 bg-black"></div>

      {/* Additional alignment marks */}
      <div className="absolute top-1/2 left-2 w-4 h-4 bg-black transform -translate-y-1/2"></div>
      <div className="absolute top-1/2 right-2 w-4 h-4 bg-black transform -translate-y-1/2"></div>
    </div>
  )
}

export default OMRSheet