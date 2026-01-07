import express, { Response } from 'express'
import Subject from '../models/Subject.js'
import { validate, schemas } from '../middleware/validation.js'
import { authenticate } from '../middleware/auth.js'
import { AuthRequest } from '../types/index.js'

const router = express.Router()

// Get all subjects for current user
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const subjects = await Subject.find({ 
      createdBy: req.user!._id,
      isActive: true 
    }).sort({ createdAt: -1 })

    res.json({
      success: true,
      data: { subjects }
    })
  } catch (error) {
    console.error('Get subjects error:', error)
    res.status(500).json({
      success: false,
      message: 'Server xatoligi'
    })
  }
})

// Get single subject
router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const subject = await Subject.findOne({
      _id: req.params.id,
      createdBy: req.user!._id
    })

    if (!subject) {
      return res.status(404).json({
        success: false,
        message: 'Mavzu topilmadi'
      })
    }

    res.json({
      success: true,
      data: { subject }
    })
  } catch (error) {
    console.error('Get subject error:', error)
    res.status(500).json({
      success: false,
      message: 'Server xatoligi'
    })
  }
})

// Create new subject
router.post('/', authenticate, validate(schemas.createSubject), async (req: AuthRequest, res) => {
  try {
    const { name, sections } = req.body

    const subject = new Subject({
      name,
      sections,
      createdBy: req.user!._id
    })

    await subject.save()

    res.status(201).json({
      success: true,
      message: 'Mavzu muvaffaqiyatli yaratildi',
      data: { subject }
    })
  } catch (error) {
    console.error('Create subject error:', error)
    res.status(500).json({
      success: false,
      message: 'Server xatoligi'
    })
  }
})

// Update subject
router.put('/:id', authenticate, validate(schemas.createSubject), async (req: AuthRequest, res) => {
  try {
    const { name, sections } = req.body

    const subject = await Subject.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user!._id },
      { name, sections },
      { new: true, runValidators: true }
    )

    if (!subject) {
      return res.status(404).json({
        success: false,
        message: 'Mavzu topilmadi'
      })
    }

    res.json({
      success: true,
      message: 'Mavzu muvaffaqiyatli yangilandi',
      data: { subject }
    })
  } catch (error) {
    console.error('Update subject error:', error)
    res.status(500).json({
      success: false,
      message: 'Server xatoligi'
    })
  }
})

// Delete subject
router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const subject = await Subject.findOneAndDelete({
      _id: req.params.id,
      createdBy: req.user!._id
    })

    if (!subject) {
      return res.status(404).json({
        success: false,
        message: 'Mavzu topilmadi'
      })
    }

    res.json({
      success: true,
      message: 'Mavzu muvaffaqiyatli o\'chirildi'
    })
  } catch (error) {
    console.error('Delete subject error:', error)
    res.status(500).json({
      success: false,
      message: 'Server xatoligi'
    })
  }
})

export default router