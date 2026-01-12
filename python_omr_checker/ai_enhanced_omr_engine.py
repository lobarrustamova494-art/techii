#!/usr/bin/env python3
"""
AI Enhanced OMR Engine
Combines column detection, bubble analysis, and AI processing
Implements the requested features:
1. Differentiate column alignment marks (3 per column) from question marks (1 per question)
2. Detect questions per column and column spacing
3. Coordinate-based bubble detection
4. 40%+ fill threshold for marked bubbles
"""

import cv2
import numpy as np
import json
import logging
from typing import List, Dict, Tuple, Optional, Any
from dataclasses import dataclass, asdict
import time
import math
from enhanced_column_detector import EnhancedColumnDetector, LayoutAnalysis
from enhanced_bubble_analyzer import EnhancedBubbleAnalyzer, BubbleAnalysisResult

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@dataclass
class AIOMRResult:
    """Complete AI OMR processing result"""
    # Main results
    extracted_answers: List[str]
    confidence: float
    processing_time: float
    
    # Layout analysis
    layout_analysis: Dict[str, Any]
    
    # Bubble analysis
    bubble_analysis: Dict[str, Any]
    
    # Quality metrics
    image_quality: Dict[str, float]
    
    # Processing details
    processing_details: Dict[str, Any]
    
    # Recommendations
    recommendations: List[str]
    
    # Error flags
    error_flags: List[str]

class AIEnhancedOMREngine:
    """AI Enhanced OMR Engine with advanced column and bubble detection"""
    
    def __init__(self):
        self.debug_mode = True
        
        # Initialize components
        self.column_detector = EnhancedColumnDetector()
        self.bubble_analyzer = EnhancedBubbleAnalyzer()
        
        # Processing parameters
        self.processing_params = {
            'expected_questions': 40,
            'expected_columns': 3,
            'min_confidence_threshold': 0.6,
            'quality_threshold': 0.5,
            'enable_ai_correction': True,
            'enable_multi_pass': True
        }
        
        # AI correction parameters
        self.ai_params = {
            'pattern_recognition': True,
            'consistency_check': True,
            'statistical_validation': True,
            'outlier_detection': True
        }
    
    def process_omr_with_ai(self, image_path: str, answer_key: Optional[List[str]] = None) -> AIOMRResult:
        """Main AI OMR processing function"""
        logger.info("=== AI ENHANCED OMR PROCESSING STARTED ===")
        start_time = time.time()
        
        try:
            # Step 1: Validate input
            if not self._validate_image(image_path):
                raise ValueError("Invalid image file")
            
            logger.info(f"📁 Processing image: {image_path}")
            if answer_key:
                logger.info(f"🔑 Answer key provided: {len(answer_key)} questions")
            
            # Step 2: Layout Analysis (Column Detection)
            logger.info("\n🏗️ STEP 1: LAYOUT ANALYSIS")
            layout_result = self.column_detector.analyze_omr_layout(image_path)
            
            self._log_layout_summary(layout_result)
            
            # Step 3: Bubble Analysis
            logger.info("\n🔍 STEP 2: BUBBLE ANALYSIS")
            bubble_result = self.bubble_analyzer.analyze_bubbles(
                image_path, 
                expected_questions=self.processing_params['expected_questions']
            )
            
            self._log_bubble_summary(bubble_result)
            
            # Step 4: AI Processing and Validation
            logger.info("\n🧠 STEP 3: AI PROCESSING")
            ai_processed_answers = self._apply_ai_processing(bubble_result, layout_result, answer_key)
            
            # Step 5: Quality Assessment
            logger.info("\n📊 STEP 4: QUALITY ASSESSMENT")
            quality_assessment = self._assess_overall_quality(layout_result, bubble_result)
            
            # Step 6: Generate Recommendations
            logger.info("\n💡 STEP 5: RECOMMENDATIONS")
            recommendations = self._generate_comprehensive_recommendations(
                layout_result, bubble_result, quality_assessment
            )
            
            # Step 7: Compile Final Results
            processing_time = time.time() - start_time
            
            final_result = AIOMRResult(
                extracted_answers=ai_processed_answers['final_answers'],
                confidence=ai_processed_answers['confidence'],
                processing_time=processing_time,
                layout_analysis=self._serialize_layout_analysis(layout_result),
                bubble_analysis=self._serialize_bubble_analysis(bubble_result),
                image_quality=bubble_result.image_quality_metrics,
                processing_details=ai_processed_answers['processing_details'],
                recommendations=recommendations,
                error_flags=ai_processed_answers['error_flags']
            )
            
            logger.info(f"\n✅ AI OMR processing completed in {processing_time:.2f}s")
            logger.info(f"📊 Final confidence: {final_result.confidence:.2f}")
            logger.info(f"🎯 Answers extracted: {len([a for a in final_result.extracted_answers if a])}/{len(final_result.extracted_answers)}")
            
            return final_result
            
        except Exception as e:
            logger.error(f"❌ AI OMR processing failed: {e}")
            raise
    
    def _validate_image(self, image_path: str) -> bool:
        """Validate input image"""
        try:
            image = cv2.imread(image_path)
            if image is None:
                return False
            
            height, width = image.shape[:2]
            
            # Check minimum dimensions
            if width < 800 or height < 1000:
                logger.warning(f"⚠️ Image dimensions ({width}x{height}) may be too small")
                return False
            
            # Check file size
            import os
            file_size = os.path.getsize(image_path)
            if file_size < 50000:  # Less than 50KB
                logger.warning(f"⚠️ Image file size ({file_size} bytes) may be too small")
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Image validation failed: {e}")
            return False
    
    def _log_layout_summary(self, layout_result: LayoutAnalysis):
        """Log layout analysis summary"""
        logger.info(f"   📋 Columns detected: {len(layout_result.columns)}")
        logger.info(f"   🎯 Total questions: {layout_result.total_questions}")
        logger.info(f"   📏 Column spacing: {layout_result.column_spacing}px")
        logger.info(f"   📐 Question spacing: {layout_result.question_spacing}px")
        logger.info(f"   ✅ Layout confidence: {layout_result.layout_confidence:.2f}")
        
        # Column details
        for column in layout_result.columns:
            logger.info(f"      Column {column.column_number}: {column.question_count} questions, {len(column.alignment_marks)} marks")
        
        # Alignment marks summary
        logger.info(f"   🎯 Alignment marks: {len(layout_result.column_alignment_marks)} column, {len(layout_result.question_alignment_marks)} question")
    
    def _log_bubble_summary(self, bubble_result: BubbleAnalysisResult):
        """Log bubble analysis summary"""
        logger.info(f"   🔍 Questions analyzed: {len(bubble_result.question_analyses)}")
        logger.info(f"   ✅ Overall confidence: {bubble_result.overall_confidence:.2f}")
        logger.info(f"   📊 Image quality: {bubble_result.image_quality_metrics['overall_score']:.2f}")
        
        stats = bubble_result.bubble_detection_stats
        logger.info(f"   📝 Answered: {stats['answered_questions']}/{stats['total_questions']}")
        logger.info(f"   ❓ Blank: {stats['blank_questions']}")
        logger.info(f"   ⚠️ Multiple marks: {stats['multiple_marks']}")
    
    def _apply_ai_processing(self, bubble_result: BubbleAnalysisResult, layout_result: LayoutAnalysis, answer_key: Optional[List[str]]) -> Dict[str, Any]:
        """Apply AI processing and validation"""
        
        initial_answers = bubble_result.extracted_answers
        processing_details = {
            'initial_detection': len([a for a in initial_answers if a]),
            'ai_corrections': 0,
            'pattern_corrections': 0,
            'consistency_corrections': 0,
            'statistical_corrections': 0
        }
        
        error_flags = []
        
        # Start with initial answers
        processed_answers = initial_answers.copy()
        
        # AI Processing Step 1: Pattern Recognition
        if self.ai_params['pattern_recognition']:
            pattern_corrections = self._apply_pattern_recognition(processed_answers, bubble_result)
            processed_answers = pattern_corrections['answers']
            processing_details['pattern_corrections'] = pattern_corrections['corrections_made']
            error_flags.extend(pattern_corrections['flags'])
        
        # AI Processing Step 2: Consistency Check
        if self.ai_params['consistency_check']:
            consistency_corrections = self._apply_consistency_check(processed_answers, bubble_result, layout_result)
            processed_answers = consistency_corrections['answers']
            processing_details['consistency_corrections'] = consistency_corrections['corrections_made']
            error_flags.extend(consistency_corrections['flags'])
        
        # AI Processing Step 3: Statistical Validation
        if self.ai_params['statistical_validation']:
            statistical_corrections = self._apply_statistical_validation(processed_answers, bubble_result)
            processed_answers = statistical_corrections['answers']
            processing_details['statistical_corrections'] = statistical_corrections['corrections_made']
            error_flags.extend(statistical_corrections['flags'])
        
        # AI Processing Step 4: Outlier Detection
        if self.ai_params['outlier_detection']:
            outlier_corrections = self._detect_and_correct_outliers(processed_answers, bubble_result)
            processed_answers = outlier_corrections['answers']
            processing_details['outlier_corrections'] = outlier_corrections['corrections_made']
            error_flags.extend(outlier_corrections['flags'])
        
        # Calculate final confidence
        total_corrections = sum([
            processing_details['pattern_corrections'],
            processing_details['consistency_corrections'],
            processing_details['statistical_corrections'],
            processing_details.get('outlier_corrections', 0)
        ])
        
        # Base confidence from bubble analysis
        base_confidence = bubble_result.overall_confidence
        
        # Adjust confidence based on corrections
        correction_penalty = min(total_corrections * 0.05, 0.2)  # Max 20% penalty
        layout_bonus = layout_result.layout_confidence * 0.1  # Up to 10% bonus
        
        final_confidence = max(0.0, min(1.0, base_confidence - correction_penalty + layout_bonus))
        
        processing_details['total_corrections'] = total_corrections
        processing_details['base_confidence'] = base_confidence
        processing_details['correction_penalty'] = correction_penalty
        processing_details['layout_bonus'] = layout_bonus
        
        return {
            'final_answers': processed_answers,
            'confidence': final_confidence,
            'processing_details': processing_details,
            'error_flags': list(set(error_flags))  # Remove duplicates
        }
    
    def _apply_pattern_recognition(self, answers: List[str], bubble_result: BubbleAnalysisResult) -> Dict[str, Any]:
        """Apply pattern recognition to improve answers"""
        corrected_answers = answers.copy()
        corrections_made = 0
        flags = []
        
        # Pattern 1: Check for very low confidence answers that might be misdetected
        for i, analysis in enumerate(bubble_result.question_analyses):
            if analysis.confidence < 0.5 and analysis.detected_answer:
                # Check if there's a bubble with higher fill percentage but below threshold
                best_bubble = None
                best_fill = 0
                
                for option, bubble in analysis.bubbles.items():
                    if bubble.fill_percentage > best_fill:
                        best_fill = bubble.fill_percentage
                        best_bubble = option
                
                # If the best bubble has significant fill (30%+) but was below 40% threshold
                if best_fill >= 0.30 and best_bubble != analysis.detected_answer:
                    corrected_answers[i] = best_bubble
                    corrections_made += 1
                    flags.append(f'pattern_correction_q{i+1}')
        
        # Pattern 2: Check for systematic bias in bubble detection
        # (This would be more sophisticated in a real AI system)
        
        return {
            'answers': corrected_answers,
            'corrections_made': corrections_made,
            'flags': flags
        }
    
    def _apply_consistency_check(self, answers: List[str], bubble_result: BubbleAnalysisResult, layout_result: LayoutAnalysis) -> Dict[str, Any]:
        """Apply consistency checks across columns and questions"""
        corrected_answers = answers.copy()
        corrections_made = 0
        flags = []
        
        # Consistency Check 1: Column-wise answer distribution
        # Check if one column has significantly different answer patterns
        column_answers = {}
        for i, analysis in enumerate(bubble_result.question_analyses):
            col_num = analysis.column_number
            if col_num not in column_answers:
                column_answers[col_num] = []
            column_answers[col_num].append((i, analysis.detected_answer))
        
        # Check for columns with too many blanks (might indicate detection issues)
        for col_num, col_answers in column_answers.items():
            blank_ratio = sum(1 for _, answer in col_answers if not answer) / len(col_answers)
            if blank_ratio > 0.5:  # More than 50% blank in one column
                flags.append(f'high_blank_ratio_column_{col_num}')
                
                # Try to recover some answers by lowering threshold for this column
                for q_idx, answer in col_answers:
                    if not answer:  # Currently blank
                        analysis = bubble_result.question_analyses[q_idx]
                        # Find bubble with highest fill percentage
                        best_option = None
                        best_fill = 0
                        for option, bubble in analysis.bubbles.items():
                            if bubble.fill_percentage > best_fill:
                                best_fill = bubble.fill_percentage
                                best_option = option
                        
                        # If best bubble has at least 25% fill, consider it marked
                        if best_fill >= 0.25:
                            corrected_answers[q_idx] = best_option
                            corrections_made += 1
                            flags.append(f'consistency_recovery_q{q_idx+1}')
        
        return {
            'answers': corrected_answers,
            'corrections_made': corrections_made,
            'flags': flags
        }
    
    def _apply_statistical_validation(self, answers: List[str], bubble_result: BubbleAnalysisResult) -> Dict[str, Any]:
        """Apply statistical validation"""
        corrected_answers = answers.copy()
        corrections_made = 0
        flags = []
        
        # Statistical Check 1: Answer distribution
        # In a typical exam, answers should be somewhat distributed across A, B, C, D
        answer_counts = {'A': 0, 'B': 0, 'C': 0, 'D': 0, '': 0}
        for answer in answers:
            answer_counts[answer] += 1
        
        total_answered = sum(answer_counts[opt] for opt in ['A', 'B', 'C', 'D'])
        
        if total_answered > 0:
            # Check for extreme bias (one option > 70% of answers)
            for option in ['A', 'B', 'C', 'D']:
                ratio = answer_counts[option] / total_answered
                if ratio > 0.7:
                    flags.append(f'extreme_bias_option_{option}')
        
        # Statistical Check 2: Confidence distribution
        confidences = [analysis.confidence for analysis in bubble_result.question_analyses]
        avg_confidence = np.mean(confidences)
        
        if avg_confidence < 0.6:
            flags.append('low_average_confidence')
        
        return {
            'answers': corrected_answers,
            'corrections_made': corrections_made,
            'flags': flags
        }
    
    def _detect_and_correct_outliers(self, answers: List[str], bubble_result: BubbleAnalysisResult) -> Dict[str, Any]:
        """Detect and correct outlier answers"""
        corrected_answers = answers.copy()
        corrections_made = 0
        flags = []
        
        # Outlier Detection 1: Questions with multiple marks but very close fill percentages
        for i, analysis in enumerate(bubble_result.question_analyses):
            if analysis.multiple_marks:
                # Get fill percentages for all bubbles
                fills = [(opt, bubble.fill_percentage) for opt, bubble in analysis.bubbles.items()]
                fills.sort(key=lambda x: x[1], reverse=True)  # Sort by fill percentage
                
                # If top two are very close (within 10%), choose the higher one
                if len(fills) >= 2 and fills[0][1] - fills[1][1] < 0.1:
                    corrected_answers[i] = fills[0][0]  # Choose the highest
                    corrections_made += 1
                    flags.append(f'outlier_multiple_close_q{i+1}')
        
        return {
            'answers': corrected_answers,
            'corrections_made': corrections_made,
            'flags': flags
        }
    
    def _assess_overall_quality(self, layout_result: LayoutAnalysis, bubble_result: BubbleAnalysisResult) -> Dict[str, float]:
        """Assess overall processing quality"""
        
        # Layout quality factors
        layout_quality = layout_result.layout_confidence
        
        # Bubble detection quality factors
        bubble_quality = bubble_result.overall_confidence
        
        # Image quality factors
        image_quality = bubble_result.image_quality_metrics['overall_score']
        
        # Detection completeness
        stats = bubble_result.bubble_detection_stats
        completeness = stats['answer_rate']
        
        # Problem indicators
        problem_ratio = (stats['multiple_marks'] + stats['blank_questions']) / stats['total_questions']
        problem_penalty = min(problem_ratio * 0.5, 0.3)
        
        # Overall quality score
        overall_quality = max(0.0, min(1.0,
            layout_quality * 0.2 +
            bubble_quality * 0.3 +
            image_quality * 0.3 +
            completeness * 0.2 -
            problem_penalty
        ))
        
        return {
            'layout_quality': layout_quality,
            'bubble_quality': bubble_quality,
            'image_quality': image_quality,
            'completeness': completeness,
            'problem_ratio': problem_ratio,
            'overall_quality': overall_quality
        }
    
    def _generate_comprehensive_recommendations(self, layout_result: LayoutAnalysis, bubble_result: BubbleAnalysisResult, quality_assessment: Dict[str, float]) -> List[str]:
        """Generate comprehensive recommendations"""
        recommendations = []
        
        # Overall quality recommendations
        overall_quality = quality_assessment['overall_quality']
        
        if overall_quality >= 0.9:
            recommendations.append("✅ Excellent processing quality - results are highly reliable")
        elif overall_quality >= 0.7:
            recommendations.append("✅ Good processing quality - results are reliable")
        elif overall_quality >= 0.5:
            recommendations.append("⚠️ Moderate processing quality - review flagged questions")
        else:
            recommendations.append("❌ Low processing quality - manual review recommended")
        
        # Layout-specific recommendations
        if layout_result.layout_confidence < 0.7:
            recommendations.append("📋 Layout detection issues - check image alignment and quality")
        
        if len(layout_result.columns) != 3:
            recommendations.append(f"📊 Expected 3 columns, found {len(layout_result.columns)} - verify image format")
        
        # Bubble detection recommendations
        stats = bubble_result.bubble_detection_stats
        
        if stats['multiple_marks'] > 0:
            recommendations.append(f"✏️ {stats['multiple_marks']} questions have multiple marks - review manually")
        
        if stats['blank_questions'] > stats['total_questions'] * 0.2:
            recommendations.append("❓ High number of blank answers - check bubble fill threshold")
        
        # Image quality recommendations
        image_quality = bubble_result.image_quality_metrics
        
        if image_quality['sharpness_score'] < 0.6:
            recommendations.append("📷 Image sharpness is low - ensure camera focus")
        
        if image_quality['contrast_score'] < 0.6:
            recommendations.append("🔆 Image contrast is low - improve lighting")
        
        if image_quality['brightness_score'] < 0.6:
            recommendations.append("💡 Image brightness issues - adjust lighting or exposure")
        
        # Add bubble-specific recommendations
        recommendations.extend(bubble_result.recommendations)
        
        return recommendations
    
    def _serialize_layout_analysis(self, layout_result: LayoutAnalysis) -> Dict[str, Any]:
        """Serialize layout analysis for JSON output"""
        return {
            'total_columns': len(layout_result.columns),
            'total_questions': layout_result.total_questions,
            'column_spacing': layout_result.column_spacing,
            'question_spacing': layout_result.question_spacing,
            'layout_confidence': layout_result.layout_confidence,
            'columns': [
                {
                    'column_number': col.column_number,
                    'question_count': col.question_count,
                    'x_start': col.x_start,
                    'x_end': col.x_end,
                    'column_width': col.column_width,
                    'alignment_marks_count': len(col.alignment_marks),
                    'questions_per_column': col.questions_per_column
                }
                for col in layout_result.columns
            ],
            'alignment_marks': {
                'column_marks': len(layout_result.column_alignment_marks),
                'question_marks': len(layout_result.question_alignment_marks),
                'total_marks': len(layout_result.column_alignment_marks) + len(layout_result.question_alignment_marks)
            },
            'processing_notes': layout_result.processing_notes
        }
    
    def _serialize_bubble_analysis(self, bubble_result: BubbleAnalysisResult) -> Dict[str, Any]:
        """Serialize bubble analysis for JSON output"""
        return {
            'processing_time': bubble_result.processing_time,
            'overall_confidence': bubble_result.overall_confidence,
            'detection_stats': bubble_result.bubble_detection_stats,
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
                    }
                }
                for q in bubble_result.question_analyses
            ]
        }

def main():
    """Test the AI Enhanced OMR Engine"""
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python ai_enhanced_omr_engine.py <image_path> [answer_key_file]")
        sys.exit(1)
    
    image_path = sys.argv[1]
    answer_key = None
    
    # Load answer key if provided
    if len(sys.argv) > 2:
        try:
            with open(sys.argv[2], 'r') as f:
                answer_key_data = json.load(f)
                answer_key = answer_key_data.get('answers', [])
        except Exception as e:
            logger.warning(f"Could not load answer key: {e}")
    
    # Initialize and run AI OMR Engine
    engine = AIEnhancedOMREngine()
    
    try:
        result = engine.process_omr_with_ai(image_path, answer_key)
        
        print("\n" + "="*80)
        print("AI ENHANCED OMR PROCESSING RESULTS")
        print("="*80)
        
        print(f"\n📊 PROCESSING SUMMARY:")
        print(f"   Processing Time: {result.processing_time:.2f}s")
        print(f"   Overall Confidence: {result.confidence:.2f}")
        print(f"   Questions Processed: {len(result.extracted_answers)}")
        print(f"   Answers Detected: {len([a for a in result.extracted_answers if a])}")
        
        print(f"\n🏗️ LAYOUT ANALYSIS:")
        layout = result.layout_analysis
        print(f"   Columns Detected: {layout['total_columns']}")
        print(f"   Total Questions: {layout['total_questions']}")
        print(f"   Column Spacing: {layout['column_spacing']}px")
        print(f"   Question Spacing: {layout['question_spacing']}px")
        print(f"   Layout Confidence: {layout['layout_confidence']:.2f}")
        
        print(f"\n🎯 ALIGNMENT MARKS:")
        marks = layout['alignment_marks']
        print(f"   Column Marks: {marks['column_marks']} (3 per column)")
        print(f"   Question Marks: {marks['question_marks']} (1 per question)")
        print(f"   Total Marks: {marks['total_marks']}")
        
        print(f"\n📋 COLUMN DETAILS:")
        for col in layout['columns']:
            print(f"   Column {col['column_number']}:")
            print(f"      Questions: {col['question_count']}")
            print(f"      Width: {col['column_width']}px")
            print(f"      Range: x={col['x_start']}-{col['x_end']}")
            print(f"      Alignment Marks: {col['alignment_marks_count']}")
        
        print(f"\n🔍 BUBBLE ANALYSIS:")
        bubble = result.bubble_analysis
        stats = bubble['detection_stats']
        print(f"   Total Questions: {stats['total_questions']}")
        print(f"   Answered Questions: {stats['answered_questions']}")
        print(f"   Blank Questions: {stats['blank_questions']}")
        print(f"   Multiple Marks: {stats['multiple_marks']}")
        print(f"   Answer Rate: {stats['answer_rate']:.1%}")
        
        print(f"\n📝 EXTRACTED ANSWERS:")
        for i, answer in enumerate(result.extracted_answers, 1):
            print(f"   Q{i:2d}: {answer if answer else '(blank)'}")
        
        print(f"\n🧠 AI PROCESSING DETAILS:")
        details = result.processing_details
        print(f"   Pattern Corrections: {details.get('pattern_corrections', 0)}")
        print(f"   Consistency Corrections: {details.get('consistency_corrections', 0)}")
        print(f"   Statistical Corrections: {details.get('statistical_corrections', 0)}")
        print(f"   Total Corrections: {details.get('total_corrections', 0)}")
        
        if result.error_flags:
            print(f"\n⚠️ ERROR FLAGS:")
            for flag in result.error_flags:
                print(f"   • {flag}")
        
        print(f"\n💡 RECOMMENDATIONS:")
        for rec in result.recommendations:
            print(f"   • {rec}")
        
        # Save comprehensive results
        output_file = image_path.replace('.jpg', '_ai_omr_results.json').replace('.png', '_ai_omr_results.json')
        
        # Convert dataclass to dict for JSON serialization
        result_dict = asdict(result)
        
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(result_dict, f, indent=2, ensure_ascii=False)
        
        print(f"\n💾 Comprehensive results saved to: {output_file}")
        
        # Also save just the answers in simple format
        answers_file = image_path.replace('.jpg', '_answers.json').replace('.png', '_answers.json')
        answers_data = {
            'extracted_answers': result.extracted_answers,
            'confidence': result.confidence,
            'processing_time': result.processing_time,
            'total_questions': len(result.extracted_answers),
            'answered_questions': len([a for a in result.extracted_answers if a]),
            'timestamp': time.strftime('%Y-%m-%d %H:%M:%S')
        }
        
        with open(answers_file, 'w', encoding='utf-8') as f:
            json.dump(answers_data, f, indent=2, ensure_ascii=False)
        
        print(f"📄 Simple answers saved to: {answers_file}")
        
    except Exception as e:
        logger.error(f"❌ AI OMR processing failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()