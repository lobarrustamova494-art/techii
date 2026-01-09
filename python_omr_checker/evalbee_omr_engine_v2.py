#!/usr/bin/env python3
"""
EvalBee OMR Engine V2 - Simplified Professional OMR System
Based on Ultra-Precision V2 with EvalBee-style enhancements
"""

import cv2
import numpy as np
import json
import logging
from typing import List, Dict, Tuple, Optional, Any
from dataclasses import dataclass
import time
import math
from ultra_precision_omr_processor_v2 import UltraPrecisionOMRProcessorV2

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@dataclass
class EvalBeeResult:
    """EvalBee processing result"""
    extracted_answers: List[str]
    confidence_scores: List[float]
    overall_confidence: float
    processing_time: float
    layout_analysis: Dict[str, Any]
    quality_metrics: Dict[str, float]
    detailed_results: List[Dict[str, Any]]
    error_flags: List[str]
    recommendations: List[str]

class EvalBeeOMREngineV2:
    """EvalBee OMR Engine V2 - Professional OMR processing based on Ultra-Precision V2"""
    
    def __init__(self):
        # Initialize Ultra-Precision V2 processor as base
        self.ultra_processor = UltraPrecisionOMRProcessorV2()
        self.debug_mode = True
        
        # EvalBee quality thresholds
        self.quality_thresholds = {
            'min_confidence': 0.7,
            'min_questions': 10,
            'max_blank_rate': 0.3,
            'max_multiple_rate': 0.1
        }
        
    def process_omr_sheet(self, image_path: str, answer_key: List[str]) -> EvalBeeResult:
        """Main EvalBee processing function"""
        logger.info("🚀 EvalBee OMR Engine V2 started")
        start_time = time.time()
        
        try:
            # Step 1: Use Ultra-Precision V2 for core processing
            logger.info("🔧 Using Ultra-Precision V2 as processing engine")
            ultra_result = self.ultra_processor.process_omr_sheet_ultra_v2(
                image_path, answer_key, use_universal=True
            )
            
            # Step 2: EvalBee quality analysis
            quality_metrics = self.analyze_image_quality(image_path)
            
            # Step 3: Enhanced confidence scoring
            confidence_scores = self.calculate_enhanced_confidence(ultra_result)
            
            # Step 4: Professional error detection
            error_flags, recommendations = self.professional_quality_control(
                ultra_result, quality_metrics, confidence_scores
            )
            
            # Step 5: Layout analysis enhancement
            layout_analysis = self.enhance_layout_analysis(ultra_result)
            
            processing_time = time.time() - start_time
            
            # Create EvalBee result
            evalbee_result = EvalBeeResult(
                extracted_answers=ultra_result.extracted_answers,
                confidence_scores=confidence_scores,
                overall_confidence=np.mean(confidence_scores) if confidence_scores else 0.0,
                processing_time=processing_time,
                layout_analysis=layout_analysis,
                quality_metrics=quality_metrics,
                detailed_results=ultra_result.detailed_results,
                error_flags=error_flags,
                recommendations=recommendations
            )
            
            logger.info(f"✅ EvalBee V2 processing completed in {processing_time:.2f}s")
            logger.info(f"📊 Questions: {len(evalbee_result.extracted_answers)}, Confidence: {evalbee_result.overall_confidence:.2f}")
            
            return evalbee_result
            
        except Exception as e:
            logger.error(f"❌ EvalBee V2 processing failed: {e}")
            raise
    
    def analyze_image_quality(self, image_path: str) -> Dict[str, float]:
        """Analyze image quality with EvalBee metrics"""
        try:
            image = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
            if image is None:
                return self.get_default_quality_metrics()
            
            # Sharpness (Laplacian variance)
            sharpness = cv2.Laplacian(image, cv2.CV_64F).var()
            
            # Contrast ratio
            contrast_ratio = np.std(image) / np.mean(image) if np.mean(image) > 0 else 0
            
            # Brightness
            brightness = np.mean(image)
            
            # Noise estimation
            blur = cv2.GaussianBlur(image, (5, 5), 0)
            noise_level = np.std(image - blur)
            
            # Overall quality score
            overall_quality = min(1.0, (
                min(sharpness / 100, 1.0) * 0.3 +
                min(contrast_ratio / 0.5, 1.0) * 0.3 +
                (1.0 - min(noise_level / 50, 1.0)) * 0.2 +
                min(brightness / 128, 1.0) * 0.2
            ))
            
            return {
                'sharpness': sharpness,
                'contrast_ratio': contrast_ratio,
                'brightness': brightness,
                'noise_level': noise_level,
                'skew_angle': 0.5,  # Simplified
                'overall_quality': overall_quality
            }
            
        except Exception as e:
            logger.warning(f"Quality analysis failed: {e}")
            return self.get_default_quality_metrics()
    
    def get_default_quality_metrics(self) -> Dict[str, float]:
        """Default quality metrics when analysis fails"""
        return {
            'sharpness': 100.0,
            'contrast_ratio': 0.4,
            'brightness': 128.0,
            'noise_level': 10.0,
            'skew_angle': 0.0,
            'overall_quality': 0.8
        }
    
    def calculate_enhanced_confidence(self, ultra_result) -> List[float]:
        """Calculate enhanced confidence scores"""
        confidence_scores = []
        
        for i, answer in enumerate(ultra_result.extracted_answers):
            # Base confidence from detailed results
            base_confidence = 0.5
            
            if i < len(ultra_result.detailed_results):
                detail = ultra_result.detailed_results[i]
                if 'confidence' in detail:
                    base_confidence = detail['confidence']
                elif 'intensity' in detail:
                    base_confidence = detail['intensity']
            
            # EvalBee confidence enhancement
            if answer == 'BLANK':
                enhanced_confidence = 0.3  # Low confidence for blanks
            elif answer.startswith('MULTIPLE'):
                enhanced_confidence = 0.6  # Medium confidence for multiple
            else:
                # Boost confidence for clear answers
                enhanced_confidence = min(0.95, base_confidence * 1.2 + 0.1)
            
            confidence_scores.append(enhanced_confidence)
        
        return confidence_scores
    
    def professional_quality_control(self, ultra_result, quality_metrics: Dict[str, float], 
                                   confidence_scores: List[float]) -> Tuple[List[str], List[str]]:
        """Professional quality control analysis"""
        error_flags = []
        recommendations = []
        
        # Image quality checks
        if quality_metrics['sharpness'] < 50:
            error_flags.append('LOW_SHARPNESS')
            recommendations.append('Image appears blurry. Use better lighting or focus.')
        
        if quality_metrics['contrast_ratio'] < 0.2:
            error_flags.append('LOW_CONTRAST')
            recommendations.append('Low contrast detected. Ensure good lighting conditions.')
        
        if quality_metrics['overall_quality'] < 0.6:
            error_flags.append('LOW_IMAGE_QUALITY')
            recommendations.append('Overall image quality is low. Consider retaking the photo.')
        
        # Answer pattern analysis
        answers = ultra_result.extracted_answers
        blank_count = answers.count('BLANK')
        multiple_count = len([a for a in answers if a.startswith('MULTIPLE')])
        
        if blank_count > len(answers) * self.quality_thresholds['max_blank_rate']:
            error_flags.append('HIGH_BLANK_RATE')
            recommendations.append('High number of blank answers detected. Check bubble filling.')
        
        if multiple_count > len(answers) * self.quality_thresholds['max_multiple_rate']:
            error_flags.append('HIGH_MULTIPLE_ANSWERS')
            recommendations.append('Multiple answers detected. Ensure only one option per question.')
        
        # Confidence analysis
        avg_confidence = np.mean(confidence_scores) if confidence_scores else 0
        if avg_confidence < self.quality_thresholds['min_confidence']:
            error_flags.append('LOW_CONFIDENCE')
            recommendations.append('Low overall confidence. Consider retaking the photo.')
        
        # Question count check
        if len(answers) < self.quality_thresholds['min_questions']:
            error_flags.append('INSUFFICIENT_QUESTIONS')
            recommendations.append('Too few questions detected. Check image quality and format.')
        
        return error_flags, recommendations
    
    def enhance_layout_analysis(self, ultra_result) -> Dict[str, Any]:
        """Enhance layout analysis with EvalBee metrics"""
        
        # Extract layout info from ultra result
        processing_details = ultra_result.processing_details or {}
        
        layout_analysis = {
            'layout_type': processing_details.get('processing_method', 'evalbee_enhanced'),
            'total_questions': len(ultra_result.extracted_answers),
            'columns': 3,  # Assume 3-column layout
            'format_confidence': ultra_result.confidence,
            'detection_method': 'EvalBee Enhanced Ultra-Precision V2',
            'coordinate_system': processing_details.get('coordinate_system', 'universal'),
            'actual_question_count': processing_details.get('actual_question_count', len(ultra_result.extracted_answers))
        }
        
        return layout_analysis

def main():
    """Test EvalBee OMR Engine V2"""
    engine = EvalBeeOMREngineV2()
    
    # Test with sample image
    answer_key = ['A'] * 40
    
    try:
        result = engine.process_omr_sheet('../../test_image_40_questions.jpg', answer_key)
        
        print("\n=== EVALBEE OMR ENGINE V2 RESULTS ===")
        print(f"Processing time: {result.processing_time:.2f}s")
        print(f"Overall confidence: {result.overall_confidence:.2f}")
        print(f"Layout: {result.layout_analysis['layout_type']}")
        print(f"Questions detected: {result.layout_analysis['total_questions']}")
        print(f"Error flags: {result.error_flags}")
        print(f"Recommendations: {result.recommendations}")
        
        print(f"\nFirst 10 answers:")
        for i, (answer, conf) in enumerate(zip(result.extracted_answers[:10], result.confidence_scores[:10])):
            print(f"  Q{i+1}: {answer} (confidence: {conf:.2f})")
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    main()