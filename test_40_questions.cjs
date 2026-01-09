const FormData = require('form-data');
const fs = require('fs');
const http = require('http');

async function test40Questions() {
  try {
    console.log('🧪 40 savollik OMR test...');
    
    // 40 ta savollik javob kaliti
    const answerKey = [
      'A', 'BLANK', 'B', 'BLANK', 'C', 'BLANK', 'D', 'BLANK', 'E', 'BLANK',
      'A', 'BLANK', 'B', 'BLANK', 'C', 'BLANK', 'D', 'BLANK', 'E', 'BLANK',
      'A', 'BLANK', 'B', 'BLANK', 'C', 'BLANK', 'D', 'BLANK', 'E', 'BLANK',
      'BLANK', 'BLANK', 'BLANK', 'BLANK', 'BLANK', 'BLANK', 'BLANK', 'BLANK', 'BLANK', 'BLANK'
    ];
    
    // Test rasmini o'qish
    const imageBuffer = fs.readFileSync('test_image_40_questions.jpg');
    
    // Form data yaratish
    const form = new FormData();
    form.append('image', imageBuffer, {
      filename: 'test_image_40_questions.jpg',
      contentType: 'image/jpeg'
    });
    
    const scoring = { correct: 1, wrong: 0, blank: 0 };
    
    form.append('answerKey', JSON.stringify(answerKey));
    form.append('scoring', JSON.stringify(scoring));
    // examId o'rniga to'g'ridan-to'g'ri examData yuboramiz
    // form.append('examId', 'test-40-questions');
    
    // Exam data qo'shish
    const examData = JSON.parse(fs.readFileSync('test_exam_40_questions.json', 'utf8'));
    form.append('examData', JSON.stringify(examData));
    form.append('debug', 'true');
    
    console.log('📤 So\'rov yuborilmoqda...');
    console.log('Javob kaliti uzunligi:', answerKey.length);
    console.log('Belgilangan javoblar:', answerKey.filter(a => a !== 'BLANK').length);
    
    // So'rov yuborish
    const options = {
      hostname: 'localhost',
      port: 10000,
      path: '/api/omr/process',
      method: 'POST',
      headers: form.getHeaders()
    };
    
    const req = http.request(options, (res) => {
      console.log('📥 Javob holati:', res.statusCode);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log('📥 Javob uzunligi:', data.length, 'bytes');
        
        if (res.statusCode === 200) {
          console.log('✅ So\'rov muvaffaqiyatli');
          try {
            const result = JSON.parse(data);
            const extractedAnswers = result.data?.extractedAnswers || [];
            const confidence = result.data?.confidence || 0;
            const processingMethod = result.data?.processingDetails?.processingMethod || 'Unknown';
            
            console.log('🎯 Aniqlangan javoblar:', extractedAnswers.length);
            console.log('📊 Ishonch darajasi:', Math.round(confidence * 100) + '%');
            console.log('🔧 Qayta ishlash usuli:', processingMethod);
            
            // Natijalarni tahlil qilish
            const detectedAnswers = extractedAnswers.filter(a => a !== 'BLANK').length;
            const expectedAnswers = answerKey.filter(a => a !== 'BLANK').length;
            
            console.log('\\n📈 NATIJALAR TAHLILI:');
            console.log('   Kutilgan javoblar:', expectedAnswers);
            console.log('   Aniqlangan javoblar:', detectedAnswers);
            console.log('   Aniqlik:', detectedAnswers === expectedAnswers ? '✅ TO\'G\'RI' : '❌ NOTO\'G\'RI');
            
            // Birinchi 10 ta savolni ko'rsatish
            console.log('\\n🔍 BIRINCHI 10 TA SAVOL:');
            for (let i = 0; i < Math.min(10, extractedAnswers.length); i++) {
              const expected = answerKey[i];
              const detected = extractedAnswers[i];
              const status = expected === detected ? '✅' : '❌';
              console.log(`   Q${i+1}: Kutilgan=${expected}, Aniqlangan=${detected} ${status}`);
            }
            
          } catch (e) {
            console.log('⚠️  JSON javobni tahlil qilib bo\'lmadi');
            console.log('Ham javob:', data.substring(0, 500) + '...');
          }
        } else {
          console.log('❌ So\'rov muvaffaqiyatsiz');
          console.log('Xato:', data);
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('🚨 So\'rov xatosi:', error);
    });
    
    // Form data yuborish
    form.pipe(req);
    
  } catch (error) {
    console.error('🚨 Test xatosi:', error);
  }
}

test40Questions();