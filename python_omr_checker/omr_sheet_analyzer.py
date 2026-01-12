#!/usr/bin/env python3
"""
OMR Sheet Analyzer - Langor + Piksel algoritmi bilan varaq tahlili
AI-powered OMR sheet analysis with anchor detection and pixel density analysis
"""

import cv2
import numpy as np
import logging
from typing import List, Dict, Tuple, Optional, Any
from dataclasses import dataclass
import time
import re
import pytesseract
from PIL import Image

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@dataclass
class AnchorPoint:
    """Langor nuqtasi (savol raqami)"""
    question_number: int
    x: int
    y: int
    confidence: float
    text_detected: str
    bbox: Tuple[int, int, int, int]

@dataclass
class BubbleRegion:
    """Bubble hududi"""
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
class QualityMetrics:
    """Rasm sifati ko'rsatkichlari"""
    sharpness: float
    contrast: float
    brightness: float
    noise_level: float
    alignment_score: float
    overall_quality: float

@dataclass
class AnalysisResult:
    """Tahlil natijasi"""
    success: bool
    processing_method: str
    processing_time: float
    detected_answers: List[str]
    anchor_points: List[AnchorPoint]
    bubble_regions: List[BubbleRegion]
    quality_metrics: QualityMetrics
    recommendations: List[str]
    error_flags: List[str]
    confidence: float

class OMRSheetAnalyzer:
    """OMR Varaq Tahlilchisi - Langor + Piksel algoritmi"""
    
    def __init__(self):
        self.debug_mode = True
        logger.info("✅ OMR Sheet Analyzer initialized")
    
    def analyze_sheet(self, image_path: str, answer_key: List[str]) -> AnalysisResult:
        """OMR varaqni tahlil qilish"""
        logger.info("🔍 OMR Sheet analysis started")
        start_time = time.time()
        
        try:
            # 1. Rasmni yuklash
            image = cv2.imread(image_path)
            if image is None:
                raise ValueError(f"Rasm yuklanmadi: {image_path}")
            
            logger.info(f"📷 Image loaded: {image.shape}")
            
            # 2. Rasm sifatini baholash
            quality_metrics = self._analyze_image_quality(image)
            logger.info(f"📊 Image quality: {quality_metrics.overall_quality:.2f}")
            
            # 3. Langorlarni aniqlash (Savol raqamlari)
            anchor_points = self._detect_anchors(image)
            logger.info(f"🎯 Anchors found: {len(anchor_points)}")
            
            # 4. Bubble-larni aniqlash va piksel tahlili
            bubble_regions = self._detect_bubbles_with_pixel_analysis(image, anchor_points)
            logger.info(f"⚪ Bubbles detected: {len(bubble_regions)}")
            
            # 5. Javoblarni aniqlash
            detected_answers = self._extract_answers_from_bubbles(bubble_regions, len(answer_key))
            logger.info(f"📝 Answers extracted: {len(detected_answers)}")
            
            # 6. Tavsiyalar va xatolik bayroqlarini yaratish
            recommendations, error_flags = self._generate_recommendations_and_flags(
                quality_metrics, anchor_points, bubble_regions, detected_answers
            )
            
            # 7. Umumiy ishonch darajasini hisoblash
            confidence = self._calculate_overall_confidence(
                quality_metrics, anchor_points, bubble_regions
            )
            
            processing_time = time.time() - start_time
            
            result = AnalysisResult(
                success=True,
                processing_method="OMR Sheet Analyzer (Langor + Piksel)",
                processing_time=processing_time,
                detected_answers=detected_answers,
                anchor_points=anchor_points,
                bubble_regions=bubble_regions,
                quality_metrics=quality_metrics,
                recommendations=recommendations,
                error_flags=error_flags,
                confidence=confidence
            )
            
            logger.info(f"✅ Analysis completed in {processing_time:.2f}s")
            return result
            
        except Exception as e:
            logger.error(f"❌ Analysis failed: {e}")
            processing_time = time.time() - start_time
            
            return AnalysisResult(
                success=False,
                processing_method="OMR Sheet Analyzer (Error)",
                processing_time=processing_time,
                detected_answers=[],
                anchor_points=[],
                bubble_regions=[],
                quality_metrics=QualityMetrics(0, 0, 0, 0, 0, 0),
                recommendations=[f"Tahlil xatoligi: {str(e)}"],
                error_flags=["ANALYSIS_FAILED"],
                confidence=0.0
            )
    
    def _analyze_image_quality(self, image: np.ndarray) -> QualityMetrics:
        """Rasm sifatini tahlil qilish"""
        
        # Grayscale ga aylantirish
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image.copy()
        
        # 1. Keskinlik (Sharpness) - Laplacian variance
        laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
        sharpness = min(1.0, laplacian_var / 1000.0)
        
        # 2. Kontrast - Standard deviation
        contrast = np.std(gray) / 255.0
        
        # 3. Yorqinlik - Mean brightness
        brightness = np.mean(gray) / 255.0
        
        # 4. Shovqin darajasi - Noise estimation
        noise_level = self._estimate_noise(gray)
        
        # 5. Alignment score - Edge detection based
        alignment_score = self._calculate_alignment_score(gray)
        
        # 6. Umumiy sifat
        overall_quality = (sharpness * 0.3 + contrast * 0.25 + 
                          (1 - abs(brightness - 0.5) * 2) * 0.2 + 
                          (1 - noise_level) * 0.15 + alignment_score * 0.1)
        
        return QualityMetrics(
            sharpness=sharpness,
            contrast=contrast,
            brightness=brightness,
            noise_level=noise_level,
            alignment_score=alignment_score,
            overall_quality=overall_quality
        )
    
    def _estimate_noise(self, gray: np.ndarray) -> float:
        """Shovqin darajasini baholash"""
        # High-pass filter for noise estimation
        kernel = np.array([[-1, -1, -1], [-1, 8, -1], [-1, -1, -1]])
        filtered = cv2.filter2D(gray, -1, kernel)
        noise_level = np.std(filtered) / 255.0
        return min(1.0, noise_level)
    
    def _calculate_alignment_score(self, gray: np.ndarray) -> float:
        """Alignment score hisoblash"""
        # Edge detection
        edges = cv2.Canny(gray, 50, 150)
        
        # Hough lines for alignment detection
        lines = cv2.HoughLines(edges, 1, np.pi/180, threshold=100)
        
        if lines is None:
            return 0.5
        
        # Calculate alignment based on line angles
        angles = []
        for line in lines[:20]:  # Top 20 lines
            rho, theta = line[0]
            angle = theta * 180 / np.pi
            angles.append(angle)
        
        if not angles:
            return 0.5
        
        # Check how many lines are close to horizontal/vertical
        horizontal_lines = sum(1 for angle in angles if abs(angle) < 10 or abs(angle - 180) < 10)
        vertical_lines = sum(1 for angle in angles if abs(angle - 90) < 10)
        
        alignment_score = (horizontal_lines + vertical_lines) / len(angles)
        return min(1.0, alignment_score)
    
    def _detect_anchors(self, image: np.ndarray) -> List[AnchorPoint]:
        """Langorlarni aniqlash (Savol raqamlari: 1., 2., 3., ...)"""
        
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image.copy()
        
        anchor_points = []
        
        try:
            # OCR bilan matnni aniqlash
            # Tesseract konfiguratsiyasi
            config = '--oem 3 --psm 6 -c tessedit_char_whitelist=0123456789.'
            
            # OCR qilish
            data = pytesseract.image_to_data(gray, config=config, output_type=pytesseract.Output.DICT)
            
            # Savol raqamlarini qidirish
            for i in range(len(data['text'])):
                text = data['text'][i].strip()
                confidence = int(data['conf'][i])
                
                # Savol raqami pattern: "1.", "2.", "3.", etc.
                if re.match(r'^\d+\.$', text) and confidence > 30:
                    question_number = int(text[:-1])  # Remove dot
                    
                    x = data['left'][i]
                    y = data['top'][i]
                    w = data['width'][i]
                    h = data['height'][i]
                    
                    anchor_point = AnchorPoint(
                        question_number=question_number,
                        x=x,
                        y=y,
                        confidence=confidence / 100.0,
                        text_detected=text,
                        bbox=(x, y, w, h)
                    )
                    
                    anchor_points.append(anchor_point)
            
            # Sort by question number
            anchor_points.sort(key=lambda ap: ap.question_number)
            
            logger.info(f"🎯 OCR detected {len(anchor_points)} anchors")
            
        except Exception as e:
            logger.warning(f"⚠️ OCR failed, using coordinate-based detection: {e}")
            # Fallback: coordinate-based anchor detection
            anchor_points = self._detect_anchors_coordinate_based(gray)
        
        return anchor_points
    
    def _detect_anchors_coordinate_based(self, gray: np.ndarray) -> List[AnchorPoint]:
        """Koordinata asosida langorlarni aniqlash"""
        
        anchor_points = []
        
        # Standard OMR layout assumptions
        # 3 columns, ~14 questions per column
        height, width = gray.shape
        
        # Column positions (approximate)
        col_positions = [
            int(width * 0.15),  # Left column
            int(width * 0.5),   # Middle column  
            int(width * 0.85)   # Right column
        ]
        
        # Question spacing
        start_y = int(height * 0.25)
        end_y = int(height * 0.85)
        questions_per_col = 14
        
        question_num = 1
        
        for col_idx, col_x in enumerate(col_positions):
            for q_idx in range(questions_per_col):
                if question_num > 40:  # Max 40 questions
                    break
                
                y = start_y + (q_idx * (end_y - start_y) // questions_per_col)
                
                # Create synthetic anchor point
                anchor_point = AnchorPoint(
                    question_number=question_num,
                    x=col_x - 20,  # Offset for question number position
                    y=y,
                    confidence=0.8,  # Default confidence for coordinate-based
                    text_detected=f"{question_num}.",
                    bbox=(col_x - 30, y - 10, 20, 20)
                )
                
                anchor_points.append(anchor_point)
                question_num += 1
        
        logger.info(f"📍 Coordinate-based detection: {len(anchor_points)} anchors")
        return anchor_points
    
    def _detect_bubbles_with_pixel_analysis(self, image: np.ndarray, 
                                          anchor_points: List[AnchorPoint]) -> List[BubbleRegion]:
        """Bubble-larni aniqlash va piksel zichligini tahlil qilish"""
        
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image.copy()
        
        bubble_regions = []
        
        # Answer options
        options = ['A', 'B', 'C', 'D']
        
        for anchor in anchor_points:
            # Har bir langor uchun bubble-larni qidirish
            anchor_x, anchor_y = anchor.x, anchor.y
            
            # Bubble-lar langorning o'ng tomonida joylashgan
            bubble_start_x = anchor_x + 40  # Offset from question number
            bubble_y = anchor_y
            bubble_spacing = 25  # Bubble-lar orasidagi masofa
            bubble_size = 15    # Bubble o'lchami
            
            for i, option in enumerate(options):
                bubble_x = bubble_start_x + (i * bubble_spacing)
                
                # Bubble hududini aniqlash
                x1 = max(0, bubble_x - bubble_size//2)
                y1 = max(0, bubble_y - bubble_size//2)
                x2 = min(gray.shape[1], bubble_x + bubble_size//2)
                y2 = min(gray.shape[0], bubble_y + bubble_size//2)
                
                if x2 > x1 and y2 > y1:
                    # Bubble hududini kesib olish
                    bubble_roi = gray[y1:y2, x1:x2]
                    
                    # Piksel zichligini tahlil qilish
                    density = self._analyze_pixel_density(bubble_roi)
                    
                    # Bubble to'ldirilganligini aniqlash
                    is_filled = density > 0.3  # Threshold for filled bubble
                    
                    # Confidence hisoblash
                    confidence = min(1.0, density * 2) if is_filled else (1.0 - density)
                    
                    bubble_region = BubbleRegion(
                        question_number=anchor.question_number,
                        option=option,
                        x=bubble_x,
                        y=bubble_y,
                        width=bubble_size,
                        height=bubble_size,
                        density=density,
                        is_filled=is_filled,
                        confidence=confidence
                    )
                    
                    bubble_regions.append(bubble_region)
        
        logger.info(f"⚪ Analyzed {len(bubble_regions)} bubble regions")
        return bubble_regions
    
    def _analyze_pixel_density(self, roi: np.ndarray) -> float:
        """Bubble hududida piksel zichligini tahlil qilish"""
        
        if roi.size == 0:
            return 0.0
        
        # Binary threshold
        _, binary = cv2.threshold(roi, 127, 255, cv2.THRESH_BINARY_INV)
        
        # Calculate density (ratio of dark pixels)
        dark_pixels = np.sum(binary == 255)
        total_pixels = roi.size
        
        density = dark_pixels / total_pixels if total_pixels > 0 else 0.0
        
        return density
    
    def _extract_answers_from_bubbles(self, bubble_regions: List[BubbleRegion], 
                                    num_questions: int) -> List[str]:
        """Bubble-lardan javoblarni chiqarish"""
        
        answers = ['BLANK'] * num_questions
        
        # Group bubbles by question
        questions_bubbles = {}
        for bubble in bubble_regions:
            q_num = bubble.question_number
            if q_num not in questions_bubbles:
                questions_bubbles[q_num] = []
            questions_bubbles[q_num].append(bubble)
        
        # Extract answer for each question
        for q_num, bubbles in questions_bubbles.items():
            if q_num <= num_questions:
                # Find the bubble with highest density (most filled)
                filled_bubbles = [b for b in bubbles if b.is_filled]
                
                if filled_bubbles:
                    # Select bubble with highest density
                    best_bubble = max(filled_bubbles, key=lambda b: b.density)
                    answers[q_num - 1] = best_bubble.option
        
        return answers
    
    def _generate_recommendations_and_flags(self, quality_metrics: QualityMetrics,
                                          anchor_points: List[AnchorPoint],
                                          bubble_regions: List[BubbleRegion],
                                          detected_answers: List[str]) -> Tuple[List[str], List[str]]:
        """Tavsiyalar va xatolik bayroqlarini yaratish"""
        
        recommendations = []
        error_flags = []
        
        # Quality-based recommendations
        if quality_metrics.sharpness < 0.5:
            recommendations.append("Rasm keskinligi past. Kamerani fokuslab qayta suratga oling.")
            error_flags.append("LOW_SHARPNESS")
        
        if quality_metrics.contrast < 0.3:
            recommendations.append("Kontrast past. Yorug'likni yaxshilang yoki boshqa burchakdan suratga oling.")
            error_flags.append("LOW_CONTRAST")
        
        if quality_metrics.brightness < 0.2 or quality_metrics.brightness > 0.8:
            recommendations.append("Yorug'lik darajasi optimal emas. Yaxshi yorug'likda suratga oling.")
            error_flags.append("POOR_LIGHTING")
        
        # Anchor-based recommendations
        if len(anchor_points) < 10:
            recommendations.append("Kam savol raqami aniqlandi. Varaqning to'liq ko'rinishini ta'minlang.")
            error_flags.append("FEW_ANCHORS_DETECTED")
        
        # Answer-based recommendations
        blank_count = detected_answers.count('BLANK')
        if blank_count > len(detected_answers) * 0.5:
            recommendations.append("Ko'p savollar bo'sh qoldi. Bubble-lar to'g'ri to'ldirilganligini tekshiring.")
            error_flags.append("HIGH_BLANK_RATE")
        
        # Overall quality
        if quality_metrics.overall_quality > 0.8:
            recommendations.append("Rasm sifati ajoyib. Tahlil natijasi ishonchli.")
        elif quality_metrics.overall_quality > 0.6:
            recommendations.append("Rasm sifati yaxshi. Tahlil natijasi qabul qilinadigan darajada.")
        else:
            recommendations.append("Rasm sifati yaxshilanishi kerak. Qayta suratga olishni tavsiya qilamiz.")
            error_flags.append("LOW_IMAGE_QUALITY")
        
        return recommendations, error_flags
    
    def _calculate_overall_confidence(self, quality_metrics: QualityMetrics,
                                    anchor_points: List[AnchorPoint],
                                    bubble_regions: List[BubbleRegion]) -> float:
        """Umumiy ishonch darajasini hisoblash"""
        
        # Quality component (40%)
        quality_score = quality_metrics.overall_quality * 0.4
        
        # Anchor detection component (30%)
        anchor_score = min(1.0, len(anchor_points) / 40) * 0.3
        
        # Bubble analysis component (30%)
        if bubble_regions:
            avg_bubble_confidence = sum(b.confidence for b in bubble_regions) / len(bubble_regions)
            bubble_score = avg_bubble_confidence * 0.3
        else:
            bubble_score = 0.0
        
        overall_confidence = quality_score + anchor_score + bubble_score
        
        return min(1.0, overall_confidence)

def main():
    """Test funksiyasi"""
    analyzer = OMRSheetAnalyzer()
    
    # Test image
    test_image = '../test_image_40_questions.jpg'
    answer_key = ['A'] * 40
    
    if os.path.exists(test_image):
        result = analyzer.analyze_sheet(test_image, answer_key)
        
        print("\n=== OMR SHEET ANALYSIS RESULT ===")
        print(f"Success: {result.success}")
        print(f"Processing Method: {result.processing_method}")
        print(f"Processing Time: {result.processing_time:.2f}s")
        print(f"Confidence: {result.confidence:.2f}")
        print(f"Anchors Found: {len(result.anchor_points)}")
        print(f"Bubbles Detected: {len(result.bubble_regions)}")
        print(f"Answers Extracted: {len(result.detected_answers)}")
        
        print(f"\nFirst 10 answers:")
        for i in range(min(10, len(result.detected_answers))):
            print(f"  Q{i+1}: {result.detected_answers[i]}")
        
        print(f"\nRecommendations:")
        for rec in result.recommendations:
            print(f"  - {rec}")
    else:
        print(f"❌ Test image not found: {test_image}")

if __name__ == "__main__":
    import os
    main()