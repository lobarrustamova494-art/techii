import { Router } from 'express'
import { Request, Response } from 'express'

const router = Router()

/**
 * POST /api/omr/webhook
 * Webhook endpoint for Python OMR server notifications
 */
router.post('/webhook', async (req: Request, res: Response) => {
  try {
    console.log('🔔 OMR Webhook received:', req.body)
    
    // Verify API key
    const apiKey = req.headers['x-api-key'] || req.body.apiKey
    const expectedApiKey = process.env.PYTHON_OMR_API_KEY || 'omr_python_server_2024_secure_key_12345'
    
    if (apiKey !== expectedApiKey) {
      return res.status(401).json({
        success: false,
        message: 'Invalid API key'
      })
    }
    
    // Process webhook data
    const { 
      processingId, 
      status, 
      result, 
      error,
      timestamp 
    } = req.body
    
    console.log(`📊 Processing ID: ${processingId}`)
    console.log(`📈 Status: ${status}`)
    
    if (status === 'completed' && result) {
      // Handle successful processing
      console.log('✅ OMR processing completed successfully')
      console.log(`Confidence: ${result.confidence}`)
      console.log(`Extracted answers: ${result.extractedAnswers?.length}`)
      
      // Here you can:
      // 1. Save results to database
      // 2. Send notifications to users
      // 3. Update processing status
      // 4. Trigger next steps in workflow
      
    } else if (status === 'failed' && error) {
      // Handle processing failure
      console.error('❌ OMR processing failed:', error)
      
      // Handle error:
      // 1. Log error details
      // 2. Notify administrators
      // 3. Update status in database
      // 4. Send error notification to user
    }
    
    res.json({
      success: true,
      message: 'Webhook processed successfully',
      processingId
    })
    
  } catch (error) {
    console.error('Webhook processing error:', error)
    res.status(500).json({
      success: false,
      message: 'Webhook processing failed'
    })
  }
})

export default router