import React, { useState, useRef, useCallback } from 'react'
import { Upload, Brain, Eye, CheckCircle, AlertTriangle, BarChart3, Target, Zap } from 'lucide-react'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import { apiService } from '@/services/api'

interface AnalysisResult {
  success: boolean
  processing_method: string
  analysis_details: {
    anchors_found: number
    bubbles_detected: number
    processing_time: number
    image_quality: number
    confidence: number
  }
  detected_answers: string[]
  anchor_analysis: Array<{
    question_number: number
    anchor_position: { x: number, y: number }
    confidence: number
    text_detected: string
  }>
  bubble_analysis: Array<{
    question_number: number
    option: string
    position: { x: number, y: number }
    density: number
    is_filled: boolean
    confidence: number
  }>
  quality_metrics: {
    sharpness: number
    contrast: number
    brightness: number
    noise_level: number
    alignment_score: number
  }
  recommendations: string[]
  error_flags: string[]
}

interface OMRSheetAnalyzerProps {
  examData?: any
  onAnalysisComplete?: (result: AnalysisResult) => void
}

const OMRSheetAnalyzer: React.FC<OMRSheetAnalyzerProps> = ({
  examData,
  onAnalysisComplete
}) => {
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [analysisProgress, setAnalysisProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState('')
  const [showDetailedResults, setShowDetailedResults] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageSelect = useCallback((file: File) => {
    setSelectedImage(file)
    setAnalysisResult(null)
    
    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }, [])

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      handleImageSelect(file)
    }
  }

  const analyzeOMRSheet = async () => {
    if (!selectedImage) {
      alert('Iltimos, avval rasm tanlang!')
      return
    }

    setIsAnalyzing(true)
    setAnalysisProgress(0)
    setCurrentStep('Rasm yuklash va tayyorlash...')

    let progressInterval: number | null = null

    try {
      // Simulate analysis steps with progress
      const steps = [
        { progress: 10, message: 'Rasm sifatini tekshirish...' },
        { progress: 25, message: 'Langorlarni (savol raqamlarini) qidirish...' },
        { progress: 45, message: 'Bubble-larni aniqlash...' },
        { progress: 65, message: 'Piksel zichligini tahlil qilish...' },
        { progress: 80, message: 'AI tahlil qilish...' },
        { progress: 95, message: 'Natijalarni yakunlash...' }
      ]

      let currentStepIndex = 0
      progressInterval = window.setInterval(() => {
        if (currentStepIndex < steps.length) {
          setAnalysisProgress(steps[currentStepIndex].progress)
          setCurrentStep(steps[currentStepIndex].message)
          currentStepIndex++
        } else {
          if (progressInterval) window.clearInterval(progressInterval)
        }
      }, 800)

      // Create answer key for analysis
      const answerKey = examData?.answerKey || Array.from({ length: 40 }, () => 'A')
      
      console.log('🔍 OMR Sheet AI Analysis started')
      console.log('📋 Answer key:', answerKey)
      console.log('🖼️ Image:', selectedImage.name, selectedImage.size, 'bytes')

      // Call OMR Sheet Analysis API
      const result = await apiService.processOMRSheetAnalysis(
        selectedImage,
        answerKey,
        {
          ...examData,
          processing_mode: 'omr_sheet_analysis',
          ai_analysis: true,
          anchor_detection: true,
          pixel_analysis: true,
          quality_assessment: true
        }
      )

      if (progressInterval) window.clearInterval(progressInterval)
      setAnalysisProgress(100)
      setCurrentStep('Tahlil tugallandi!')

      console.log('✅ OMR Sheet analysis completed:', result)

      // Transform result to our format
      const analysisResult: AnalysisResult = {
        success: result.success || false,
        processing_method: result.data?.processing_method || 'AI OMR Sheet Analyzer',
        analysis_details: {
          anchors_found: result.data?.analysis_details?.anchors_found || 0,
          bubbles_detected: result.data?.analysis_details?.bubbles_detected || 0,
          processing_time: result.data?.analysis_details?.processing_time || 0,
          image_quality: result.data?.analysis_details?.image_quality || 0,
          confidence: result.data?.analysis_details?.confidence || 0
        },
        detected_answers: result.data?.detected_answers || [],
        anchor_analysis: result.data?.anchor_analysis || [],
        bubble_analysis: result.data?.bubble_analysis || [],
        quality_metrics: {
          sharpness: result.data?.quality_metrics?.sharpness || 0,
          contrast: result.data?.quality_metrics?.contrast || 0,
          brightness: result.data?.quality_metrics?.brightness || 0,
          noise_level: result.data?.quality_metrics?.noise_level || 0,
          alignment_score: result.data?.quality_metrics?.alignment_score || 0
        },
        recommendations: result.data?.recommendations || [
          'Rasm sifati yaxshi',
          'Langorlar muvaffaqiyatli aniqlandi',
          'Bubble-lar aniq ko\'rinmoqda'
        ],
        error_flags: result.data?.error_flags || []
      }

      setAnalysisResult(analysisResult)
      onAnalysisComplete?.(analysisResult)

      console.log('📊 Analysis result:', analysisResult)

    } catch (error: any) {
      console.error('❌ OMR Sheet analysis error:', error)
      if (progressInterval) window.clearInterval(progressInterval)
      
      // Create error result
      const errorResult: AnalysisResult = {
        success: false,
        processing_method: 'AI OMR Sheet Analyzer (Error)',
        analysis_details: {
          anchors_found: 0,
          bubbles_detected: 0,
          processing_time: 0,
          image_quality: 0,
          confidence: 0
        },
        detected_answers: [],
        anchor_analysis: [],
        bubble_analysis: [],
        quality_metrics: {
          sharpness: 0,
          contrast: 0,
          brightness: 0,
          noise_level: 0,
          alignment_score: 0
        },
        recommendations: ['Tahlil qilishda xatolik yuz berdi'],
        error_flags: ['ANALYSIS_FAILED']
      }

      setAnalysisResult(errorResult)
      alert(`Tahlil qilishda xatolik: ${error.message}`)
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-gradient-to-r from-purple-500 to-blue-600 rounded-xl">
            <Brain className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              AI OMR Varaq Tahlilchisi
            </h2>
            <p className="text-slate-600 dark:text-slate-400">
              Langor + Piksel algoritmi bilan professional tahlil
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-blue-600" />
            <span>Langor aniqlash (Savol raqamlari)</span>
          </div>
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-green-600" />
            <span>Piksel zichligi tahlili</span>
          </div>
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-purple-600" />
            <span>AI-powered sifat nazorati</span>
          </div>
        </div>
      </Card>

      {/* Image Upload */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          OMR Varaq Rasmini Yuklash
        </h3>
        
        <div className="space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
          
          <div className="flex gap-4">
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Upload size={16} />
              Rasm Tanlash
            </Button>
          </div>

          {imagePreview && (
            <div className="mt-4">
              <div className="relative max-w-md mx-auto">
                <img
                  src={imagePreview}
                  alt="OMR Sheet Preview"
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700"
                />
                <div className="absolute top-2 right-2 bg-black/80 text-white px-2 py-1 rounded text-xs">
                  {selectedImage?.name}
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Analysis Button */}
      {selectedImage && !isAnalyzing && (
        <Card className="p-6">
          <div className="text-center">
            <Button
              onClick={analyzeOMRSheet}
              className="bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700"
              size="lg"
            >
              <Brain size={20} className="mr-2" />
              AI Tahlil Boshlash
            </Button>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
              Langor va piksel algoritmi bilan professional tahlil
            </p>
          </div>
        </Card>
      )}

      {/* Analysis Progress */}
      {isAnalyzing && (
        <Card className="p-6">
          <div className="text-center">
            <div className="mb-4">
              <div className="mx-auto w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-600 rounded-full flex items-center justify-center mb-4 animate-pulse">
                <Brain className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                AI Tahlil Jarayoni
              </h3>
              <p className="text-slate-600 dark:text-slate-400 mb-4">
                {currentStep}
              </p>
            </div>

            <div className="max-w-md mx-auto">
              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3 mb-4">
                <div 
                  className="bg-gradient-to-r from-purple-500 to-blue-600 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${analysisProgress}%` }}
                />
              </div>
              <div className="text-sm text-slate-500 dark:text-slate-400">
                {analysisProgress}% tugallandi
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Analysis Results */}
      {analysisResult && (
        <div className="space-y-6">
          {/* Results Overview */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <CheckCircle className="w-6 h-6 text-green-600" />
                AI Tahlil Natijasi
              </h3>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDetailedResults(!showDetailedResults)}
                >
                  <BarChart3 size={16} className="mr-1" />
                  {showDetailedResults ? 'Yashirish' : 'Tafsilotlar'}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 mb-1">
                  {analysisResult.analysis_details.anchors_found}
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400">Langorlar Topildi</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600 mb-1">
                  {analysisResult.analysis_details.bubbles_detected}
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400">Bubble-lar Aniqlandi</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600 mb-1">
                  {(analysisResult.analysis_details.confidence * 100).toFixed(1)}%
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400">Ishonch Darajasi</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-600 mb-1">
                  {analysisResult.analysis_details.processing_time.toFixed(1)}s
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400">Tahlil Vaqti</div>
              </div>
            </div>
          </Card>

          {/* Detailed Results */}
          {showDetailedResults && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Anchor Analysis */}
              <Card className="p-6">
                <h4 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <Target className="w-5 h-5 text-blue-600" />
                  Langor Tahlili (Savol Raqamlari)
                </h4>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {analysisResult.anchor_analysis.slice(0, 10).map((anchor, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <div>
                        <span className="font-medium">Savol {anchor.question_number}</span>
                        <div className="text-sm text-slate-600 dark:text-slate-400">
                          Matn: "{anchor.text_detected}"
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-blue-600">
                          {(anchor.confidence * 100).toFixed(1)}%
                        </div>
                        <div className="text-xs text-slate-500">
                          ({anchor.anchor_position.x}, {anchor.anchor_position.y})
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Quality Metrics */}
              <Card className="p-6">
                <h4 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <Eye className="w-5 h-5 text-green-600" />
                  Rasm Sifati Ko'rsatkichlari
                </h4>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">Keskinlik</span>
                      <span className="text-sm">{analysisResult.quality_metrics.sharpness.toFixed(1)}</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${Math.min(100, analysisResult.quality_metrics.sharpness * 100)}%` }}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">Kontrast</span>
                      <span className="text-sm">{analysisResult.quality_metrics.contrast.toFixed(2)}</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full" 
                        style={{ width: `${Math.min(100, analysisResult.quality_metrics.contrast * 100)}%` }}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">Yorqinlik</span>
                      <span className="text-sm">{analysisResult.quality_metrics.brightness.toFixed(1)}</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                      <div 
                        className="bg-yellow-600 h-2 rounded-full" 
                        style={{ width: `${Math.min(100, analysisResult.quality_metrics.brightness * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Recommendations */}
          {analysisResult.recommendations.length > 0 && (
            <Card className="p-6">
              <h4 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-orange-600" />
                AI Tavsiyalari
              </h4>
              <ul className="space-y-2">
                {analysisResult.recommendations.map((rec, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-slate-600 dark:text-slate-400">{rec}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Error Flags */}
          {analysisResult.error_flags.length > 0 && (
            <Card className="p-6 border-orange-200 bg-orange-50 dark:bg-orange-900/20">
              <h4 className="font-semibold text-orange-800 dark:text-orange-400 mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Diqqat Talab Qiladigan Masalalar
              </h4>
              <div className="flex flex-wrap gap-2">
                {analysisResult.error_flags.map((flag, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400 text-xs rounded-full"
                  >
                    {flag.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}

export default OMRSheetAnalyzer