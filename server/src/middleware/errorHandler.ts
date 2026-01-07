import { Request, Response, NextFunction } from 'express'
import mongoose from 'mongoose'

interface CustomError extends Error {
  statusCode?: number
  code?: number
  keyValue?: any
  errors?: any
}

export const errorHandler = (
  err: CustomError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let error = { ...err }
  error.message = err.message

  // Log error
  console.error('Error:', err)

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Noto\'g\'ri ID formati'
    error = { name: 'CastError', message, statusCode: 400 }
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0]
    const message = `${field} allaqachon mavjud`
    error = { name: 'DuplicateError', message, statusCode: 400 }
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors || {}).map((val: any) => val.message).join(', ')
    error = { name: 'ValidationError', message, statusCode: 400 }
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Token yaroqsiz'
    error = { name: 'JsonWebTokenError', message, statusCode: 401 }
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token muddati tugagan'
    error = { name: 'TokenExpiredError', message, statusCode: 401 }
  }

  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || 'Server xatoligi',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  })
}

export const notFound = (req: Request, res: Response, next: NextFunction) => {
  const error = new Error(`Yo'l topilmadi - ${req.originalUrl}`) as CustomError
  error.statusCode = 404
  next(error)
}