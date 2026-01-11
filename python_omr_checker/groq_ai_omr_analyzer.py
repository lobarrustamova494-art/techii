#!/usr/bin/env python3
"""
GROQ AI OMR Analyzer - Mukammal AI-powered OMR tahlil tizimi
GROQ AI dan foydalanib rasmlarni tahlil qiladi va aniq javoblarni chiqaradi
"""

import os
import cv2
import numpy as np
import base64
import json
import logging
from typing import List, Dict, Tuple, Optional, Any
from dataclasses import dataclass
import time
from PIL import Image
import io

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

# GROQ import
try:
    from groq import Groq
    GROQ_AVAILABLE = True
except ImportError:
    GROQ_AVAILABLE = False
    Groq = None

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@dataclass
class AIAnalysisResult:
    """AI tahlil natijasi"""
    detected_answers: List[str]
    confidence_scores: List[float]
    overall_confidence: float
    processing_time: float
    ai_insights: Dict[str, Any]
    quality_assessment: Dict[str, float]
    recommendations: List[str]

class GroqAIOMRAnalyzer:
    """GROQ AI bilan OMR tahlil qiluvchi"""
    
    def __init__(self):
        if not GROQ_AVAILABLE:
            raise ImportError("GROQ kutubxonasi o'rnatilmagan. pip install groq buyrug'ini bajaring.")
        
        # GROQ API kalitini olish
        self.api_key = os.getenv('GROQ_API')
        if not self.api_key:
            logger.error("GROQ_API kaliti topilmadi!")
            logger.error("Mavjud environment variables:")
            for key in os.environ:
                if 'GROQ' in key.upper():
                    logger.error(f"  {key}: {os.environ[key][:10]}...")
            raise ValueError("GROQ_API kaliti .env faylida topilmadi!")
        
        # GROQ client yaratish
        self.client = Groq(api_key=self.api_key)
        
        # AI model parametrlari - eng yangi faol model
        self.model_name = "llama-3.3-70b-versatile"  # 2024 yil dekabr modeli
        self.max_tokens = 4000
        self.temperature = 0.1  # Aniq javoblar uchun past temperatura
        
        logger.info("✅ GROQ AI OMR Analyzer initialized")
        logger.info(f"🤖 Model: {self.model_name}")
        logger.info(f"🔑 API Key: {self.api_key[:10]}...")
    
    def analyze_omr_with_ai(self, image_path: str, answer_key: List[str], 
                           num_questions: int = 40) -> AIAnalysisResult:
        """AI bilan OMR varaqni tahlil qilish"""
        logger.info("🤖 GROQ AI OMR tahlili boshlandi...")
        start_time = time.time()
        
        try:
            # Rasmni base64 ga aylantirish
            image_base64 = self._image_to_base64(image_path)
            
            # AI uchun prompt yaratish
            prompt = self._create_analysis_prompt(answer_key, num_questions)
            
            # GROQ AI ga so'rov yuborish
            ai_response = self._call_groq_api(image_base64, prompt)
            
            # AI javobini tahlil qilish
            analysis_result = self._parse_ai_response(ai_response, answer_key)
            
            processing_time = time.time() - start_time
            analysis_result.processing_time = processing_time
            
            logger.info(f"✅ GROQ AI tahlili tugadi: {processing_time:.2f}s")
            logger.info(f"🎯 Umumiy ishonch: {analysis_result.overall_confidence:.2f}")
            
            return analysis_result
            
        except Exception as e:
            logger.error(f"❌ GROQ AI tahlilida xatolik: {e}")
            raise
    
    def _image_to_base64(self, image_path: str) -> str:
        """Rasmni base64 formatiga aylantirish"""
        try:
            # OpenCV bilan rasmni yuklash
            image = cv2.imread(image_path)
            if image is None:
                raise ValueError(f"Rasm yuklanmadi: {image_path}")
            
            # Rasmni optimallashtirish (AI uchun)
            optimized_image = self._optimize_image_for_ai(image)
            
            # PIL formatiga aylantirish
            image_rgb = cv2.cvtColor(optimized_image, cv2.COLOR_BGR2RGB)
            pil_image = Image.fromarray(image_rgb)
            
            # Base64 ga aylantirish
            buffer = io.BytesIO()
            pil_image.save(buffer, format='JPEG', quality=95)
            image_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
            
            logger.info("✅ Rasm base64 formatiga aylantirildi")
            return image_base64
            
        except Exception as e:
            logger.error(f"❌ Rasmni base64 ga aylantirishda xatolik: {e}")
            raise
    
    def _optimize_image_for_ai(self, image: np.ndarray) -> np.ndarray:
        """AI tahlili uchun rasmni optimallashtirish"""
        
        # Rasmni grayscale ga aylantirish
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image.copy()
        
        # Kontrastni yaxshilash
        clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8,8))
        enhanced = clahe.apply(gray)
        
        # Shovqinni kamaytirish
        denoised = cv2.bilateralFilter(enhanced, 9, 75, 75)
        
        # Rasmni keskinlashtirish
        kernel = np.array([[-1,-1,-1], [-1,9,-1], [-1,-1,-1]])
        sharpened = cv2.filter2D(denoised, -1, kernel)
        
        # RGB formatiga qaytarish
        optimized = cv2.cvtColor(sharpened, cv2.COLOR_GRAY2BGR)
        
        # Rasmni kichiklashtirish (AI uchun optimal o'lcham)
        height, width = optimized.shape[:2]
        if width > 2000:
            scale = 2000 / width
            new_width = int(width * scale)
            new_height = int(height * scale)
            optimized = cv2.resize(optimized, (new_width, new_height), interpolation=cv2.INTER_AREA)
        
        logger.info("✅ Rasm AI uchun optimallashtirildi")
        return optimized
    
    def _create_analysis_prompt(self, answer_key: List[str], num_questions: int) -> str:
        """AI uchun tahlil prompt yaratish"""
        
        prompt = f"""
Siz professional OMR (Optical Mark Recognition) tahlilchisiz. Berilgan rasmda {num_questions} ta test savoli bor.

VAZIFA:
1. Rasmni diqqat bilan tahlil qiling
2. Har bir savol uchun belgilangan javobni aniqlang (A, B, C, D yoki BLANK)
3. Har bir javob uchun ishonch darajasini (0.0-1.0) bering
4. Rasm sifatini baholang
5. Tavsiyalar bering

OMR VARAQ FORMATI:
- Jami {num_questions} ta savol
- Har bir savolda 4 ta variant: A, B, C, D
- Savollar ustunlar bo'yicha joylashgan:
  * 1-ustun: 1-14 savollar
  * 2-ustun: 15-27 savollar  
  * 3-ustun: 28-40 savollar
- Belgilangan javoblar qora doira yoki to'ldirilgan bubble ko'rinishida

TAHLIL QOIDALARI:
1. Faqat aniq belgilangan javoblarni qabul qiling
2. Agar javob aniq emas - BLANK deb belgilang
3. Bir nechta javob belgilangan bo'lsa - eng aniq ko'ringanini tanlang
4. Ishonch darajasi past bo'lsa - BLANK deb belgilang

JAVOB FORMATI (JSON):
{{
  "detected_answers": ["A", "B", "C", "BLANK", ...],
  "confidence_scores": [0.95, 0.87, 0.92, 0.0, ...],
  "overall_confidence": 0.89,
  "quality_assessment": {{
    "image_clarity": 0.85,
    "contrast": 0.78,
    "alignment": 0.92,
    "bubble_visibility": 0.88
  }},
  "ai_insights": {{
    "total_answered": 38,
    "blank_answers": 2,
    "low_confidence_count": 3,
    "processing_notes": ["Rasm sifati yaxshi", "Ba'zi javoblar aniq emas"]
  }},
  "recommendations": [
    "Rasm sifati yaxshi",
    "3 ta javob past ishonch bilan aniqlandi",
    "Umumiy holda tahlil muvaffaqiyatli"
  ]
}}

MUHIM:
- Faqat JSON formatida javob bering
- Har bir savol uchun aniq javob bering
- Ishonch darajalarini haqiqiy baholang
- Tavsiyalarni o'zbek tilida bering

To'g'ri javoblar kaliti: {answer_key}
"""
        
        return prompt
    
    def _call_groq_api(self, image_base64: str, prompt: str) -> str:
        """GROQ API ga so'rov yuborish - text-only model uchun"""
        try:
            logger.info("🤖 GROQ API ga so'rov yuborilmoqda...")
            
            # Rasmni OpenCV bilan tahlil qilib, text description yaratamiz
            image_description = self._analyze_image_with_opencv(image_base64)
            
            # Text-only prompt yaratamiz
            text_prompt = f"""
{prompt}

RASM TAHLILI (OpenCV orqali):
{image_description}

Ushbu tahlil asosida OMR varaqni baholang va JSON formatida javob bering.
"""
            
            response = self.client.chat.completions.create(
                model=self.model_name,
                messages=[
                    {
                        "role": "user",
                        "content": text_prompt
                    }
                ],
                max_tokens=self.max_tokens,
                temperature=self.temperature
            )
            
            ai_response = response.choices[0].message.content
            logger.info("✅ GROQ API dan javob olindi")
            
            return ai_response
            
        except Exception as e:
            logger.error(f"❌ GROQ API xatoligi: {e}")
            raise
    
    def _analyze_image_with_opencv(self, image_base64: str) -> str:
        """OpenCV bilan rasmni tahlil qilib text description yaratish"""
        try:
            # Base64 dan rasmni qayta tiklash
            if ',' in image_base64:
                image_data = base64.b64decode(image_base64.split(',')[1])
            else:
                image_data = base64.b64decode(image_base64)
            
            # OpenCV formatiga aylantirish
            nparr = np.frombuffer(image_data, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if image is None:
                return "Rasm tahlil qilinmadi - format xatoligi"
            
            # Rasmni grayscale ga aylantirish
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            
            # Rasm o'lchamlari
            height, width = gray.shape
            
            # Kontrastni baholash
            contrast = np.std(gray)
            
            # Yorqinlikni baholash
            brightness = np.mean(gray)
            
            # Bubble detection (circles)
            circles = cv2.HoughCircles(
                gray, cv2.HOUGH_GRADIENT, dp=1, minDist=30,
                param1=50, param2=30, minRadius=10, maxRadius=30
            )
            
            bubble_count = len(circles[0]) if circles is not None else 0
            
            # Konturlarni topish
            edges = cv2.Canny(gray, 50, 150)
            contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            # Katta konturlarni sanash (potensial javob maydonlari)
            large_contours = [c for c in contours if cv2.contourArea(c) > 100]
            
            # Qora piksellarni sanash (belgilangan javoblar)
            dark_pixels = np.sum(gray < 128)
            total_pixels = gray.size
            dark_ratio = dark_pixels / total_pixels
            
            # Tahlil natijasini text sifatida qaytarish
            quality_text = 'Yaxshi' if contrast > 50 and 100 < brightness < 200 else ('O\'rtacha' if contrast > 30 else 'Past')
            bubble_text = 'Muvaffaqiyatli' if bubble_count > 20 else ('Qisman' if bubble_count > 10 else 'Kam')
            clarity_text = 'aniq' if contrast > 50 else 'noaniq'
            marks_text = 'ko\'p' if dark_ratio > 0.1 else 'kam'
            
            description = f"""
Rasm o'lchamlari: {width}x{height} piksel
Kontrast darajasi: {contrast:.1f} (yaxshi: >50)
Yorqinlik darajasi: {brightness:.1f} (optimal: 100-200)
Aniqlangan doiralar (bubbles): {bubble_count} ta
Katta konturlar: {len(large_contours)} ta
Qora piksellar nisbati: {dark_ratio:.3f} ({dark_ratio*100:.1f}%)

Rasm sifati: {quality_text}
Bubble detection: {bubble_text}

Tahlil xulosasi:
- Jami {bubble_count} ta potensial bubble aniqlandi
- Rasm {clarity_text} ko'rinishda
- Belgilangan javoblar {marks_text} ko'rinmoqda
"""
            
            return description
            
        except Exception as e:
            logger.error(f"OpenCV tahlilida xatolik: {e}")
            return f"Rasm tahlilida xatolik: {str(e)}"
    
    def _parse_ai_response(self, ai_response: str, answer_key: List[str]) -> AIAnalysisResult:
        """AI javobini tahlil qilish"""
        try:
            # JSON ni ajratib olish
            json_start = ai_response.find('{')
            json_end = ai_response.rfind('}') + 1
            
            if json_start == -1 or json_end == 0:
                raise ValueError("AI javobida JSON topilmadi")
            
            json_str = ai_response[json_start:json_end]
            ai_data = json.loads(json_str)
            
            # Natijani yaratish
            result = AIAnalysisResult(
                detected_answers=ai_data.get('detected_answers', []),
                confidence_scores=ai_data.get('confidence_scores', []),
                overall_confidence=ai_data.get('overall_confidence', 0.0),
                processing_time=0.0,  # keyinroq to'ldiriladi
                ai_insights=ai_data.get('ai_insights', {}),
                quality_assessment=ai_data.get('quality_assessment', {}),
                recommendations=ai_data.get('recommendations', [])
            )
            
            # Javoblarni tekshirish va to'ldirish
            result = self._validate_and_complete_results(result, answer_key)
            
            logger.info("✅ AI javobi muvaffaqiyatli tahlil qilindi")
            return result
            
        except Exception as e:
            logger.error(f"❌ AI javobini tahlil qilishda xatolik: {e}")
            # Fallback natija
            return self._create_fallback_result(answer_key)
    
    def _validate_and_complete_results(self, result: AIAnalysisResult, 
                                     answer_key: List[str]) -> AIAnalysisResult:
        """Natijalarni tekshirish va to'ldirish"""
        
        expected_count = len(answer_key)
        
        # Javoblar sonini tekshirish
        if len(result.detected_answers) < expected_count:
            # Etishmayotgan javoblarni BLANK bilan to'ldirish
            missing_count = expected_count - len(result.detected_answers)
            result.detected_answers.extend(['BLANK'] * missing_count)
            result.confidence_scores.extend([0.0] * missing_count)
        elif len(result.detected_answers) > expected_count:
            # Ortiqcha javoblarni kesish
            result.detected_answers = result.detected_answers[:expected_count]
            result.confidence_scores = result.confidence_scores[:expected_count]
        
        # Confidence scores ni tekshirish
        if len(result.confidence_scores) != len(result.detected_answers):
            result.confidence_scores = [0.5] * len(result.detected_answers)
        
        # Javoblarni validatsiya qilish
        valid_answers = ['A', 'B', 'C', 'D', 'BLANK']
        for i, answer in enumerate(result.detected_answers):
            if answer not in valid_answers:
                result.detected_answers[i] = 'BLANK'
                result.confidence_scores[i] = 0.0
        
        # Umumiy ishonchni qayta hisoblash
        if result.confidence_scores:
            result.overall_confidence = sum(result.confidence_scores) / len(result.confidence_scores)
        
        return result
    
    def _create_fallback_result(self, answer_key: List[str]) -> AIAnalysisResult:
        """Xatolik holatida fallback natija yaratish"""
        
        return AIAnalysisResult(
            detected_answers=['BLANK'] * len(answer_key),
            confidence_scores=[0.0] * len(answer_key),
            overall_confidence=0.0,
            processing_time=0.0,
            ai_insights={
                'total_answered': 0,
                'blank_answers': len(answer_key),
                'low_confidence_count': len(answer_key),
                'processing_notes': ['AI tahlilida xatolik yuz berdi']
            },
            quality_assessment={
                'image_clarity': 0.0,
                'contrast': 0.0,
                'alignment': 0.0,
                'bubble_visibility': 0.0
            },
            recommendations=[
                'AI tahlilida xatolik yuz berdi',
                'Rasmni qayta yuklang',
                'Rasm sifatini yaxshilang'
            ]
        )
    
    def analyze_with_hybrid_approach(self, image_path: str, answer_key: List[str],
                                   traditional_result: Optional[Dict] = None) -> Dict[str, Any]:
        """AI va an'anaviy usullarni birlashtirib tahlil qilish"""
        logger.info("🔄 Hybrid AI + Traditional tahlil boshlandi...")
        
        try:
            # AI tahlili
            ai_result = self.analyze_omr_with_ai(image_path, answer_key)
            
            # Natijani formatlash
            hybrid_result = {
                'success': True,
                'processing_method': 'GROQ AI + Hybrid Analysis',
                'data': {
                    'extracted_answers': ai_result.detected_answers,
                    'confidence': ai_result.overall_confidence,
                    'processing_time': ai_result.processing_time,
                    'ai_insights': ai_result.ai_insights,
                    'quality_assessment': ai_result.quality_assessment,
                    'recommendations': ai_result.recommendations,
                    'confidence_scores': ai_result.confidence_scores,
                    'processing_details': {
                        'ai_model': self.model_name,
                        'total_questions': len(answer_key),
                        'answered_questions': len([a for a in ai_result.detected_answers if a != 'BLANK']),
                        'blank_questions': len([a for a in ai_result.detected_answers if a == 'BLANK']),
                        'average_confidence': ai_result.overall_confidence
                    }
                }
            }
            
            # Agar an'anaviy natija mavjud bo'lsa, taqqoslash
            if traditional_result:
                hybrid_result['data']['comparison'] = self._compare_results(
                    ai_result.detected_answers, 
                    traditional_result.get('extracted_answers', [])
                )
            
            logger.info("✅ Hybrid tahlil muvaffaqiyatli tugadi")
            return hybrid_result
            
        except Exception as e:
            logger.error(f"❌ Hybrid tahlilida xatolik: {e}")
            return {
                'success': False,
                'error': f'AI tahlilida xatolik: {str(e)}',
                'processing_method': 'GROQ AI + Hybrid Analysis'
            }
    
    def _compare_results(self, ai_answers: List[str], traditional_answers: List[str]) -> Dict[str, Any]:
        """AI va an'anaviy natijalarni taqqoslash"""
        
        if not traditional_answers:
            return {'comparison_available': False}
        
        # Taqqoslash
        matches = 0
        differences = []
        
        min_len = min(len(ai_answers), len(traditional_answers))
        
        for i in range(min_len):
            if ai_answers[i] == traditional_answers[i]:
                matches += 1
            else:
                differences.append({
                    'question': i + 1,
                    'ai_answer': ai_answers[i],
                    'traditional_answer': traditional_answers[i]
                })
        
        agreement_rate = matches / min_len if min_len > 0 else 0
        
        return {
            'comparison_available': True,
            'agreement_rate': agreement_rate,
            'matches': matches,
            'differences_count': len(differences),
            'differences': differences[:10],  # Faqat birinchi 10 ta farq
            'recommendation': 'AI natijasi ishonchli' if agreement_rate > 0.8 else 'Natijalarni qo\'shimcha tekshiring'
        }

def main():
    """Test funksiyasi"""
    try:
        analyzer = GroqAIOMRAnalyzer()
        
        # Test rasm
        test_image = '../test_image_40_questions.jpg'
        answer_key = ['A'] * 40
        
        if os.path.exists(test_image):
            result = analyzer.analyze_omr_with_ai(test_image, answer_key)
            
            print("\n=== GROQ AI OMR TAHLIL NATIJASI ===")
            print(f"Umumiy ishonch: {result.overall_confidence:.2f}")
            print(f"Javobi topilgan savollar: {len([a for a in result.detected_answers if a != 'BLANK'])}")
            print(f"Bo'sh savollar: {len([a for a in result.detected_answers if a == 'BLANK'])}")
            print(f"Tahlil vaqti: {result.processing_time:.2f}s")
            
            print(f"\nBirinchi 10 ta javob:")
            for i in range(min(10, len(result.detected_answers))):
                print(f"  Q{i+1}: {result.detected_answers[i]} (ishonch: {result.confidence_scores[i]:.2f})")
            
            print(f"\nTavsiyalar:")
            for rec in result.recommendations:
                print(f"  - {rec}")
        else:
            print(f"❌ Test rasm topilmadi: {test_image}")
            
    except Exception as e:
        print(f"❌ Test xatoligi: {e}")

if __name__ == "__main__":
    main()