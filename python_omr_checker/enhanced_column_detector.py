#!/usr/bin/env python3
"""
Enhanced Column Detector for OMR Sheets
Detects column alignment marks vs question alignment marks
Analyzes column structure and question distribution
"""

import cv2
import numpy as np
import json
import logging
from typing import List, Dict, Tuple, Optional, Any
from dataclasses import dataclass
import time
import math
from collections import defaultdict

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@dataclass
class AlignmentMark:
    """Alignment mark detection result"""
    x: int
    y: int
    width: int
    height: int
    mark_type: str  # 'column' or 'question'
    confidence: float
    area: int
    aspect_ratio: float

@dataclass
class ColumnInfo:
    """Column structure information"""
    column_number: int
    x_start: int
    x_end: int
    question_count: int
    question_positions: List[Tuple[int, int]]  # (x, y) positions
    alignment_marks: List[AlignmentMark]  # Column alignment marks (3 per column)
    column_width: int
    questions_per_column: int

@dataclass
class LayoutAnalysis:
    """Complete layout analysis result"""
    columns: List[ColumnInfo]
    total_questions: int
    column_spacing: int
    question_spacing: int
    layout_confidence: float
    column_alignment_marks: List[AlignmentMark]  # 3 marks per column
    question_alignment_marks: List[AlignmentMark]  # 1 mark per question
    processing_notes: List[str]

class EnhancedColumnDetector:
    """Enhanced column detector with alignment mark differentiation"""
    
    def __init__(self):
        self.debug_mode = True
        
        # Column detection parameters
        self.column_params = {
            'expected_columns': 3,  # For 40 questions: 14+13+13
            'min_column_width': 200,
            'max_column_width': 400,
            'min_column_spacing': 150,
            'max_column_spacing': 350,
            'questions_per_column': [14, 13, 13]  # Standard distribution
        }
        
        # Alignment mark parameters
        self.alignment_params = {
            # Column alignment marks (3 per column, left side)
            'column_mark_width': (12, 25),
            'column_mark_height': (12, 25),
            'column_mark_aspect_ratio': (0.7, 1.3),
            'column_marks_per_column': 3,
            'column_mark_vertical_spacing': (180, 280),
            
            # Question alignment marks (1 per question, left of each question)
            'question_mark_width': (8, 18),
            'question_mark_height': (8, 18),
            'question_mark_aspect_ratio': (0.8, 1.2),
            'question_mark_spacing': (35, 55),  # Vertical spacing between questions
            
            # Detection thresholds
            'dark_threshold': 80,
            'min_dark_ratio': 0.6,
            'min_confidence': 0.7
        }
        
        # Bubble detection parameters
        self.bubble_params = {
            'bubble_radius': (10, 20),
            'fill_threshold': 0.4,  # 40% filled = marked
            'options_per_question': 4,  # A, B, C, D
            'option_spacing': (25, 45)
        }
    
    def analyze_omr_layout(self, image_path: str) -> LayoutAnalysis:
        """Main layout analysis function"""
        logger.info("=== ENHANCED COLUMN DETECTION STARTED ===")
        start_time = time.time()
        
        try:
            # Load and preprocess image
            image = cv2.imread(image_path)
            if image is None:
                raise ValueError(f"Could not load image: {image_path}")
            
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            height, width = gray.shape
            
            logger.info(f"📏 Image dimensions: {width}x{height}")
            
            # Step 1: Detect all alignment marks
            all_marks = self.detect_all_alignment_marks(gray)
            logger.info(f"🎯 Total alignment marks detected: {len(all_marks)}")
            
            # Step 2: Classify marks as column vs question marks
            column_marks, question_marks = self.classify_alignment_marks(all_marks, width, height)
            logger.info(f"📊 Column marks: {len(column_marks)}, Question marks: {len(question_marks)}")
            
            # Step 3: Analyze column structure
            columns = self.analyze_column_structure(column_marks, question_marks, width, height)
            logger.info(f"📋 Detected columns: {len(columns)}")
            
            # Step 4: Calculate layout metrics
            layout_metrics = self.calculate_layout_metrics(columns)
            
            # Step 5: Validate layout consistency
            layout_confidence = self.validate_layout_consistency(columns, question_marks)
            
            processing_time = time.time() - start_time
            logger.info(f"✅ Layout analysis completed in {processing_time:.2f}s")
            
            return LayoutAnalysis(
                columns=columns,
                total_questions=sum(col.question_count for col in columns),
                column_spacing=layout_metrics['average_column_spacing'],
                question_spacing=layout_metrics['average_question_spacing'],
                layout_confidence=layout_confidence,
                column_alignment_marks=column_marks,
                question_alignment_marks=question_marks,
                processing_notes=self._generate_processing_notes(columns, layout_metrics)
            )
            
        except Exception as e:
            logger.error(f"❌ Layout analysis failed: {e}")
            raise
    
    def detect_all_alignment_marks(self, gray_image: np.ndarray) -> List[AlignmentMark]:
        """Detect all potential alignment marks in the image"""
        logger.info("🔍 Detecting all alignment marks...")
        
        height, width = gray_image.shape
        marks = []
        
        # Apply preprocessing for better mark detection
        blurred = cv2.GaussianBlur(gray_image, (3, 3), 0)
        
        # Use adaptive thresholding
        binary = cv2.adaptiveThreshold(
            blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
            cv2.THRESH_BINARY_INV, 11, 2
        )
        
        # Find contours
        contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        for contour in contours:
            # Get bounding rectangle
            x, y, w, h = cv2.boundingRect(contour)
            area = cv2.contourArea(contour)
            
            # Filter by size (potential alignment marks)
            if (self.alignment_params['column_mark_width'][0] <= w <= max(self.alignment_params['column_mark_width'][1], self.alignment_params['question_mark_width'][1]) and
                self.alignment_params['column_mark_height'][0] <= h <= max(self.alignment_params['column_mark_height'][1], self.alignment_params['question_mark_height'][1]) and
                area > 50):
                
                # Calculate aspect ratio
                aspect_ratio = w / h if h > 0 else 0
                
                # Check if it's dark enough (alignment mark)
                roi = gray_image[y:y+h, x:x+w]
                dark_pixels = np.sum(roi < self.alignment_params['dark_threshold'])
                total_pixels = roi.size
                dark_ratio = dark_pixels / total_pixels if total_pixels > 0 else 0
                
                if dark_ratio >= self.alignment_params['min_dark_ratio']:
                    confidence = min(dark_ratio * 1.2, 1.0)  # Boost confidence for very dark marks
                    
                    mark = AlignmentMark(
                        x=x + w//2,  # Center point
                        y=y + h//2,
                        width=w,
                        height=h,
                        mark_type='unknown',  # Will be classified later
                        confidence=confidence,
                        area=int(area),
                        aspect_ratio=aspect_ratio
                    )
                    marks.append(mark)
        
        # Sort marks by position (top to bottom, left to right)
        marks.sort(key=lambda m: (m.y, m.x))
        
        logger.info(f"   Found {len(marks)} potential alignment marks")
        return marks
    
    def classify_alignment_marks(self, marks: List[AlignmentMark], width: int, height: int) -> Tuple[List[AlignmentMark], List[AlignmentMark]]:
        """Classify marks as column alignment marks vs question alignment marks"""
        logger.info("🏷️ Classifying alignment marks...")
        
        column_marks = []
        question_marks = []
        
        # Define search areas
        left_margin = width * 0.15  # Left 15% of image
        
        for mark in marks:
            # Only consider marks in the left margin area
            if mark.x > left_margin:
                continue
            
            # Classify based on size and position patterns
            is_column_mark = self._is_column_alignment_mark(mark, marks, width, height)
            
            if is_column_mark:
                mark.mark_type = 'column'
                column_marks.append(mark)
            else:
                mark.mark_type = 'question'
                question_marks.append(mark)
        
        logger.info(f"   Column marks: {len(column_marks)}")
        logger.info(f"   Question marks: {len(question_marks)}")
        
        return column_marks, question_marks
    
    def _is_column_alignment_mark(self, mark: AlignmentMark, all_marks: List[AlignmentMark], width: int, height: int) -> bool:
        """Determine if a mark is a column alignment mark (3 per column) vs question mark (1 per question)"""
        
        # Column marks are typically:
        # 1. Larger than question marks
        # 2. Positioned at specific intervals (3 per column)
        # 3. Have consistent vertical spacing
        # 4. Located at the far left of each column
        
        # Size criteria
        size_score = 0
        if (self.alignment_params['column_mark_width'][0] <= mark.width <= self.alignment_params['column_mark_width'][1] and
            self.alignment_params['column_mark_height'][0] <= mark.height <= self.alignment_params['column_mark_height'][1]):
            size_score += 2
        
        # Aspect ratio criteria
        aspect_score = 0
        if (self.alignment_params['column_mark_aspect_ratio'][0] <= mark.aspect_ratio <= self.alignment_params['column_mark_aspect_ratio'][1]):
            aspect_score += 1
        
        # Position criteria - column marks should be at far left
        position_score = 0
        if mark.x < width * 0.08:  # Very left edge
            position_score += 2
        elif mark.x < width * 0.12:  # Still quite left
            position_score += 1
        
        # Vertical spacing pattern - look for groups of 3
        spacing_score = 0
        nearby_marks = [m for m in all_marks if abs(m.x - mark.x) < 50 and m != mark]
        
        # Count marks in vertical proximity
        vertical_neighbors = 0
        for other in nearby_marks:
            y_diff = abs(other.y - mark.y)
            if 150 < y_diff < 350:  # Expected spacing between column marks
                vertical_neighbors += 1
        
        if vertical_neighbors >= 1:  # At least one other mark in column pattern
            spacing_score += 2
        
        # Total score
        total_score = size_score + aspect_score + position_score + spacing_score
        
        # Column mark if score >= 4
        return total_score >= 4
    
    def analyze_column_structure(self, column_marks: List[AlignmentMark], question_marks: List[AlignmentMark], width: int, height: int) -> List[ColumnInfo]:
        """Analyze column structure based on alignment marks"""
        logger.info("📋 Analyzing column structure...")
        
        columns = []
        
        # Group column marks by X position (each column should have 3 marks)
        column_groups = self._group_marks_by_column(column_marks)
        
        for col_idx, (x_pos, marks_in_column) in enumerate(column_groups.items()):
            logger.info(f"   Column {col_idx + 1}: {len(marks_in_column)} alignment marks at x≈{x_pos}")
            
            # Determine column boundaries
            col_start_x = x_pos + 50  # Start after alignment marks
            col_end_x = col_start_x + self.column_params['max_column_width']
            
            # Adjust end based on next column or image width
            if col_idx < len(column_groups) - 1:
                next_x = list(column_groups.keys())[col_idx + 1]
                col_end_x = min(col_end_x, (x_pos + next_x) // 2)
            else:
                col_end_x = min(col_end_x, width - 50)
            
            # Find questions in this column
            questions_in_column = self._find_questions_in_column(
                question_marks, col_start_x, col_end_x, height
            )
            
            column_info = ColumnInfo(
                column_number=col_idx + 1,
                x_start=col_start_x,
                x_end=col_end_x,
                question_count=len(questions_in_column),
                question_positions=[(q.x, q.y) for q in questions_in_column],
                alignment_marks=marks_in_column,
                column_width=col_end_x - col_start_x,
                questions_per_column=len(questions_in_column)
            )
            
            columns.append(column_info)
            
            logger.info(f"      Questions: {len(questions_in_column)}")
            logger.info(f"      Width: {column_info.column_width}px")
            logger.info(f"      Range: x={col_start_x}-{col_end_x}")
        
        return columns
    
    def _group_marks_by_column(self, column_marks: List[AlignmentMark]) -> Dict[int, List[AlignmentMark]]:
        """Group column marks by X position (each column should have 3 marks)"""
        groups = defaultdict(list)
        
        # Sort marks by X position
        sorted_marks = sorted(column_marks, key=lambda m: m.x)
        
        # Group marks with similar X positions
        tolerance = 30  # pixels
        current_x = None
        
        for mark in sorted_marks:
            if current_x is None or abs(mark.x - current_x) > tolerance:
                current_x = mark.x
            
            groups[current_x].append(mark)
        
        # Filter groups to only include those with reasonable number of marks
        filtered_groups = {}
        for x_pos, marks in groups.items():
            if len(marks) >= 2:  # At least 2 marks per column (ideally 3)
                filtered_groups[x_pos] = marks
        
        return filtered_groups
    
    def _find_questions_in_column(self, question_marks: List[AlignmentMark], col_start: int, col_end: int, height: int) -> List[AlignmentMark]:
        """Find question marks within a specific column"""
        questions = []
        
        for mark in question_marks:
            if col_start <= mark.x <= col_end:
                questions.append(mark)
        
        # Sort by Y position (top to bottom)
        questions.sort(key=lambda q: q.y)
        
        return questions
    
    def calculate_layout_metrics(self, columns: List[ColumnInfo]) -> Dict[str, Any]:
        """Calculate layout metrics"""
        logger.info("📊 Calculating layout metrics...")
        
        metrics = {}
        
        # Column spacing
        if len(columns) > 1:
            spacings = []
            for i in range(len(columns) - 1):
                spacing = columns[i + 1].x_start - columns[i].x_end
                spacings.append(spacing)
            metrics['average_column_spacing'] = int(np.mean(spacings))
            metrics['column_spacings'] = spacings
        else:
            metrics['average_column_spacing'] = 0
            metrics['column_spacings'] = []
        
        # Question spacing within columns
        question_spacings = []
        for column in columns:
            if len(column.question_positions) > 1:
                col_spacings = []
                positions = sorted(column.question_positions, key=lambda p: p[1])  # Sort by Y
                for i in range(len(positions) - 1):
                    spacing = positions[i + 1][1] - positions[i][1]
                    col_spacings.append(spacing)
                question_spacings.extend(col_spacings)
        
        if question_spacings:
            metrics['average_question_spacing'] = int(np.mean(question_spacings))
            metrics['question_spacing_std'] = int(np.std(question_spacings))
        else:
            metrics['average_question_spacing'] = 0
            metrics['question_spacing_std'] = 0
        
        # Column widths
        metrics['column_widths'] = [col.column_width for col in columns]
        metrics['average_column_width'] = int(np.mean(metrics['column_widths'])) if metrics['column_widths'] else 0
        
        logger.info(f"   Average column spacing: {metrics['average_column_spacing']}px")
        logger.info(f"   Average question spacing: {metrics['average_question_spacing']}px")
        logger.info(f"   Average column width: {metrics['average_column_width']}px")
        
        return metrics
    
    def validate_layout_consistency(self, columns: List[ColumnInfo], question_marks: List[AlignmentMark]) -> float:
        """Validate layout consistency and return confidence score"""
        logger.info("✅ Validating layout consistency...")
        
        confidence_factors = []
        
        # Factor 1: Expected number of columns (3 for 40 questions)
        expected_columns = 3
        column_factor = min(len(columns) / expected_columns, 1.0)
        confidence_factors.append(('columns', column_factor, 0.3))
        
        # Factor 2: Total questions should be around 40
        total_questions = sum(col.question_count for col in columns)
        question_factor = min(total_questions / 40, 1.0) if total_questions <= 40 else max(0.5, 40 / total_questions)
        confidence_factors.append(('questions', question_factor, 0.3))
        
        # Factor 3: Column alignment marks (should have 3 per column)
        alignment_factor = 0
        for column in columns:
            expected_marks = 3
            actual_marks = len(column.alignment_marks)
            col_alignment_factor = min(actual_marks / expected_marks, 1.0)
            alignment_factor += col_alignment_factor
        alignment_factor = alignment_factor / len(columns) if columns else 0
        confidence_factors.append(('alignment', alignment_factor, 0.2))
        
        # Factor 4: Question distribution consistency
        if len(columns) >= 2:
            question_counts = [col.question_count for col in columns]
            expected_distribution = [14, 13, 13]  # Standard for 40 questions
            
            distribution_factor = 0
            for i, count in enumerate(question_counts[:3]):
                if i < len(expected_distribution):
                    factor = min(count / expected_distribution[i], 1.0) if count <= expected_distribution[i] else max(0.5, expected_distribution[i] / count)
                    distribution_factor += factor
            distribution_factor = distribution_factor / min(len(question_counts), 3)
            confidence_factors.append(('distribution', distribution_factor, 0.2))
        else:
            confidence_factors.append(('distribution', 0.5, 0.2))
        
        # Calculate weighted confidence
        total_confidence = sum(factor * weight for _, factor, weight in confidence_factors)
        
        logger.info("   Confidence factors:")
        for name, factor, weight in confidence_factors:
            logger.info(f"      {name}: {factor:.2f} (weight: {weight})")
        logger.info(f"   Overall confidence: {total_confidence:.2f}")
        
        return total_confidence
    
    def _generate_processing_notes(self, columns: List[ColumnInfo], metrics: Dict[str, Any]) -> List[str]:
        """Generate processing notes and recommendations"""
        notes = []
        
        # Column analysis
        notes.append(f"Detected {len(columns)} columns")
        
        for i, column in enumerate(columns):
            notes.append(f"Column {i+1}: {column.question_count} questions, {len(column.alignment_marks)} alignment marks")
        
        # Spacing analysis
        if metrics['average_column_spacing'] > 0:
            notes.append(f"Average column spacing: {metrics['average_column_spacing']}px")
        
        if metrics['average_question_spacing'] > 0:
            notes.append(f"Average question spacing: {metrics['average_question_spacing']}px")
        
        # Quality assessment
        total_questions = sum(col.question_count for col in columns)
        if total_questions == 40:
            notes.append("✅ Standard 40-question format detected")
        elif total_questions > 0:
            notes.append(f"⚠️ Non-standard format: {total_questions} questions detected")
        else:
            notes.append("❌ No questions detected - check image quality")
        
        return notes

def main():
    """Test the enhanced column detector"""
    import sys
    
    if len(sys.argv) != 2:
        print("Usage: python enhanced_column_detector.py <image_path>")
        sys.exit(1)
    
    image_path = sys.argv[1]
    
    detector = EnhancedColumnDetector()
    
    try:
        result = detector.analyze_omr_layout(image_path)
        
        print("\n" + "="*60)
        print("ENHANCED COLUMN DETECTION RESULTS")
        print("="*60)
        
        print(f"\n📊 LAYOUT SUMMARY:")
        print(f"   Total Columns: {len(result.columns)}")
        print(f"   Total Questions: {result.total_questions}")
        print(f"   Column Spacing: {result.column_spacing}px")
        print(f"   Question Spacing: {result.question_spacing}px")
        print(f"   Layout Confidence: {result.layout_confidence:.2f}")
        
        print(f"\n🎯 ALIGNMENT MARKS:")
        print(f"   Column Marks: {len(result.column_alignment_marks)}")
        print(f"   Question Marks: {len(result.question_alignment_marks)}")
        
        print(f"\n📋 COLUMN DETAILS:")
        for column in result.columns:
            print(f"   Column {column.column_number}:")
            print(f"      Questions: {column.question_count}")
            print(f"      Width: {column.column_width}px")
            print(f"      Range: x={column.x_start}-{column.x_end}")
            print(f"      Alignment Marks: {len(column.alignment_marks)}")
        
        print(f"\n📝 PROCESSING NOTES:")
        for note in result.processing_notes:
            print(f"   • {note}")
        
        # Save results to JSON
        output_file = image_path.replace('.jpg', '_layout_analysis.json').replace('.png', '_layout_analysis.json')
        
        result_dict = {
            'layout_summary': {
                'total_columns': len(result.columns),
                'total_questions': result.total_questions,
                'column_spacing': result.column_spacing,
                'question_spacing': result.question_spacing,
                'layout_confidence': result.layout_confidence
            },
            'columns': [
                {
                    'column_number': col.column_number,
                    'question_count': col.question_count,
                    'x_start': col.x_start,
                    'x_end': col.x_end,
                    'column_width': col.column_width,
                    'alignment_marks_count': len(col.alignment_marks),
                    'question_positions': col.question_positions
                }
                for col in result.columns
            ],
            'alignment_marks': {
                'column_marks': len(result.column_alignment_marks),
                'question_marks': len(result.question_alignment_marks)
            },
            'processing_notes': result.processing_notes
        }
        
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(result_dict, f, indent=2, ensure_ascii=False)
        
        print(f"\n💾 Results saved to: {output_file}")
        
    except Exception as e:
        logger.error(f"❌ Processing failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()