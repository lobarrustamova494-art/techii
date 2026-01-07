import express, { Response } from 'express'
import Exam from '../models/Exam.js'
import Subject from '../models/Subject.js'
import { validate, schemas } from '../middleware/validation.js'
import { authenticate } from '../middleware/auth.js'
import { AuthRequest } from '../types/index.js'

const router = express.Router()

// Get all exams for current user
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const exams = await Exam.find({ 
      createdBy: req.user!._id,
      isActive: true 
    })
    .populate('subjects', 'name sections')
    .sort({ createdAt: -1 })

    res.json({
      success: true,
      data: { exams }
    })
  } catch (error) {
    console.error('Get exams error:', error)
    res.status(500).json({
      success: false,
      message: 'Server xatoligi'
    })
  }
})

// Get single exam
router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const exam = await Exam.findOne({
      _id: req.params.id,
      createdBy: req.user!._id
    }).populate('subjects', 'name sections')

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Imtihon topilmadi'
      })
    }

    res.json({
      success: true,
      data: { exam }
    })
  } catch (error) {
    console.error('Get exam error:', error)
    res.status(500).json({
      success: false,
      message: 'Server xatoligi'
    })
  }
})

// Create new exam
router.post('/', authenticate, validate(schemas.createExam), async (req: AuthRequest, res) => {
  try {
    console.log('Create exam request body:', req.body)
    
    const examData = {
      ...req.body,
      createdBy: req.user!._id
    }

    console.log('Creating exam with data:', examData)
    
    const exam = new Exam(examData)
    await exam.save()

    console.log('Exam created successfully:', exam._id)

    res.status(201).json({
      success: true,
      message: 'Imtihon muvaffaqiyatli yaratildi',
      data: { exam }
    })
  } catch (error) {
    console.error('Create exam error:', error)
    res.status(500).json({
      success: false,
      message: 'Server xatoligi'
    })
  }
})

// Update exam
router.put('/:id', authenticate, validate(schemas.updateExam), async (req: AuthRequest, res) => {
  try {
    console.log('Update exam request body:', req.body)
    
    const exam = await Exam.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user!._id },
      req.body,
      { new: true, runValidators: true }
    )

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Imtihon topilmadi'
      })
    }

    console.log('Exam updated successfully:', exam._id)

    res.json({
      success: true,
      message: 'Imtihon muvaffaqiyatli yangilandi',
      data: { exam }
    })
  } catch (error) {
    console.error('Update exam error:', error)
    res.status(500).json({
      success: false,
      message: 'Server xatoligi'
    })
  }
})

// Delete exam
router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const exam = await Exam.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user!._id },
      { isActive: false },
      { new: true }
    )

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Imtihon topilmadi'
      })
    }

    res.json({
      success: true,
      message: 'Imtihon muvaffaqiyatli o\'chirildi'
    })
  } catch (error) {
    console.error('Delete exam error:', error)
    res.status(500).json({
      success: false,
      message: 'Server xatoligi'
    })
  }
})

export default router