import React from 'react'
import { ExamData } from '@/types'

interface OMRSheetProps {
  examData: ExamData
  structure: 'continuous' | 'subject_in_column'
  includeLogo: boolean
  prefillStudentId: boolean
  compactLayout: boolean
  paperSize: 'a4' | 'letter'
  correctAnswers?: string[]  // To'g'ri javoblar ro'yxati
  showCorrectAnswers?: boolean  // To'g'ri javoblarni ko'rsatish
}

const OMRSheet: React.FC<OMRSheetProps> = ({
  examData,
  structure,
  includeLogo: _includeLogo,
  prefillStudentId,
  compactLayout: _compactLayout,
  paperSize,
  correctAnswers = [],
  showCorrectAnswers = false
}) => {
  // Validate examData
  if (!examData || !examData.subjects || examData.subjects.length === 0) {
    return (
      <div className={`omr-sheet bg-white ${paperSize === 'a4' ? 'w-[210mm] min-h-[297mm]' : 'w-[8.5in] min-h-[11in]'} mx-auto shadow-lg print:shadow-none print:p-0 relative print:bg-white flex items-center justify-center`} style={{ padding: '15mm' }}>
        <div className="text-center text-gray-500">
          <p className="text-lg font-semibold mb-2">OMR Varaq</p>
          <p>Imtihon ma'lumotlari topilmadi</p>
        </div>
      </div>
    )
  }

  // Calculate total questions and organize data
  const totalQuestions = examData.subjects.reduce((total, subject) =>
    total + subject.sections.reduce((sectionTotal, section) => sectionTotal + section.questionCount, 0), 0
  )

  // Flatten all sections with their questions for continuous structure
  const allQuestions: Array<{
    questionNumber: number
    subjectName: string
    sectionName: string
    questionType: string
  }> = []

  let questionCounter = 1
  examData.subjects.forEach(subject => {
    subject.sections.forEach(section => {
      for (let i = 0; i < section.questionCount; i++) {
        allQuestions.push({
          questionNumber: questionCounter++,
          subjectName: subject.name,
          sectionName: section.name,
          questionType: section.questionType
        })
      }
    })
  })

  // Determine answer options based on question types
  const getAnswerOptions = (questionType: string) => {
    if (questionType === 'true_false') return ['T', 'F']
    if (questionType.startsWith('multiple_choice_')) {
      const optionCount = parseInt(questionType.split('_')[2])
      return Array.from({ length: optionCount }, (_, i) => String.fromCharCode(65 + i)) // A, B, C, D, E, etc.
    }
    return ['A', 'B', 'C', 'D', 'E'] // Default
  }

  // Check if an answer option is correct
  const isCorrectAnswer = (questionNumber: number, option: string) => {
    if (!showCorrectAnswers || !correctAnswers || correctAnswers.length === 0) return false
    const correctAnswer = correctAnswers[questionNumber - 1]
    return correctAnswer === option
  }

  // Group questions into columns (for 3-column layout)
  const questionsPerColumn = Math.ceil(totalQuestions / 3)
  const columns = [
    allQuestions.slice(0, questionsPerColumn),
    allQuestions.slice(questionsPerColumn, questionsPerColumn * 2),
    allQuestions.slice(questionsPerColumn * 2)
  ]
  return (
    <div className={`omr-sheet bg-white ${paperSize === 'a4' ? 'w-[210mm] min-h-[297mm]' : 'w-[8.5in] min-h-[11in]'} mx-auto shadow-lg print:shadow-none print:p-0 relative print:bg-white`} style={{ padding: '15mm' }}>

      {/* Alignment marks - 8 black rectangles (4 on each side) matching template system */}
      <div className="absolute left-4 w-3 h-3 bg-black" style={{ top: '102px' }}></div>  {/* L1 */}
      <div className="absolute left-4 w-3 h-3 bg-black" style={{ top: '324px' }}></div>  {/* L2 */}
      <div className="absolute left-4 w-3 h-3 bg-black" style={{ top: '555px' }}></div>  {/* L3 */}
      <div className="absolute left-4 w-3 h-3 bg-black" style={{ top: '782px' }}></div>  {/* L4 */}

      <div className="absolute right-4 w-3 h-3 bg-black" style={{ top: '102px' }}></div>  {/* R1 */}
      <div className="absolute right-4 w-3 h-3 bg-black" style={{ top: '324px' }}></div>  {/* R2 */}
      <div className="absolute right-4 w-3 h-3 bg-black" style={{ top: '555px' }}></div>  {/* R3 */}
      <div className="absolute right-4 w-3 h-3 bg-black" style={{ top: '782px' }}></div>  {/* R4 */}

      {/* Header with exam information */}
      <div className="border-2 border-black mb-6">
        <div className="border-b-2 border-black p-2">
          <span className="font-bold text-sm">NAME :</span>
        </div>
        <div className="border-b-2 border-black p-2">
          <span className="font-bold text-sm">EXAM : {examData.name}</span>
        </div>
        <div className="p-2">
          <span className="font-bold text-sm">DATE : {examData.date}</span>
        </div>
      </div>

      {/* Student ID section if enabled */}
      {prefillStudentId && (
        <div className="text-center mb-6">
          <div className="text-sm font-bold mb-2">Rolik raqami</div>
          <div className="flex justify-center gap-1 mb-2">
            {[0, 1, 2, 3, 4].map((num) => (
              <div key={num} className="w-6 h-6 border-2 border-black text-xs flex items-center justify-center font-bold">
                {num}
              </div>
            ))}
          </div>
          <div className="flex justify-center gap-1">
            {Array.from({ length: 10 }, (_, i) => (
              <div key={i} className="w-4 h-4 border-2 border-black rounded-full"></div>
            ))}
          </div>
        </div>
      )}

      {/* Dynamic OMR Layout based on structure */}
      {structure === 'continuous' ? (
        // Continuous structure - questions flow across columns
        <div className="grid grid-cols-3 gap-8">
          {columns.map((columnQuestions, columnIndex) => (
            <div key={columnIndex} className="relative">
              {columnQuestions.length > 0 && (
                <div className="mb-4">
                  {/* Column Markers - 3 distinct squares to identify column start */}
                  <div className="absolute -left-6 top-0 flex flex-col gap-2">
                    <div className="w-4 h-4 bg-black"></div>
                    <div className="w-4 h-4 bg-black"></div>
                    <div className="w-4 h-4 bg-black"></div>
                  </div>

                  {/* Column header with answer options */}
                  <div className="flex items-center gap-1 mb-1 ml-2">
                    <div className="w-3"></div>
                    <span className="w-4"></span>
                    <div className="flex gap-1">
                      {getAnswerOptions(columnQuestions[0].questionType).map((letter) => (
                        <div key={letter} className="w-4 text-center text-xs font-bold">{letter}</div>
                      ))}
                    </div>
                  </div>

                  {/* Questions in this column */}
                  <div className="space-y-2 ml-2">
                    {columnQuestions.map((question) => (
                      <div key={question.questionNumber} className="flex items-center gap-1">
                        {/* Question Row Marker - Timing Mark */}
                        <div className="w-3 h-3 bg-black"></div>
                        <span className="text-sm font-bold w-4 text-right">{question.questionNumber}</span>
                        <div className="flex gap-1">
                          {getAnswerOptions(question.questionType).map((letter) => (
                            <div
                              key={letter}
                              className={`w-4 h-4 border-2 border-black rounded-full relative ${isCorrectAnswer(question.questionNumber, letter)
                                  ? 'bg-green-100'
                                  : ''
                                }`}
                            >
                              {isCorrectAnswer(question.questionNumber, letter) && (
                                <div className="absolute -inset-1 border-2 border-green-500 bg-green-200 bg-opacity-30 rounded"></div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        // Subject-based structure - each subject in its own section
        <div className="space-y-8">
          {examData.subjects.map((subject, subjectIndex) => (
            <div key={subject.id} className="border-t-2 border-gray-300 pt-4 first:border-t-0 first:pt-0">
              <div className="text-center text-lg font-bold mb-4">
                {subject.name}
              </div>

              {subject.sections.map((section, sectionIndex) => {
                const sectionStartQuestion = examData.subjects
                  .slice(0, subjectIndex)
                  .reduce((total, s) => total + s.sections.reduce((st, sec) => st + sec.questionCount, 0), 0) +
                  subject.sections
                    .slice(0, sectionIndex)
                    .reduce((total, s) => total + s.questionCount, 0) + 1

                return (
                  <div key={section.id} className="mb-6">
                    <div className="text-center text-sm font-bold mb-3">
                      {section.name}
                    </div>

                    {/* Section header with answer options */}
                    <div className="flex items-center gap-1 mb-1">
                      <div className="w-2"></div>
                      <span className="w-4"></span>
                      <div className="flex gap-1">
                        {getAnswerOptions(section.questionType).map((letter) => (
                          <div key={letter} className="w-4 text-center text-xs font-bold">{letter}</div>
                        ))}
                      </div>
                    </div>

                    {/* Questions in this section */}
                    <div className="space-y-1">
                      {Array.from({ length: section.questionCount }, (_, i) => (
                        <div key={i} className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-black"></div>
                          <span className="text-sm font-bold w-4 text-right">{sectionStartQuestion + i}</span>
                          <div className="flex gap-1">
                            {getAnswerOptions(section.questionType).map((letter) => (
                              <div
                                key={letter}
                                className={`w-4 h-4 border-2 border-black rounded-full relative ${isCorrectAnswer(sectionStartQuestion + i, letter)
                                    ? 'bg-green-100'
                                    : ''
                                  }`}
                              >
                                {isCorrectAnswer(sectionStartQuestion + i, letter) && (
                                  <div className="absolute -inset-1 border-2 border-green-500 bg-green-200 bg-opacity-30 rounded"></div>
                                )}
                              </div>
                            ))}
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
      )}

      {/* Footer with exam summary */}
      <div className="mt-8 pt-4 border-t-2 border-gray-300 text-center text-xs text-gray-600">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <span className="font-bold">Jami savollar:</span> {totalQuestions}
          </div>
          <div>
            <span className="font-bold">Mavzular:</span> {examData.subjects.length}
          </div>
          <div>
            <span className="font-bold">To'plamlar:</span> {examData.examSets}
          </div>
        </div>
      </div>
    </div>
  )
}

export default OMRSheet