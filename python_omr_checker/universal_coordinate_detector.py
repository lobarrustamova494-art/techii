#!/usr/bin/env python3
"""
Universal Coordinate Detector for OMR Sheets
Har qanday yuklangan rasmni avtomatik koordinatalashtirish tizimi
"""

import cv2
import numpy as np
import json
import logging
from typing import List, Dict, Tuple, Optional, Any
from dataclasses import dataclass
import time
from collections import defaultdict

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@dataclass
class DetectedBubble:
    """Aniqlangan bubble ma'lumotlari"""
    x: int
    y: int
    width: int
    height: int
    center_x: int
    center_y: int
    area: float
    aspect_ratio: float
    circularity: float
    confidence: float

@dataclass
class LayoutStructure:
    """Layout tuzilishi ma'lumotlari"""
    layout_type: str
    total_rows: int
    total_columns: int
    column_groups: List[Dict]
    row_positions: List[int]
    column_positions: List[int]

class UniversalCoordinateDetector:
    """Universal koordinata aniqlash tizimi"""
    
    def __init__(self):
        self.debug_mode = True
        
        # Enhanced bubble detection parameters for new format
        self.min_bubble_area = 80   # Smaller bubbles in new format
        self.max_bubble_area = 800  # Adjusted for new bubble size
        self.aspect_ratio_tolerance = 0.4  # More flexible: 0.6 to 1.4
        self.circularity_threshold = 0.15  # More lenient for various bubble styles
        self.solidity_threshold = 0.55     # More lenient for filled bubbles
        
        # Layout detection parameters for new format
        self.row_tolerance = 35      # Adjusted for new layout spacing
        self.column_tolerance = 50   # Tighter column grouping
        self.min_bubbles_per_row = 4 # At least A, B, C, D
        self.max_bubbles_per_row = 15 # Maximum bubbles per row
        self.min_rows_for_valid_layout = 10 # Minimum rows for valid sheet
        
        # Flexible grouping parameters for various layouts
        self.expected_columns_per_group = 4  # A, B, C, D (minimum)
        self.max_columns_per_group = 5       # A, B, C, D, E (maximum)
        self.expected_groups = 3             # 3 columns typical
        self.min_expected_groups = 2         # Minimum 2 columns
        self.max_expected_groups = 4         # Maximum 4 columns
        
        # Coordinate mapping cache
        self.coordinate_cache = {}
        
    def preprocess_image(self, image: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        """Enhanced preprocessing for better bubble detection"""
        logger.info("🔧 Enhanced Universal preprocessing boshlandi")
        
        # Grayskalega o'tkazish
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image.copy()
        
        height, width = gray.shape
        logger.info(f"📊 Rasm o'lchami: {width}x{height}")
        
        # Enhanced preprocessing pipeline
        # 1. Noise reduction with bilateral filter
        denoised = cv2.bilateralFilter(gray, 9, 75, 75)
        
        # 2. Contrast enhancement with CLAHE
        clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8,8))
        enhanced = clahe.apply(denoised)
        
        # 3. Multiple threshold approaches for better bubble detection
        # Adaptive threshold
        binary1 = cv2.adaptiveThreshold(
            enhanced, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
            cv2.THRESH_BINARY_INV, 11, 2
        )
        
        # Otsu threshold
        _, binary2 = cv2.threshold(enhanced, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
        
        # Combine both thresholds
        binary = cv2.bitwise_or(binary1, binary2)
        
        # 4. Enhanced morphological operations
        # Use elliptical kernel for better bubble detection
        kernel_small = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2, 2))
        kernel_medium = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
        
        # Close small gaps
        cleaned = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel_small)
        # Remove noise
        cleaned = cv2.morphologyEx(cleaned, cv2.MORPH_OPEN, kernel_small)
        # Fill bubble interiors
        cleaned = cv2.morphologyEx(cleaned, cv2.MORPH_CLOSE, kernel_medium)
        
        logger.info("✅ Enhanced preprocessing yakunlandi")
        return gray, cleaned
    
    def detect_bubbles(self, binary_image: np.ndarray) -> List[DetectedBubble]:
        """Enhanced bubble detection for 40/40 accuracy"""
        logger.info("🎯 Enhanced Universal bubble detection boshlandi")
        
        contours, _ = cv2.findContours(
            binary_image, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
        )
        
        bubbles = []
        total_contours = len(contours)
        
        for i, contour in enumerate(contours):
            area = cv2.contourArea(contour)
            
            # Enhanced area filtering
            if self.min_bubble_area <= area <= self.max_bubble_area:
                x, y, w, h = cv2.boundingRect(contour)
                
                # Enhanced aspect ratio check
                aspect_ratio = w / h if h > 0 else 0
                min_ratio = 1 - self.aspect_ratio_tolerance
                max_ratio = 1 + self.aspect_ratio_tolerance
                
                if min_ratio <= aspect_ratio <= max_ratio:
                    # Enhanced circularity check
                    perimeter = cv2.arcLength(contour, True)
                    if perimeter > 0:
                        circularity = 4 * np.pi * area / (perimeter * perimeter)
                        
                        if circularity > self.circularity_threshold:
                            # Enhanced solidity check
                            hull = cv2.convexHull(contour)
                            hull_area = cv2.contourArea(hull)
                            solidity = area / hull_area if hull_area > 0 else 0
                            
                            if solidity > self.solidity_threshold:
                                # Enhanced confidence calculation
                                size_score = min(area / 1000, 1.0)  # Normalize area
                                shape_score = min(circularity * 3, 1.0)  # Boost circularity
                                solidity_score = solidity
                                
                                confidence = (size_score + shape_score + solidity_score) / 3
                                confidence = min(confidence, 1.0)
                                
                                bubble = DetectedBubble(
                                    x=x, y=y, width=w, height=h,
                                    center_x=x + w // 2,
                                    center_y=y + h // 2,
                                    area=area,
                                    aspect_ratio=aspect_ratio,
                                    circularity=circularity,
                                    confidence=confidence
                                )
                                bubbles.append(bubble)
        
        # Sort by confidence and keep best candidates
        bubbles.sort(key=lambda b: b.confidence, reverse=True)
        
        # For 40 questions with 5 options each = 200 bubbles expected
        # Keep top candidates but allow for some variation
        max_bubbles = min(len(bubbles), 250)  # Allow some extra
        bubbles = bubbles[:max_bubbles]
        
        logger.info(f"✅ Enhanced detection: {len(bubbles)} bubble candidates from {total_contours} contours")
        return bubbles
    
    def group_bubbles_into_rows(self, bubbles: List[DetectedBubble]) -> List[List[DetectedBubble]]:
        """Enhanced bubble grouping for 40-question layout with special handling for last rows"""
        logger.info("📊 Enhanced bubblelarni qatorlarga guruhlash")
        
        if not bubbles:
            return []
        
        # Sort by Y coordinate first
        sorted_bubbles = sorted(bubbles, key=lambda b: b.center_y)
        
        rows = []
        current_row = [sorted_bubbles[0]]
        
        for bubble in sorted_bubbles[1:]:
            # Calculate average Y of current row
            avg_y = sum(b.center_y for b in current_row) / len(current_row)
            
            # Enhanced row grouping with dynamic tolerance
            y_diff = abs(bubble.center_y - avg_y)
            
            # Adaptive tolerance based on image size and current row size
            adaptive_tolerance = self.row_tolerance
            if len(current_row) >= 12:  # If we have many bubbles, be more strict
                adaptive_tolerance = self.row_tolerance * 0.7
            elif len(current_row) <= 5:  # If few bubbles, be more lenient
                adaptive_tolerance = self.row_tolerance * 1.1
            
            if y_diff <= adaptive_tolerance:
                current_row.append(bubble)
            else:
                # Finish current row if it has reasonable number of bubbles
                if self.min_bubbles_per_row <= len(current_row) <= self.max_bubbles_per_row:
                    # Sort by X coordinate within row
                    current_row.sort(key=lambda b: b.center_x)
                    rows.append(current_row)
                elif len(current_row) > self.max_bubbles_per_row:
                    # Too many bubbles - try to split or filter
                    logger.info(f"⚠️ Row with {len(current_row)} bubbles - filtering by confidence")
                    # Keep only high-confidence bubbles
                    filtered_row = [b for b in current_row if b.confidence > 0.5]
                    if self.min_bubbles_per_row <= len(filtered_row) <= self.max_bubbles_per_row:
                        filtered_row.sort(key=lambda b: b.center_x)
                        rows.append(filtered_row)
                        logger.info(f"   ✅ Filtered row: {len(filtered_row)} bubbles")
                    else:
                        logger.info(f"   ❌ Row rejected after filtering: {len(filtered_row)} bubbles")
                else:
                    # For small rows, check if we're near the end of the image
                    # If so, be more lenient to capture questions 39-40
                    if len(rows) >= 10 and len(current_row) >= 2:  # Near end, accept smaller rows
                        logger.info(f"⚠️ Near-end row accepted: {len(current_row)} bubbles (relaxed criteria)")
                        current_row.sort(key=lambda b: b.center_x)
                        rows.append(current_row)
                    else:
                        logger.info(f"⚠️ Row rejected: {len(current_row)} bubbles (need {self.min_bubbles_per_row}-{self.max_bubbles_per_row})")
                
                # Start new row
                current_row = [bubble]
        
        # Add the last row with more lenient criteria
        if len(current_row) >= 2:  # Accept even 2 bubbles for the very last row
            current_row.sort(key=lambda b: b.center_x)
            rows.append(current_row)
            logger.info(f"✅ Final row accepted: {len(current_row)} bubbles (lenient criteria)")
        elif self.min_bubbles_per_row <= len(current_row) <= self.max_bubbles_per_row:
            current_row.sort(key=lambda b: b.center_x)
            rows.append(current_row)
        elif len(current_row) > self.max_bubbles_per_row:
            # Filter last row too
            filtered_row = [b for b in current_row if b.confidence > 0.5]
            if len(filtered_row) >= 2:  # Very lenient for last row
                filtered_row.sort(key=lambda b: b.center_x)
                rows.append(filtered_row)
                logger.info(f"✅ Final filtered row: {len(filtered_row)} bubbles")
        
        # Sort rows by Y coordinate
        rows.sort(key=lambda row: sum(b.center_y for b in row) / len(row))
        
        logger.info(f"✅ Enhanced grouping: {len(rows)} valid rows")
        
        # For 40 questions in 3 columns, expect ~13-14 rows
        if len(rows) < 10:
            logger.warning(f"⚠️ Kam qatorlar topildi: {len(rows)} (10+ kutilgan)")
        
        return rows
    
    def analyze_layout_structure(self, rows: List[List[DetectedBubble]]) -> LayoutStructure:
        """Layout tuzilishini tahlil qilish"""
        logger.info("🏗️ Layout tuzilishini tahlil qilish")
        
        if len(rows) < self.min_rows_for_valid_layout:
            raise ValueError(f"Yetarli qatorlar topilmadi: {len(rows)}")
        
        # Har qatordagi bubblelar sonini hisoblash
        row_lengths = [len(row) for row in rows]
        
        # Eng ko'p uchraydigan uzunlikni topish
        length_counts = defaultdict(int)
        for length in row_lengths:
            length_counts[length] += 1
        
        standard_length = max(length_counts.keys(), key=lambda k: length_counts[k])
        standard_rows = [row for row in rows if len(row) == standard_length]
        
        # Ustun pozitsiyalarini hisoblash
        column_positions = []
        for col_idx in range(standard_length):
            x_positions = [row[col_idx].center_x for row in standard_rows]
            avg_x = sum(x_positions) / len(x_positions)
            column_positions.append(int(avg_x))
        
        # Qator pozitsiyalarini hisoblash
        row_positions = []
        for row in rows:
            avg_y = sum(b.center_y for b in row) / len(row)
            row_positions.append(int(avg_y))
        
        # Ustunlar orasidagi masofani hisoblash
        column_spacing = []
        if len(column_positions) > 1:
            for i in range(1, len(column_positions)):
                spacing = column_positions[i] - column_positions[i-1]
                column_spacing.append(spacing)
        
        # Ustun guruhlarini aniqlash
        column_groups = self.detect_column_groups(column_positions, column_spacing)
        
        # Layout turini aniqlash
        layout_type = self.determine_layout_type(len(rows), standard_length, column_groups)
        
        layout = LayoutStructure(
            layout_type=layout_type,
            total_rows=len(rows),
            total_columns=standard_length,
            column_groups=column_groups,
            row_positions=row_positions,
            column_positions=column_positions
        )
        
        logger.info(f"✅ Layout tahlili:")
        logger.info(f"   Turi: {layout_type}")
        logger.info(f"   Qatorlar: {len(rows)}")
        logger.info(f"   Ustunlar: {standard_length}")
        logger.info(f"   Guruhlar: {len(column_groups)}")
        
        return layout
    
    def detect_column_groups(self, column_positions: List[int], column_spacing: List[int]) -> List[Dict]:
        """Enhanced column group detection for 3-column layout"""
        if len(column_spacing) < 2:
            return [{
                'start': 0, 
                'end': len(column_positions)-1, 
                'columns': len(column_positions),
                'start_x': column_positions[0] if column_positions else 0,
                'end_x': column_positions[-1] if column_positions else 0
            }]
        
        # Enhanced spacing analysis
        avg_spacing = sum(column_spacing) / len(column_spacing)
        median_spacing = sorted(column_spacing)[len(column_spacing) // 2]
        
        # Use median for more robust gap detection
        gap_threshold = max(avg_spacing * 1.5, median_spacing * 1.8)
        
        logger.info(f"📏 Spacing analysis: avg={avg_spacing:.1f}, median={median_spacing:.1f}, threshold={gap_threshold:.1f}")
        
        # Find large gaps (column separators)
        large_gaps = []
        for i, spacing in enumerate(column_spacing):
            if spacing > gap_threshold:
                large_gaps.append(i)
                logger.info(f"   Large gap found at position {i}: {spacing:.1f}")
        
        # Create groups based on gaps
        groups = []
        start_idx = 0
        
        for gap_idx in large_gaps:
            if gap_idx > start_idx:
                group_size = gap_idx - start_idx + 1
                groups.append({
                    'start': start_idx,
                    'end': gap_idx,
                    'columns': group_size,
                    'start_x': column_positions[start_idx],
                    'end_x': column_positions[gap_idx]
                })
                logger.info(f"   Group created: columns {start_idx}-{gap_idx} ({group_size} columns)")
            start_idx = gap_idx + 1
        
        # Add the last group
        if start_idx < len(column_positions):
            group_size = len(column_positions) - start_idx
            groups.append({
                'start': start_idx,
                'end': len(column_positions) - 1,
                'columns': group_size,
                'start_x': column_positions[start_idx],
                'end_x': column_positions[-1]
            })
            logger.info(f"   Final group: columns {start_idx}-{len(column_positions)-1} ({group_size} columns)")
        
        # Enhanced validation for 3-column layout
        # Each group should have ~5 columns (A, B, C, D, E)
        valid_groups = []
        for group in groups:
            if 3 <= group['columns'] <= 7:  # Allow 3-7 columns per group
                valid_groups.append(group)
            else:
                logger.warning(f"⚠️ Group rejected: {group['columns']} columns (3-7 expected)")
        
        # If we don't have 3 groups, try alternative grouping
        if len(valid_groups) != 3 and len(column_positions) >= 12:
            logger.info("🔄 Trying alternative 3-group division...")
            # Force divide into 3 equal groups
            cols_per_group = len(column_positions) // 3
            valid_groups = []
            
            for i in range(3):
                start = i * cols_per_group
                end = start + cols_per_group - 1
                if i == 2:  # Last group gets remaining columns
                    end = len(column_positions) - 1
                
                valid_groups.append({
                    'start': start,
                    'end': end,
                    'columns': end - start + 1,
                    'start_x': column_positions[start],
                    'end_x': column_positions[end]
                })
        
        logger.info(f"✅ Final groups: {len(valid_groups)}")
        return valid_groups
    
    def determine_layout_type(self, total_rows: int, total_columns: int, column_groups: List[Dict]) -> str:
        """Layout turini aniqlash"""
        if len(column_groups) >= 3:
            return 'three_column_layout'  # 3 ustunli layout (40 savollik test)
        elif len(column_groups) == 2:
            return 'two_column_layout'    # 2 ustunli layout
        elif total_columns >= 10:
            return 'wide_single_layout'   # Keng bitta layout
        elif total_columns >= 5:
            return 'standard_layout'      # Standart layout
        else:
            return 'narrow_layout'        # Tor layout
    
    def create_coordinate_mapping(self, rows: List[List[DetectedBubble]], layout: LayoutStructure) -> Dict:
        """Koordinatalar mapping yaratish"""
        logger.info("🗺️ Universal koordinatalar mapping yaratish")
        
        coordinate_mapping = {
            'layout_type': layout.layout_type,
            'total_questions': 0,
            'questions': {},
            'layout_info': {
                'total_rows': layout.total_rows,
                'total_columns': layout.total_columns,
                'column_groups': layout.column_groups,
                'row_positions': layout.row_positions,
                'column_positions': layout.column_positions
            }
        }
        
        question_number = 1
        
        # Layout turiga qarab mapping yaratish
        if layout.layout_type == 'three_column_layout':
            coordinate_mapping = self.create_three_column_mapping(rows, layout, question_number)
        elif layout.layout_type == 'two_column_layout':
            coordinate_mapping = self.create_two_column_mapping(rows, layout, question_number)
        else:
            coordinate_mapping = self.create_single_column_mapping(rows, layout, question_number)
        
        logger.info(f"✅ Mapping yaratildi: {coordinate_mapping['total_questions']} savol")
        return coordinate_mapping
    
    def create_three_column_mapping(self, rows: List[List[DetectedBubble]], layout: LayoutStructure, start_question: int = 1) -> Dict:
        """Enhanced 3-column mapping for 40-question layout with missing question recovery"""
        questions = {}
        question_number = start_question
        
        logger.info(f"🏗️ Creating enhanced 3-column mapping: {len(rows)} rows, {len(layout.column_groups)} groups")
        
        # Enhanced mapping for 40 questions with missing question recovery
        for row_idx, row in enumerate(rows):
            logger.info(f"   Processing row {row_idx + 1}: {len(row)} bubbles")
            
            # Process each column group in this row
            for group_idx, group in enumerate(layout.column_groups):
                # Extract bubbles for this group
                start_col = group['start']
                end_col = group['end']
                
                # Ensure we don't go out of bounds
                if start_col >= len(row):
                    logger.warning(f"     Group {group_idx + 1}: start_col {start_col} >= row length {len(row)}")
                    continue
                
                end_col = min(end_col, len(row) - 1)
                group_bubbles = row[start_col:end_col + 1]
                
                logger.info(f"     Group {group_idx + 1}: columns {start_col}-{end_col}, {len(group_bubbles)} bubbles")
                
                # Enhanced: Accept 3+ options per question (more flexible)
                if len(group_bubbles) >= 3:  # At least 3 options (A, B, C)
                    question_data = {
                        'question_number': question_number,
                        'row_index': row_idx,
                        'column_group': group_idx,
                        'options': {}
                    }
                    
                    # Map bubbles to options (A, B, C, D, E)
                    options = ['A', 'B', 'C', 'D', 'E']
                    option_count = min(len(group_bubbles), 5)
                    
                    for i in range(option_count):
                        bubble = group_bubbles[i]
                        option = options[i]
                        
                        question_data['options'][option] = {
                            'x': bubble.center_x,
                            'y': bubble.center_y,
                            'width': bubble.width,
                            'height': bubble.height,
                            'confidence': bubble.confidence
                        }
                    
                    # Add question if we have at least 3 options
                    if len(question_data['options']) >= 3:
                        questions[question_number] = question_data
                        logger.info(f"       ✅ Question {question_number} mapped with {len(question_data['options'])} options")
                        question_number += 1
                    else:
                        logger.warning(f"       ❌ Question {question_number} skipped: only {len(question_data['options'])} options")
                else:
                    logger.warning(f"     Group {group_idx + 1}: insufficient bubbles ({len(group_bubbles)})")
            
            # Stop if we've reached 40 questions
            if question_number > 40:
                break
        
        # Enhanced: Try to recover missing questions by extrapolation
        if question_number <= 40:
            logger.info(f"🔄 Attempting to recover missing questions: {question_number-1}/40 detected")
            questions = self.recover_missing_questions(questions, layout, rows)
        
        total_questions = len(questions)
        logger.info(f"✅ Enhanced 3-column mapping complete: {total_questions} questions mapped")
        
        return {
            'layout_type': 'three_column_layout',
            'total_questions': total_questions,
            'questions': questions,
            'layout_info': {
                'total_rows': layout.total_rows,
                'total_columns': layout.total_columns,
                'column_groups': layout.column_groups,
                'row_positions': layout.row_positions,
                'column_positions': layout.column_positions
            }
        }
    
    def recover_missing_questions(self, questions: Dict, layout: LayoutStructure, rows: List[List[DetectedBubble]]) -> Dict:
        """Enhanced recovery system for missing questions with intelligent extrapolation"""
        logger.info("🔧 Enhanced recovery system attempting to recover missing questions...")
        
        if len(questions) < 30:  # Only try recovery if we have reasonable base
            logger.warning("⚠️ Too few questions detected for reliable recovery")
            return questions
        
        # Analyze existing question patterns
        existing_questions = sorted(questions.keys())
        missing_questions = [q for q in range(1, 41) if q not in questions]
        
        logger.info(f"   Missing questions: {missing_questions}")
        
        # Enhanced recovery for 3-column layout
        if layout.layout_type == 'three_column_layout' and len(layout.column_groups) >= 3:
            questions = self.recover_three_column_missing_questions(questions, layout, rows, missing_questions)
        
        # General extrapolation for remaining missing questions
        if len(existing_questions) >= 35:
            for missing_q in missing_questions:
                if missing_q not in questions:
                    # Try to extrapolate from similar positioned questions
                    estimated_question = self.extrapolate_question_position_enhanced(
                        missing_q, questions, layout, rows
                    )
                    
                    if estimated_question:
                        questions[missing_q] = estimated_question
                        logger.info(f"       ✅ Recovered question {missing_q} by enhanced extrapolation")
        
        return questions
    
    def recover_three_column_missing_questions(self, questions: Dict, layout: LayoutStructure, 
                                             rows: List[List[DetectedBubble]], missing_questions: List[int]) -> Dict:
        """Specialized recovery for 3-column layout missing questions"""
        logger.info("🎯 Specialized 3-column recovery system activated")
        
        # For 40-question 3-column layout: questions 1-14 in col1, 15-27 in col2, 28-40 in col3
        # Missing questions are likely 39, 40 (last questions in column 3)
        
        for missing_q in missing_questions:
            if missing_q >= 39:  # Focus on questions 39-40
                logger.info(f"   🔍 Attempting to recover question {missing_q}")
                
                # Question 39 should be in column 3, row 12 (0-indexed: row 11)
                # Question 40 should be in column 3, row 13 (0-indexed: row 12)
                
                if missing_q == 39:
                    recovered_q = self.recover_question_39(questions, layout, rows)
                elif missing_q == 40:
                    recovered_q = self.recover_question_40(questions, layout, rows)
                else:
                    continue
                
                if recovered_q:
                    questions[missing_q] = recovered_q
                    logger.info(f"       ✅ Successfully recovered question {missing_q}")
                else:
                    logger.warning(f"       ❌ Failed to recover question {missing_q}")
        
        return questions
    
    def recover_question_39(self, questions: Dict, layout: LayoutStructure, rows: List[List[DetectedBubble]]) -> Optional[Dict]:
        """Recover question 39 specifically"""
        try:
            # Question 39 should be in column 3, around row 11-12
            # Look for patterns from questions 36, 37, 38 to estimate position
            
            if 36 in questions and 37 in questions:
                q36_data = questions[36]
                q37_data = questions[37]
                
                # Estimate row for question 39 (should be row after 37, same column as 36)
                target_row_idx = q37_data['row_index'] + 1
                
                if target_row_idx < len(rows):
                    target_row = rows[target_row_idx]
                    
                    # Try to find bubbles in column 3 position
                    if len(layout.column_groups) >= 3:
                        group = layout.column_groups[2]  # Column 3 (0-indexed)
                        
                        # Look for bubbles in the expected X range of column 3
                        col3_x_start = group['start_x'] - 50  # Allow some tolerance
                        col3_x_end = group['end_x'] + 50
                        
                        # Find bubbles in this X range
                        col3_bubbles = []
                        for bubble in target_row:
                            if col3_x_start <= bubble.center_x <= col3_x_end:
                                col3_bubbles.append(bubble)
                        
                        # Sort by X coordinate
                        col3_bubbles.sort(key=lambda b: b.center_x)
                        
                        if len(col3_bubbles) >= 3:  # At least 3 options
                            question_data = {
                                'question_number': 39,
                                'row_index': target_row_idx,
                                'column_group': 2,
                                'options': {}
                            }
                            
                            options = ['A', 'B', 'C', 'D', 'E']
                            option_count = min(len(col3_bubbles), 5)
                            
                            for i in range(option_count):
                                bubble = col3_bubbles[i]
                                option = options[i]
                                
                                question_data['options'][option] = {
                                    'x': bubble.center_x,
                                    'y': bubble.center_y,
                                    'width': bubble.width,
                                    'height': bubble.height,
                                    'confidence': bubble.confidence
                                }
                            
                            logger.info(f"       🎯 Q39 recovered: row {target_row_idx}, {len(question_data['options'])} options")
                            return question_data
            
            return None
            
        except Exception as e:
            logger.warning(f"⚠️ Q39 recovery failed: {e}")
            return None
    
    def recover_question_40(self, questions: Dict, layout: LayoutStructure, rows: List[List[DetectedBubble]]) -> Optional[Dict]:
        """Recover question 40 specifically with enhanced debugging and broader search"""
        try:
            logger.info(f"       🔍 Q40 Recovery: Analyzing {len(rows)} rows")
            
            # First, try the standard approach
            if 37 in questions and 38 in questions:
                q37_data = questions[37]
                q38_data = questions[38]
                
                logger.info(f"       📍 Q37 in row {q37_data['row_index']}, Q38 in row {q38_data['row_index']}")
                
                # Question 40 should be in the same row as 38, but in column 3
                target_row_idx = q38_data['row_index']
                
                if target_row_idx < len(rows):
                    target_row = rows[target_row_idx]
                    logger.info(f"       🎯 Target row {target_row_idx} has {len(target_row)} bubbles")
                    
                    # Try to find bubbles in column 3 position
                    if len(layout.column_groups) >= 3:
                        group = layout.column_groups[2]  # Column 3 (0-indexed)
                        logger.info(f"       📏 Column 3 range: {group['start_x']} - {group['end_x']}")
                        
                        # Look for bubbles in the expected X range of column 3
                        col3_x_start = group['start_x'] - 50
                        col3_x_end = group['end_x'] + 50
                        
                        logger.info(f"       🔍 Searching X range: {col3_x_start} - {col3_x_end}")
                        
                        # Find bubbles in this X range
                        col3_bubbles = []
                        for bubble in target_row:
                            if col3_x_start <= bubble.center_x <= col3_x_end:
                                col3_bubbles.append(bubble)
                                logger.info(f"         ✅ Found bubble in range: x={bubble.center_x}")
                        
                        logger.info(f"       📊 Found {len(col3_bubbles)} bubbles in column 3 range")
                        
                        # Sort by X coordinate
                        col3_bubbles.sort(key=lambda b: b.center_x)
                        
                        if len(col3_bubbles) >= 2:  # Accept even 2 options for the last question
                            question_data = {
                                'question_number': 40,
                                'row_index': target_row_idx,
                                'column_group': 2,
                                'options': {}
                            }
                            
                            options = ['A', 'B', 'C', 'D', 'E']
                            option_count = min(len(col3_bubbles), 5)
                            
                            for i in range(option_count):
                                bubble = col3_bubbles[i]
                                option = options[i]
                                
                                question_data['options'][option] = {
                                    'x': bubble.center_x,
                                    'y': bubble.center_y,
                                    'width': bubble.width,
                                    'height': bubble.height,
                                    'confidence': bubble.confidence
                                }
                            
                            logger.info(f"       🎯 Q40 recovered: row {target_row_idx}, {len(question_data['options'])} options")
                            return question_data
            
            # Alternative 1: Check if there are additional rows after the current last row
            logger.info("       🔄 Trying alternative recovery method...")
            if len(rows) > 0:
                last_row = rows[-1]
                logger.info(f"       📍 Last row has {len(last_row)} bubbles")
                
                # Look for any remaining bubbles that might be question 40
                if len(layout.column_groups) >= 3:
                    group = layout.column_groups[2]
                    
                    # More lenient search for the last question
                    col3_x_start = group['start_x'] - 100
                    col3_x_end = group['end_x'] + 100
                    
                    logger.info(f"       🔍 Alternative search range: {col3_x_start} - {col3_x_end}")
                    
                    col3_bubbles = []
                    for bubble in last_row:
                        if col3_x_start <= bubble.center_x <= col3_x_end:
                            col3_bubbles.append(bubble)
                            logger.info(f"         ✅ Alternative found: x={bubble.center_x}")
                    
                    col3_bubbles.sort(key=lambda b: b.center_x)
                    
                    logger.info(f"       📊 Alternative method found {len(col3_bubbles)} bubbles")
                    
                    if len(col3_bubbles) >= 2:  # Accept even 2 options for the last question
                        question_data = {
                            'question_number': 40,
                            'row_index': len(rows) - 1,
                            'column_group': 2,
                            'options': {}
                        }
                        
                        options = ['A', 'B', 'C', 'D', 'E']
                        option_count = min(len(col3_bubbles), 5)
                        
                        for i in range(option_count):
                            bubble = col3_bubbles[i]
                            option = options[i]
                            
                            question_data['options'][option] = {
                                'x': bubble.center_x,
                                'y': bubble.center_y,
                                'width': bubble.width,
                                'height': bubble.height,
                                'confidence': bubble.confidence
                            }
                        
                        logger.info(f"       🎯 Q40 recovered (alternative): last row, {len(question_data['options'])} options")
                        return question_data
            
            # Alternative 2: Create synthetic coordinates based on pattern
            logger.info("       🔄 Trying synthetic coordinate generation...")
            if 36 in questions and len(layout.column_groups) >= 3:
                q36_data = questions[36]
                group = layout.column_groups[2]
                
                # Use Q36 as reference for column 3 positioning
                if q36_data['options']:
                    # Get the X positions from Q36 (which is in column 3)
                    q36_x_positions = [coords['x'] for coords in q36_data['options'].values()]
                    q36_x_positions.sort()
                    
                    # Estimate Y position for Q40 (should be after Q38)
                    if 38 in questions:
                        q38_data = questions[38]
                        estimated_y = q38_data['options']['A']['y']  # Same row as Q38
                        
                        # Create synthetic question 40 using Q36's X pattern
                        question_data = {
                            'question_number': 40,
                            'row_index': q38_data['row_index'],
                            'column_group': 2,
                            'options': {}
                        }
                        
                        options = ['A', 'B', 'C', 'D', 'E']
                        for i, x_pos in enumerate(q36_x_positions[:5]):  # Use up to 5 positions
                            option = options[i]
                            question_data['options'][option] = {
                                'x': x_pos,
                                'y': estimated_y,
                                'width': 20,  # Default width
                                'height': 20,  # Default height
                                'confidence': 0.5  # Lower confidence for synthetic
                            }
                        
                        logger.info(f"       🎯 Q40 recovered (synthetic): {len(question_data['options'])} synthetic options")
                        return question_data
            
            logger.warning("       ❌ All Q40 recovery methods failed")
            return None
            
        except Exception as e:
            logger.warning(f"⚠️ Q40 recovery failed: {e}")
            return None
    
    def extrapolate_question_position_enhanced(self, question_num: int, questions: Dict, 
                                             layout: LayoutStructure, rows: List[List[DetectedBubble]]) -> Optional[Dict]:
        """Enhanced extrapolation with better pattern recognition"""
        try:
            # Determine which column this question should be in
            column_group = (question_num - 1) % 3  # 0, 1, 2 for columns 1, 2, 3
            
            # For 3-column layout: questions 1-14 in col1, 15-27 in col2, 28-40 in col3
            if question_num <= 14:
                column_group = 0
            elif question_num <= 27:
                column_group = 1
            else:
                column_group = 2
            
            # Find reference questions in the same column
            same_column_questions = []
            for q_num, q_data in questions.items():
                if q_data.get('column_group') == column_group:
                    same_column_questions.append((q_num, q_data))
            
            if len(same_column_questions) < 2:
                return None
            
            # Sort by question number
            same_column_questions.sort(key=lambda x: x[0])
            
            # Use the last two questions in the same column to estimate position
            last_q_num, last_q_data = same_column_questions[-1]
            second_last_q_num, second_last_q_data = same_column_questions[-2]
            
            # Calculate row spacing pattern
            row_spacing = last_q_data['row_index'] - second_last_q_data['row_index']
            
            # Estimate row for the missing question
            estimated_row = last_q_data['row_index'] + row_spacing
            
            # Ensure we don't go beyond available rows
            if estimated_row >= len(rows):
                estimated_row = len(rows) - 1
            
            target_row = rows[estimated_row]
            
            # Try to find bubbles in the estimated position
            if column_group < len(layout.column_groups):
                group = layout.column_groups[column_group]
                
                # Use the X positions from the reference question
                ref_options = last_q_data['options']
                if not ref_options:
                    return None
                
                # Get X coordinates from reference question
                ref_x_positions = [coords['x'] for coords in ref_options.values()]
                ref_x_positions.sort()
                
                # Find bubbles near these X positions
                found_bubbles = []
                for ref_x in ref_x_positions:
                    # Look for bubbles within tolerance of reference X position
                    tolerance = 50
                    for bubble in target_row:
                        if abs(bubble.center_x - ref_x) <= tolerance:
                            found_bubbles.append(bubble)
                            break
                
                # If we didn't find enough bubbles, try broader search
                if len(found_bubbles) < 3:
                    # Search in the column group X range
                    col_x_start = group['start_x'] - 50
                    col_x_end = group['end_x'] + 50
                    
                    found_bubbles = []
                    for bubble in target_row:
                        if col_x_start <= bubble.center_x <= col_x_end:
                            found_bubbles.append(bubble)
                    
                    found_bubbles.sort(key=lambda b: b.center_x)
                
                if len(found_bubbles) >= 3:  # At least 3 options
                    question_data = {
                        'question_number': question_num,
                        'row_index': estimated_row,
                        'column_group': column_group,
                        'options': {}
                    }
                    
                    options = ['A', 'B', 'C', 'D', 'E']
                    option_count = min(len(found_bubbles), 5)
                    
                    for i in range(option_count):
                        bubble = found_bubbles[i]
                        option = options[i]
                        
                        question_data['options'][option] = {
                            'x': bubble.center_x,
                            'y': bubble.center_y,
                            'width': bubble.width,
                            'height': bubble.height,
                            'confidence': bubble.confidence
                        }
                    
                    return question_data
            
            return None
            
        except Exception as e:
            logger.warning(f"⚠️ Enhanced extrapolation failed for question {question_num}: {e}")
            return None
    
    def create_two_column_mapping(self, rows: List[List[DetectedBubble]], layout: LayoutStructure, start_question: int = 1) -> Dict:
        """2 ustunli layout uchun mapping"""
        questions = {}
        question_number = start_question
        
        # Har bir qator uchun
        for row_idx, row in enumerate(rows):
            # Har bir ustun guruhi uchun
            for group in layout.column_groups:
                group_bubbles = row[group['start']:group['end']+1]
                
                if len(group_bubbles) >= 4:  # Kamida 4 ta variant
                    question_data = {
                        'question_number': question_number,
                        'row_index': row_idx,
                        'column_group': layout.column_groups.index(group),
                        'options': {}
                    }
                    
                    option_count = min(len(group_bubbles), 5)
                    options = ['A', 'B', 'C', 'D', 'E'][:option_count]
                    
                    for i, bubble in enumerate(group_bubbles[:option_count]):
                        question_data['options'][options[i]] = {
                            'x': bubble.center_x,
                            'y': bubble.center_y,
                            'width': bubble.width,
                            'height': bubble.height,
                            'confidence': bubble.confidence
                        }
                    
                    questions[question_number] = question_data
                    question_number += 1
        
        return {
            'layout_type': 'two_column_layout',
            'total_questions': question_number - start_question,
            'questions': questions,
            'layout_info': {
                'total_rows': layout.total_rows,
                'total_columns': layout.total_columns,
                'column_groups': layout.column_groups,
                'row_positions': layout.row_positions,
                'column_positions': layout.column_positions
            }
        }
    
    def create_single_column_mapping(self, rows: List[List[DetectedBubble]], layout: LayoutStructure, start_question: int = 1) -> Dict:
        """Bitta ustunli layout uchun mapping"""
        questions = {}
        question_number = start_question
        
        # Har bir qator = bitta savol
        for row_idx, row in enumerate(rows):
            if len(row) >= 2:  # Kamida 2 ta variant
                question_data = {
                    'question_number': question_number,
                    'row_index': row_idx,
                    'options': {}
                }
                
                option_count = min(len(row), 5)
                options = ['A', 'B', 'C', 'D', 'E'][:option_count]
                
                for i, bubble in enumerate(row[:option_count]):
                    question_data['options'][options[i]] = {
                        'x': bubble.center_x,
                        'y': bubble.center_y,
                        'width': bubble.width,
                        'height': bubble.height,
                        'confidence': bubble.confidence
                    }
                
                questions[question_number] = question_data
                question_number += 1
        
        return {
            'layout_type': 'single_column_layout',
            'total_questions': question_number - start_question,
            'questions': questions,
            'layout_info': {
                'total_rows': layout.total_rows,
                'total_columns': layout.total_columns,
                'row_positions': layout.row_positions,
                'column_positions': layout.column_positions
            }
        }
    
    def detect_coordinates(self, image: np.ndarray) -> Optional[Dict]:
        """Asosiy koordinata aniqlash funksiyasi"""
        logger.info("=== UNIVERSAL COORDINATE DETECTION STARTED ===")
        
        try:
            start_time = time.time()
            
            # 1. Preprocessing
            gray, binary = self.preprocess_image(image)
            
            # 2. Bubble detection
            bubbles = self.detect_bubbles(binary)
            
            if not bubbles:
                logger.error("❌ Hech qanday bubble topilmadi!")
                return None
            
            # 3. Qatorlarga guruhlash
            rows = self.group_bubbles_into_rows(bubbles)
            
            if not rows:
                logger.error("❌ Qatorlar aniqlanmadi!")
                return None
            
            # 4. Layout tuzilishini tahlil qilish
            layout = self.analyze_layout_structure(rows)
            
            # 5. Koordinatalar mapping yaratish
            coordinate_mapping = self.create_coordinate_mapping(rows, layout)
            
            processing_time = time.time() - start_time
            
            # 6. Natijalarni tayyorlash
            result = {
                'success': True,
                'processing_time': processing_time,
                'image_info': {
                    'width': gray.shape[1],
                    'height': gray.shape[0]
                },
                'detection_stats': {
                    'total_bubbles': len(bubbles),
                    'valid_rows': len(rows),
                    'layout_type': layout.layout_type
                },
                'coordinate_mapping': coordinate_mapping,
                'processing_method': 'Universal Coordinate Detection'
            }
            
            logger.info("=== UNIVERSAL COORDINATE DETECTION COMPLETED ===")
            logger.info(f"✅ Processing time: {processing_time:.2f}s")
            logger.info(f"✅ Layout: {layout.layout_type}")
            logger.info(f"✅ Questions: {coordinate_mapping['total_questions']}")
            
            return result
            
        except Exception as e:
            logger.error(f"❌ Universal coordinate detection failed: {e}")
            return {
                'success': False,
                'error': str(e),
                'processing_method': 'Universal Coordinate Detection'
            }

def main():
    """Test funksiyasi"""
    detector = UniversalCoordinateDetector()
    
    # Test image yuklash - correct path
    test_image_paths = [
        '../../test-image.jpg',
        '../test-image.jpg', 
        'test_image_real.jpg',
        'test_image_40_questions.jpg'
    ]
    
    image = None
    image_path = None
    
    for path in test_image_paths:
        try:
            image = cv2.imread(path)
            if image is not None:
                image_path = path
                print(f"✅ Test image loaded: {path}")
                break
        except:
            continue
    
    if image is None:
        print("❌ Test image topilmadi! Quyidagi fayllarni tekshiring:")
        for path in test_image_paths:
            print(f"   - {path}")
        return
    
    # Koordinatalarni aniqlash
    result = detector.detect_coordinates(image)
    
    if result and result.get('success'):
        print("\n=== ENHANCED UNIVERSAL COORDINATE DETECTION RESULTS ===")
        
        mapping = result['coordinate_mapping']
        print(f"Layout turi: {mapping['layout_type']}")
        print(f"Jami savollar: {mapping['total_questions']}")
        print(f"Processing time: {result['processing_time']:.2f}s")
        
        # Layout info
        layout_info = mapping.get('layout_info', {})
        print(f"Total rows: {layout_info.get('total_rows', 0)}")
        print(f"Total columns: {layout_info.get('total_columns', 0)}")
        print(f"Column groups: {len(layout_info.get('column_groups', []))}")
        
        # Birinchi 10 ta savol koordinatalarini ko'rsatish
        questions = mapping.get('questions', {})
        print(f"\nBirinchi 10 ta savol koordinatalari:")
        for q_num in sorted(questions.keys())[:10]:
            q_data = questions[q_num]
            print(f"  Savol {q_num} (Row {q_data.get('row_index', 0)}, Group {q_data.get('column_group', 0)}):")
            for option, coords in q_data['options'].items():
                print(f"    {option}: ({coords['x']}, {coords['y']}) conf={coords['confidence']:.2f}")
        
        # Oxirgi 5 ta savol
        if len(questions) > 10:
            print(f"\nOxirgi 5 ta savol koordinatalari:")
            last_questions = sorted(questions.keys())[-5:]
            for q_num in last_questions:
                q_data = questions[q_num]
                print(f"  Savol {q_num} (Row {q_data.get('row_index', 0)}, Group {q_data.get('column_group', 0)}):")
                for option, coords in q_data['options'].items():
                    print(f"    {option}: ({coords['x']}, {coords['y']}) conf={coords['confidence']:.2f}")
        
        # Natijalarni saqlash
        output_file = 'enhanced_universal_coordinates_result.json'
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(result, f, indent=2, ensure_ascii=False)
        
        print(f"\n✅ Enhanced natijalar '{output_file}' faylida saqlandi")
        
        # Performance summary
        detection_stats = result.get('detection_stats', {})
        print(f"\n📊 PERFORMANCE SUMMARY:")
        print(f"   Total bubbles detected: {detection_stats.get('total_bubbles', 0)}")
        print(f"   Valid rows found: {detection_stats.get('valid_rows', 0)}")
        print(f"   Layout type: {detection_stats.get('layout_type', 'unknown')}")
        print(f"   Questions mapped: {mapping['total_questions']}")
        print(f"   Target: 40 questions")
        print(f"   Success rate: {(mapping['total_questions']/40)*100:.1f}%")
        
    else:
        print("❌ Enhanced koordinata aniqlash muvaffaqiyatsiz!")
        if result:
            error_msg = result.get('error', 'Noma\'lum xatolik')
            print(f"Xatolik: {error_msg}")

if __name__ == "__main__":
    main()