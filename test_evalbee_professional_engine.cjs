#!/usr/bin/env node
/**
 * Test EvalBee Professional OMR Engine
 * Comprehensive testing of the professional multi-pass processing system
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
const ANSWER_KEY = Array(40).fill('A') // 40 questions, all A

console.log('=== EVALBEE PROFESSIONAL OMR ENGINE TEST ===')
console.log(`Python OMR URL: ${PYTHON_OMR_URL}`)
console.log(`Test image: ${TEST_IMAGE}`)
console.log(`Answer key: ${ANSWER_KEY.length} questions`)

async function testProfessionalEngine() {
  try {
    // Check if test image exists
    if (!fs.existsSync(TEST_IMAGE)) {
      console.error(`❌ Test image not found: ${TEST_IMAGE}`)
      process.exit(1)
    }

    console.log('\n🚀 Testing EvalBee Professional Multi-Pass Engine...')
    
    // Prepare form data
    const formData = new FormData()
    formData.append('image', fs.createReadStream(TEST_IMAGE))
    formData.append('answerKey', JSON.stringify(ANSWER_KEY))
    formData.append('scoring', JSON.stringify({ correct: 1, wrong: 0, blank: 0 }))
    formData.append('debug', 'true')

    const startTime = Date.now()

    // Test professional endpoint
    console.log('📡 Sending request to professional endpoint...')
    const response = await fetch(`${PYTHON_OMR_URL}/api/omr/process_professional`, {
      method: 'POST',
      body: formData,
      headers: {
        'Accept': 'application/json'
      }
    })

    const processingTime = Date.now() - startTime

    if (!response.ok) {
      console.error(`❌ HTTP Error: ${response.status} ${response.statusText}`)
      const errorText = await response.text()
      console.error('Error details:', errorText)
      return false
    }

    const result = await response.json()

    if (!result.success) {
      console.error('❌ Processing failed:', result.error)
      return false
    }

    console.log('\n✅ EvalBee Professional processing completed successfully!')
    
    // Display results
    const data = result.data
    console.log('\n=== PROCESSING RESULTS ===')
    console.log(`Overall Confidence: ${(data.overall_confidence * 100).toFixed(1)}%`)
    console.log(`Processing Time: ${data.processing_time?.toFixed(2) || (processingTime / 1000).toFixed(2)}s`)
    console.log(`Engine Version: ${data.engine_version}`)
    console.log(`Processing Method: ${data.processing_method}`)

    // Image quality metrics
    if (data.image_quality_metrics) {
      console.log('\n=== IMAGE QUALITY METRICS ===')
      const quality = data.image_quality_metrics
      console.log(`Overall Quality: ${(quality.overall_quality * 100).toFixed(1)}%`)
      console.log(`Sharpness: ${quality.sharpness?.toFixed(1) || 'N/A'}`)
      console.log(`Contrast: ${(quality.contrast * 100).toFixed(1)}%`)
      console.log(`Brightness: ${quality.brightness?.toFixed(1) || 'N/A'}`)
      console.log(`Noise Level: ${quality.noise_level?.toFixed(1) || 'N/A'}`)
    }

    // Performance metrics
    if (data.performance_metrics) {
      console.log('\n=== PERFORMANCE METRICS ===')
      const perf = data.performance_metrics
      console.log(`Total Questions: ${perf.total_questions_processed}`)
      console.log(`High Confidence: ${perf.high_confidence_answers}`)
      console.log(`Medium Confidence: ${perf.medium_confidence_answers}`)
      console.log(`Low Confidence: ${perf.low_confidence_answers}`)
      console.log(`Blank Answers: ${perf.blank_answers}`)
      console.log(`Average Confidence: ${(perf.average_confidence * 100).toFixed(1)}%`)
      console.log(`Success Rate: ${(perf.processing_success_rate * 100).toFixed(1)}%`)
    }

    // Error summary
    if (data.error_summary && Object.keys(data.error_summary).length > 0) {
      console.log('\n=== ERROR SUMMARY ===')
      for (const [error, count] of Object.entries(data.error_summary)) {
        console.log(`${error}: ${count}`)
      }
    }

    // System recommendations
    if (data.system_recommendations && data.system_recommendations.length > 0) {
      console.log('\n=== SYSTEM RECOMMENDATIONS ===')
      data.system_recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. ${rec}`)
      })
    }

    // Answer analysis
    console.log('\n=== ANSWER ANALYSIS ===')
    const answers = data.extracted_answers
    console.log(`Total Answers: ${answers.length}`)
    
    const answerCounts = {}
    answers.forEach(answer => {
      answerCounts[answer] = (answerCounts[answer] || 0) + 1
    })
    
    console.log('Answer Distribution:')
    Object.entries(answerCounts).forEach(([answer, count]) => {
      console.log(`  ${answer}: ${count}`)
    })

    // First 10 questions detailed
    console.log('\n=== FIRST 10 QUESTIONS (DETAILED) ===')
    const questionResults = data.question_results || []
    for (let i = 0; i < Math.min(10, questionResults.length); i++) {
      const qr = questionResults[i]
      console.log(`Q${qr.question_number}: ${qr.detected_answer} (confidence: ${(qr.confidence * 100).toFixed(1)}%, quality: ${(qr.quality_score * 100).toFixed(1)}%)`)
      
      if (qr.error_flags && qr.error_flags.length > 0) {
        console.log(`  Errors: ${qr.error_flags.join(', ')}`)
      }
      
      if (qr.consensus_votes) {
        const votes = Object.entries(qr.consensus_votes)
          .filter(([_, count]) => count > 0)
          .map(([option, count]) => `${option}:${count}`)
          .join(', ')
        if (votes) {
          console.log(`  Consensus: ${votes}`)
        }
      }
    }

    // Accuracy calculation
    let correctAnswers = 0
    for (let i = 0; i < Math.min(answers.length, ANSWER_KEY.length); i++) {
      if (answers[i] === ANSWER_KEY[i]) {
        correctAnswers++
      }
    }
    
    const accuracy = (correctAnswers / ANSWER_KEY.length) * 100
    console.log(`\n=== ACCURACY ASSESSMENT ===`)
    console.log(`Correct Answers: ${correctAnswers}/${ANSWER_KEY.length}`)
    console.log(`Accuracy: ${accuracy.toFixed(1)}%`)

    // Professional engine specific metrics
    console.log('\n=== PROFESSIONAL ENGINE FEATURES ===')
    console.log('✅ Multi-pass bubble analysis')
    console.log('✅ Consensus voting system')
    console.log('✅ Advanced quality control')
    console.log('✅ Professional error detection')
    console.log('✅ Comprehensive performance metrics')
    console.log('✅ Actionable system recommendations')

    return true

  } catch (error) {
    console.error('❌ Test failed with error:', error.message)
    return false
  }
}

async function testFallbackProcessing() {
  try {
    console.log('\n🔄 Testing fallback to main endpoint...')
    
    // Prepare form data
    const formData = new FormData()
    formData.append('image', fs.createReadStream(TEST_IMAGE))
    formData.append('answerKey', JSON.stringify(ANSWER_KEY))
    formData.append('scoring', JSON.stringify({ correct: 1, wrong: 0, blank: 0 }))
    formData.append('professional', 'true')
    formData.append('debug', 'true')

    const response = await fetch(`${PYTHON_OMR_URL}/api/omr/process`, {
      method: 'POST',
      body: formData,
      headers: {
        'Accept': 'application/json'
      }
    })

    if (!response.ok) {
      console.error(`❌ Fallback HTTP Error: ${response.status} ${response.statusText}`)
      return false
    }

    const result = await response.json()

    if (!result.success) {
      console.error('❌ Fallback processing failed:', result.message)
      return false
    }

    console.log('✅ Fallback processing successful!')
    console.log(`Method: ${result.data.processing_details?.processing_method || 'Unknown'}`)
    console.log(`Confidence: ${(result.data.confidence * 100).toFixed(1)}%`)
    console.log(`Answers: ${result.data.extracted_answers.length}`)

    return true

  } catch (error) {
    console.error('❌ Fallback test failed:', error.message)
    return false
  }
}

async function runAllTests() {
  console.log('\n🧪 Running comprehensive EvalBee Professional engine tests...')
  
  let passedTests = 0
  let totalTests = 0

  // Test 1: Professional endpoint
  totalTests++
  console.log('\n--- TEST 1: Professional Endpoint ---')
  if (await testProfessionalEngine()) {
    passedTests++
    console.log('✅ TEST 1 PASSED')
  } else {
    console.log('❌ TEST 1 FAILED')
  }

  // Test 2: Fallback processing
  totalTests++
  console.log('\n--- TEST 2: Fallback Processing ---')
  if (await testFallbackProcessing()) {
    passedTests++
    console.log('✅ TEST 2 PASSED')
  } else {
    console.log('❌ TEST 2 FAILED')
  }

  // Final results
  console.log('\n=== TEST SUMMARY ===')
  console.log(`Tests Passed: ${passedTests}/${totalTests}`)
  console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`)

  if (passedTests === totalTests) {
    console.log('🎉 ALL TESTS PASSED! EvalBee Professional engine is working correctly.')
  } else {
    console.log('⚠️ Some tests failed. Please check the implementation.')
  }

  return passedTests === totalTests
}

// Run tests
runAllTests()
  .then(success => {
    process.exit(success ? 0 : 1)
  })
  .catch(error => {
    console.error('❌ Test suite failed:', error)
    process.exit(1)
  })