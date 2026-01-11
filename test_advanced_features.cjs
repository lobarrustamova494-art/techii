#!/usr/bin/env node
/**
 * Advanced Features Test Suite for EvalBee Professional OMR System
 * Tests all advanced features including quality analysis, batch processing, and analytics
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

console.log('=== EVALBEE ADVANCED FEATURES TEST SUITE ===')
console.log(`Python OMR URL: ${PYTHON_OMR_URL}`)
console.log(`Test image: ${TEST_IMAGE}`)

async function testServerStatus() {
  console.log('\n🔍 Testing server status and feature availability...')
  
  try {
    const response = await fetch(`${PYTHON_OMR_URL}/api/omr/status`)
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const result = await response.json()
    
    if (result.success) {
      console.log('✅ Server is running')
      console.log(`📊 Engines available:`)
      
      const engines = result.data.engines
      for (const [engine, available] of Object.entries(engines)) {
        console.log(`   ${engine}: ${available ? '✅' : '❌'}`)
      }
      
      console.log(`🚀 Advanced features:`)
      const features = result.data.advanced_features
      for (const [feature, available] of Object.entries(features)) {
        console.log(`   ${feature}: ${available ? '✅' : '❌'}`)
      }
      
      return result.data.advanced_features.available
    } else {
      throw new Error('Server status check failed')
    }
    
  } catch (error) {
    console.error('❌ Server status test failed:', error.message)
    return false
  }
}

async function testQualityAnalysis() {
  console.log('\n🔍 Testing real-time quality analysis...')
  
  try {
    if (!fs.existsSync(TEST_IMAGE)) {
      console.error(`❌ Test image not found: ${TEST_IMAGE}`)
      return false
    }
    
    const formData = new FormData()
    formData.append('image', fs.createReadStream(TEST_IMAGE))
    
    const response = await fetch(`${PYTHON_OMR_URL}/api/quality/analyze`, {
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
      const analysis = result.quality_analysis
      
      console.log('✅ Quality analysis completed')
      console.log(`📊 Overall Score: ${analysis.overall_score}%`)
      console.log(`🎯 Quality Level: ${analysis.quality_level}`)
      console.log(`✅ Ready for Processing: ${analysis.is_ready}`)
      
      console.log(`📈 Detailed Scores:`)
      for (const [metric, score] of Object.entries(analysis.scores)) {
        console.log(`   ${metric}: ${score}%`)
      }
      
      if (analysis.recommendations.length > 0) {
        console.log(`💡 Recommendations:`)
        analysis.recommendations.forEach((rec, index) => {
          console.log(`   ${index + 1}. ${rec}`)
        })
      }
      
      if (analysis.warnings.length > 0) {
        console.log(`⚠️ Warnings:`)
        analysis.warnings.forEach((warning, index) => {
          console.log(`   ${index + 1}. ${warning}`)
        })
      }
      
      return true
    } else {
      throw new Error(result.error || 'Quality analysis failed')
    }
    
  } catch (error) {
    console.error('❌ Quality analysis test failed:', error.message)
    return false
  }
}

async function testProfessionalEngine() {
  console.log('\n🎯 Testing EvalBee Professional Multi-Pass Engine...')
  
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
    
    const response = await fetch(`${PYTHON_OMR_URL}/api/omr/process_professional`, {
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
      
      console.log('✅ Professional engine processing completed')
      console.log(`⏱️ Processing Time: ${(processingTime / 1000).toFixed(2)}s`)
      console.log(`🎯 Overall Confidence: ${(data.overall_confidence * 100).toFixed(1)}%`)
      console.log(`📊 Questions Processed: ${data.question_results?.length || 0}`)
      
      if (data.performance_metrics) {
        const perf = data.performance_metrics
        console.log(`📈 Performance Metrics:`)
        console.log(`   High Confidence: ${perf.high_confidence_answers}`)
        console.log(`   Medium Confidence: ${perf.medium_confidence_answers}`)
        console.log(`   Low Confidence: ${perf.low_confidence_answers}`)
        console.log(`   Success Rate: ${(perf.processing_success_rate * 100).toFixed(1)}%`)
      }
      
      if (data.system_recommendations && data.system_recommendations.length > 0) {
        console.log(`💡 System Recommendations:`)
        data.system_recommendations.forEach((rec, index) => {
          console.log(`   ${index + 1}. ${rec}`)
        })
      }
      
      return true
    } else {
      throw new Error(result.error || 'Professional engine processing failed')
    }
    
  } catch (error) {
    console.error('❌ Professional engine test failed:', error.message)
    return false
  }
}

async function testAnalytics() {
  console.log('\n📊 Testing analytics engine...')
  
  try {
    // Test performance metrics
    const perfResponse = await fetch(`${PYTHON_OMR_URL}/api/analytics/performance`)
    
    if (!perfResponse.ok) {
      throw new Error(`Performance metrics HTTP ${perfResponse.status}`)
    }
    
    const perfResult = await perfResponse.json()
    
    if (perfResult.success) {
      const metrics = perfResult.performance_metrics
      
      console.log('✅ Performance metrics retrieved')
      console.log(`📊 Total Processed: ${metrics.total_processed || 0}`)
      console.log(`🎯 Average Confidence: ${((metrics.average_confidence || 0) * 100).toFixed(1)}%`)
      console.log(`⏱️ Average Processing Time: ${(metrics.average_processing_time || 0).toFixed(2)}s`)
      
      if (metrics.method_distribution) {
        console.log(`🔧 Processing Methods:`)
        for (const [method, count] of Object.entries(metrics.method_distribution)) {
          console.log(`   ${method}: ${count}`)
        }
      }
    }
    
    // Test analytics report
    const reportResponse = await fetch(`${PYTHON_OMR_URL}/api/analytics/report?period_days=7`)
    
    if (!reportResponse.ok) {
      throw new Error(`Analytics report HTTP ${reportResponse.status}`)
    }
    
    const reportResult = await reportResponse.json()
    
    if (reportResult.success) {
      const report = reportResult.report
      
      console.log('✅ Analytics report generated')
      console.log(`📅 Period: ${report.period}`)
      console.log(`📊 Total Processed: ${report.total_processed}`)
      console.log(`🎯 Success Rate: ${(report.success_rate * 100).toFixed(1)}%`)
      
      if (report.common_errors && report.common_errors.length > 0) {
        console.log(`⚠️ Common Errors:`)
        report.common_errors.slice(0, 3).forEach(([error, count]) => {
          console.log(`   ${error}: ${count}`)
        })
      }
    }
    
    return true
    
  } catch (error) {
    console.error('❌ Analytics test failed:', error.message)
    return false
  }
}

async function testHealthCheck() {
  console.log('\n🏥 Testing health check endpoint...')
  
  try {
    const response = await fetch(`${PYTHON_OMR_URL}/health`)
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const result = await response.json()
    
    console.log('✅ Health check passed')
    console.log(`📊 Service: ${result.service}`)
    console.log(`🔢 Version: ${result.version}`)
    console.log(`⏰ Timestamp: ${new Date(result.timestamp * 1000).toLocaleString()}`)
    
    return true
    
  } catch (error) {
    console.error('❌ Health check failed:', error.message)
    return false
  }
}

async function runAdvancedTestSuite() {
  console.log('\n🧪 Running comprehensive advanced features test suite...')
  
  const tests = [
    { name: 'Server Status', fn: testServerStatus },
    { name: 'Health Check', fn: testHealthCheck },
    { name: 'Quality Analysis', fn: testQualityAnalysis },
    { name: 'Professional Engine', fn: testProfessionalEngine },
    { name: 'Analytics Engine', fn: testAnalytics }
  ]
  
  let passedTests = 0
  let totalTests = tests.length
  const results = []
  
  for (const test of tests) {
    console.log(`\n--- TEST: ${test.name.toUpperCase()} ---`)
    
    try {
      const startTime = Date.now()
      const result = await test.fn()
      const duration = Date.now() - startTime
      
      if (result) {
        console.log(`✅ ${test.name} PASSED (${duration}ms)`)
        passedTests++
        results.push({ name: test.name, status: 'PASSED', duration })
      } else {
        console.log(`❌ ${test.name} FAILED (${duration}ms)`)
        results.push({ name: test.name, status: 'FAILED', duration })
      }
    } catch (error) {
      console.log(`❌ ${test.name} ERROR: ${error.message}`)
      results.push({ name: test.name, status: 'ERROR', error: error.message })
    }
  }
  
  // Final results
  console.log('\n=== ADVANCED FEATURES TEST SUMMARY ===')
  console.log(`Tests Passed: ${passedTests}/${totalTests}`)
  console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`)
  
  console.log('\nDetailed Results:')
  results.forEach(result => {
    const status = result.status === 'PASSED' ? '✅' : '❌'
    const duration = result.duration ? ` (${result.duration}ms)` : ''
    console.log(`  ${status} ${result.name}${duration}`)
    if (result.error) {
      console.log(`      Error: ${result.error}`)
    }
  })
  
  if (passedTests === totalTests) {
    console.log('\n🎉 ALL ADVANCED FEATURES TESTS PASSED!')
    console.log('🚀 EvalBee Professional OMR System is fully operational with all advanced features.')
  } else {
    console.log('\n⚠️ Some advanced features tests failed.')
    console.log('🔧 Please check the implementation and server status.')
  }
  
  return passedTests === totalTests
}

// Run the test suite
runAdvancedTestSuite()
  .then(success => {
    process.exit(success ? 0 : 1)
  })
  .catch(error => {
    console.error('❌ Test suite failed:', error)
    process.exit(1)
  })