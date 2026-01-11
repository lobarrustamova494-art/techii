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
import omrRoutes from './routes/omr.js'
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

// CORS configuration - YAXSHILANGAN
const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true)
    
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:3000', 
      'http://localhost:4173',
      'https://stitch-omr-frontend.onrender.com',
      process.env.FRONTEND_URL
    ].filter(Boolean)
    
    if (allowedOrigins.includes(origin) || /\.onrender\.com$/.test(origin)) {
      callback(null, true)
    } else {
      console.log('CORS blocked origin:', origin)
      callback(null, true) // Allow all origins in development
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Range', 'X-Content-Range']
}
app.use(cors(corsOptions))

// Additional CORS headers for preflight requests
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*')
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With, Accept, Origin')
  res.header('Access-Control-Allow-Credentials', 'true')
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.sendStatus(200)
  } else {
    next()
  }
})

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

// Health check endpoint for Render
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: '2.0.0',
    services: {
      database: 'connected',
      ai: 'operational',
      omr: 'ultra-precision'
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
app.use('/api/omr', omrRoutes)
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