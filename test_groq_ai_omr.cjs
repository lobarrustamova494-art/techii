#!/usr/bin/env node
/**
 * GROQ AI OMR Test Suite
 * GROQ AI bilan OMR tahlilini test qilish
 */

const fetch = require('node-fetch')
const FormData = require('form-data')
const fs = require('fs')
const path = require('path')

// Configuration
const PYTHON_OMR_URL = process.env.PYTHON_OMR_URL || 'http://localhost:5000'
const TEST_IMAGE = 'test_image_40_questions.jpg'

console.log('=== GROQ AI OMR TEST SUITE ===')
console.log(`Python OMR URL: ${PYTHON_OMR_URL}`)
console.log(`Test image: ${TEST_IMAGE}`)

async function testGroqAIStatus() {
  console.log('\n🤖 Testing GROQ AI status...')
  
  try {
    const response = await fetch(`${PYTHON_OMR_URL}/api/ai/status`)
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const result = await response.json()
    
    if (result.success) {
      const aiStatus = result.ai_status
      
      console.log('✅ AI status retrieved')
      console.log(`🤖 GROQ AI Available: ${aiStatus.groq_ai.available ? '✅' : '❌'}`)
      
      if (aiStatus.groq_ai.available) {
        console.log(`📊 Model: ${aiStatus.groq_ai.model}`)
        console.log(`🔑 API Key Configured: ${aiStatus.groq_ai.api_key_configured ? '✅' : '❌'}`)
      }
      
      console.log(`🧠 ML Classifier: ${aiStatus.ml_classifier.available ? '✅' : '❌'}`)
      console.log(`🔍 Quality Controller: ${aiStatus.quality_controller.available ? '✅' : '❌'}`)
      
      console.log(`🚀 Traditional Engines:`)
      console.log(`   Professional: ${aiStatus.traditional_engines.professional ? '✅' : '❌'}`)
      console.log(`   Anchor-Based: ${aiStatus.traditional_engines.anchor_based ? '✅' : '❌'}`)
      
      return aiStatus.groq_ai.available
    } else {
      throw new Error(result.message || 'AI status check failed')
    }
    
  } catch (error) {
    console.error('❌ AI status test failed:', error.message)
    return false
  }
}

async function testGroqAIProcessing() {
  console.log('\n🤖 Testing GROQ AI OMR processing...')
  
  try {
    if (!fs.existsSync(TEST_IMAGE)) {
      console.error(`❌ Test image not found: ${TEST_IMAGE}`)
      return false
    }
    
    const formData = new FormData()
    formData.append('image', fs.createReadStream(TEST_IMAGE))
    formData.append('answerKey', JSON.stringify(Array(40).fill('A')))
    formData.append('scoring', JSON.stringify({ correct: 1, wrong: 0, blank: 0 }))
    
    const startTime = Date.now()
    
    const response = await fetch(`${PYTHON_OMR_URL}/api/omr/process_groq_ai`, {
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
      
      console.log('✅ GROQ AI processing completed')
      console.log(`⏱️ Processing Time: ${(processingTime / 1000).toFixed(2)}s`)
      console.log(`🎯 Overall Confidence: ${(data.confidence * 100).toFixed(1)}%`)
      console.log(`📊 Questions Processed: ${data.extracted_answers ? data.extracted_answers.length : 0}`)
      
      if (data.processing_details) {
        console.log(`🤖 AI Model: ${data.processing_details.aiModel || 'Unknown'}`)
        console.log(`📈 Answered Questions: ${data.processing_details.answeredQuestions || 0}`)
        console.log(`📉 Blank Questions: ${data.processing_details.blankQuestions || 0}`)
        console.log(`🎯 Average Confidence: ${((data.processing_details.averageConfidence || 0) * 100).toFixed(1)}%`)
        
        if (data.processing_details.hybridAnalysis) {
          console.log(`🔄 Hybrid Analysis: ✅`)
        }
        
        if (data.processing_details.comparison) {
          const comp = data.processing_details.comparison
          console.log(`📊 Comparison with Traditional:`)
          console.log(`   Agreement Rate: ${(comp.agreement_rate * 100).toFixed(1)}%`)
          console.log(`   Matches: ${comp.matches}`)
          console.log(`   Differences: ${comp.differences_count}`)
          console.log(`   Recommendation: ${comp.recommendation}`)
        }
      }
      
      if (data.processing_details && data.processing_details.aiInsights) {
        const insights = data.processing_details.aiInsights
        console.log(`💡 AI Insights:`)
        console.log(`   Total Answered: ${insights.total_answered || 0}`)
        console.log(`   Blank Answers: ${insights.blank_answers || 0}`)
        console.log(`   Low Confidence Count: ${insights.low_confidence_count || 0}`)
        
        if (insights.processing_notes && insights.processing_notes.length > 0) {
          console.log(`📝 Processing Notes:`)
          insights.processing_notes.forEach((note, index) => {
            console.log(`   ${index + 1}. ${note}`)
          })
        }
      }
      
      if (data.processing_details && data.processing_details.recommendations) {
        console.log(`💡 AI Recommendations:`)
        data.processing_details.recommendations.forEach((rec, index) => {
          console.log(`   ${index + 1}. ${rec}`)
        })
      }
      
      // Show first 10 answers
      if (data.extracted_answers && data.extracted_answers.length > 0) {
        console.log(`📋 First 10 Answers:`)
        for (let i = 0; i < Math.min(10, data.extracted_answers.length); i++) {
          const confidence = data.processing_details && data.processing_details.confidenceScores 
            ? data.processing_details.confidenceScores[i] 
            : 0
          console.log(`   Q${i+1}: ${data.extracted_answers[i]} (confidence: ${(confidence * 100).toFixed(1)}%)`)
        }
      }
      
      return true
    } else {
      throw new Error(result.error || 'GROQ AI processing failed')
    }
    
  } catch (error) {
    console.error('❌ GROQ AI processing test failed:', error.message)
    return false
  }
}

async function testHybridAIProcessing() {
  console.log('\n🔄 Testing Hybrid AI processing...')
  
  try {
    if (!fs.existsSync(TEST_IMAGE)) {
      console.error(`❌ Test image not found: ${TEST_IMAGE}`)
      return false
    }
    
    const formData = new FormData()
    formData.append('image', fs.createReadStream(TEST_IMAGE))
    formData.append('answerKey', JSON.stringify(Array(40).fill('A')))
    formData.append('scoring', JSON.stringify({ correct: 1, wrong: 0, blank: 0 }))
    
    const startTime = Date.now()
    
    const response = await fetch(`${PYTHON_OMR_URL}/api/omr/process_hybrid_ai`, {
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
      
      console.log('✅ Hybrid AI processing completed')
      console.log(`⏱️ Processing Time: ${(processingTime / 1000).toFixed(2)}s`)
      console.log(`🎯 Processing Method: ${result.processing_method}`)
      console.log(`🔄 Hybrid Analysis: ${data.hybrid_analysis ? '✅' : '❌'}`)
      console.log(`🔙 Traditional Backup: ${data.traditional_backup ? '✅' : '❌'}`)
      
      if (data.comparison && data.comparison.comparison_available) {
        const comp = data.comparison
        console.log(`📊 AI vs Traditional Comparison:`)
        console.log(`   Agreement Rate: ${(comp.agreement_rate * 100).toFixed(1)}%`)
        console.log(`   Matches: ${comp.matches}`)
        console.log(`   Differences: ${comp.differences_count}`)
        console.log(`   Recommendation: ${comp.recommendation}`)
        
        if (comp.differences && comp.differences.length > 0) {
          console.log(`🔍 Sample Differences:`)
          comp.differences.slice(0, 5).forEach(diff => {
            console.log(`   Q${diff.question}: AI=${diff.ai_answer}, Traditional=${diff.traditional_answer}`)
          })
        }
      }
      
      return true
    } else {
      throw new Error(result.error || 'Hybrid AI processing failed')
    }
    
  } catch (error) {
    console.error('❌ Hybrid AI processing test failed:', error.message)
    return false
  }
}

async function runAllTests() {
  console.log('\n🧪 Running GROQ AI OMR test suite...\n')
  
  const tests = [
    { name: 'AI Status', fn: testGroqAIStatus },
    { name: 'GROQ AI Processing', fn: testGroqAIProcessing },
    { name: 'Hybrid AI Processing', fn: testHybridAIProcessing }
  ]
  
  const results = []
  const startTime = Date.now()
  
  for (const test of tests) {
    console.log(`--- TEST: ${test.name.toUpperCase()} ---\n`)
    
    const testStartTime = Date.now()
    const success = await test.fn()
    const testTime = Date.now() - testStartTime
    
    results.push({
      name: test.name,
      success,
      time: testTime
    })
    
    console.log(`${success ? '✅' : '❌'} ${test.name} ${success ? 'PASSED' : 'FAILED'} (${testTime}ms)`)
  }
  
  const totalTime = Date.now() - startTime
  const passedTests = results.filter(r => r.success).length
  const successRate = (passedTests / results.length * 100).toFixed(1)
  
  console.log('\n=== GROQ AI OMR TEST SUMMARY ===')
  console.log(`Tests Passed: ${passedTests}/${results.length}`)
  console.log(`Success Rate: ${successRate}%`)
  console.log(`Total Time: ${totalTime}ms`)
  
  console.log('\nDetailed Results:')
  results.forEach(result => {
    console.log(`  ${result.success ? '✅' : '❌'} ${result.name} (${result.time}ms)`)
  })
  
  if (passedTests === results.length) {
    console.log('\n🎉 ALL GROQ AI TESTS PASSED!')
    console.log('🤖 GROQ AI OMR System is fully operational.')
    process.exit(0)
  } else {
    console.log('\n⚠️ Some GROQ AI tests failed.')
    console.log('🔧 Please check the GROQ API configuration and server status.')
    process.exit(1)
  }
}

// Run tests
runAllTests().catch(error => {
  console.error('❌ Test suite failed:', error)
  process.exit(1)
})