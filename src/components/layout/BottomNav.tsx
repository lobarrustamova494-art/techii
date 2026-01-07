import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Home, FileText, Users, BarChart3, Settings } from 'lucide-react'

const BottomNav: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()

  const navItems = [
    { icon: Home, label: 'Bosh sahifa', path: '/' },
    { icon: FileText, label: 'Imtihonlar', path: '/exam-creation' },
    { icon: Users, label: 'O\'quvchilar', path: '/students' },
    { icon: BarChart3, label: 'Hisobotlar', path: '/reports' },
    { icon: Settings, label: 'Sozlamalar', path: '/settings' },
  ]

  return (
    <nav className="fixed bottom-0 left-0 w-full bg-surface-light dark:bg-surface-dark border-t border-slate-200 dark:border-slate-800 pb-safe pt-2 px-4 z-30">
      <div className="flex justify-between items-center max-w-md mx-auto">
        {navItems.map(({ icon: Icon, label, path }) => {
          const isActive = location.pathname === path
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`flex flex-col items-center gap-1 p-2 w-16 ${
                isActive 
                  ? 'text-primary' 
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
              }`}
            >
              <Icon size={24} fill={isActive ? 'currentColor' : 'none'} />
              <span className="text-[10px] font-medium">{label}</span>
            </button>
          )
        })}
      </div>
      <div className="h-6 w-full" />
    </nav>
  )
}

export default BottomNav