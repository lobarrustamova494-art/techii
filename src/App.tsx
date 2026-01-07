import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import ExamCreation from './pages/ExamCreation'
import ExamDetail from './pages/ExamDetail'
import ExamKeys from './pages/ExamKeys'
import ExamScanner from './pages/ExamScanner'
import OMRGeneration from './pages/OMRGeneration'
import ScanUpload from './pages/ScanUpload'
import LoadingDemo from './pages/LoadingDemo'

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
                <ExamCreation />
              </ProtectedRoute>
            } />
            <Route path="/exam-detail/:id" element={
              <ProtectedRoute>
                <ExamDetail />
              </ProtectedRoute>
            } />
            <Route path="/exam-keys/:id" element={
              <ProtectedRoute>
                <ExamKeys />
              </ProtectedRoute>
            } />
            <Route path="/exam-scanner/:id" element={
              <ProtectedRoute>
                <ExamScanner />
              </ProtectedRoute>
            } />
            <Route path="/omr-generation" element={
              <ProtectedRoute>
                <OMRGeneration />
              </ProtectedRoute>
            } />
            <Route path="/scan-upload" element={
              <ProtectedRoute>
                <ScanUpload />
              </ProtectedRoute>
            } />
            <Route path="/loading-demo" element={
              <ProtectedRoute>
                <LoadingDemo />
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