#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

async function testImprovedLayoutProcessor() {
    console.log('🚀 Testing Improved Layout OMR Processor...\n');
    
    const pythonScript = path.join(__dirname, 'python_omr_checker', 'improved_layout_processor.py');
    
    return new Promise((resolve, reject) => {
        const pythonProcess = spawn('python', [pythonScript], {
            cwd: __dirname,
            stdio: ['pipe', 'pipe', 'pipe']
        });
        
        let stdout = '';
        let stderr = '';
        
        pythonProcess.stdout.on('data', (data) => {
            stdout += data.toString();
        });
        
        pythonProcess.stderr.on('data', (data) => {
            stderr += data.toString();
        });
        
        pythonProcess.on('close', (code) => {
            console.log('📊 Python Output:');
            console.log(stdout);
            
            if (stderr) {
                console.log('⚠️ Python Errors:');
                console.log(stderr);
            }
            
            if (code === 0) {
                console.log('✅ Improved Layout Processor test completed successfully!');
                resolve(true);
            } else {
                console.log(`❌ Improved Layout Processor test failed with code ${code}`);
                reject(new Error(`Process exited with code ${code}`));
            }
        });
        
        pythonProcess.on('error', (error) => {
            console.error('❌ Failed to start Python process:', error);
            reject(error);
        });
    });
}

// Run the test
testImprovedLayoutProcessor()
    .then(() => {
        console.log('\n🎉 All tests completed!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Test failed:', error);
        process.exit(1);
    });