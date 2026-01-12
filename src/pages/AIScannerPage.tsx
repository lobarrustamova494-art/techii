import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Upload, Brain, Check, AlertCircle, Loader2, FileText } from 'lucide-react'
import Header from '@/components/layout/Header'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import { useAuth } from '@/contexts/AuthContext'
import { apiService } from '@/services/api'
import { Exam } from '@/types'

const AIScannerPage: React.FC = () => {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const { user } = useAuth()
    const [exam, setExam] = useState<Exam | null>(null)
    const [loading, setLoading] = useState(true)
    const [analyzing, setAnalyzing] = useState(false)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [result, setResult] = useState<any>(null)
    const [error, setError] = useState('')
    const fileInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        const fetchExam = async () => {
            if (!id) return
            try {
                const response = await apiService.getExam(id)
                if (response.success && response.data) {
                    setExam(response.data.exam)
                }
            } catch (error) {
                console.error('Error fetching exam:', error)
                setError('Imtihon ma\'lumotlarini yuklashda xatolik')
            } finally {
                setLoading(false)
            }
        }
        fetchExam()
    }, [id])

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (file) {
            setSelectedFile(file)
            const url = URL.createObjectURL(file)
            setPreviewUrl(url)
            setResult(null)
            setError('')
        }
    }

    const handleAnalyze = async () => {
        if (!selectedFile || !exam) return

        setAnalyzing(true)
        setError('')
        setResult(null)

        try {
            // Use Anchor-Based OMR (Langor + Piksel)
            const response = await apiService.processOMRHybrid(
                selectedFile,
                exam.answerKey || [],
                exam.scoring || { correct: 1, wrong: 0, blank: 0 },
                exam.id,
                {
                    ...exam,
                    processing_mode: 'anchor_based_ai_check',
                    anchor_detection: true,
                    pixel_analysis: true
                },
                false, // useGroqAI
                false, // useProfessional (disable)
                true,  // useAnchorBased (enable as primary)
                false  // useCloud
            )

            if (response && response.success) {
                setResult(response.data)
            } else {
                throw new Error(response?.error || 'Tahlil qilishda xatolik')
            }
        } catch (err: any) {
            console.error('Analysis error:', err)
            setError(err.message || 'Rasm tahlilida xatolik yuz berdi')
        } finally {
            setAnalyzing(false)
        }
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        const file = e.dataTransfer.files?.[0]
        if (file && file.type.startsWith('image/')) {
            setSelectedFile(file)
            const url = URL.createObjectURL(file)
            setPreviewUrl(url)
            setResult(null)
            setError('')
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center">
                <Loader2 className="animate-spin text-primary" size={32} />
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
                title="AI Tekshiruv (Langor + Piksel)"
                showBack
                onBack={() => navigate(`/exams/${id}`)}
            />

            <div className="container mx-auto px-4 py-6 max-w-4xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Upload Section */}
                    <div className="space-y-4">
                        <Card className="p-6">
                            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <Upload size={20} />
                                Rasm yuklash
                            </h2>

                            <div
                                className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-8 text-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                onClick={() => fileInputRef.current?.click()}
                                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                onDrop={handleDrop}
                            >
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleFileSelect}
                                />

                                {previewUrl ? (
                                    <div className="relative">
                                        <img
                                            src={previewUrl}
                                            alt="Preview"
                                            className="max-h-64 mx-auto rounded shadow-sm"
                                        />
                                        <div className="mt-2 text-sm text-slate-500">
                                            Boshqa rasm tanlash uchun bosing
                                        </div>
                                    </div>
                                ) : (
                                    <div className="py-8">
                                        <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <FileText className="text-primary" size={32} />
                                        </div>
                                        <p className="text-slate-600 dark:text-slate-400 font-medium">
                                            Rasm tanlang yoki shu yerga tashlang
                                        </p>
                                        <p className="text-xs text-slate-500 mt-2">
                                            JPG, PNG formatlar
                                        </p>
                                    </div>
                                )}
                            </div>

                            <Button
                                className="w-full mt-4"
                                disabled={!selectedFile || analyzing}
                                onClick={handleAnalyze}
                            >
                                {analyzing ? (
                                    <>
                                        <Loader2 className="animate-spin mr-2" size={18} />
                                        Tahlil qilinmoqda...
                                    </>
                                ) : (
                                    <>
                                        <Brain className="mr-2" size={18} />
                                        Tahlil qilish
                                    </>
                                )}
                            </Button>

                            {error && (
                                <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg text-sm flex items-start gap-2">
                                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                                    {error}
                                </div>
                            )}
                        </Card>
                    </div>

                    {/* Results Section */}
                    <div className="space-y-4">
                        {result ? (
                            <Card className="p-6">
                                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-green-600">
                                    <Check size={20} />
                                    Natija
                                </h2>

                                <div className="grid grid-cols-2 gap-4 mb-6">
                                    <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg text-center">
                                        <div className="text-3xl font-bold text-primary">
                                            {result.scoring?.totalScore || 0}
                                        </div>
                                        <div className="text-xs text-slate-500 uppercase tracking-wider mt-1">
                                            Umumiy ball
                                        </div>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg text-center">
                                        <div className="text-3xl font-bold text-green-600">
                                            {result.scoring?.correctCount || 0}
                                        </div>
                                        <div className="text-xs text-slate-500 uppercase tracking-wider mt-1">
                                            To'g'ri javoblar
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                                    <h3 className="font-medium text-sm text-slate-500 mb-2">Javoblar ro'yxati:</h3>
                                    {result.extractedAnswers?.map((answer: string, index: number) => (
                                        <div key={index} className="flex items-center justify-between p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded border-b border-slate-100 dark:border-slate-700 last:border-0">
                                            <span className="font-mono text-sm w-8 text-slate-400">
                                                {index + 1}.
                                            </span>
                                            <span className={`font-bold ${answer === exam?.answerKey?.[index]
                                                ? 'text-green-600'
                                                : answer === 'BLANK'
                                                    ? 'text-yellow-500'
                                                    : 'text-red-500'
                                                }`}>
                                                {answer}
                                            </span>
                                            <span className="text-xs text-slate-400">
                                                {exam?.answerKey?.[index] ? `(To'g'ri: ${exam.answerKey[index]})` : ''}
                                            </span>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
                                    <div className="text-xs text-slate-500">
                                        Processing Method: {result.processingDetails?.processingMethod}
                                    </div>
                                    <div className="text-xs text-slate-500">
                                        Confidence: {(result.confidence * 100).toFixed(1)}%
                                    </div>
                                </div>
                            </Card>
                        ) : (
                            <Card className="p-6 h-full flex items-center justify-center text-center text-slate-400">
                                <div>
                                    <Brain size={48} className="mx-auto mb-4 opacity-20" />
                                    <p>Natijalar shu yerda ko'rsatiladi</p>
                                </div>
                            </Card>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default AIScannerPage
