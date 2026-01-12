#!/usr/bin/env node

const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

async function testImprovedLayoutAPI() {
    console.log('🚀 Testing Improved Layout OMR API...\n');
    
    const serverUrl = 'http://localhost:5000';
    const imagePath = path.join(__dirname, 'test_image_40_questions.jpg');
    
    // Check if image exists
    if (!fs.existsSync(imagePath)) {
        console.error('❌ Test image not found:', imagePath);
        return false;
    }
    
    try {
        // Test server status first
        console.log('📊 Checking server status...');
        const statusResponse = await axios.get(`${serverUrl}/api/omr/status`);
        console.log('✅ Server is running');
        console.log('Status response:', JSON.stringify(statusResponse.data, null, 2));
        
        if (statusResponse.data.engines && statusResponse.data.engines.improved_layout !== undefined) {
            console.log('Improved Layout Available:', statusResponse.data.engines.improved_layout);
        } else {
            console.log('⚠️ Improved Layout status not found in response, but continuing...');
        }
        
        // Prepare form data
        const form = new FormData();
        form.append('image', fs.createReadStream(imagePath));
        form.append('examData', JSON.stringify({
            total_questions: 40,
            options_per_question: 5
        }));
        
        // Send request to improved layout endpoint
        console.log('\n🔍 Processing OMR with Improved Layout Processor...');
        const response = await axios.post(`${serverUrl}/api/omr/process_improved_layout`, form, {
            headers: {
                ...form.getHeaders(),
            },
            timeout: 30000 // 30 seconds timeout
        });
        
        if (response.data.success) {
            console.log('✅ OMR processing successful!');
            console.log('\n📊 Results:');
            console.log(`Total Questions: ${response.data.data.total_questions}`);
            console.log(`Columns Found: ${response.data.data.columns}`);
            console.log(`Processing Time: ${response.data.data.processing_time?.toFixed(2)}s`);
            
            const answeredQuestions = Object.values(response.data.data.answers).filter(a => a !== null).length;
            console.log(`Answers Found: ${answeredQuestions}/${response.data.data.total_questions}`);
            
            console.log('\n📝 Answers:');
            for (const [questionNum, answer] of Object.entries(response.data.data.answers)) {
                const confidence = response.data.data.confidence_scores[questionNum];
                if (answer) {
                    console.log(`Q${questionNum}: ${answer} (${confidence.toFixed(1)}%)`);
                }
            }
            
            console.log('\n🔧 Debug Info:');
            console.log(response.data.data.debug_info);
            
            console.log('\n🎯 Features Used:');
            response.data.features.forEach(feature => {
                console.log(`  • ${feature}`);
            });
            
            return true;
        } else {
            console.error('❌ OMR processing failed:', response.data.error);
            return false;
        }
        
    } catch (error) {
        if (error.code === 'ECONNREFUSED') {
            console.error('❌ Cannot connect to server. Make sure the Python server is running on port 5000');
        } else if (error.response) {
            console.error('❌ Server error:', error.response.data);
        } else {
            console.error('❌ Request error:', error.message);
        }
        return false;
    }
}

// Run the test
testImprovedLayoutAPI()
    .then((success) => {
        if (success) {
            console.log('\n🎉 Improved Layout API test completed successfully!');
            process.exit(0);
        } else {
            console.log('\n💥 Improved Layout API test failed!');
            process.exit(1);
        }
    })
    .catch((error) => {
        console.error('\n💥 Test failed with error:', error);
        process.exit(1);
    });