#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const fetch = require('node-fetch');

// Configuration
const PYTHON_OMR_URL = 'http://localhost:5000';
const TEST_IMAGE = 'test_image_40_questions.jpg';

console.log('=== OMR SHEET ANALYZER TEST SUITE ===');
console.log(`Python OMR URL: ${PYTHON_OMR_URL}`);
console.log(`Test image: ${TEST_IMAGE}`);
console.log('');

async function testOMRSheetAnalyzer() {
    console.log('🧪 Running OMR Sheet Analyzer test suite...');
    console.log('');

    let testsRun = 0;
    let testsPassed = 0;
    const startTime = Date.now();

    // Test 1: Health Check
    console.log('--- TEST: HEALTH CHECK ---');
    console.log('');
    try {
        console.log('🏥 Testing health check...');
        const healthResponse = await fetch(`${PYTHON_OMR_URL}/health`);
        
        if (healthResponse.ok) {
            const healthData = await healthResponse.json();
            console.log('✅ Health check passed');
            console.log(`📊 Service: ${healthData.service}`);
            console.log(`🔢 Version: ${healthData.version || 'Unknown'}`);
            console.log(`⏰ Timestamp: ${new Date(healthData.timestamp * 1000).toLocaleString()}`);
            testsPassed++;
        } else {
            console.log(`❌ Health check failed: ${healthResponse.status}`);
        }
    } catch (error) {
        console.log(`❌ Health check error: ${error.message}`);
    }
    testsRun++;
    console.log(`✅ Health Check ${testsPassed === testsRun ? 'PASSED' : 'FAILED'} (${Date.now() - startTime}ms)`);
    console.log('');

    // Test 2: OMR Sheet Analysis
    console.log('--- TEST: OMR SHEET ANALYSIS ---');
    console.log('');
    
    if (!fs.existsSync(TEST_IMAGE)) {
        console.log(`❌ Test image not found: ${TEST_IMAGE}`);
        testsRun++;
        console.log('');
        return { testsRun, testsPassed };
    }

    try {
        console.log('🔍 Testing OMR Sheet Analysis...');
        
        // Create form data
        const formData = new FormData();
        formData.append('image', fs.createReadStream(TEST_IMAGE));
        formData.append('answerKey', JSON.stringify(['A', 'B', 'C', 'D'].concat(Array(36).fill('A'))));
        
        const analysisResponse = await fetch(`${PYTHON_OMR_URL}/api/omr/analyze_sheet`, {
            method: 'POST',
            body: formData,
            headers: formData.getHeaders()
        });

        if (analysisResponse.ok) {
            const analysisData = await analysisResponse.json();
            
            if (analysisData.success) {
                console.log('✅ OMR Sheet analysis completed');
                console.log(`⏱️ Processing Time: ${analysisData.data.processing_time.toFixed(2)}s`);
                console.log(`🎯 Overall Confidence: ${(analysisData.data.confidence * 100).toFixed(1)}%`);
                console.log(`📊 Processing Method: ${analysisData.data.processing_method}`);
                
                // Analysis details
                const details = analysisData.data.analysis_details;
                console.log(`🎯 Anchors Found: ${details.anchors_found}`);
                console.log(`⚪ Bubbles Detected: ${details.bubbles_detected}`);
                console.log(`📈 Image Quality: ${(details.image_quality * 100).toFixed(1)}%`);
                
                // Quality metrics
                const quality = analysisData.data.quality_metrics;
                console.log(`📊 Quality Metrics:`);
                console.log(`   Sharpness: ${quality.sharpness.toFixed(2)}`);
                console.log(`   Contrast: ${quality.contrast.toFixed(2)}`);
                console.log(`   Brightness: ${quality.brightness.toFixed(2)}`);
                console.log(`   Noise Level: ${quality.noise_level.toFixed(2)}`);
                console.log(`   Alignment Score: ${quality.alignment_score.toFixed(2)}`);
                
                // First 10 answers
                const answers = analysisData.data.detected_answers;
                console.log(`📋 First 10 Answers:`);
                for (let i = 0; i < Math.min(10, answers.length); i++) {
                    console.log(`   Q${i+1}: ${answers[i]}`);
                }
                
                // Anchor analysis
                const anchors = analysisData.data.anchor_analysis;
                if (anchors.length > 0) {
                    console.log(`🎯 First 5 Anchors:`);
                    for (let i = 0; i < Math.min(5, anchors.length); i++) {
                        const anchor = anchors[i];
                        console.log(`   Q${anchor.question_number}: "${anchor.text_detected}" at (${anchor.anchor_position.x}, ${anchor.anchor_position.y}) - ${(anchor.confidence * 100).toFixed(1)}%`);
                    }
                }
                
                // Recommendations
                if (analysisData.data.recommendations.length > 0) {
                    console.log(`💡 Recommendations:`);
                    analysisData.data.recommendations.slice(0, 3).forEach((rec, index) => {
                        console.log(`   ${index + 1}. ${rec}`);
                    });
                }
                
                // Error flags
                if (analysisData.data.error_flags.length > 0) {
                    console.log(`⚠️ Error Flags: ${analysisData.data.error_flags.join(', ')}`);
                }
                
                testsPassed++;
            } else {
                console.log(`❌ Analysis failed: ${analysisData.message || 'Unknown error'}`);
            }
        } else {
            const errorText = await analysisResponse.text();
            console.log(`❌ Analysis request failed: ${analysisResponse.status} - ${errorText}`);
        }
    } catch (error) {
        console.log(`❌ Analysis error: ${error.message}`);
    }
    testsRun++;
    console.log(`✅ OMR Sheet Analysis ${testsPassed === testsRun ? 'PASSED' : 'FAILED'} (${Date.now() - startTime}ms)`);
    console.log('');

    return { testsRun, testsPassed };
}

async function main() {
    try {
        const { testsRun, testsPassed } = await testOMRSheetAnalyzer();
        
        console.log('=== OMR SHEET ANALYZER TEST SUMMARY ===');
        console.log(`Tests Passed: ${testsPassed}/${testsRun}`);
        console.log(`Success Rate: ${((testsPassed / testsRun) * 100).toFixed(1)}%`);
        console.log('');

        if (testsPassed === testsRun) {
            console.log('🎉 ALL OMR SHEET ANALYZER TESTS PASSED!');
            console.log('🔍 OMR Sheet Analyzer with Langor + Piksel algorithm is fully operational.');
        } else {
            console.log('❌ Some tests failed. Please check the implementation.');
        }
        
        console.log('');
        process.exit(testsPassed === testsRun ? 0 : 1);
        
    } catch (error) {
        console.error('❌ Test suite failed:', error.message);
        process.exit(1);
    }
}

main();