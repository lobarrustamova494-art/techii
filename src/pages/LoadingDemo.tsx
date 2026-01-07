import React, { useState } from 'react'
import { Download, Save, Upload, RefreshCw } from 'lucide-react'
import Header from '@/components/layout/Header'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import {
  LoadingSpinner,
  LoadingButton,
  LoadingOverlay,
  LoadingState,
  SkeletonLoader,
  ProgressBar
} from '@/components/ui'

const LoadingDemo: React.FC = () => {
  const [showOverlay, setShowOverlay] = useState(false)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(45)

  const handleLoadingTest = async () => {
    setLoading(true)
    await new Promise(resolve => setTimeout(resolve, 2000))
    setLoading(false)
  }

  const handleOverlayTest = async () => {
    setShowOverlay(true)
    await new Promise(resolve => setTimeout(resolve, 3000))
    setShowOverlay(false)
  }

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark">
      <Header user={{ id: '1', name: 'Demo User', avatar: '', isOnline: true }} />
      
      <div className="container mx-auto px-4 py-6 space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            Loading Komponentlari Demo
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Yangi spinner va loader komponentlarini sinab ko'ring
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-500 mt-2">
            Loyihada qo'shilgan barcha loading komponentlari bu yerda namoyish etilgan
          </p>
        </div>

        {/* Loading Spinners */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Loading Spinners</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
            <div className="text-center">
              <LoadingSpinner variant="default" size="lg" />
              <p className="mt-2 text-sm">Default</p>
            </div>
            <div className="text-center">
              <LoadingSpinner variant="dots" size="lg" />
              <p className="mt-2 text-sm">Dots</p>
            </div>
            <div className="text-center">
              <LoadingSpinner variant="pulse" size="lg" />
              <p className="mt-2 text-sm">Pulse</p>
            </div>
            <div className="text-center">
              <LoadingSpinner variant="bars" size="lg" />
              <p className="mt-2 text-sm">Bars</p>
            </div>
            <div className="text-center">
              <LoadingSpinner variant="ring" size="lg" />
              <p className="mt-2 text-sm">Ring</p>
            </div>
          </div>
        </Card>

        {/* Loading Buttons */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Loading Buttons</h2>
          <div className="flex flex-wrap gap-4">
            <LoadingButton
              loading={loading}
              onClick={handleLoadingTest}
              icon={<Download size={16} />}
            >
              Yuklab olish
            </LoadingButton>
            
            <LoadingButton
              loading={loading}
              loadingText="Saqlanmoqda..."
              variant="outline"
              icon={<Save size={16} />}
            >
              Saqlash
            </LoadingButton>
            
            <LoadingButton
              loading={loading}
              loadingText="Yuklanmoqda..."
              variant="ghost"
              icon={<Upload size={16} />}
            >
              Yuklash
            </LoadingButton>
          </div>
        </Card>

        {/* Progress Bars */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Progress Bars</h2>
          <div className="space-y-4">
            <ProgressBar 
              value={progress} 
              showLabel={true}
              label="Yuklanish jarayoni"
            />
            <ProgressBar 
              value={75} 
              variant="success"
              showLabel={true}
              label="Muvaffaqiyatli"
            />
            <ProgressBar 
              value={30} 
              variant="warning"
              showLabel={true}
              label="Ogohlantirish"
            />
            <ProgressBar 
              value={90} 
              variant="gradient"
              showLabel={true}
              label="Gradient"
              size="lg"
            />
          </div>
          
          <div className="mt-4 flex gap-2">
            <Button 
              size="sm" 
              onClick={() => setProgress(Math.max(0, progress - 10))}
            >
              -10%
            </Button>
            <Button 
              size="sm" 
              onClick={() => setProgress(Math.min(100, progress + 10))}
            >
              +10%
            </Button>
          </div>
        </Card>

        {/* Skeleton Loaders */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Skeleton Loaders</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium mb-2">Text Skeleton</h3>
              <SkeletonLoader variant="text" lines={4} />
            </div>
            <div>
              <h3 className="font-medium mb-2">Card Skeleton</h3>
              <SkeletonLoader variant="card" />
            </div>
            <div>
              <h3 className="font-medium mb-2">List Skeleton</h3>
              <SkeletonLoader variant="list" lines={3} />
            </div>
            <div>
              <h3 className="font-medium mb-2">Table Skeleton</h3>
              <SkeletonLoader variant="table" lines={4} />
            </div>
          </div>
        </Card>

        {/* Loading States */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Loading States</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium mb-2">Card Loading</h3>
              <LoadingState 
                variant="card" 
                message="Ma'lumotlar yuklanmoqda..."
                type="dots"
              />
            </div>
            <div>
              <h3 className="font-medium mb-2">Skeleton Loading</h3>
              <LoadingState 
                type="skeleton" 
                skeletonType="list"
                lines={3}
              />
            </div>
          </div>
        </Card>

        {/* Overlay Test */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Loading Overlay</h2>
          <Button onClick={handleOverlayTest}>
            <RefreshCw size={16} className="mr-2" />
            Overlay ni sinab ko'rish
          </Button>
        </Card>
      </div>

      <LoadingOverlay 
        isVisible={showOverlay}
        message="Kuting, jarayon davom etmoqda..."
        variant="pulse"
        size="xl"
      />
    </div>
  )
}

export default LoadingDemo