#!/usr/bin/env python3
"""
Enhanced Bubble Analyzer with 40%+ Fill Detection
Analyzes bubble filling percentage with high precision
"""

import cv2
import numpy as np
import json
import logging
from typing import List, Dict, Tuple, Optional, Any
from dataclasses import dataclass
import time
import math
from enhanced_column_detector import EnhancedColumnDetector, LayoutAnalysis, ColumnInfo

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@dataclass
class BubbleInfo:
    """Individual bubble analysis result"""
    question_number: int
    option: str  # A, B, C, D
    x: int
    y: int
    radius: int
    fill_percentage: float
    is_filled: bool  # True if >= 40% filled
    confidence: float
    pixel_analysis: Dict[str, Any]
    quality_flags: List[str]

@dataclass
class QuestionAnalysis:
    """Complete question analysis result"""
    question_number: int
    column_number: int
    bubbles: Dict[str, BubbleInfo]  # A, B, C, D
    detected_answer: str
    confidence: float
    multiple_marks: bool
    no_marks: bool
    quality_score: float
    processing_notes: List[str]

@dataclass
class BubbleAnalysisResult:
    """Complete bubble analysis result"""
    extracted_answers: List[str]
    question_analyses: List[QuestionAnalysis]
    overall_confidence: float
    processing_time: float
    image_quality_metrics: Dict[str, float]
    layout_analysis: LayoutAnalysis
    bubble_detection_stats: Dict[str, Any]
    recommendations: List[str]

class EnhancedBubbleAnalyzer:
    """Enhanced bubble analyzer with precise 40%+ fill detection"""
    
    def __init__(self):
        self.debug_mode = True
        
        # Bubble detection parameters
        self.bubble_params = {
            'expected_radius': 15,  # Expected bubble radius in pixels
            'radius_tolerance': 5,  # ±5 pixels tolerance
            'fill_threshold': 0.40,  # 40% fill threshold
            'confidence_threshold': 0.7,
            'option_spacing': 35,  # Horizontal spacing between A, B, C, D
            'options': ['A', 'B', 'C', 'D']
        }
        
        # Pixel analysis parameters
        self.pixel_params = {
            'dark_threshold': 100,  # Pixels darker than this are considered "filled"
            'medium_threshold': 150,  # Medium darkness threshold
            'light_threshold': 200,  # Light threshold
            'noise_filter_size': 3,  # Morphological noise filter
            'edge_exclusion': 2  # Exclude edge pixels from analysis
        }
        
        # Quality assessment parameters
        self.quality_params = {
            'min_sharpness': 50.0,
            'min_contrast': 0.2,
            'min_brightness': 30.0,
            'max_brightness': 220.0,
            'uniformity_threshold': 0.8
        }
        
        # Initialize column detector
        self.column_detector = EnhancedColumnDetector()
    
    def analyze_bubbles(self, image_path: str, expected_questions: int = 40) -> BubbleAnalysisResult:
        """Main bubble analysis function"""
        logger.info("=== ENHANCED BUBBLE ANALYSIS STARTED ===")
        start_time = time.time()
        
        try:
            # Load and preprocess image
            image = cv2.imread(image_path)
            if image is None:
                raise ValueError(f"Could not load image: {image_path}")
            
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            height, width = gray.shape
            
            logger.info(f"📏 Image dimensions: {width}x{height}")
            logger.info(f"🎯 Expected questions: {expected_questions}")
            
            # Step 1: Analyze layout structure
            layout_analysis = self.column_detector.analyze_omr_layout(image_path)
            logger.info(f"📋 Layout analysis: {len(layout_analysis.columns)} columns, {layout_analysis.total_questions} questions")
            
            # Step 2: Assess image quality
            quality_metrics = self.assess_image_quality(gray)
            logger.info(f"📊 Image quality score: {quality_metrics['overall_score']:.2f}")
            
            # Step 3: Analyze bubbles for each question
            question_analyses = self.analyze_all_questions(gray, layout_analysis)
            logger.info(f"🔍 Analyzed {len(question_analyses)} questions")
            
            # Step 4: Extract final answers
            extracted_answers = self.extract_final_answers(question_analyses)
            
            # Step 5: Calculate overall confidence
            overall_confidence = self.calculate_overall_confidence(question_analyses, quality_metrics)
            
            # Step 6: Generate statistics and recommendations
            detection_stats = self.generate_detection_stats(question_analyses)
            recommendations = self.generate_recommendations(question_analyses, quality_metrics)
            
            processing_time = time.time() - start_time
            logger.info(f"✅ Bubble analysis completed in {processing_time:.2f}s")
            
            return BubbleAnalysisResult(
                extracted_answers=extracted_answers,
                question_analyses=question_analyses,
                overall_confidence=overall_confidence,
                processing_time=processing_time,
                image_quality_metrics=quality_metrics,
                layout_analysis=layout_analysis,
                bubble_detection_stats=detection_stats,
                recommendations=recommendations
            )
            
        except Exception as e:
            logger.error(f"❌ Bubble analysis failed: {e}")
            raise
    
    def assess_image_quality(self, gray_image: np.ndarray) -> Dict[str, float]:
        """Assess image quality for bubble detection"""
        logger.info("📊 Assessing image quality...")
        
        height, width = gray_image.shape
        
        # Sharpness (Laplacian variance)
        laplacian = cv2.Laplacian(gray_image, cv2.CV_64F)
        sharpness = laplacian.var()
        
        # Contrast (standard deviation)
        contrast = gray_image.std() / 255.0
        
        # Brightness (mean)
        brightness = gray_image.mean()
        
        # Noise level (estimate using median filter difference)
        median_filtered = cv2.medianBlur(gray_image, 5)
        noise_level = np.mean(np.abs(gray_image.astype(float) - median_filtered.astype(float)))
        
        # Overall quality score
        sharpness_score = min(sharpness / 100.0, 1.0)
        contrast_score = min(contrast / 0.3, 1.0)
        brightness_score = 1.0 - abs(brightness - 127.5) / 127.5  # Optimal brightness around 127.5
        noise_score = max(0, 1.0 - noise_level / 20.0)
        
        overall_score = (sharpness_score * 0.3 + contrast_score * 0.3 + 
                        brightness_score * 0.2 + noise_score * 0.2)
        
        metrics = {
            'sharpness': sharpness,
            'contrast': contrast,
            'brightness': brightness,
            'noise_level': noise_level,
            'sharpness_score': sharpness_score,
            'contrast_score': contrast_score,
            'brightness_score': brightness_score,
            'noise_score': noise_score,
            'overall_score': overall_score
        }
        
        logger.info(f"   Sharpness: {sharpness:.1f} (score: {sharpness_score:.2f})")
        logger.info(f"   Contrast: {contrast:.2f} (score: {contrast_score:.2f})")
        logger.info(f"   Brightness: {brightness:.1f} (score: {brightness_score:.2f})")
        logger.info(f"   Noise: {noise_level:.1f} (score: {noise_score:.2f})")
        logger.info(f"   Overall: {overall_score:.2f}")
        
        return metrics
    
    def analyze_all_questions(self, gray_image: np.ndarray, layout: LayoutAnalysis) -> List[QuestionAnalysis]:
        """Analyze bubbles for all questions"""
        logger.info("🔍 Analyzing bubbles for all questions...")
        
        question_analyses = []
        question_number = 1
        
        for column in layout.columns:
            logger.info(f"   Processing Column {column.column_number}: {column.question_count} questions")
            
            # Sort question positions by Y coordinate (top to bottom)
            sorted_positions = sorted(column.question_positions, key=lambda p: p[1])
            
            for pos_idx, (q_x, q_y) in enumerate(sorted_positions):
                # Analyze this question
                question_analysis = self.analyze_single_question(
                    gray_image, question_number, column.column_number, q_x, q_y
                )
                question_analyses.append(question_analysis)
                
                question_number += 1
        
        logger.info(f"   Completed analysis for {len(question_analyses)} questions")
        return question_analyses
    
    def analyze_single_question(self, gray_image: np.ndarray, question_num: int, column_num: int, q_x: int, q_y: int) -> QuestionAnalysis:
        """Analyze bubbles for a single question"""
        
        bubbles = {}
        option_spacing = self.bubble_params['option_spacing']
        
        # Analyze each option (A, B, C, D)
        for i, option in enumerate(self.bubble_params['options']):
            # Calculate bubble position
            bubble_x = q_x + 50 + (i * option_spacing)  # Start 50px right of question mark
            bubble_y = q_y
            
            # Analyze this bubble
            bubble_info = self.analyze_single_bubble(
                gray_image, question_num, option, bubble_x, bubble_y
            )
            bubbles[option] = bubble_info
        
        # Determine the detected answer
        detected_answer, confidence, multiple_marks, no_marks = self.determine_question_answer(bubbles)
        
        # Calculate quality score
        quality_score = self.calculate_question_quality(bubbles)
        
        # Generate processing notes
        processing_notes = self.generate_question_notes(bubbles, detected_answer, multiple_marks, no_marks)
        
        return QuestionAnalysis(
            question_number=question_num,
            column_number=column_num,
            bubbles=bubbles,
            detected_answer=detected_answer,
            confidence=confidence,
            multiple_marks=multiple_marks,
            no_marks=no_marks,
            quality_score=quality_score,
            processing_notes=processing_notes
        )
    
    def analyze_single_bubble(self, gray_image: np.ndarray, question_num: int, option: str, x: int, y: int) -> BubbleInfo:
        """Analyze a single bubble with 40%+ fill detection"""
        
        radius = self.bubble_params['expected_radius']
        
        # Extract bubble region
        y1 = max(0, y - radius)
        y2 = min(gray_image.shape[0], y + radius)
        x1 = max(0, x - radius)
        x2 = min(gray_image.shape[1], x + radius)
        
        bubble_region = gray_image[y1:y2, x1:x2]
        
        if bubble_region.size == 0:
            # Invalid region
            return BubbleInfo(
                question_number=question_num,
                option=option,
                x=x, y=y, radius=radius,
                fill_percentage=0.0,
                is_filled=False,
                confidence=0.0,
                pixel_analysis={},
                quality_flags=['invalid_region']
            )
        
        # Create circular mask
        h, w = bubble_region.shape
        center_y, center_x = h // 2, w // 2
        y_coords, x_coords = np.ogrid[:h, :w]
        mask = (x_coords - center_x) ** 2 + (y_coords - center_y) ** 2 <= radius ** 2
        
        # Apply edge exclusion
        edge_exclusion = self.pixel_params['edge_exclusion']
        inner_mask = (x_coords - center_x) ** 2 + (y_coords - center_y) ** 2 <= (radius - edge_exclusion) ** 2
        
        # Extract pixels within the bubble (excluding edges)
        bubble_pixels = bubble_region[inner_mask]
        
        if len(bubble_pixels) == 0:
            return BubbleInfo(
                question_number=question_num,
                option=option,
                x=x, y=y, radius=radius,
                fill_percentage=0.0,
                is_filled=False,
                confidence=0.0,
                pixel_analysis={},
                quality_flags=['no_pixels']
            )
        
        # Pixel analysis
        total_pixels = len(bubble_pixels)
        
        # Count pixels by darkness level
        very_dark_pixels = np.sum(bubble_pixels < self.pixel_params['dark_threshold'])
        medium_pixels = np.sum((bubble_pixels >= self.pixel_params['dark_threshold']) & 
                              (bubble_pixels < self.pixel_params['medium_threshold']))
        light_pixels = np.sum(bubble_pixels >= self.pixel_params['medium_threshold'])
        
        # Calculate fill percentage (weighted by darkness)
        # Very dark pixels count as 100% fill
        # Medium pixels count as 50% fill
        # Light pixels count as 0% fill
        weighted_fill = (very_dark_pixels * 1.0 + medium_pixels * 0.5) / total_pixels
        fill_percentage = weighted_fill
        
        # Alternative fill calculation (simple dark pixel ratio)
        simple_fill = very_dark_pixels / total_pixels
        
        # Use the higher of the two calculations for better sensitivity
        final_fill_percentage = max(fill_percentage, simple_fill)
        
        # Determine if bubble is filled (40% threshold)
        is_filled = final_fill_percentage >= self.bubble_params['fill_threshold']
        
        # Calculate confidence based on fill clarity
        if final_fill_percentage >= 0.7:
            confidence = 0.95  # Very confident - clearly filled
        elif final_fill_percentage >= 0.5:
            confidence = 0.85  # Confident - well filled
        elif final_fill_percentage >= 0.4:
            confidence = 0.75  # Moderately confident - just above threshold
        elif final_fill_percentage >= 0.2:
            confidence = 0.6   # Low confidence - partially filled
        else:
            confidence = 0.9   # High confidence it's empty
        
        # Quality assessment
        quality_flags = []
        
        # Check for uniformity
        pixel_std = np.std(bubble_pixels)
        if pixel_std > 50:
            quality_flags.append('non_uniform_fill')
        
        # Check for noise
        if pixel_std < 10 and final_fill_percentage < 0.1:
            quality_flags.append('very_clean_empty')
        elif pixel_std < 15 and final_fill_percentage > 0.8:
            quality_flags.append('very_clean_filled')
        
        # Check brightness
        mean_brightness = np.mean(bubble_pixels)
        if mean_brightness < 50:
            quality_flags.append('very_dark')
        elif mean_brightness > 200:
            quality_flags.append('very_light')
        
        pixel_analysis = {
            'total_pixels': int(total_pixels),
            'very_dark_pixels': int(very_dark_pixels),
            'medium_pixels': int(medium_pixels),
            'light_pixels': int(light_pixels),
            'mean_brightness': float(mean_brightness),
            'pixel_std': float(pixel_std),
            'weighted_fill': float(weighted_fill),
            'simple_fill': float(simple_fill),
            'final_fill': float(final_fill_percentage)
        }
        
        return BubbleInfo(
            question_number=question_num,
            option=option,
            x=x, y=y, radius=radius,
            fill_percentage=final_fill_percentage,
            is_filled=is_filled,
            confidence=confidence,
            pixel_analysis=pixel_analysis,
            quality_flags=quality_flags
        )
    
    def determine_question_answer(self, bubbles: Dict[str, BubbleInfo]) -> Tuple[str, float, bool, bool]:
        """Determine the answer for a question based on bubble analysis"""
        
        filled_bubbles = [(option, bubble) for option, bubble in bubbles.items() if bubble.is_filled]
        
        # No marks detected
        if len(filled_bubbles) == 0:
            return '', 0.5, False, True
        
        # Multiple marks detected
        if len(filled_bubbles) > 1:
            # Choose the most filled one
            best_option, best_bubble = max(filled_bubbles, key=lambda x: x[1].fill_percentage)
            return best_option, best_bubble.confidence * 0.7, True, False  # Reduce confidence for multiple marks
        
        # Single mark detected
        option, bubble = filled_bubbles[0]
        return option, bubble.confidence, False, False
    
    def calculate_question_quality(self, bubbles: Dict[str, BubbleInfo]) -> float:
        """Calculate quality score for a question"""
        
        confidences = [bubble.confidence for bubble in bubbles.values()]
        avg_confidence = np.mean(confidences)
        
        # Check for quality flags
        total_flags = sum(len(bubble.quality_flags) for bubble in bubbles.values())
        flag_penalty = min(total_flags * 0.1, 0.3)
        
        quality_score = max(0.0, avg_confidence - flag_penalty)
        return quality_score
    
    def generate_question_notes(self, bubbles: Dict[str, BubbleInfo], answer: str, multiple_marks: bool, no_marks: bool) -> List[str]:
        """Generate processing notes for a question"""
        notes = []
        
        if no_marks:
            notes.append("No marks detected")
        elif multiple_marks:
            filled_options = [opt for opt, bubble in bubbles.items() if bubble.is_filled]
            notes.append(f"Multiple marks detected: {', '.join(filled_options)}")
        else:
            notes.append(f"Single mark detected: {answer}")
        
        # Add fill percentage info
        for option, bubble in bubbles.items():
            if bubble.fill_percentage > 0.1:  # Only mention bubbles with some fill
                notes.append(f"{option}: {bubble.fill_percentage:.1%} filled")
        
        return notes
    
    def extract_final_answers(self, question_analyses: List[QuestionAnalysis]) -> List[str]:
        """Extract final answers from question analyses"""
        answers = []
        
        for analysis in question_analyses:
            answers.append(analysis.detected_answer)
        
        return answers
    
    def calculate_overall_confidence(self, question_analyses: List[QuestionAnalysis], quality_metrics: Dict[str, float]) -> float:
        """Calculate overall confidence score"""
        
        if not question_analyses:
            return 0.0
        
        # Average question confidence
        question_confidences = [q.confidence for q in question_analyses]
        avg_question_confidence = np.mean(question_confidences)
        
        # Image quality factor
        image_quality_factor = quality_metrics['overall_score']
        
        # Problem detection penalty
        multiple_marks_count = sum(1 for q in question_analyses if q.multiple_marks)
        no_marks_count = sum(1 for q in question_analyses if q.no_marks)
        
        problem_penalty = (multiple_marks_count + no_marks_count) * 0.05
        
        overall_confidence = max(0.0, min(1.0, 
            avg_question_confidence * 0.7 + 
            image_quality_factor * 0.3 - 
            problem_penalty
        ))
        
        return overall_confidence
    
    def generate_detection_stats(self, question_analyses: List[QuestionAnalysis]) -> Dict[str, Any]:
        """Generate bubble detection statistics"""
        
        total_questions = len(question_analyses)
        answered_questions = sum(1 for q in question_analyses if q.detected_answer)
        blank_questions = sum(1 for q in question_analyses if q.no_marks)
        multiple_marks = sum(1 for q in question_analyses if q.multiple_marks)
        
        # Fill percentage distribution
        all_fill_percentages = []
        for analysis in question_analyses:
            for bubble in analysis.bubbles.values():
                all_fill_percentages.append(bubble.fill_percentage)
        
        stats = {
            'total_questions': total_questions,
            'answered_questions': answered_questions,
            'blank_questions': blank_questions,
            'multiple_marks': multiple_marks,
            'answer_rate': answered_questions / total_questions if total_questions > 0 else 0,
            'fill_percentage_stats': {
                'mean': float(np.mean(all_fill_percentages)) if all_fill_percentages else 0,
                'std': float(np.std(all_fill_percentages)) if all_fill_percentages else 0,
                'min': float(np.min(all_fill_percentages)) if all_fill_percentages else 0,
                'max': float(np.max(all_fill_percentages)) if all_fill_percentages else 0
            }
        }
        
        return stats
    
    def generate_recommendations(self, question_analyses: List[QuestionAnalysis], quality_metrics: Dict[str, float]) -> List[str]:
        """Generate recommendations based on analysis"""
        recommendations = []
        
        # Image quality recommendations
        if quality_metrics['overall_score'] < 0.7:
            recommendations.append("⚠️ Image quality is below optimal - consider rescanning")
            
            if quality_metrics['sharpness_score'] < 0.6:
                recommendations.append("📷 Image appears blurry - ensure camera is focused")
            
            if quality_metrics['contrast_score'] < 0.6:
                recommendations.append("🔆 Low contrast - improve lighting conditions")
            
            if quality_metrics['brightness_score'] < 0.6:
                recommendations.append("💡 Brightness issues - adjust lighting or camera settings")
        
        # Detection issue recommendations
        multiple_marks_count = sum(1 for q in question_analyses if q.multiple_marks)
        if multiple_marks_count > 0:
            recommendations.append(f"✏️ {multiple_marks_count} questions have multiple marks - review manually")
        
        blank_questions_count = sum(1 for q in question_analyses if q.no_marks)
        if blank_questions_count > len(question_analyses) * 0.2:  # More than 20% blank
            recommendations.append("❓ High number of blank answers - verify image alignment")
        
        # Success recommendations
        if quality_metrics['overall_score'] >= 0.8 and multiple_marks_count == 0:
            recommendations.append("✅ Excellent scan quality - results are highly reliable")
        
        return recommendations

def main():
    """Test the enhanced bubble analyzer"""
    import sys
    
    if len(sys.argv) != 2:
        print("Usage: python enhanced_bubble_analyzer.py <image_path>")
        sys.exit(1)
    
    image_path = sys.argv[1]
    
    analyzer = EnhancedBubbleAnalyzer()
    
    try:
        result = analyzer.analyze_bubbles(image_path)
        
        print("\n" + "="*60)
        print("ENHANCED BUBBLE ANALYSIS RESULTS")
        print("="*60)
        
        print(f"\n📊 ANALYSIS SUMMARY:")
        print(f"   Processing Time: {result.processing_time:.2f}s")
        print(f"   Overall Confidence: {result.overall_confidence:.2f}")
        print(f"   Questions Analyzed: {len(result.question_analyses)}")
        print(f"   Image Quality Score: {result.image_quality_metrics['overall_score']:.2f}")
        
        print(f"\n🎯 DETECTION STATISTICS:")
        stats = result.bubble_detection_stats
        print(f"   Total Questions: {stats['total_questions']}")
        print(f"   Answered Questions: {stats['answered_questions']}")
        print(f"   Blank Questions: {stats['blank_questions']}")
        print(f"   Multiple Marks: {stats['multiple_marks']}")
        print(f"   Answer Rate: {stats['answer_rate']:.1%}")
        
        print(f"\n📝 EXTRACTED ANSWERS:")
        for i, answer in enumerate(result.extracted_answers, 1):
            print(f"   Q{i:2d}: {answer if answer else '(blank)'}")
        
        print(f"\n💡 RECOMMENDATIONS:")
        for rec in result.recommendations:
            print(f"   • {rec}")
        
        # Save detailed results
        output_file = image_path.replace('.jpg', '_bubble_analysis.json').replace('.png', '_bubble_analysis.json')
        
        # Prepare detailed results for JSON
        detailed_results = {
            'summary': {
                'processing_time': result.processing_time,
                'overall_confidence': result.overall_confidence,
                'questions_analyzed': len(result.question_analyses),
                'extracted_answers': result.extracted_answers
            },
            'image_quality': result.image_quality_metrics,
            'detection_stats': result.bubble_detection_stats,
            'layout_analysis': {
                'total_columns': len(result.layout_analysis.columns),
                'total_questions': result.layout_analysis.total_questions,
                'column_spacing': result.layout_analysis.column_spacing,
                'question_spacing': result.layout_analysis.question_spacing,
                'layout_confidence': result.layout_analysis.layout_confidence
            },
            'question_details': [
                {
                    'question_number': q.question_number,
                    'column_number': q.column_number,
                    'detected_answer': q.detected_answer,
                    'confidence': q.confidence,
                    'multiple_marks': q.multiple_marks,
                    'no_marks': q.no_marks,
                    'quality_score': q.quality_score,
                    'bubble_fill_percentages': {
                        option: bubble.fill_percentage 
                        for option, bubble in q.bubbles.items()
                    },
                    'processing_notes': q.processing_notes
                }
                for q in result.question_analyses
            ],
            'recommendations': result.recommendations
        }
        
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(detailed_results, f, indent=2, ensure_ascii=False)
        
        print(f"\n💾 Detailed results saved to: {output_file}")
        
    except Exception as e:
        logger.error(f"❌ Analysis failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()