import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import LoadingSpinner from './components/ui/LoadingSpinner'

// Eager load critical pages
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'

// Lazy load heavy pages
const ExamCreation = lazy(() => import('./pages/ExamCreation'))
const ExamDetail = lazy(() => import('./pages/ExamDetail'))
const ExamKeys = lazy(() => import('./pages/ExamKeys'))
const ExamScanner = lazy(() => import('./pages/ExamScanner'))
const EvalBeeScanner = lazy(() => import('./pages/EvalBeeScanner'))
const EvalBeeCameraScannerPage = lazy(() => import('./pages/EvalBeeCameraScanner'))
const OMRGeneration = lazy(() => import('./pages/OMRGeneration'))
const ScanUpload = lazy(() => import('./pages/ScanUpload'))
const LoadingDemo = lazy(() => import('./pages/LoadingDemo'))

// Loading fallback component
const PageLoader = () => (
  <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center">
    <div className="text-center">
      <LoadingSpinner size="lg" />
      <p className="mt-4 text-slate-600 dark:text-slate-400">Sahifa yuklanmoqda...</p>
    </div>
  </div>
)

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-background-light dark:bg-background-dark">
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            {/* Protected routes */}
            <Route path="/" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/exam-creation" element={
              <ProtectedRoute>
                <Suspense fallback={<PageLoader />}>
                  <ExamCreation />
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="/exam-detail/:id" element={
              <ProtectedRoute>
                <Suspense fallback={<PageLoader />}>
                  <ExamDetail />
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="/exam-keys/:id" element={
              <ProtectedRoute>
                <Suspense fallback={<PageLoader />}>
                  <ExamKeys />
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="/exam-scanner/:id" element={
              <ProtectedRoute>
                <Suspense fallback={<PageLoader />}>
                  <ExamScanner />
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="/exam-scanner/:id/evalbee" element={
              <ProtectedRoute>
                <Suspense fallback={<PageLoader />}>
                  <EvalBeeScanner />
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="/exam-scanner/:id/evalbee-camera" element={
              <ProtectedRoute>
                <Suspense fallback={<PageLoader />}>
                  <EvalBeeCameraScannerPage />
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="/omr-generation" element={
              <ProtectedRoute>
                <Suspense fallback={<PageLoader />}>
                  <OMRGeneration />
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="/scan-upload" element={
              <ProtectedRoute>
                <Suspense fallback={<PageLoader />}>
                  <ScanUpload />
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="/loading-demo" element={
              <ProtectedRoute>
                <Suspense fallback={<PageLoader />}>
                  <LoadingDemo />
                </Suspense>
              </ProtectedRoute>
            } />
            
            {/* Redirect any unknown routes to dashboard */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  )
}

export default App