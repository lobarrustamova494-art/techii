import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Upload, 
  Camera, 
  Image, 
  Trash2, 
  X, 
  RefreshCw, 
  ArrowUp,
  FileText,
  AlertCircle
} from 'lucide-react'
import Header from '@/components/layout/Header'
import Button from '@/components/ui/Button'
import ProgressBar from '@/components/ui/ProgressBar'
import { UploadFile } from '@/types'

const ScanUpload: React.FC = () => {
  const navigate = useNavigate()
  
  const [files, setFiles] = useState<UploadFile[]>([
    {
      id: '1',
      name: 'Matematika_Imtihon_A_Qism_001.jpg',
      size: 2.4 * 1024 * 1024, // 2.4 MB
      status: 'ready',
      thumbnail: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAQDQ5kPjvU7XRc0jrlNLv-xHXF2HhD3T1-V3EmIz1vNAFOIz9RHPhvcRLcmZcZrRIYipf5EOnCWNeelLh-4aH5SDNAUWMnKbUWMHE_W--Zq2p576fvDxkUXLDNYJaftZEM4Wb0hOXG4rh4M_m0ou8scA8d6vQQQW6Fa_LT0jDs7tdG9kcMPBL7eRHQkjV-SJuug4J6Piei3sBesCxmPwEVRC4_ipYyZaogT57xVGCSBECWXpxk1f_b9v68vQMT33L86wcuI1Jmophs'
    },
    {
      id: '2',
      name: 'Matematika_Imtihon_A_Qism_002.jpg',
      size: 3.1 * 1024 * 1024, // 3.1 MB
      status: 'uploading',
      progress: 65,
      thumbnail: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCjIBvFfphicNicIXLkADuURGN4dmPF8qivNzbbSf1fvhPZXv_S9DUxoaw9ra35dhQ8AgriAOwawpkFCRb2y_CfurUktEyHmEQu3FQWX4DJVI-TNgaEZKUJs1LYbZsuqppgtop4crRqFziNWnb4zuB-xdHOFOB4webTy8csP0rSj0GoI1WUC1CSivqhfsDY413IqVnbtLjRgtYeLvizwsCmumO6oxnqyx0d-UnVBBZQMR5x17eOpLxrc2mf1XYRa-6pg9NqhmmgmzvY'
    },
    {
      id: '3',
      name: 'Matematika_Imtihon_B_Qism_004.jpg',
      size: 1.8 * 1024 * 1024, // 1.8 MB
      status: 'error'
    }
  ])

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  const handleFileAction = (fileId: string, action: 'delete' | 'retry' | 'cancel') => {
    if (action === 'delete' || action === 'cancel') {
      setFiles(prev => prev.filter(f => f.id !== fileId))
    } else if (action === 'retry') {
      setFiles(prev => prev.map(f => 
        f.id === fileId ? { ...f, status: 'ready' as const } : f
      ))
    }
  }

  const handleStartUpload = () => {
    const readyFiles = files.filter(f => f.status === 'ready')
    console.log('Starting upload for files:', readyFiles)
    // Here you would implement the actual upload logic
  }


  const getStatusText = (file: UploadFile) => {
    switch (file.status) {
      case 'ready':
        return `Yuklashga tayyor • ${formatFileSize(file.size)}`
      case 'uploading':
        return `Yuklanmoqda... ${file.progress}%`
      case 'error':
        return 'Yuklash muvaffaqiyatsiz. Qayta urinish uchun bosing.'
      case 'completed':
        return `Yakunlandi • ${formatFileSize(file.size)}`
      default:
        return formatFileSize(file.size)
    }
  }

  const getStatusColor = (file: UploadFile) => {
    switch (file.status) {
      case 'ready':
        return 'text-primary'
      case 'uploading':
        return 'text-slate-500 dark:text-slate-400'
      case 'error':
        return 'text-red-500'
      case 'completed':
        return 'text-green-500'
      default:
        return 'text-slate-500 dark:text-slate-400'
    }
  }

  const qualityTips = [
    {
      icon: 'crop_free',
      title: 'Qog\'ozni tekislang',
      description: 'Eng yaxshi OMR uchun burchaklarni buklamang.',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCFg8_Dx9Dett1989X3_4EjwC8TzhpA5beb7CxAqSwjN_W0Ol8zCaFKStaugTLoFVebodZGnimCjKBox8ANASMBW4_wdR1hCmq5Dni_8gWtVivL45egq-0jdigwVFjlue6BiaA0wBPfWUM6i_E0xnqbsIfL0Dy3YLh89dcaJAdx5kMT6ACr1Zu5jcVGV-j4nXPJpnUwcrlJCJYp4LGhMkTw7E9_IiEy9sWhjmZWZqNYSYm9ftaan8qOvtTgpiMD1BkYMTrqeTGz4LJx'
    },
    {
      icon: 'grid_on',
      title: 'Parallel burchaklar',
      description: 'Telefonni varaq ustida to\'g\'ridan-to\'g\'ri ushlab turing.',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDlKqUQGHwJ_spipKwuzTT7mFxpmZ9UeYfB9Mb9lz-7OLqJRT8gRkVIeOHR9tRpNe_wJs-voRp9SXMpGT9TAQux36oZ1spSZtvUhUk78ALXceHoGIz9_YOs5Q5__tU8sFW_Wk3J8XxESwsTOBbw5y4NF_4W2Tqi7RvxNn-UJWOS_jd1Uxctpq59bBfq45B_LtqYYdHaXPB3c4uPClLbBOJt6YLwLBPs1F_uD3t73eJxJlvZOyE2kgjKbs4yIqhtuck4Rqo11KIjV7iI'
    },
    {
      icon: 'wb_sunny',
      title: 'Yaxshi yorug\'lik',
      description: 'Qora soyalar belgilarni yopmayotganiga ishonch hosil qiling.',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDvZ3jnoDCuR8wl6gXOPNoqPBF3ybwZ5B7IiuvscNnFCAof7C-UXLgMHQCChFNXsfAY9jUDFgxOkmAeeQGODeV38nUE7cE5XPY8vTmtlQyoXkMdQvPkfAA2YHthyZW4RBrIzxmz739Gk1eCUiaGNmc7o94Pj_Sk0TntCvh3lTaX5LR7sREd8t1olmK0h0va-ueRUuJvYKbFjQ_y37l7S683PAHmPBAjOd-DBvKrz5iLY12al8UrJSQULCiZj3b442MVMRnc8EWYRH95'
    }
  ]

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-hidden pb-24 bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100">
      <Header
        user={{ id: '1', name: '', phone: '', avatar: '', isOnline: false }}
        title="Javob varaqlarini yuklash"
        showBack
        showHome
        onBack={() => navigate('/')}
      />

      <main className="flex-1 flex flex-col p-4 gap-6">
        {/* Upload Area */}
        <section className="flex flex-col gap-4">
          <div className="flex flex-col items-center gap-6 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800/50 px-6 py-10 transition-colors hover:border-primary hover:bg-primary/5 dark:hover:bg-primary/10 cursor-pointer group">
            <div className="flex max-w-[480px] flex-col items-center gap-3">
              <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Upload size={32} className="text-primary" />
              </div>
              <div className="text-center">
                <p className="text-slate-900 dark:text-white text-lg font-bold leading-tight">Yuklash maydoni</p>
                <p className="text-slate-500 dark:text-slate-400 text-sm font-normal leading-normal mt-1">
                  Javob varaqlarini tanlash uchun bu yerga bosing yoki fayllarni sudrab tashlang.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <Button className="flex items-center justify-center gap-2">
              <Camera size={20} />
              <span>Rasm olish</span>
            </Button>
            <Button variant="secondary" className="flex items-center justify-center gap-2">
              <Image size={20} />
              <span>Galereya</span>
            </Button>
          </div>
        </section>

        {/* Pending Uploads */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-slate-900 dark:text-white text-lg font-bold leading-tight">Kutilayotgan yuklashlar</h3>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-200 dark:bg-slate-800 px-2 py-1 rounded-full">
              {files.length} ta fayl
            </span>
          </div>
          
          <div className="flex flex-col gap-3">
            {files.map((file) => (
              <div
                key={file.id}
                className={`flex items-center gap-3 bg-white dark:bg-slate-800 p-3 rounded-lg shadow-sm border relative overflow-hidden ${
                  file.status === 'error' 
                    ? 'border-red-200 dark:border-red-900/30' 
                    : 'border-slate-100 dark:border-slate-700'
                }`}
              >
                {/* Progress bar for uploading files */}
                {file.status === 'uploading' && file.progress && (
                  <div className="absolute bottom-0 left-0 right-0">
                    <ProgressBar 
                      value={file.progress} 
                      size="sm" 
                      variant="default"
                      className="rounded-none"
                    />
                  </div>
                )}

                {/* Thumbnail */}
                <div className="size-12 rounded bg-slate-200 dark:bg-slate-700 overflow-hidden shrink-0 relative">
                  {file.thumbnail ? (
                    <img
                      src={file.thumbnail}
                      alt="Thumbnail"
                      className="w-full h-full object-cover opacity-80"
                    />
                  ) : file.status === 'error' ? (
                    <div className="size-12 rounded bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-500">
                      <AlertCircle size={20} />
                    </div>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-slate-400">
                      <FileText size={16} />
                    </div>
                  )}
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                    {file.name}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {file.status === 'uploading' && (
                      <span className="size-2 rounded-full bg-primary animate-pulse" />
                    )}
                    <p className={`text-xs font-medium ${getStatusColor(file)}`}>
                      {getStatusText(file)}
                    </p>
                  </div>
                </div>

                {/* Action Button */}
                <button
                  onClick={() => {
                    if (file.status === 'error') {
                      handleFileAction(file.id, 'retry')
                    } else if (file.status === 'uploading') {
                      handleFileAction(file.id, 'cancel')
                    } else {
                      handleFileAction(file.id, 'delete')
                    }
                  }}
                  className={`p-2 transition-colors ${
                    file.status === 'error'
                      ? 'text-primary hover:text-primary/80'
                      : file.status === 'uploading'
                      ? 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                      : 'text-slate-400 hover:text-red-500'
                  }`}
                >
                  {file.status === 'error' ? (
                    <RefreshCw size={20} />
                  ) : file.status === 'uploading' ? (
                    <X size={20} />
                  ) : (
                    <Trash2 size={20} />
                  )}
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Quality Guidelines */}
        <section className="flex flex-col pb-6">
          <div className="flex items-center justify-between pb-3">
            <h3 className="text-slate-900 dark:text-white text-lg font-bold leading-tight">Optimal sifat maslahatlari</h3>
            <button className="text-primary text-sm font-semibold">Barchasini ko'rish</button>
          </div>
          
          <div className="flex overflow-x-auto no-scrollbar gap-4 -mx-4 px-4 pb-2 snap-x">
            {qualityTips.map((tip, index) => (
              <div key={index} className="flex flex-col gap-3 min-w-[160px] w-[160px] snap-center">
                <div className="aspect-square w-full rounded-xl bg-slate-200 dark:bg-slate-700 relative overflow-hidden shadow-inner">
                  <div className="absolute inset-0 bg-gradient-to-tr from-slate-300 to-slate-100 dark:from-slate-800 dark:to-slate-600 opacity-50" />
                  <img
                    src={tip.image}
                    alt={tip.title}
                    className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-60"
                  />
                </div>
                <div>
                  <p className="text-slate-900 dark:text-white text-sm font-bold leading-tight">{tip.title}</p>
                  <p className="text-slate-500 dark:text-slate-400 text-xs font-normal leading-normal mt-1">
                    {tip.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Sticky Bottom Bar */}
      <div className="fixed bottom-0 w-full bg-white dark:bg-background-dark border-t border-slate-200 dark:border-slate-800 p-4 pb-6 z-20">
        <Button
          onClick={handleStartUpload}
          className="w-full flex items-center justify-center gap-2"
          disabled={files.filter(f => f.status === 'ready').length === 0}
        >
          <span>Yuklashni boshlash ({files.filter(f => f.status === 'ready').length})</span>
          <ArrowUp size={20} />
        </Button>
      </div>
    </div>
  )
}

export default ScanUpload