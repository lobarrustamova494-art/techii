#!/usr/bin/env node

/**
 * EvalBee OMR Engine Test Script
 * Tests the professional-grade EvalBee OMR processing system
 */

const fs = require('fs');
const FormData = require('form-data');
const axios = require('axios');

// Configuration
const PYTHON_SERVER_URL = 'http://localhost:5000';
const TEST_IMAGE_PATH = './test_image_40_questions.jpg';

// Test answer key (40 questions)
const ANSWER_KEY = [
    'A', 'B', 'C', 'D', 'A', 'B', 'C', 'D', 'A', 'B',
    'C', 'D', 'A', 'B', 'C', 'D', 'A', 'B', 'C', 'D',
    'A', 'B', 'C', 'D', 'A', 'B', 'C', 'D', 'A', 'B',
    'C', 'D', 'A', 'B', 'C', 'D', 'A', 'B', 'C', 'D'
];

const SCORING = {
    correct: 1,
    wrong: 0,
    blank: 0
};

async function testEvalBeeEngine() {
    console.log('🚀 EvalBee OMR Engine Test Started');
    console.log('=====================================');
    
    try {
        // Check if test image exists
        if (!fs.existsSync(TEST_IMAGE_PATH)) {
            throw new Error(`Test image not found: ${TEST_IMAGE_PATH}`);
        }
        
        console.log(`📸 Using test image: ${TEST_IMAGE_PATH}`);
        console.log(`🎯 Answer key: ${ANSWER_KEY.length} questions`);
        console.log(`⚙️  EvalBee Professional Engine V2 Mode`);
        
        // Prepare form data
        const formData = new FormData();
        formData.append('image', fs.createReadStream(TEST_IMAGE_PATH));
        formData.append('answerKey', JSON.stringify(ANSWER_KEY));
        formData.append('scoring', JSON.stringify(SCORING));
        
        // EvalBee V2 engine parameters
        formData.append('evalbee', 'true');           // Use EvalBee V2 engine
        formData.append('ultra', 'false');            // Don't use ultra (EvalBee V2 uses it internally)
        formData.append('universal', 'true');         // Universal coordinates
        formData.append('optimized', 'false');        // Don't use optimized
        formData.append('perfect', 'false');          // Don't use perfect
        formData.append('debug', 'true');             // Enable debug mode
        
        // Advanced EvalBee parameters
        formData.append('quality_analysis', 'true');  // Quality metrics
        formData.append('advanced_detection', 'true'); // Advanced bubble detection
        formData.append('processing_mode', 'high_accuracy'); // High accuracy mode
        
        console.log('\n🔄 Processing with EvalBee V2 Engine...');
        const startTime = Date.now();
        
        // Send request to Python server
        const response = await axios.post(`${PYTHON_SERVER_URL}/api/omr/process`, formData, {
            headers: formData.getHeaders(),
            timeout: 30000
        });
        
        const processingTime = (Date.now() - startTime) / 1000;
        
        if (response.status !== 200) {
            throw new Error(`Server error: ${response.status} - ${response.statusText}`);
        }
        
        const result = response.data;
        
        console.log('\n✅ EvalBee Processing Completed!');
        console.log('=====================================');
        
        if (result.success) {
            const data = result.data;
            
            console.log(`📊 Processing Results:`);
            console.log(`   • Processing Time: ${processingTime.toFixed(2)}s`);
            console.log(`   • Engine: ${data.processing_details?.processing_method || 'EvalBee Engine'}`);
            console.log(`   • Questions Detected: ${data.extracted_answers?.length || 0}`);
            console.log(`   • Overall Confidence: ${(data.confidence * 100).toFixed(1)}%`);
            
            // EvalBee specific metrics
            if (data.processing_details) {
                const details = data.processing_details;
                
                console.log(`\n🎯 EvalBee Advanced Metrics:`);
                console.log(`   • Layout Type: ${details.layout_type || 'Unknown'}`);
                console.log(`   • Image Quality: ${(details.image_quality * 100).toFixed(1)}%`);
                console.log(`   • Processing Method: ${details.processing_method}`);
                
                if (details.error_flags && details.error_flags.length > 0) {
                    console.log(`   • Error Flags: ${details.error_flags.join(', ')}`);
                }
                
                if (details.recommendations && details.recommendations.length > 0) {
                    console.log(`   • Recommendations:`);
                    details.recommendations.forEach(rec => {
                        console.log(`     - ${rec}`);
                    });
                }
                
                if (details.quality_metrics) {
                    const qm = details.quality_metrics;
                    console.log(`\n📈 Quality Analysis:`);
                    console.log(`   • Sharpness: ${qm.sharpness?.toFixed(0) || 'N/A'}`);
                    console.log(`   • Contrast: ${qm.contrast_ratio?.toFixed(2) || 'N/A'}`);
                    console.log(`   • Brightness: ${qm.brightness?.toFixed(0) || 'N/A'}`);
                    console.log(`   • Noise Level: ${(qm.noise_level * 100)?.toFixed(1) || 'N/A'}%`);
                    console.log(`   • Skew Angle: ${qm.skew_angle?.toFixed(1) || 'N/A'}°`);
                }
            }
            
            // Show first 10 answers
            console.log(`\n📝 First 10 Extracted Answers:`);
            for (let i = 0; i < Math.min(10, data.extracted_answers?.length || 0); i++) {
                const answer = data.extracted_answers[i];
                const expected = ANSWER_KEY[i];
                const isCorrect = answer === expected;
                const status = isCorrect ? '✅' : '❌';
                
                console.log(`   Q${i + 1}: ${answer} (expected: ${expected}) ${status}`);
            }
            
            // Calculate accuracy
            let correctCount = 0;
            const totalQuestions = Math.min(data.extracted_answers?.length || 0, ANSWER_KEY.length);
            
            for (let i = 0; i < totalQuestions; i++) {
                if (data.extracted_answers[i] === ANSWER_KEY[i]) {
                    correctCount++;
                }
            }
            
            const accuracy = totalQuestions > 0 ? (correctCount / totalQuestions * 100) : 0;
            
            console.log(`\n🎯 EvalBee Engine Performance:`);
            console.log(`   • Questions Processed: ${totalQuestions}`);
            console.log(`   • Correct Answers: ${correctCount}`);
            console.log(`   • Accuracy: ${accuracy.toFixed(1)}%`);
            console.log(`   • Processing Speed: ${processingTime.toFixed(2)}s`);
            
            // Performance rating
            let rating = 'Unknown';
            if (accuracy >= 95) rating = '🏆 Excellent';
            else if (accuracy >= 90) rating = '🥇 Very Good';
            else if (accuracy >= 80) rating = '🥈 Good';
            else if (accuracy >= 70) rating = '🥉 Fair';
            else rating = '❌ Needs Improvement';
            
            console.log(`   • Performance Rating: ${rating}`);
            
        } else {
            console.error('❌ Processing failed:', result.message);
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack trace:', error.stack);
    }
    
    console.log('\n🏁 EvalBee Engine Test Completed');
}

// Run the test
if (require.main === module) {
    testEvalBeeEngine();
}

module.exports = { testEvalBeeEngine };