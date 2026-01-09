#!/usr/bin/env python3
"""
Enhanced OMR Processor with Universal Coordinate Detection
Har qanday OMR rasmini tahlil qilib, aniq koordinatalar bilan ishlaydi
"""

import cv2
import numpy as np
import json
import logging
from typing import List, Dict, Tuple, Optional, Any
from dataclasses import dataclass
import time
import sys
import os

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@dataclass
class BubbleCoordinate:
    """Bubble coordinate data structure"""
    x: int
    y: int
    option: str
    question_number: int
    question_type: str = 'multiple_choice_5'
    subject_name: Optional[str] = None
    section_name: Optional[str] = None

@dataclass
class OMRResult:
    """OMR processing result data structure"""
    extracted_answers: List[str]
    confidence: float
    processing_details: Dict[str, Any]
    detailed_results: List[Dict[str, Any]]

class EnhancedOMRProcessor:
    """Enhanced OMR Processor with Universal Coordinate Detection"""
    
    def __init__(self):
        self.debug_mode = False
        
        # Enhanced bubble detection parameters
        self.min_bubble_area = 150
        self.max_bubble_area = 4000
        self.aspect_ratio_tolerance = 0.4
        self.circularity_threshold = 0.2
        
        # Layout detection parameters
        self.row_tolerance = 50
        self.column_tolerance = 60
        self.min_bubbles_per_row = 3
        
        # Bubble analysis parameters
        self.detection_threshold = 0.35  # 35% minimum threshold
        self.high_confidence_threshold = 0.70
        self.very_high_confidence_threshold = 0.85
        
    def set_debug_mode(self, debug: bool):
        """Enable/disable debug mode"""
        self.debug_mode = debug
        
    def preprocess_image_enhanced(self, image_path: str) -> Tuple[np.ndarray, Dict[str, Any]]:
        """Enhanced image preprocessing"""
        logger.info(f"🔧 Enhanced preprocessing started: {image_path}")
        
        # Read image
        original = cv2.imread(image_path)
        if original is None:
            raise ValueError(f"Could not read image: {image_path}")
        
        # Convert to grayscale
        gray = cv2.cvtColor(original, cv2.COLOR_BGR2GRAY)
        height, width = gray.shape
        
        logger.info(f"📊 Image dimensions: {width}x{height}")
        
        # Noise reduction
        denoised = cv2.medianBlur(gray, 3)
        
        # Contrast enhancement
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
        enhanced = clahe.apply(denoised)
        
        # Quality assessment
        quality_score = self._assess_image_quality(enhanced)
        
        metadata = {
            'width': width,
            'height': height,
            'quality_score': quality_score,
            'preprocessing_method': 'enhanced_clahe'
        }
        
        logger.info(f"✅ Preprocessing complete: quality={int(quality_score * 100)}%")
        
        return enhanced, metadata
    
    def _assess_image_quality(self, gray_image: np.ndarray) -> float:
        """Assess image quality"""
        # Calculate image sharpness using Laplacian variance
        laplacian_var = cv2.Laplacian(gray_image, cv2.CV_64F).var()
        
        # Calculate contrast
        contrast = gray_image.std()
        
        # Normalize quality score
        sharpness_score = min(laplacian_var / 1000.0, 1.0)
        contrast_score = min(contrast / 100.0, 1.0)
        
        quality = (sharpness_score + contrast_score) / 2
        return min(quality, 1.0)
    
    def detect_bubbles_universal(self, image: np.ndarray) -> List[Dict[str, Any]]:
        """Universal bubble detection"""
        logger.info("🎯 Universal bubble detection started...")
        
        # Adaptive threshold
        binary = cv2.adaptiveThreshold(
            image, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
            cv2.THRESH_BINARY_INV, 15, 3
        )
        
        # Morphological operations
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
        cleaned = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel)
        cleaned = cv2.morphologyEx(cleaned, cv2.MORPH_OPEN, kernel)
        
        # Find contours
        contours, _ = cv2.findContours(
            cleaned, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
        )
        
        bubbles = []
        for contour in contours:
            area = cv2.contourArea(contour)
            
            # Area filter
            if self.min_bubble_area <= area <= self.max_bubble_area:
                x, y, w, h = cv2.boundingRect(contour)
                
                # Aspect ratio check
                aspect_ratio = w / h
                if (1 - self.aspect_ratio_tolerance) <= aspect_ratio <= (1 + self.aspect_ratio_tolerance):
                    
                    # Circularity check
                    perimeter = cv2.arcLength(contour, True)
                    if perimeter > 0:
                        circularity = 4 * np.pi * area / (perimeter * perimeter)
                        
                        if circularity > self.circularity_threshold:
                            # Solidity check
                            hull = cv2.convexHull(contour)
                            hull_area = cv2.contourArea(hull)
                            solidity = area / hull_area if hull_area > 0 else 0
                            
                            if solidity > 0.7:
                                bubbles.append({
                                    'x': x,
                                    'y': y,
                                    'width': w,
                                    'height': h,
                                    'center_x': x + w // 2,
                                    'center_y': y + h // 2,
                                    'area': area,
                                    'aspect_ratio': aspect_ratio,
                                    'circularity': circularity,
                                    'solidity': solidity
                                })
        
        logger.info(f"✅ Detected bubble candidates: {len(bubbles)}")
        return bubbles
    
    def analyze_layout_structure_universal(self, bubbles: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Universal layout structure analysis"""
        logger.info("📊 Universal layout analysis...")
        
        if not bubbles:
            return {}
        
        # Sort by Y coordinate
        sorted_bubbles = sorted(bubbles, key=lambda b: b['center_y'])
        
        # Group into rows
        rows = []
        current_row = [sorted_bubbles[0]]
        
        for bubble in sorted_bubbles[1:]:
            avg_y = sum(b['center_y'] for b in current_row) / len(current_row)
            
            if abs(bubble['center_y'] - avg_y) <= self.row_tolerance:
                current_row.append(bubble)
            else:
                if len(current_row) >= self.min_bubbles_per_row:
                    rows.append(sorted(current_row, key=lambda b: b['center_x']))
                current_row = [bubble]
        
        # Add last row
        if len(current_row) >= self.min_bubbles_per_row:
            rows.append(sorted(current_row, key=lambda b: b['center_x']))
        
        if len(rows) < 5:
            logger.warning(f"⚠️ Insufficient rows detected: {len(rows)}")
            return {}
        
        # Analyze column structure
        column_analysis = self._analyze_columns_universal(rows)
        
        # Determine layout type
        layout_type = self._determine_layout_type_universal(rows, column_analysis)
        
        layout_info = {
            'rows': rows,
            'total_rows': len(rows),
            'column_analysis': column_analysis,
            'layout_type': layout_type,
            'bubbles_per_row': [len(row) for row in rows]
        }
        
        logger.info(f"✅ Layout analysis complete:")
        logger.info(f"   Rows: {len(rows)}")
        logger.info(f"   Layout type: {layout_type}")
        logger.info(f"   Columns: {column_analysis.get('total_columns', 0)}")
        
        return layout_info
    
    def _analyze_columns_universal(self, rows: List[List[Dict[str, Any]]]) -> Dict[str, Any]:
        """Universal column analysis"""
        if not rows:
            return {}
        
        # Find most common row length
        row_lengths = [len(row) for row in rows]
        most_common_length = max(set(row_lengths), key=row_lengths.count)
        standard_rows = [row for row in rows if len(row) == most_common_length]
        
        if not standard_rows:
            return {'total_columns': 0}
        
        # Calculate column positions
        column_positions = []
        for col_idx in range(most_common_length):
            x_positions = [row[col_idx]['center_x'] for row in standard_rows]
            avg_x = sum(x_positions) / len(x_positions)
            column_positions.append(int(avg_x))
        
        # Calculate column spacing
        column_spacing = []
        if len(column_positions) > 1:
            for i in range(1, len(column_positions)):
                spacing = column_positions[i] - column_positions[i-1]
                column_spacing.append(spacing)
        
        avg_spacing = sum(column_spacing) / len(column_spacing) if column_spacing else 0
        
        # Detect column groups
        column_groups = self._detect_column_groups_universal(column_positions, column_spacing)
        
        return {
            'total_columns': most_common_length,
            'column_positions': column_positions,
            'average_spacing': avg_spacing,
            'column_spacing': column_spacing,
            'column_groups': column_groups
        }
    
    def _detect_column_groups_universal(self, column_positions: List[int], 
                                      column_spacing: List[int]) -> List[Dict[str, Any]]:
        """Detect column groups based on spacing"""
        if len(column_spacing) < 2:
            return [{'start': 0, 'end': len(column_positions)-1, 'columns': len(column_positions)}]
        
        avg_spacing = sum(column_spacing) / len(column_spacing)
        
        # Find large gaps (1.8x average spacing)
        large_gaps = []
        for i, spacing in enumerate(column_spacing):
            if spacing > avg_spacing * 1.8:
                large_gaps.append(i)
        
        # Create groups
        groups = []
        start_idx = 0
        
        for gap_idx in large_gaps:
            if gap_idx > start_idx:
                groups.append({
                    'start': start_idx,
                    'end': gap_idx,
                    'columns': gap_idx - start_idx + 1,
                    'start_x': column_positions[start_idx],
                    'end_x': column_positions[gap_idx]
                })
            start_idx = gap_idx + 1
        
        # Add last group
        if start_idx < len(column_positions):
            groups.append({
                'start': start_idx,
                'end': len(column_positions) - 1,
                'columns': len(column_positions) - start_idx,
                'start_x': column_positions[start_idx],
                'end_x': column_positions[-1]
            })
        
        return groups
    
    def _determine_layout_type_universal(self, rows: List[List[Dict[str, Any]]], 
                                       column_analysis: Dict[str, Any]) -> str:
        """Determine layout type"""
        total_columns = column_analysis.get('total_columns', 0)
        column_groups = column_analysis.get('column_groups', [])
        
        if len(column_groups) >= 3:
            return 'multi_section'
        elif len(column_groups) == 2:
            return 'two_section'
        elif total_columns >= 10:
            return 'wide_single'
        elif total_columns >= 5:
            return 'standard_single'
        else:
            return 'narrow_single'
    
    def create_coordinate_mapping_universal(self, layout_info: Dict[str, Any]) -> Dict[str, Any]:
        """Create universal coordinate mapping"""
        logger.info("🗺️ Creating universal coordinate mapping...")
        
        if not layout_info or 'rows' not in layout_info:
            return {}
        
        rows = layout_info['rows']
        column_analysis = layout_info['column_analysis']
        layout_type = layout_info['layout_type']
        
        coordinate_mapping = {
            'layout_type': layout_type,
            'total_questions': 0,
            'questions': {}
        }
        
        question_number = 1
        
        # Create mapping based on layout type
        if layout_type == 'multi_section':
            coordinate_mapping = self._create_multi_section_mapping_universal(
                rows, column_analysis, question_number
            )
        elif layout_type == 'two_section':
            coordinate_mapping = self._create_two_section_mapping_universal(
                rows, column_analysis, question_number
            )
        else:
            coordinate_mapping = self._create_single_section_mapping_universal(
                rows, column_analysis, question_number
            )
        
        logger.info(f"✅ Coordinate mapping created:")
        logger.info(f"   Total questions: {coordinate_mapping['total_questions']}")
        logger.info(f"   Layout type: {coordinate_mapping['layout_type']}")
        
        return coordinate_mapping
    
    def _create_multi_section_mapping_universal(self, rows: List[List[Dict[str, Any]]], 
                                              column_analysis: Dict[str, Any], 
                                              start_question: int = 1) -> Dict[str, Any]:
        """Create multi-section coordinate mapping"""
        column_groups = column_analysis.get('column_groups', [])
        questions = {}
        question_number = start_question
        
        # Process each row
        for row_idx, row in enumerate(rows):
            # Process each column group
            for group in column_groups:
                # Get bubbles in this group
                group_bubbles = row[group['start']:group['end']+1]
                
                if len(group_bubbles) >= 4:  # At least 4 options
                    question_data = {
                        'question_number': question_number,
                        'row_index': row_idx,
                        'group_index': column_groups.index(group),
                        'options': {}
                    }
                    
                    # Determine number of options
                    option_count = min(len(group_bubbles), 5)
                    options = ['A', 'B', 'C', 'D', 'E'][:option_count]
                    
                    for i, bubble in enumerate(group_bubbles[:option_count]):
                        question_data['options'][options[i]] = {
                            'x': bubble['center_x'],
                            'y': bubble['center_y'],
                            'width': bubble['width'],
                            'height': bubble['height']
                        }
                    
                    questions[question_number] = question_data
                    question_number += 1
        
        return {
            'layout_type': 'multi_section',
            'total_questions': question_number - start_question,
            'questions': questions,
            'column_groups': column_groups
        }
    
    def _create_two_section_mapping_universal(self, rows: List[List[Dict[str, Any]]], 
                                            column_analysis: Dict[str, Any], 
                                            start_question: int = 1) -> Dict[str, Any]:
        """Create two-section coordinate mapping"""
        column_groups = column_analysis.get('column_groups', [])
        questions = {}
        question_number = start_question
        
        # Process each row
        for row_idx, row in enumerate(rows):
            # Process each column group (2 sections)
            for group in column_groups:
                group_bubbles = row[group['start']:group['end']+1]
                
                if len(group_bubbles) >= 4:
                    question_data = {
                        'question_number': question_number,
                        'row_index': row_idx,
                        'section_index': column_groups.index(group),
                        'options': {}
                    }
                    
                    option_count = min(len(group_bubbles), 5)
                    options = ['A', 'B', 'C', 'D', 'E'][:option_count]
                    
                    for i, bubble in enumerate(group_bubbles[:option_count]):
                        question_data['options'][options[i]] = {
                            'x': bubble['center_x'],
                            'y': bubble['center_y'],
                            'width': bubble['width'],
                            'height': bubble['height']
                        }
                    
                    questions[question_number] = question_data
                    question_number += 1
        
        return {
            'layout_type': 'two_section',
            'total_questions': question_number - start_question,
            'questions': questions,
            'column_groups': column_groups
        }
    
    def _create_single_section_mapping_universal(self, rows: List[List[Dict[str, Any]]], 
                                               column_analysis: Dict[str, Any], 
                                               start_question: int = 1) -> Dict[str, Any]:
        """Create single-section coordinate mapping"""
        questions = {}
        question_number = start_question
        
        # Each row = one question
        for row_idx, row in enumerate(rows):
            if len(row) >= 2:  # At least 2 options
                question_data = {
                    'question_number': question_number,
                    'row_index': row_idx,
                    'options': {}
                }
                
                option_count = min(len(row), 5)
                options = ['A', 'B', 'C', 'D', 'E'][:option_count]
                
                for i, bubble in enumerate(row[:option_count]):
                    question_data['options'][options[i]] = {
                        'x': bubble['center_x'],
                        'y': bubble['center_y'],
                        'width': bubble['width'],
                        'height': bubble['height']
                    }
                
                questions[question_number] = question_data
                question_number += 1
        
        return {
            'layout_type': 'single_section',
            'total_questions': question_number - start_question,
            'questions': questions
        }
    
    def analyze_bubble_intensity_enhanced(self, image: np.ndarray, center_x: int, center_y: int,
                                        radius: int = 15, option: str = '', 
                                        question_number: int = 0) -> float:
        """Enhanced bubble intensity analysis"""
        height, width = image.shape
        
        # Ensure coordinates are within bounds
        if center_x < 0 or center_x >= width or center_y < 0 or center_y >= height:
            logger.info(f"    {option} option (Q{question_number}): ({center_x}, {center_y}) - OUT OF BOUNDS")
            return 0.0
        
        # Create circular mask
        mask = np.zeros(image.shape, dtype='uint8')
        cv2.circle(mask, (center_x, center_y), radius, 255, -1)
        
        # Apply mask
        masked = cv2.bitwise_and(image, image, mask=mask)
        
        # Analyze darkness levels
        very_dark_threshold = 100
        dark_threshold = 140
        medium_threshold = 180
        
        # Count pixels at different darkness levels
        very_dark_pixels = np.sum((masked > 0) & (masked < very_dark_threshold))
        dark_pixels = np.sum((masked > 0) & (masked < dark_threshold))
        medium_dark_pixels = np.sum((masked > 0) & (masked < medium_threshold))
        total_pixels = cv2.countNonZero(mask)
        
        # Calculate ratios
        if total_pixels > 0:
            very_dark_ratio = very_dark_pixels / total_pixels
            dark_ratio = dark_pixels / total_pixels
            medium_dark_ratio = medium_dark_pixels / total_pixels
        else:
            very_dark_ratio = dark_ratio = medium_dark_ratio = 0.0
        
        # Get center pixel value
        center_pixel = image[center_y, center_x] if 0 <= center_y < height and 0 <= center_x < width else 255
        
        # Calculate average pixel value in bubble area
        bubble_pixels = masked[masked > 0]
        avg_pixel_value = np.mean(bubble_pixels) if len(bubble_pixels) > 0 else 255
        
        # Enhanced detection logic
        is_marked = False
        confidence_score = 0
        
        # Primary criterion: Very dark pixels
        if very_dark_ratio >= 0.25:
            is_marked = True
            confidence_score = very_dark_ratio
        elif very_dark_ratio >= 0.15 and center_pixel < 80:
            is_marked = True
            confidence_score = very_dark_ratio * 0.9
        elif very_dark_ratio >= 0.10 and avg_pixel_value < 100:
            is_marked = True
            confidence_score = very_dark_ratio * 0.8
        
        # Secondary criterion: Dark pixels
        elif dark_ratio >= 0.40 and center_pixel < 120:
            is_marked = True
            confidence_score = dark_ratio * 0.7
        elif dark_ratio >= 0.50 and avg_pixel_value < 130:
            is_marked = True
            confidence_score = dark_ratio * 0.6
        
        # Tertiary criterion: Medium dark pixels
        elif medium_dark_ratio >= 0.60 and center_pixel < 150:
            is_marked = True
            confidence_score = medium_dark_ratio * 0.5
        
        # Calculate final intensity
        if is_marked:
            intensity = max(confidence_score, 0.3)  # Minimum 30% for marked
        else:
            intensity = min(very_dark_ratio * 0.2, 0.15)  # Maximum 15% for unmarked
        
        if self.debug_mode:
            logger.info(f"    {option} option (Q{question_number}): ({center_x}, {center_y})")
            logger.info(f"      Very dark: {very_dark_pixels}/{total_pixels} ({int(very_dark_ratio * 100)}%)")
            logger.info(f"      Dark: {dark_pixels}/{total_pixels} ({int(dark_ratio * 100)}%)")
            logger.info(f"      Center pixel: {center_pixel}, Avg: {avg_pixel_value:.1f}")
            logger.info(f"      Final intensity: {int(intensity * 100)}%")
            
            if is_marked:
                logger.info(f"      ✅ {option} MARKED (confidence: {int(confidence_score * 100)}%)")
            else:
                logger.info(f"      ⚪ {option} empty")
        
        return intensity
    
    def process_questions_universal(self, image: np.ndarray, 
                                  coordinate_mapping: Dict[str, Any],
                                  expected_questions: int) -> Dict[str, Any]:
        """Process questions using universal coordinate mapping"""
        logger.info("=== UNIVERSAL QUESTION PROCESSING ===")
        logger.info(f"Processing {coordinate_mapping.get('total_questions', 0)} questions")
        
        detailed_results = []
        questions = coordinate_mapping.get('questions', {})
        
        # Process each question
        for question_number in sorted(questions.keys()):
            if question_number > expected_questions:
                continue
            
            question_data = questions[question_number]
            options = question_data.get('options', {})
            
            logger.info(f"\n=== QUESTION {question_number} (UNIVERSAL) ===")
            
            bubble_intensities = {}
            bubble_coordinates = {}
            max_intensity = 0.0
            detected_answer = 'BLANK'
            
            # Analyze each option
            for option, coords in options.items():
                x, y = coords['x'], coords['y']
                bubble_coordinates[option] = {'x': x, 'y': y}
                
                logger.info(f"  📍 {option} option: ({x}, {y})")
                
                # Analyze bubble intensity
                intensity = self.analyze_bubble_intensity_enhanced(
                    image, x, y, radius=15, option=option, question_number=question_number
                )
                
                bubble_intensities[option] = intensity
                
                # Check if this is the best answer
                if intensity >= self.detection_threshold:
                    if intensity > max_intensity:
                        max_intensity = intensity
                        detected_answer = option
            
            # Calculate confidence
            confidence = 0.2  # base confidence
            
            if max_intensity >= self.very_high_confidence_threshold:
                confidence = 0.95
            elif max_intensity >= self.high_confidence_threshold:
                confidence = 0.85
            elif max_intensity >= self.detection_threshold:
                confidence = 0.70
            else:
                confidence = 0.30
                detected_answer = 'BLANK'
            
            # Check for multiple marked answers
            marked_answers = []
            for opt, intensity in bubble_intensities.items():
                if intensity >= self.detection_threshold:
                    marked_answers.append(opt)
            
            if len(marked_answers) > 1:
                confidence *= 0.4  # Reduce confidence for multiple marks
                logger.info(f"   ⚠️  Multiple answers detected: {', '.join(marked_answers)}")
            
            logger.info(f"🎯 Question {question_number}: {detected_answer} "
                       f"({int(max_intensity * 100)}% filled, {int(confidence * 100)}% confidence)")
            
            detailed_results.append({
                'question': question_number,
                'detected_answer': detected_answer,
                'confidence': confidence,
                'bubble_intensities': bubble_intensities,
                'bubble_coordinates': bubble_coordinates,
                'question_type': 'multiple_choice_5',
                'row_index': question_data.get('row_index'),
                'group_index': question_data.get('group_index', question_data.get('section_index'))
            })
        
        # Calculate overall accuracy
        high_confidence_answers = [r for r in detailed_results if r['confidence'] > 0.7]
        accuracy = len(high_confidence_answers) / len(detailed_results) if detailed_results else 0
        
        logger.info(f"\n📊 UNIVERSAL PROCESSING RESULTS:")
        logger.info(f"   Total questions processed: {len(detailed_results)}")
        logger.info(f"   High confidence answers: {len(high_confidence_answers)}")
        logger.info(f"   Processing accuracy: {int(accuracy * 100)}%")
        
        return {
            'accuracy': accuracy,
            'detailed_results': detailed_results
        }
    
    def process_omr_sheet_universal(self, image_path: str, answer_key: List[str]) -> OMRResult:
        """Main universal OMR processing function"""
        logger.info("=== ENHANCED UNIVERSAL OMR PROCESSING STARTED ===")
        logger.info(f"Image: {image_path}")
        logger.info(f"Expected questions: {len(answer_key)}")
        
        start_time = time.time()
        
        try:
            # Step 1: Enhanced preprocessing
            preprocessed_image, image_metadata = self.preprocess_image_enhanced(image_path)
            
            # Step 2: Universal bubble detection
            bubbles = self.detect_bubbles_universal(preprocessed_image)
            
            if not bubbles:
                raise ValueError("No bubbles detected in the image")
            
            # Step 3: Universal layout analysis
            layout_info = self.analyze_layout_structure_universal(bubbles)
            
            if not layout_info:
                raise ValueError("Could not analyze layout structure")
            
            # Step 4: Create universal coordinate mapping
            coordinate_mapping = self.create_coordinate_mapping_universal(layout_info)
            
            if not coordinate_mapping or coordinate_mapping.get('total_questions', 0) == 0:
                raise ValueError("Could not create coordinate mapping")
            
            # Step 5: Process questions
            bubble_analysis = self.process_questions_universal(
                preprocessed_image, coordinate_mapping, len(answer_key)
            )
            
            # Step 6: Extract answers
            extracted_answers = []
            for result in bubble_analysis['detailed_results']:
                extracted_answers.append(result['detected_answer'])
            
            # Pad with BLANK if needed
            while len(extracted_answers) < len(answer_key):
                extracted_answers.append('BLANK')
            
            # Calculate overall confidence
            confidence = bubble_analysis['accuracy']
            
            processing_time = time.time() - start_time
            
            # Prepare result
            result = OMRResult(
                extracted_answers=extracted_answers,
                confidence=confidence,
                processing_details={
                    'bubble_detection_accuracy': bubble_analysis['accuracy'],
                    'image_quality': image_metadata['quality_score'],
                    'processing_method': 'Enhanced Universal OMR Detection',
                    'layout_type': layout_info['layout_type'],
                    'processing_time': processing_time,
                    'image_info': image_metadata,
                    'actual_question_count': len(bubble_analysis['detailed_results']),
                    'expected_question_count': len(answer_key),
                    'total_bubbles_detected': len(bubbles),
                    'rows_detected': layout_info['total_rows'],
                    'columns_detected': layout_info['column_analysis'].get('total_columns', 0)
                },
                detailed_results=bubble_analysis['detailed_results']
            )
            
            logger.info("=== ENHANCED UNIVERSAL OMR PROCESSING COMPLETED ===")
            logger.info(f"Confidence: {int(confidence * 100)}%")
            logger.info(f"Processing time: {processing_time:.2f}s")
            logger.info(f"Extracted answers: {len(extracted_answers)}")
            
            return result
            
        except Exception as e:
            logger.error(f"❌ Processing failed: {e}")
            raise

def main():
    """Test the enhanced OMR processor"""
    processor = EnhancedOMRProcessor()
    processor.set_debug_mode(True)
    
    # Test with sample answer key
    answer_key = ['A'] * 40  # 40 questions, all A
    
    try:
        result = processor.process_omr_sheet_universal('../../test-image.jpg', answer_key)
        
        print("\n=== ENHANCED UNIVERSAL OMR PROCESSING RESULTS ===")
        print(f"Confidence: {int(result.confidence * 100)}%")
        print(f"Processing method: {result.processing_details['processing_method']}")
        print(f"Layout type: {result.processing_details['layout_type']}")
        print(f"Processing time: {result.processing_details['processing_time']:.2f}s")
        print(f"Questions detected: {result.processing_details['actual_question_count']}")
        print(f"Bubbles detected: {result.processing_details['total_bubbles_detected']}")
        
        print(f"\nFirst 10 extracted answers:")
        for i, answer in enumerate(result.extracted_answers[:10]):
            print(f"  Q{i+1}: {answer}")
        
        print(f"\nDetailed results for first 5 questions:")
        for result_detail in result.detailed_results[:5]:
            q_num = result_detail['question']
            answer = result_detail['detected_answer']
            conf = int(result_detail['confidence'] * 100)
            print(f"  Q{q_num}: {answer} ({conf}% confidence)")
            
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    main()