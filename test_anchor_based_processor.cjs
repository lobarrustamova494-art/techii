#!/usr/bin/env node
/**
 * Anchor-Based OMR Processor Test
 * Tests the anchor-based processor with fallback support
 */

const fs = require('fs')
const path = require('path')
const FormData = require('form-data')

// Import fetch for Node.js
let fetch
try {
  fetch = require('node-fetch')
} catch (error) {
  console.error('❌ node-fetch not installed. Please run: npm install node-fetch')
  process.exit(1)
}

// Configuration
const PYTHON_OMR_URL = process.env.PYTHON_OMR_URL || 'http://localhost:5000'
const TEST_IMAGE = 'test_image_40_questions.jpg'

console.log('=== ANCHOR-BASED OMR PROCESSOR TEST ===')
console.log(`Python OMR URL: ${PYTHON_OMR_URL}`)
console.log(`Test image: ${TEST_IMAGE}`)

async function testAnchorBasedProcessor() {
  console.log('\n🎯 Testing Anchor-Based OMR Processor...')
  
  try {
    if (!fs.existsSync(TEST_IMAGE)) {
      console.error(`❌ Test image not found: ${TEST_IMAGE}`)
      return false
    }
    
    const formData = new FormData()
    formData.append('image', fs.createReadStream(TEST_IMAGE))
    formData.append('answerKey', JSON.stringify(Array(40).fill('A')))
    
    const startTime = Date.now()
    
    const response = await fetch(`${PYTHON_OMR_URL}/api/omr/process_anchor_based`, {
      method: 'POST',
      body: formData,
      headers: {
        'Accept': 'application/json'
      }
    })
    
    const processingTime = Date.now() - startTime
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const result = await response.json()
    
    if (result.success) {
      const data = result.data
      
      console.log('✅ Anchor-based processing completed')
      console.log(`⏱️ Processing Time: ${(processingTime / 1000).toFixed(2)}s`)
      console.log(`🎯 Confidence: ${(data.confidence * 100).toFixed(1)}%`)
      console.log(`📍 Anchors Found: ${data.anchor_points?.length || 0}`)
      console.log(`🔍 Bubbles Analyzed: ${data.bubble_regions?.length || 0}`)
      console.log(`📊 Questions Processed: ${data.extracted_answers?.length || 0}`)
      
      if (data.processing_details) {
        console.log(`🔧 Processing Method: ${data.processing_details.processing_method}`)
        console.log(`📐 Image Dimensions: ${data.processing_details.image_dimensions?.join('x') || 'Unknown'}`)
        console.log(`🧪 Tesseract Available: ${data.processing_details.tesseract_available}`)
      }
      
      console.log(`\nFirst 10 answers:`)
      for (let i = 0; i < Math.min(10, data.extracted_answers?.length || 0); i++) {
        console.log(`  Q${i+1}: ${data.extracted_answers[i]}`)
      }
      
      if (data.anchor_points && data.anchor_points.length > 0) {
        console.log(`\nFirst 5 anchor points:`)
        for (let i = 0; i < Math.min(5, data.anchor_points.length); i++) {
          const anchor = data.anchor_points[i]
          console.log(`  Q${anchor.question_number}: (${anchor.x}, ${anchor.y}) - "${anchor.text}" (conf: ${(anchor.confidence * 100).toFixed(1)}%)`)
        }
      }
      
      return true
    } else {
      throw new Error(result.error || 'Anchor-based processing failed')
    }
    
  } catch (error) {
    console.error('❌ Anchor-based processor test failed:', error.message)
    return false
  }
}

async function testFallbackToMainEndpoint() {
  console.log('\n🔄 Testing fallback to main endpoint...')
  
  try {
    if (!fs.existsSync(TEST_IMAGE)) {
      console.error(`❌ Test image not found: ${TEST_IMAGE}`)
      return false
    }
    
    const formData = new FormData()
    formData.append('image', fs.createReadStream(TEST_IMAGE))
    formData.append('answerKey', JSON.stringify(Array(40).fill('A')))
    formData.append('anchor_based', 'true')  // Request anchor-based processing
    
    const response = await fetch(`${PYTHON_OMR_URL}/api/omr/process`, {
      method: 'POST',
      body: formData,
      headers: {
        'Accept': 'application/json'
      }
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const result = await response.json()
    
    if (result.success) {
      console.log('✅ Fallback processing successful!')
      console.log(`Method: ${result.data.processing_details?.processing_method || 'Unknown'}`)
      console.log(`Confidence: ${(result.data.confidence * 100).toFixed(1)}%`)
      console.log(`Answers: ${result.data.extracted_answers?.length || 0}`)
      return true
    } else {
      throw new Error(result.message || 'Fallback processing failed')
    }
    
  } catch (error) {
    console.error('❌ Fallback test failed:', error.message)
    return false
  }
}

async function runTests() {
  console.log('\n🧪 Running Anchor-Based OMR Processor tests...')
  
  const tests = [
    { name: 'Anchor-Based Processor', fn: testAnchorBasedProcessor },
    { name: 'Fallback Processing', fn: testFallbackToMainEndpoint }
  ]
  
  let passedTests = 0
  let totalTests = tests.length
  
  for (const test of tests) {
    console.log(`\n--- TEST: ${test.name.toUpperCase()} ---`)
    
    try {
      const result = await test.fn()
      if (result) {
        console.log(`✅ ${test.name} PASSED`)
        passedTests++
      } else {
        console.log(`❌ ${test.name} FAILED`)
      }
    } catch (error) {
      console.log(`❌ ${test.name} ERROR: ${error.message}`)
    }
  }
  
  console.log('\n=== TEST SUMMARY ===')
  console.log(`Tests Passed: ${passedTests}/${totalTests}`)
  console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`)
  
  if (passedTests === totalTests) {
    console.log('\n🎉 ALL TESTS PASSED!')
    console.log('🎯 Anchor-Based OMR Processor is working correctly with fallback support.')
  } else {
    console.log('\n⚠️ Some tests failed.')
    console.log('🔧 Check the implementation and server status.')
  }
  
  return passedTests === totalTests
}

// Run the tests
runTests()
  .then(success => {
    process.exit(success ? 0 : 1)
  })
  .catch(error => {
    console.error('❌ Test suite failed:', error)
    process.exit(1)
  })
</content>
</invoke>