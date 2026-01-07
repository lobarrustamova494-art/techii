import express, { Response } from 'express'
import User from '../models/User.js'
import { generateToken } from '../utils/jwt.js'
import { validate, schemas } from '../middleware/validation.js'
import { authenticate } from '../middleware/auth.js'
import { AuthRequest } from '../types/index.js'

const router = express.Router()

// Register
router.post('/register', validate(schemas.register), async (req, res) => {
  try {
    console.log('Register request body:', req.body)
    const { name, phone, password, role } = req.body

    // Check if user already exists
    console.log('Checking existing user with phone:', phone)
    const existingUser = await User.findOne({ phone })
    if (existingUser) {
      console.log('User already exists')
      return res.status(400).json({
        success: false,
        message: 'Bu telefon raqam allaqachon ro\'yxatdan o\'tgan'
      })
    }

    // Create user
    console.log('Creating new user...')
    const user = new User({ name, phone, password, role })
    await user.save()
    console.log('User created successfully:', user._id)

    // Generate token
    const token = generateToken(user._id.toString())
    console.log('Token generated')

    res.status(201).json({
      success: true,
      message: 'Foydalanuvchi muvaffaqiyatli ro\'yxatdan o\'tdi',
      data: {
        user,
        token
      }
    })
  } catch (error) {
    console.error('Register error:', error)
    res.status(500).json({
      success: false,
      message: 'Server xatoligi'
    })
  }
})

// Login
router.post('/login', validate(schemas.login), async (req, res) => {
  try {
    const { phone, password } = req.body

    // Find user with password
    const user = await User.findOne({ phone, isActive: true }).select('+password')
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Telefon raqam yoki parol noto\'g\'ri'
      })
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password)
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Telefon raqam yoki parol noto\'g\'ri'
      })
    }

    // Generate token
    const token = generateToken(user._id.toString())

    // Remove password from response
    user.password = undefined as any

    res.json({
      success: true,
      message: 'Muvaffaqiyatli kirildi',
      data: {
        user,
        token
      }
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({
      success: false,
      message: 'Server xatoligi'
    })
  }
})

// Get current user
router.get('/me', authenticate, async (req: AuthRequest, res) => {
  try {
    const user = req.user
    res.json({
      success: true,
      data: { user }
    })
  } catch (error) {
    console.error('Get user error:', error)
    res.status(500).json({
      success: false,
      message: 'Server xatoligi'
    })
  }
})

export default router