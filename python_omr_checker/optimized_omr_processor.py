#!/usr/bin/env python3
"""
Optimized OMR Processor with Enhanced Threshold Detection
Threshold qiymatlarini sozlash va aniq detection algoritmi
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

class OptimizedOMRProcessor:
    """Optimized OMR Processor with Enhanced Threshold Detection"""
    
    def __init__(self):
        self.debug_mode = False
        
        # Optimized bubble detection parameters
        self.min_bubble_area = 100  # Further reduced
        self.max_bubble_area = 5000  # Further increased
        self.aspect_ratio_tolerance = 0.6  # Further increased
        self.circularity_threshold = 0.1  # Further reduced
        
        # Layout detection parameters
        self.row_tolerance = 60  # Increased
        self.column_tolerance = 70  # Increased
        self.min_bubbles_per_row = 2  # Reduced from 4
        
        # Enhanced bubble analysis parameters
        self.detection_threshold = 0.45  # Increased from 0.35 to 0.45
        self.high_confidence_threshold = 0.75
        self.very_high_confidence_threshold = 0.90
        
        # Multiple answer detection
        self.multiple_answer_penalty = 0.3  # Reduced penalty
        self.clear_winner_threshold = 0.15  # Minimum difference for clear winner
        
    def set_debug_mode(self, debug: bool):
        """Enable/disable debug mode"""
        self.debug_mode = debug
        
    def preprocess_image_optimized(self, image_path: str) -> Tuple[np.ndarray, Dict[str, Any]]:
        """Optimized image preprocessing"""
        logger.info(f"🔧 Optimized preprocessing started: {image_path}")
        
        # Read image
        original = cv2.imread(image_path)
        if original is None:
            raise ValueError(f"Could not read image: {image_path}")
        
        # Convert to grayscale
        gray = cv2.cvtColor(original, cv2.COLOR_BGR2GRAY)
        height, width = gray.shape
        
        logger.info(f"📊 Image dimensions: {width}x{height}")
        
        # Advanced noise reduction
        denoised = cv2.bilateralFilter(gray, 9, 75, 75)
        
        # Enhanced contrast with CLAHE
        clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8,8))
        enhanced = clahe.apply(denoised)
        
        # Sharpening filter
        kernel = np.array([[-1,-1,-1], [-1,9,-1], [-1,-1,-1]])
        sharpened = cv2.filter2D(enhanced, -1, kernel)
        
        # Quality assessment
        quality_score = self._assess_image_quality_advanced(sharpened)
        
        metadata = {
            'width': width,
            'height': height,
            'quality_score': quality_score,
            'preprocessing_method': 'optimized_bilateral_clahe_sharpen'
        }
        
        logger.info(f"✅ Preprocessing complete: quality={int(quality_score * 100)}%")
        
        return sharpened, metadata
    
    def _assess_image_quality_advanced(self, gray_image: np.ndarray) -> float:
        """Advanced image quality assessment"""
        # Calculate image sharpness using Laplacian variance
        laplacian_var = cv2.Laplacian(gray_image, cv2.CV_64F).var()
        
        # Calculate contrast using standard deviation
        contrast = gray_image.std()
        
        # Calculate brightness distribution
        hist = cv2.calcHist([gray_image], [0], None, [256], [0, 256])
        brightness_score = 1.0 - abs(np.mean(gray_image) - 128) / 128
        
        # Normalize scores
        sharpness_score = min(laplacian_var / 1500.0, 1.0)
        contrast_score = min(contrast / 80.0, 1.0)
        
        # Combined quality score
        quality = (sharpness_score * 0.4 + contrast_score * 0.4 + brightness_score * 0.2)
        return min(quality, 1.0)
    
    def detect_bubbles_optimized(self, image: np.ndarray) -> List[Dict[str, Any]]:
        """Optimized bubble detection with multiple methods"""
        logger.info("🎯 Optimized bubble detection started...")
        
        # Method 1: Adaptive threshold
        binary1 = cv2.adaptiveThreshold(
            image, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
            cv2.THRESH_BINARY_INV, 11, 2
        )
        
        # Method 2: Otsu threshold
        _, binary2 = cv2.threshold(image, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
        
        # Method 3: Fixed threshold
        _, binary3 = cv2.threshold(image, 127, 255, cv2.THRESH_BINARY_INV)
        
        # Combine methods
        combined = cv2.bitwise_or(cv2.bitwise_or(binary1, binary2), binary3)
        
        # Enhanced morphological operations
        kernel_close = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
        kernel_open = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2, 2))
        
        cleaned = cv2.morphologyEx(combined, cv2.MORPH_CLOSE, kernel_close)
        cleaned = cv2.morphologyEx(cleaned, cv2.MORPH_OPEN, kernel_open)
        
        # Find contours
        contours, _ = cv2.findContours(
            cleaned, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
        )
        
        bubbles = []
        for contour in contours:
            area = cv2.contourArea(contour)
            
            # Enhanced area filter
            if self.min_bubble_area <= area <= self.max_bubble_area:
                x, y, w, h = cv2.boundingRect(contour)
                
                # Enhanced aspect ratio check
                aspect_ratio = w / h
                if (1 - self.aspect_ratio_tolerance) <= aspect_ratio <= (1 + self.aspect_ratio_tolerance):
                    
                    # Enhanced circularity check
                    perimeter = cv2.arcLength(contour, True)
                    if perimeter > 0:
                        circularity = 4 * np.pi * area / (perimeter * perimeter)
                        
                        if circularity > self.circularity_threshold:
                            # Enhanced solidity check
                            hull = cv2.convexHull(contour)
                            hull_area = cv2.contourArea(hull)
                            solidity = area / hull_area if hull_area > 0 else 0
                            
                            # Enhanced extent check
                            rect_area = w * h
                            extent = area / rect_area if rect_area > 0 else 0
                            
                            if solidity > 0.5 and extent > 0.3:  # Further reduced thresholds
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
                                    'solidity': solidity,
                                    'extent': extent
                                })
        
        logger.info(f"✅ Detected optimized bubble candidates: {len(bubbles)}")
        return bubbles
    
    def analyze_layout_structure_optimized(self, bubbles: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Optimized layout structure analysis"""
        logger.info("📊 Optimized layout analysis...")
        
        if not bubbles:
            return {}
        
        # Enhanced clustering for rows
        sorted_bubbles = sorted(bubbles, key=lambda b: b['center_y'])
        
        rows = []
        current_row = [sorted_bubbles[0]]
        
        for bubble in sorted_bubbles[1:]:
            # Dynamic row tolerance based on bubble size
            avg_height = sum(b['height'] for b in current_row) / len(current_row)
            dynamic_tolerance = max(self.row_tolerance, avg_height * 1.5)
            
            avg_y = sum(b['center_y'] for b in current_row) / len(current_row)
            
            if abs(bubble['center_y'] - avg_y) <= dynamic_tolerance:
                current_row.append(bubble)
            else:
                if len(current_row) >= self.min_bubbles_per_row:
                    rows.append(sorted(current_row, key=lambda b: b['center_x']))
                current_row = [bubble]
        
        # Add last row
        if len(current_row) >= self.min_bubbles_per_row:
            rows.append(sorted(current_row, key=lambda b: b['center_x']))
        
        if len(rows) < 3:  # Reduced from 5
            logger.warning(f"⚠️ Insufficient rows detected: {len(rows)}")
            return {}
        
        # Enhanced column analysis
        column_analysis = self._analyze_columns_optimized(rows)
        
        # Enhanced layout type detection
        layout_type = self._determine_layout_type_optimized(rows, column_analysis)
        
        layout_info = {
            'rows': rows,
            'total_rows': len(rows),
            'column_analysis': column_analysis,
            'layout_type': layout_type,
            'bubbles_per_row': [len(row) for row in rows],
            'row_heights': [int(sum(b['height'] for b in row) / len(row)) for row in rows],
            'row_positions': [int(sum(b['center_y'] for b in row) / len(row)) for row in rows]
        }
        
        logger.info(f"✅ Optimized layout analysis complete:")
        logger.info(f"   Rows: {len(rows)}")
        logger.info(f"   Layout type: {layout_type}")
        logger.info(f"   Columns: {column_analysis.get('total_columns', 0)}")
        
        return layout_info
    
    def _analyze_columns_optimized(self, rows: List[List[Dict[str, Any]]]) -> Dict[str, Any]:
        """Optimized column analysis"""
        if not rows:
            return {}
        
        # Find most common row length with tolerance
        row_lengths = [len(row) for row in rows]
        length_counts = {}
        for length in row_lengths:
            length_counts[length] = length_counts.get(length, 0) + 1
        
        # Allow for slight variations in row length
        most_common_length = max(length_counts.keys(), key=lambda k: length_counts[k])
        tolerance = 2  # Allow ±2 bubbles difference
        
        standard_rows = [row for row in rows 
                        if abs(len(row) - most_common_length) <= tolerance]
        
        if not standard_rows:
            return {'total_columns': 0}
        
        # Use the most complete row for column analysis
        reference_row = max(standard_rows, key=len)
        
        # Calculate column positions with enhanced clustering
        column_positions = []
        column_widths = []
        
        for col_idx in range(len(reference_row)):
            x_positions = []
            for row in standard_rows:
                if col_idx < len(row):
                    x_positions.append(row[col_idx]['center_x'])
            
            if x_positions:
                avg_x = sum(x_positions) / len(x_positions)
                std_x = np.std(x_positions) if len(x_positions) > 1 else 0
                
                column_positions.append(int(avg_x))
                column_widths.append(std_x)
        
        # Enhanced column spacing analysis
        column_spacing = []
        if len(column_positions) > 1:
            for i in range(1, len(column_positions)):
                spacing = column_positions[i] - column_positions[i-1]
                column_spacing.append(spacing)
        
        avg_spacing = sum(column_spacing) / len(column_spacing) if column_spacing else 0
        
        # Enhanced column groups detection
        column_groups = self._detect_column_groups_optimized(column_positions, column_spacing)
        
        return {
            'total_columns': len(reference_row),
            'column_positions': column_positions,
            'column_widths': column_widths,
            'average_spacing': avg_spacing,
            'column_spacing': column_spacing,
            'standard_rows_count': len(standard_rows),
            'column_groups': column_groups,
            'reference_row_length': len(reference_row)
        }
    
    def _detect_column_groups_optimized(self, column_positions: List[int], 
                                      column_spacing: List[int]) -> List[Dict[str, Any]]:
        """Optimized column groups detection"""
        if len(column_spacing) < 2:
            return [{'start': 0, 'end': len(column_positions)-1, 'columns': len(column_positions)}]
        
        # Enhanced gap detection using statistical analysis
        avg_spacing = sum(column_spacing) / len(column_spacing)
        std_spacing = np.std(column_spacing)
        
        # Dynamic threshold based on spacing distribution
        gap_threshold = avg_spacing + (1.5 * std_spacing)
        
        # Find significant gaps
        large_gaps = []
        for i, spacing in enumerate(column_spacing):
            if spacing > gap_threshold:
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
                    'end_x': column_positions[gap_idx],
                    'avg_spacing': sum(column_spacing[start_idx:gap_idx]) / max(1, gap_idx - start_idx)
                })
            start_idx = gap_idx + 1
        
        # Add last group
        if start_idx < len(column_positions):
            groups.append({
                'start': start_idx,
                'end': len(column_positions) - 1,
                'columns': len(column_positions) - start_idx,
                'start_x': column_positions[start_idx],
                'end_x': column_positions[-1],
                'avg_spacing': sum(column_spacing[start_idx:]) / max(1, len(column_spacing) - start_idx) if start_idx < len(column_spacing) else 0
            })
        
        return groups
    
    def _determine_layout_type_optimized(self, rows: List[List[Dict[str, Any]]], 
                                       column_analysis: Dict[str, Any]) -> str:
        """Optimized layout type determination"""
        total_columns = column_analysis.get('total_columns', 0)
        column_groups = column_analysis.get('column_groups', [])
        
        # Enhanced layout classification
        if len(column_groups) >= 3 and total_columns >= 15:
            return 'multi_section_large'
        elif len(column_groups) >= 3:
            return 'multi_section'
        elif len(column_groups) == 2 and total_columns >= 10:
            return 'two_section_large'
        elif len(column_groups) == 2:
            return 'two_section'
        elif total_columns >= 15:
            return 'wide_single'
        elif total_columns >= 8:
            return 'standard_single'
        else:
            return 'narrow_single'
    
    def analyze_bubble_intensity_optimized(self, image: np.ndarray, center_x: int, center_y: int,
                                         radius: int = 15, option: str = '', 
                                         question_number: int = 0) -> float:
        """Optimized bubble intensity analysis with enhanced thresholds"""
        height, width = image.shape
        
        # Ensure coordinates are within bounds
        if center_x < 0 or center_x >= width or center_y < 0 or center_y >= height:
            if self.debug_mode:
                logger.info(f"    {option} option (Q{question_number}): ({center_x}, {center_y}) - OUT OF BOUNDS")
            return 0.0
        
        # Create circular mask with enhanced radius
        mask = np.zeros(image.shape, dtype='uint8')
        cv2.circle(mask, (center_x, center_y), radius, 255, -1)
        
        # Apply mask
        masked = cv2.bitwise_and(image, image, mask=mask)
        
        # Enhanced darkness level analysis
        very_dark_threshold = 80    # More strict for very dark
        dark_threshold = 120        # More strict for dark
        medium_threshold = 160      # More strict for medium
        
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
        
        # Get center pixel and surrounding area analysis
        center_pixel = image[center_y, center_x] if 0 <= center_y < height and 0 <= center_x < width else 255
        
        # Calculate average pixel value in bubble area
        bubble_pixels = masked[masked > 0]
        avg_pixel_value = np.mean(bubble_pixels) if len(bubble_pixels) > 0 else 255
        
        # Calculate standard deviation for consistency check
        std_pixel_value = np.std(bubble_pixels) if len(bubble_pixels) > 0 else 0
        
        # Enhanced detection logic with multiple criteria
        is_marked = False
        confidence_score = 0
        
        # Primary criterion: Very dark pixels (strong marking)
        if very_dark_ratio >= 0.35:  # 35% very dark pixels
            is_marked = True
            confidence_score = very_dark_ratio
        elif very_dark_ratio >= 0.25 and center_pixel < 60:  # 25% very dark + very dark center
            is_marked = True
            confidence_score = very_dark_ratio * 0.95
        elif very_dark_ratio >= 0.20 and avg_pixel_value < 80:  # 20% very dark + dark average
            is_marked = True
            confidence_score = very_dark_ratio * 0.90
        
        # Secondary criterion: Dark pixels (medium marking)
        elif dark_ratio >= 0.50 and center_pixel < 100:  # 50% dark pixels + dark center
            is_marked = True
            confidence_score = dark_ratio * 0.75
        elif dark_ratio >= 0.60 and avg_pixel_value < 110:  # 60% dark pixels + dark average
            is_marked = True
            confidence_score = dark_ratio * 0.70
        
        # Tertiary criterion: Medium dark pixels (light marking)
        elif medium_dark_ratio >= 0.70 and center_pixel < 140:  # 70% medium dark + medium center
            is_marked = True
            confidence_score = medium_dark_ratio * 0.60
        elif medium_dark_ratio >= 0.80 and avg_pixel_value < 130:  # 80% medium dark + medium average
            is_marked = True
            confidence_score = medium_dark_ratio * 0.55
        
        # Calculate final intensity with consistency bonus
        if is_marked:
            # Consistency bonus for uniform marking
            consistency_bonus = 1.0 - (std_pixel_value / 100.0) if std_pixel_value < 100 else 0.5
            intensity = max(confidence_score * consistency_bonus, 0.35)  # Minimum 35% for marked
        else:
            # For unmarked bubbles, use very low intensity
            intensity = min(very_dark_ratio * 0.15, 0.20)  # Maximum 20% for unmarked
        
        if self.debug_mode:
            logger.info(f"    {option} option (Q{question_number}): ({center_x}, {center_y})")
            logger.info(f"      Very dark: {very_dark_pixels}/{total_pixels} ({int(very_dark_ratio * 100)}%)")
            logger.info(f"      Dark: {dark_pixels}/{total_pixels} ({int(dark_ratio * 100)}%)")
            logger.info(f"      Medium: {medium_dark_pixels}/{total_pixels} ({int(medium_dark_ratio * 100)}%)")
            logger.info(f"      Center: {center_pixel}, Avg: {avg_pixel_value:.1f}, Std: {std_pixel_value:.1f}")
            logger.info(f"      Final intensity: {int(intensity * 100)}%")
            
            if is_marked:
                logger.info(f"      ✅ {option} MARKED (confidence: {int(confidence_score * 100)}%)")
            else:
                logger.info(f"      ⚪ {option} empty")
        
        return intensity
    
    def process_questions_optimized(self, image: np.ndarray, 
                                  coordinate_mapping: Dict[str, Any],
                                  expected_questions: int) -> Dict[str, Any]:
        """Optimized question processing with enhanced answer selection"""
        logger.info("=== OPTIMIZED QUESTION PROCESSING ===")
        logger.info(f"Processing {coordinate_mapping.get('total_questions', 0)} questions")
        
        detailed_results = []
        questions = coordinate_mapping.get('questions', {})
        
        # Process each question
        for question_number in sorted(questions.keys()):
            if question_number > expected_questions:
                continue
            
            question_data = questions[question_number]
            options = question_data.get('options', {})
            
            logger.info(f"\n=== QUESTION {question_number} (OPTIMIZED) ===")
            
            bubble_intensities = {}
            bubble_coordinates = {}
            detected_answer = 'BLANK'
            
            # Analyze each option
            for option, coords in options.items():
                x, y = coords['x'], coords['y']
                bubble_coordinates[option] = {'x': x, 'y': y}
                
                logger.info(f"  📍 {option} option: ({x}, {y})")
                
                # Analyze bubble intensity
                intensity = self.analyze_bubble_intensity_optimized(
                    image, x, y, radius=16, option=option, question_number=question_number
                )
                
                bubble_intensities[option] = intensity
            
            # Enhanced answer selection logic
            detected_answer, confidence = self._select_best_answer_optimized(
                bubble_intensities, question_number
            )
            
            logger.info(f"🎯 Question {question_number}: {detected_answer} "
                       f"({int(max(bubble_intensities.values()) * 100)}% filled, {int(confidence * 100)}% confidence)")
            
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
        
        logger.info(f"\n📊 OPTIMIZED PROCESSING RESULTS:")
        logger.info(f"   Total questions processed: {len(detailed_results)}")
        logger.info(f"   High confidence answers: {len(high_confidence_answers)}")
        logger.info(f"   Processing accuracy: {int(accuracy * 100)}%")
        
        return {
            'accuracy': accuracy,
            'detailed_results': detailed_results
        }
    
    def _select_best_answer_optimized(self, bubble_intensities: Dict[str, float], 
                                    question_number: int) -> Tuple[str, float]:
        """Optimized answer selection with enhanced logic"""
        
        # Sort intensities in descending order
        sorted_intensities = sorted(bubble_intensities.items(), key=lambda x: x[1], reverse=True)
        
        if not sorted_intensities:
            return 'BLANK', 0.2
        
        best_option, best_intensity = sorted_intensities[0]
        second_best_intensity = sorted_intensities[1][1] if len(sorted_intensities) > 1 else 0
        
        # Check if best answer meets threshold
        if best_intensity < self.detection_threshold:
            return 'BLANK', 0.3
        
        # Calculate confidence based on intensity and separation
        base_confidence = 0.5
        
        # Intensity-based confidence
        if best_intensity >= self.very_high_confidence_threshold:
            intensity_confidence = 0.95
        elif best_intensity >= self.high_confidence_threshold:
            intensity_confidence = 0.85
        elif best_intensity >= self.detection_threshold + 0.1:
            intensity_confidence = 0.75
        else:
            intensity_confidence = 0.65
        
        # Separation-based confidence (clear winner bonus)
        separation = best_intensity - second_best_intensity
        if separation >= self.clear_winner_threshold:
            separation_confidence = 0.95
        elif separation >= 0.10:
            separation_confidence = 0.85
        elif separation >= 0.05:
            separation_confidence = 0.75
        else:
            separation_confidence = 0.60
        
        # Check for multiple marked answers
        marked_answers = [opt for opt, intensity in bubble_intensities.items() 
                         if intensity >= self.detection_threshold]
        
        if len(marked_answers) > 1:
            # Multiple answers detected - apply penalty but still choose best
            multiple_penalty = self.multiple_answer_penalty
            logger.info(f"   ⚠️  Multiple answers detected: {', '.join(marked_answers)}")
            
            # If there's a clear winner, reduce penalty
            if separation >= self.clear_winner_threshold:
                multiple_penalty *= 0.5
            
            final_confidence = (intensity_confidence + separation_confidence) / 2 * (1 - multiple_penalty)
        else:
            # Single clear answer
            final_confidence = (intensity_confidence + separation_confidence) / 2
        
        # Ensure minimum confidence for detected answers
        final_confidence = max(final_confidence, 0.4)
        
        return best_option, final_confidence
    
    def create_coordinate_mapping_optimized(self, layout_info: Dict[str, Any]) -> Dict[str, Any]:
        """Optimized coordinate mapping creation"""
        logger.info("🗺️ Creating optimized coordinate mapping...")
        
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
        
        # Create mapping based on layout type with enhanced logic
        if 'multi_section' in layout_type:
            coordinate_mapping = self._create_multi_section_mapping_optimized(
                rows, column_analysis, question_number
            )
        elif 'two_section' in layout_type:
            coordinate_mapping = self._create_two_section_mapping_optimized(
                rows, column_analysis, question_number
            )
        else:
            coordinate_mapping = self._create_single_section_mapping_optimized(
                rows, column_analysis, question_number
            )
        
        logger.info(f"✅ Optimized coordinate mapping created:")
        logger.info(f"   Total questions: {coordinate_mapping['total_questions']}")
        logger.info(f"   Layout type: {coordinate_mapping['layout_type']}")
        
        return coordinate_mapping
    
    def _create_multi_section_mapping_optimized(self, rows: List[List[Dict[str, Any]]], 
                                              column_analysis: Dict[str, Any], 
                                              start_question: int = 1) -> Dict[str, Any]:
        """Optimized multi-section coordinate mapping"""
        column_groups = column_analysis.get('column_groups', [])
        questions = {}
        question_number = start_question
        
        # Enhanced question mapping for multi-section layout
        for row_idx, row in enumerate(rows):
            for group_idx, group in enumerate(column_groups):
                # Get bubbles in this group
                start_col = group['start']
                end_col = min(group['end'], len(row) - 1)
                group_bubbles = row[start_col:end_col+1]
                
                # Enhanced option count detection
                if len(group_bubbles) >= 4:  # At least 4 options (A, B, C, D)
                    question_data = {
                        'question_number': question_number,
                        'row_index': row_idx,
                        'group_index': group_idx,
                        'options': {}
                    }
                    
                    # Determine number of options based on group size and spacing
                    option_count = min(len(group_bubbles), 5)
                    
                    # Enhanced option selection - take evenly spaced bubbles
                    if len(group_bubbles) > 5:
                        # Select 5 most evenly spaced bubbles
                        indices = np.linspace(0, len(group_bubbles)-1, 5, dtype=int)
                        selected_bubbles = [group_bubbles[i] for i in indices]
                    else:
                        selected_bubbles = group_bubbles[:option_count]
                    
                    options = ['A', 'B', 'C', 'D', 'E'][:len(selected_bubbles)]
                    
                    for i, bubble in enumerate(selected_bubbles):
                        question_data['options'][options[i]] = {
                            'x': bubble['center_x'],
                            'y': bubble['center_y'],
                            'width': bubble['width'],
                            'height': bubble['height']
                        }
                    
                    questions[question_number] = question_data
                    question_number += 1
        
        return {
            'layout_type': 'multi_section_optimized',
            'total_questions': question_number - start_question,
            'questions': questions,
            'column_groups': column_groups
        }
    
    def _create_two_section_mapping_optimized(self, rows: List[List[Dict[str, Any]]], 
                                            column_analysis: Dict[str, Any], 
                                            start_question: int = 1) -> Dict[str, Any]:
        """Optimized two-section coordinate mapping"""
        column_groups = column_analysis.get('column_groups', [])
        questions = {}
        question_number = start_question
        
        # Process each row for two-section layout
        for row_idx, row in enumerate(rows):
            for group_idx, group in enumerate(column_groups):
                start_col = group['start']
                end_col = min(group['end'], len(row) - 1)
                group_bubbles = row[start_col:end_col+1]
                
                if len(group_bubbles) >= 4:
                    question_data = {
                        'question_number': question_number,
                        'row_index': row_idx,
                        'section_index': group_idx,
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
            'layout_type': 'two_section_optimized',
            'total_questions': question_number - start_question,
            'questions': questions,
            'column_groups': column_groups
        }
    
    def _create_single_section_mapping_optimized(self, rows: List[List[Dict[str, Any]]], 
                                               column_analysis: Dict[str, Any], 
                                               start_question: int = 1) -> Dict[str, Any]:
        """Optimized single-section coordinate mapping"""
        questions = {}
        question_number = start_question
        
        # Each row = one question for single section
        for row_idx, row in enumerate(rows):
            if len(row) >= 4:  # At least 4 options
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
            'layout_type': 'single_section_optimized',
            'total_questions': question_number - start_question,
            'questions': questions
        }
    
    def process_omr_sheet_optimized(self, image_path: str, answer_key: List[str]) -> OMRResult:
        """Main optimized OMR processing function"""
        logger.info("=== OPTIMIZED OMR PROCESSING STARTED ===")
        logger.info(f"Image: {image_path}")
        logger.info(f"Expected questions: {len(answer_key)}")
        
        start_time = time.time()
        
        try:
            # Step 1: Optimized preprocessing
            preprocessed_image, image_metadata = self.preprocess_image_optimized(image_path)
            
            # Step 2: Optimized bubble detection
            bubbles = self.detect_bubbles_optimized(preprocessed_image)
            
            if not bubbles:
                raise ValueError("No bubbles detected in the image")
            
            # Step 3: Optimized layout analysis
            layout_info = self.analyze_layout_structure_optimized(bubbles)
            
            if not layout_info:
                raise ValueError("Could not analyze layout structure")
            
            # Step 4: Create optimized coordinate mapping
            coordinate_mapping = self.create_coordinate_mapping_optimized(layout_info)
            
            if not coordinate_mapping or coordinate_mapping.get('total_questions', 0) == 0:
                raise ValueError("Could not create coordinate mapping")
            
            # Step 5: Process questions with optimization
            bubble_analysis = self.process_questions_optimized(
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
                    'processing_method': 'Optimized Universal OMR Detection',
                    'layout_type': layout_info['layout_type'],
                    'processing_time': processing_time,
                    'image_info': image_metadata,
                    'actual_question_count': len(bubble_analysis['detailed_results']),
                    'expected_question_count': len(answer_key),
                    'total_bubbles_detected': len(bubbles),
                    'rows_detected': layout_info['total_rows'],
                    'columns_detected': layout_info['column_analysis'].get('total_columns', 0),
                    'detection_threshold': self.detection_threshold,
                    'high_confidence_threshold': self.high_confidence_threshold
                },
                detailed_results=bubble_analysis['detailed_results']
            )
            
            logger.info("=== OPTIMIZED OMR PROCESSING COMPLETED ===")
            logger.info(f"Confidence: {int(confidence * 100)}%")
            logger.info(f"Processing time: {processing_time:.2f}s")
            logger.info(f"Extracted answers: {len(extracted_answers)}")
            
            return result
            
        except Exception as e:
            logger.error(f"❌ Processing failed: {e}")
            raise

def main():
    """Test the optimized OMR processor"""
    processor = OptimizedOMRProcessor()
    processor.set_debug_mode(True)
    
    # Test with sample answer key
    answer_key = ['A'] * 40  # 40 questions, all A
    
    try:
        result = processor.process_omr_sheet_optimized('../../test-image.jpg', answer_key)
        
        print("\n=== OPTIMIZED OMR PROCESSING RESULTS ===")
        print(f"Confidence: {int(result.confidence * 100)}%")
        print(f"Processing method: {result.processing_details['processing_method']}")
        print(f"Layout type: {result.processing_details['layout_type']}")
        print(f"Processing time: {result.processing_details['processing_time']:.2f}s")
        print(f"Questions detected: {result.processing_details['actual_question_count']}")
        print(f"Bubbles detected: {result.processing_details['total_bubbles_detected']}")
        print(f"Detection threshold: {result.processing_details['detection_threshold']}")
        
        print(f"\nFirst 10 extracted answers:")
        for i, answer in enumerate(result.extracted_answers[:10]):
            print(f"  Q{i+1}: {answer}")
        
        print(f"\nDetailed results for first 5 questions:")
        for result_detail in result.detailed_results[:5]:
            q_num = result_detail['question']
            answer = result_detail['detected_answer']
            conf = int(result_detail['confidence'] * 100)
            intensities = result_detail['bubble_intensities']
            max_intensity = max(intensities.values()) if intensities else 0
            print(f"  Q{q_num}: {answer} ({conf}% confidence, {int(max_intensity * 100)}% intensity)")
            
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    main()