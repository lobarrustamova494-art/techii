#!/usr/bin/env python3
"""
Anchor-Based OMR Processor
Langor (Anchor) asosida savol raqamlarini topib, bubble koordinatalarini hisoblaydigan tizim
"""

import cv2
import numpy as np
import json
import logging
import re
from typing import List, Dict, Tuple, Optional, Any
from dataclasses import dataclass
import time

# Optional Tesseract import with fallback
TESSERACT_AVAILABLE = False
try:
    import pytesseract
    TESSERACT_AVAILABLE = True
    logger = logging.getLogger(__name__)
    logger.info("✅ Tesseract OCR is available")
except ImportError:
    logger = logging.getLogger(__name__)
    logger.warning("⚠️ Tesseract OCR not available - using coordinate-based fallback")

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@dataclass
class AnchorPoint:
    """Anchor (Langor) nuqta ma'lumotlari"""
    question_number: int
    x: int
    y: int
    confidence: float
    text: str
    bbox: Tuple[int, int, int, int]  # (x, y, width, height)

@dataclass
class BubbleRegion:
    """Bubble hudud ma'lumotlari"""
    question_number: int
    option: str
    x: int
    y: int
    width: int
    height: int
    density: float
    is_filled: bool
    confidence: float

@dataclass
class AnchorBasedResult:
    """Anchor-based OMR natijasi"""
    extracted_answers: List[str]
    confidence: float
    processing_time: float
    anchor_points: List[AnchorPoint]
    bubble_regions: List[BubbleRegion]
    processing_details: Dict[str, Any]
    detailed_results: List[Dict[str, Any]]

class AnchorBasedOMRProcessor:
    """Anchor (Langor) asosida OMR qayta ishlash tizimi"""
    
    def __init__(self):
        self.debug_mode = True
        self.tesseract_available = TESSERACT_AVAILABLE
        
        # Anchor detection parameters
        self.anchor_params = {
            'min_question_number': 1,
            'max_question_number': 40,
            'number_pattern': r'\b(\d{1,2})\s*[.)]',  # 1. yoki 1) formatida
            'min_confidence': 0.6,
            'tesseract_config': '--psm 6 -c tessedit_char_whitelist=0123456789.)()'
        }
        
        # Fallback coordinate-based detection (when Tesseract is not available)
        self.fallback_coordinates = self._generate_fallback_coordinates()
        
        # Bubble detection parameters
        self.bubble_params = {
            'bubble_width': 20,
            'bubble_height': 20,
            'horizontal_spacing': 35,  # A, B, C, D orasidagi masofa
            'vertical_offset': 0,      # Raqamdan bubble gacha vertikal masofa
            'horizontal_offset': 50,   # Raqamdan bubble gacha gorizontal masofa
            'options': ['A', 'B', 'C', 'D'],
            'density_threshold': 0.3   # Bubble to'ldirilganlik chegarasi
        }
        
        # Image preprocessing parameters
        self.preprocess_params = {
            'gaussian_blur_kernel': (3, 3),
            'adaptive_threshold_block_size': 11,
            'adaptive_threshold_c': 2,
            'morphology_kernel_size': (2, 2)
        }
    
    def _generate_fallback_coordinates(self) -> Dict[int, Tuple[int, int]]:
        """Generate fallback coordinates when Tesseract is not available"""
        # These are approximate coordinates for a standard OMR sheet layout
        # Based on common OMR sheet formats with 3 columns, 14 questions per column
        coordinates = {}
        
        # Column 1: Questions 1-14
        start_x, start_y = 250, 640
        for i in range(14):
            q_num = i + 1
            coordinates[q_num] = (start_x, start_y + i * 47)
        
        # Column 2: Questions 15-27 (13 questions)
        start_x, start_y = 800, 635
        for i in range(13):
            q_num = i + 15
            coordinates[q_num] = (start_x, start_y + i * 48)
        
        # Column 3: Questions 28-40 (13 questions)
        start_x, start_y = 1270, 627
        for i in range(13):
            q_num = i + 28
            coordinates[q_num] = (start_x, start_y + i * 48)
        
        return coordinates
    
    def process_omr_with_anchors(self, image_path: str, answer_key: List[str]) -> AnchorBasedResult:
        """Anchor-based OMR qayta ishlash asosiy funksiyasi"""
        logger.info("=== ANCHOR-BASED OMR PROCESSING STARTED ===")
        
        if not self.tesseract_available:
            logger.info("🔄 Using coordinate-based fallback (Tesseract not available)")
        
        start_time = time.time()
        
        try:
            # Step 1: Rasmni yuklash va preprocessing
            original_image, processed_image = self.preprocess_image(image_path)
            
            # Step 2: Anchor nuqtalarni topish (OCR yoki fallback)
            if self.tesseract_available:
                anchor_points = self.detect_anchor_points_ocr(processed_image, original_image)
            else:
                anchor_points = self.detect_anchor_points_fallback(processed_image)
            
            # Step 3: Har bir anchor uchun bubble koordinatalarini hisoblash
            bubble_regions = self.calculate_bubble_coordinates(anchor_points, processed_image)
            
            # Step 4: Bubble density tahlili
            analyzed_bubbles = self.analyze_bubble_density(bubble_regions, processed_image)
            
            # Step 5: Javoblarni aniqlash
            extracted_answers = self.determine_answers_from_bubbles(analyzed_bubbles)
            
            # Step 6: Natijalarni tayyorlash
            processing_time = time.time() - start_time
            confidence = self.calculate_overall_confidence(analyzed_bubbles)
            
            processing_method = 'Anchor-Based OMR with OCR' if self.tesseract_available else 'Anchor-Based OMR with Coordinate Fallback'
            
            result = AnchorBasedResult(
                extracted_answers=extracted_answers,
                confidence=confidence,
                processing_time=processing_time,
                anchor_points=anchor_points,
                bubble_regions=analyzed_bubbles,
                processing_details={
                    'anchors_found': len(anchor_points),
                    'bubbles_analyzed': len(analyzed_bubbles),
                    'processing_method': processing_method,
                    'image_dimensions': original_image.shape[:2],
                    'preprocessing_applied': True,
                    'tesseract_available': self.tesseract_available
                },
                detailed_results=self.create_detailed_results(analyzed_bubbles)
            )
            
            logger.info(f"✅ Anchor-based processing completed in {processing_time:.2f}s")
            logger.info(f"📍 Anchors found: {len(anchor_points)}")
            logger.info(f"🔍 Bubbles analyzed: {len(analyzed_bubbles)}")
            logger.info(f"📊 Overall confidence: {confidence:.2f}")
            
            return result
            
        except Exception as e:
            logger.error(f"❌ Anchor-based processing failed: {e}")
            raise
    
    def preprocess_image(self, image_path: str) -> Tuple[np.ndarray, np.ndarray]:
        """Rasmni preprocessing qilish"""
        logger.info("🔧 Image preprocessing started")
        
        # Original rasmni yuklash
        original = cv2.imread(image_path)
        if original is None:
            raise ValueError(f"Could not read image: {image_path}")
        
        # Grayscale ga o'tkazish
        gray = cv2.cvtColor(original, cv2.COLOR_BGR2GRAY)
        
        # Noise reduction
        denoised = cv2.GaussianBlur(gray, self.preprocess_params['gaussian_blur_kernel'], 0)
        
        # Contrast enhancement
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        enhanced = clahe.apply(denoised)
        
        # Adaptive thresholding
        processed = cv2.adaptiveThreshold(
            enhanced, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY,
            self.preprocess_params['adaptive_threshold_block_size'],
            self.preprocess_params['adaptive_threshold_c']
        )
        
        # Morphological operations
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, self.preprocess_params['morphology_kernel_size'])
        processed = cv2.morphologyEx(processed, cv2.MORPH_CLOSE, kernel)
        
        logger.info("✅ Image preprocessing completed")
        return original, processed
    
    def detect_anchor_points_ocr(self, processed_image: np.ndarray, original_image: np.ndarray) -> List[AnchorPoint]:
        """OCR yordamida savol raqamlarini (anchor points) topish"""
        logger.info("🎯 Detecting anchor points using OCR")
        
        anchor_points = []
        
        try:
            # OCR bilan matnni aniqlash
            ocr_data = pytesseract.image_to_data(
                processed_image, 
                config=self.anchor_params['tesseract_config'],
                output_type=pytesseract.Output.DICT
            )
            
            # OCR natijalarini tahlil qilish
            for i in range(len(ocr_data['text'])):
                text = ocr_data['text'][i].strip()
                confidence = float(ocr_data['conf'][i])
                
                if confidence < self.anchor_params['min_confidence'] * 100:
                    continue
                
                # Savol raqamini topish
                match = re.search(self.anchor_params['number_pattern'], text)
                if match:
                    question_number = int(match.group(1))
                    
                    # Raqam oralig'ini tekshirish
                    if (self.anchor_params['min_question_number'] <= 
                        question_number <= self.anchor_params['max_question_number']):
                        
                        x = ocr_data['left'][i]
                        y = ocr_data['top'][i]
                        w = ocr_data['width'][i]
                        h = ocr_data['height'][i]
                        
                        anchor_point = AnchorPoint(
                            question_number=question_number,
                            x=x + w // 2,  # Markaziy nuqta
                            y=y + h // 2,
                            confidence=confidence / 100,
                            text=text,
                            bbox=(x, y, w, h)
                        )
                        
                        anchor_points.append(anchor_point)
                        
                        if self.debug_mode:
                            logger.info(f"📍 Found anchor: Q{question_number} at ({x + w//2}, {y + h//2}) - '{text}' (conf: {confidence:.1f}%)")
            
            # Anchor nuqtalarni savol raqami bo'yicha tartiblash
            anchor_points.sort(key=lambda ap: ap.question_number)
            
            logger.info(f"✅ Found {len(anchor_points)} anchor points using OCR")
            
            return anchor_points
            
        except Exception as e:
            logger.error(f"❌ OCR anchor detection failed: {e}")
            return []
    
    def detect_anchor_points_fallback(self, processed_image: np.ndarray) -> List[AnchorPoint]:
        """Fallback method: Use predefined coordinates when OCR is not available"""
        logger.info("🎯 Using fallback coordinate-based anchor detection")
        
        anchor_points = []
        
        for question_number, (x, y) in self.fallback_coordinates.items():
            # Create anchor point with predefined coordinates
            anchor_point = AnchorPoint(
                question_number=question_number,
                x=x,
                y=y,
                confidence=0.8,  # Default confidence for coordinate-based detection
                text=f"{question_number}.",
                bbox=(x-10, y-10, 20, 20)  # Approximate bounding box
            )
            
            anchor_points.append(anchor_point)
            
            if self.debug_mode:
                logger.info(f"📍 Fallback anchor: Q{question_number} at ({x}, {y})")
        
        # Sort by question number
        anchor_points.sort(key=lambda ap: ap.question_number)
        
        logger.info(f"✅ Generated {len(anchor_points)} fallback anchor points")
        return anchor_points
    
    def calculate_bubble_coordinates(self, anchor_points: List[AnchorPoint], image: np.ndarray) -> List[BubbleRegion]:
        """Anchor nuqtalar asosida bubble koordinatalarini hisoblash"""
        logger.info("📐 Calculating bubble coordinates from anchors")
        
        bubble_regions = []
        height, width = image.shape[:2]
        
        for anchor in anchor_points:
            question_number = anchor.question_number
            anchor_x = anchor.x
            anchor_y = anchor.y
            
            if self.debug_mode:
                logger.info(f"🔍 Processing Q{question_number} anchor at ({anchor_x}, {anchor_y})")
            
            # Har bir option (A, B, C, D) uchun bubble koordinatalarini hisoblash
            for i, option in enumerate(self.bubble_params['options']):
                # Bubble koordinatalarini hisoblash
                bubble_x = anchor_x + self.bubble_params['horizontal_offset'] + (i * self.bubble_params['horizontal_spacing'])
                bubble_y = anchor_y + self.bubble_params['vertical_offset']
                
                # Rasm chegaralarini tekshirish
                if (0 <= bubble_x < width - self.bubble_params['bubble_width'] and
                    0 <= bubble_y < height - self.bubble_params['bubble_height']):
                    
                    bubble_region = BubbleRegion(
                        question_number=question_number,
                        option=option,
                        x=bubble_x,
                        y=bubble_y,
                        width=self.bubble_params['bubble_width'],
                        height=self.bubble_params['bubble_height'],
                        density=0.0,  # Keyinroq hisoblanadi
                        is_filled=False,  # Keyinroq aniqlanadi
                        confidence=anchor.confidence
                    )
                    
                    bubble_regions.append(bubble_region)
                    
                    if self.debug_mode:
                        logger.info(f"  📍 {option}: ({bubble_x}, {bubble_y})")
                else:
                    if self.debug_mode:
                        logger.warning(f"  ⚠️ {option}: ({bubble_x}, {bubble_y}) - out of bounds")
        
        logger.info(f"✅ Calculated {len(bubble_regions)} bubble coordinates")
        return bubble_regions
    
    def analyze_bubble_density(self, bubble_regions: List[BubbleRegion], image: np.ndarray) -> List[BubbleRegion]:
        """Bubble density (qorayish darajasi) tahlili"""
        logger.info("🔍 Analyzing bubble density")
        
        analyzed_bubbles = []
        
        for bubble in bubble_regions:
            # Bubble hududini ajratib olish
            x, y = bubble.x, bubble.y
            w, h = bubble.width, bubble.height
            
            # Rasm chegaralarini tekshirish
            if x + w > image.shape[1] or y + h > image.shape[0]:
                continue
            
            bubble_region = image[y:y+h, x:x+w]
            
            if bubble_region.size == 0:
                continue
            
            # Density hisoblash (qora piksellar foizi)
            # Adaptive threshold qo'llanilgan rasmda: 0 = qora, 255 = oq
            total_pixels = bubble_region.size
            dark_pixels = np.sum(bubble_region == 0)  # Qora piksellar
            density = dark_pixels / total_pixels if total_pixels > 0 else 0
            
            # Bubble to'ldirilganligini aniqlash
            is_filled = density >= self.bubble_params['density_threshold']
            
            # Confidence hisoblash
            confidence = min(1.0, density * 2) if is_filled else max(0.1, 1.0 - density)
            
            # Yangilangan bubble ma'lumotlari
            updated_bubble = BubbleRegion(
                question_number=bubble.question_number,
                option=bubble.option,
                x=bubble.x,
                y=bubble.y,
                width=bubble.width,
                height=bubble.height,
                density=density,
                is_filled=is_filled,
                confidence=confidence
            )
            
            analyzed_bubbles.append(updated_bubble)
            
            if self.debug_mode:
                status = "FILLED" if is_filled else "EMPTY"
                logger.info(f"  Q{bubble.question_number}{bubble.option}: density={density:.3f}, {status} (conf: {confidence:.2f})")
        
        logger.info(f"✅ Analyzed {len(analyzed_bubbles)} bubbles")
        return analyzed_bubbles
    
    def determine_answers_from_bubbles(self, analyzed_bubbles: List[BubbleRegion]) -> List[str]:
        """Bubble tahlili asosida javoblarni aniqlash"""
        logger.info("🎯 Determining answers from bubble analysis")
        
        # Savollar bo'yicha guruhlash
        questions = {}
        for bubble in analyzed_bubbles:
            q_num = bubble.question_number
            if q_num not in questions:
                questions[q_num] = []
            questions[q_num].append(bubble)
        
        # Javoblarni aniqlash
        answers = []
        max_question = max(questions.keys()) if questions else 0
        
        for q_num in range(1, max_question + 1):
            if q_num not in questions:
                answers.append('BLANK')
                continue
            
            question_bubbles = questions[q_num]
            
            # To'ldirilgan bubblelarni topish
            filled_bubbles = [b for b in question_bubbles if b.is_filled]
            
            if len(filled_bubbles) == 0:
                # Hech qaysi bubble to'ldirilmagan
                answers.append('BLANK')
            elif len(filled_bubbles) == 1:
                # Bitta bubble to'ldirilgan (to'g'ri holat)
                answers.append(filled_bubbles[0].option)
            else:
                # Bir nechta bubble to'ldirilgan
                # Eng yuqori density ga ega bo'lganini tanlash
                best_bubble = max(filled_bubbles, key=lambda b: b.density)
                answers.append(f"MULTIPLE_{best_bubble.option}")
            
            if self.debug_mode:
                filled_options = [b.option for b in filled_bubbles]
                logger.info(f"Q{q_num}: {answers[-1]} (filled: {filled_options})")
        
        logger.info(f"✅ Determined {len(answers)} answers")
        return answers
    
    def calculate_overall_confidence(self, analyzed_bubbles: List[BubbleRegion]) -> float:
        """Umumiy ishonch darajasini hisoblash"""
        if not analyzed_bubbles:
            return 0.0
        
        # Har bir savol uchun eng yuqori confidence ni olish
        questions = {}
        for bubble in analyzed_bubbles:
            q_num = bubble.question_number
            if q_num not in questions:
                questions[q_num] = []
            questions[q_num].append(bubble)
        
        question_confidences = []
        for q_num, bubbles in questions.items():
            if bubbles:
                max_confidence = max(b.confidence for b in bubbles)
                question_confidences.append(max_confidence)
        
        return np.mean(question_confidences) if question_confidences else 0.0
    
    def create_detailed_results(self, analyzed_bubbles: List[BubbleRegion]) -> List[Dict[str, Any]]:
        """Batafsil natijalarni yaratish"""
        # Savollar bo'yicha guruhlash
        questions = {}
        for bubble in analyzed_bubbles:
            q_num = bubble.question_number
            if q_num not in questions:
                questions[q_num] = []
            questions[q_num].append(bubble)
        
        detailed_results = []
        for q_num in sorted(questions.keys()):
            bubbles = questions[q_num]
            
            # Bubble intensities va coordinates
            bubble_intensities = {}
            bubble_coordinates = {}
            
            for bubble in bubbles:
                bubble_intensities[bubble.option] = bubble.density
                bubble_coordinates[bubble.option] = {'x': bubble.x, 'y': bubble.y}
            
            # Javobni aniqlash
            filled_bubbles = [b for b in bubbles if b.is_filled]
            if len(filled_bubbles) == 0:
                detected_answer = 'BLANK'
                confidence = 0.2
            elif len(filled_bubbles) == 1:
                detected_answer = filled_bubbles[0].option
                confidence = filled_bubbles[0].confidence
            else:
                best_bubble = max(filled_bubbles, key=lambda b: b.density)
                detected_answer = f"MULTIPLE_{best_bubble.option}"
                confidence = best_bubble.confidence * 0.8  # Penalty for multiple
            
            detailed_results.append({
                'question': q_num,
                'detected_answer': detected_answer,
                'confidence': confidence,
                'bubble_intensities': bubble_intensities,
                'bubble_coordinates': bubble_coordinates,
                'processing_method': 'anchor_based_density_analysis'
            })
        
        return detailed_results

def main():
    """Test Anchor-Based OMR Processor"""
    processor = AnchorBasedOMRProcessor()
    
    # Test with sample image
    answer_key = ['A'] * 40
    
    try:
        result = processor.process_omr_with_anchors('../../test_image_40_questions.jpg', answer_key)
        
        print("\n=== ANCHOR-BASED OMR RESULTS ===")
        print(f"Processing time: {result.processing_time:.2f}s")
        print(f"Overall confidence: {result.confidence:.2f}")
        print(f"Anchors found: {result.processing_details['anchors_found']}")
        print(f"Bubbles analyzed: {result.processing_details['bubbles_analyzed']}")
        
        print(f"\nFirst 10 answers:")
        for i, answer in enumerate(result.extracted_answers[:10]):
            print(f"  Q{i+1}: {answer}")
        
        print(f"\nAnchor points found:")
        for anchor in result.anchor_points[:10]:
            print(f"  Q{anchor.question_number}: ({anchor.x}, {anchor.y}) - '{anchor.text}' (conf: {anchor.confidence:.2f})")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()