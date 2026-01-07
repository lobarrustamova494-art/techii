// Load environment variables FIRST
import dotenv from 'dotenv'
dotenv.config()

import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { connectDatabase } from './config/database.js'
import { errorHandler, notFound } from './middleware/errorHandler.js'

// Import routes
import authRoutes from './routes/auth.js'
import subjectRoutes from './routes/subjects.js'
import examRoutes from './routes/exams.js'
import aiRoutes from './routes/ai.js'
// import studentRoutes from './routes/students.js'

const app = express()
const PORT = process.env.PORT || 5000

// Security middleware
app.use(helmet())

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Juda ko\'p so\'rov yuborildi, keyinroq urinib ko\'ring'
  }
})
app.use(limiter)

// CORS configuration
const corsOptions = {
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    'https://stitch-omr-frontend.onrender.com',
    /\.onrender\.com$/
  ],
  credentials: true,
  optionsSuccessStatus: 200
}
app.use(cors(corsOptions))

// Body parsing middleware
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server ishlamoqda',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  })
})

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'API test muvaffaqiyatli',
    data: {
      server: 'running',
      database: 'connected',
      timestamp: new Date().toISOString()
    }
  })
})

// API routes
app.use('/api', (req, res, next) => {
  console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`)
  next()
})

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/subjects', subjectRoutes)
app.use('/api/exams', examRoutes)
app.use('/api/ai', aiRoutes)
// app.use('/api/students', studentRoutes)

// Error handling middleware
app.use(notFound)
app.use(errorHandler)

// Start server
const startServer = async () => {
  try {
    // Connect to database
    await connectDatabase()
    
    // Start listening
    app.listen(PORT, () => {
      console.log(`🚀 Server ${PORT} portda ishlamoqda`)
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`)
      console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`)
    })
  } catch (error) {
    console.error('❌ Serverni ishga tushirishda xatolik:', error)
    process.exit(1)
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (err: Error) => {
  console.error('❌ Unhandled Promise Rejection:', err.message)
  process.exit(1)
})

// Handle uncaught exceptions
process.on('uncaughtException', (err: Error) => {
  console.error('❌ Uncaught Exception:', err.message)
  process.exit(1)
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM signal received, shutting down gracefully')
  process.exit(0)
})

process.on('SIGINT', () => {
  console.log('👋 SIGINT signal received, shutting down gracefully')
  process.exit(0)
})

startServer()

export default app