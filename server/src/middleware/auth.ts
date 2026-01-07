import { Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import User from '../models/User.js'
import { AuthRequest } from '../types/index.js'

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '')

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token topilmadi, kirish rad etildi'
      })
    }

    const jwtSecret = process.env.JWT_SECRET
    if (!jwtSecret) {
      return res.status(500).json({
        success: false,
        message: 'Server konfiguratsiya xatoligi'
      })
    }

    const decoded = jwt.verify(token, jwtSecret) as { userId: string }
    const user = await User.findById(decoded.userId).select('+password')

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Foydalanuvchi topilmadi yoki faol emas'
      })
    }

    req.user = user
    next()
  } catch (error) {
    console.error('Authentication error:', error)
    return res.status(401).json({
      success: false,
      message: 'Token yaroqsiz'
    })
  }
}

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Foydalanuvchi autentifikatsiya qilinmagan'
      })
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Bu amalni bajarish uchun ruxsat yo\'q'
      })
    }

    next()
  }
}