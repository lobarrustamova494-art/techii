#!/usr/bin/env python3
"""
Improved Layout-Based OMR Processor
Uses intelligent analysis to detect OMR sheet structure
"""

import cv2
import numpy as np
import json
import logging
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass
import math

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class Rectangle:
    x: int
    y: int
    width: int
    height: int
    area: int

@dataclass
class ColumnMarker:
    rectangles: List[Rectangle]
    x_position: int
    y_start: int
    y_end: int

@dataclass
class QuestionMarker:
    rectangle: Rectangle
    question_number: int
    column_index: int

@dataclass
class Column:
    index: int
    x_start: int
    x_end: int
    questions: List[QuestionMarker]
    marker: ColumnMarker

@dataclass
class Bubble:
    x: int
    y: int
    width: int
    height: int
    filled_percentage: float
    is_filled: bool
    option: str  # A, B, C, D, E

class ImprovedLayoutOMRProcessor:
    def __init__(self):
        self.debug_mode = True
        self.min_rectangle_area = 200  # Focus on larger rectangles
        self.max_rectangle_area = 600  
        self.bubble_fill_threshold = 40.0  # 40% threshold
        
    def preprocess_image(self, image: np.ndarray) -> np.ndarray:
        """Preprocess image for better marker detection"""
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image.copy()
        
        # Apply Gaussian blur to reduce noise
        blurred = cv2.GaussianBlur(gray, (3, 3), 0)
        
        # Apply threshold to get binary image
        _, binary = cv2.threshold(blurred, 127, 255, cv2.THRESH_BINARY_INV)
        
        return binary
    
    def detect_rectangles(self, binary_image: np.ndarray) -> List[Rectangle]:
        """Detect rectangles that could be markers"""
        contours, _ = cv2.findContours(
            binary_image, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
        )
        
        rectangles = []
        
        for contour in contours:
            x, y, w, h = cv2.boundingRect(contour)
            area = w * h
            aspect_ratio = w / h if h > 0 else 0
            
            # Filter for marker-sized rectangles
            if (self.min_rectangle_area <= area <= self.max_rectangle_area and
                0.5 <= aspect_ratio <= 2.0 and
                w >= 15 and h >= 15):
                
                # Check if rectangle is filled enough
                contour_area = cv2.contourArea(contour)
                fill_ratio = contour_area / area if area > 0 else 0
                
                if fill_ratio > 0.4:
                    rectangles.append(Rectangle(x, y, w, h, area))
        
        logger.info(f"Detected {len(rectangles)} potential marker rectangles")
        return rectangles
    
    def analyze_column_structure(self, rectangles: List[Rectangle]) -> List[ColumnMarker]:
        """Analyze rectangles to find column markers using a different approach"""
        if len(rectangles) < 6:
            logger.warning("Not enough rectangles for column analysis")
            return []
        
        logger.info("Analyzing OMR structure with new approach...")
        
        # Sort rectangles by x position
        rectangles.sort(key=lambda r: r.x)
        
        # Log rectangle positions for debugging
        logger.info("Rectangle positions:")
        for i, rect in enumerate(rectangles):
            logger.info(f"  {i}: x={rect.x}, y={rect.y}, w={rect.width}, h={rect.height}")
        
        # Since we're seeing question markers instead of column markers,
        # let's try to infer column structure from question marker positions
        
        # Group rectangles by approximate x position (columns)
        x_groups = {}
        x_tolerance = 50  # Larger tolerance for grouping
        
        for rect in rectangles:
            found_group = False
            for group_x in list(x_groups.keys()):
                if abs(rect.x - group_x) <= x_tolerance:
                    x_groups[group_x].append(rect)
                    found_group = True
                    break
            
            if not found_group:
                x_groups[rect.x] = [rect]
        
        logger.info(f"Found {len(x_groups)} x-position groups:")
        for group_x, group_rects in x_groups.items():
            logger.info(f"  Group at x={group_x}: {len(group_rects)} rectangles")
        
        # For each group with enough rectangles, create artificial column markers
        column_markers = []
        
        for group_x, group_rects in x_groups.items():
            if len(group_rects) >= 3:  # Need at least 3 rectangles
                # Sort by y position
                group_rects.sort(key=lambda r: r.y)
                
                # Take first 3 rectangles as column marker
                rect1, rect2, rect3 = group_rects[0], group_rects[1], group_rects[2]
                
                # Create column marker
                column_marker = ColumnMarker(
                    rectangles=[rect1, rect2, rect3],
                    x_position=int(np.mean([r.x for r in [rect1, rect2, rect3]])),
                    y_start=rect1.y,
                    y_end=rect3.y + rect3.height
                )
                column_markers.append(column_marker)
                
                logger.info(f"Created artificial column marker at x={column_marker.x_position}")
        
        # Sort column markers by x position
        column_markers.sort(key=lambda cm: cm.x_position)
        
        logger.info(f"Created {len(column_markers)} column markers")
        return column_markers
    
    def find_question_markers(self, rectangles: List[Rectangle], 
                            column_markers: List[ColumnMarker]) -> List[QuestionMarker]:
        """Find question markers (rectangles not used in column markers)"""
        # Get rectangles used in column markers
        used_rects = set()
        for cm in column_markers:
            for rect in cm.rectangles:
                used_rects.add((rect.x, rect.y, rect.width, rect.height))
        
        question_markers = []
        
        for rect in rectangles:
            rect_tuple = (rect.x, rect.y, rect.width, rect.height)
            if rect_tuple not in used_rects:
                # Assign to nearest column
                column_index = self.assign_to_column(rect, column_markers)
                if column_index >= 0:
                    question_markers.append(QuestionMarker(
                        rectangle=rect,
                        question_number=0,  # Will be assigned later
                        column_index=column_index
                    ))
        
        logger.info(f"Found {len(question_markers)} question markers")
        return question_markers
    
    def assign_to_column(self, rect: Rectangle, column_markers: List[ColumnMarker]) -> int:
        """Assign a question marker to the nearest column"""
        if not column_markers:
            return -1
        
        best_column = -1
        min_distance = float('inf')
        
        for i, cm in enumerate(column_markers):
            # Calculate horizontal distance
            distance = abs(rect.x - cm.x_position)
            
            # Check if within reasonable vertical range
            if (cm.y_start - 100 <= rect.y <= cm.y_end + 800):
                if distance < min_distance:
                    min_distance = distance
                    best_column = i
        
        return best_column
    
    def organize_columns(self, column_markers: List[ColumnMarker], 
                        question_markers: List[QuestionMarker]) -> List[Column]:
        """Organize markers into column structures"""
        columns = []
        
        # Sort column markers by x position
        column_markers.sort(key=lambda cm: cm.x_position)
        
        for i, cm in enumerate(column_markers):
            # Get question markers for this column
            column_questions = [qm for qm in question_markers if qm.column_index == i]
            
            # Sort questions by y position
            column_questions.sort(key=lambda qm: qm.rectangle.y)
            
            # Assign question numbers
            for j, qm in enumerate(column_questions):
                qm.question_number = j + 1
            
            # Determine column boundaries
            if i == 0:
                x_start = 0
            else:
                prev_cm = column_markers[i-1]
                x_start = (prev_cm.x_position + cm.x_position) // 2
            
            if i == len(column_markers) - 1:
                x_end = 9999
            else:
                next_cm = column_markers[i+1]
                x_end = (cm.x_position + next_cm.x_position) // 2
            
            column = Column(
                index=i,
                x_start=x_start,
                x_end=x_end,
                questions=column_questions,
                marker=cm
            )
            columns.append(column)
        
        logger.info(f"Organized {len(columns)} columns")
        for col in columns:
            logger.info(f"Column {col.index}: {len(col.questions)} questions")
        
        return columns
    
    def detect_bubbles_for_question(self, image: np.ndarray, question: QuestionMarker, 
                                  column: Column) -> List[Bubble]:
        """Detect and analyze bubbles for a specific question"""
        bubbles = []
        
        # Define search area to the right of question marker
        qr = question.rectangle
        search_x_start = qr.x + qr.width + 5  # Start closer to question marker
        search_x_end = min(image.shape[1], search_x_start + 200)  # Smaller search area
        search_y_start = max(0, qr.y - 10)  # Expand vertically
        search_y_end = min(image.shape[0], qr.y + qr.height + 10)
        
        logger.info(f"Searching for bubbles in area: x=({search_x_start}-{search_x_end}), y=({search_y_start}-{search_y_end})")
        
        # Extract search region
        search_region = image[search_y_start:search_y_end, search_x_start:search_x_end]
        
        if search_region.size == 0:
            logger.info("Search region is empty")
            return bubbles
        
        # Convert to grayscale if needed
        if len(search_region.shape) == 3:
            gray_region = cv2.cvtColor(search_region, cv2.COLOR_BGR2GRAY)
        else:
            gray_region = search_region.copy()
        
        # Apply threshold to find dark areas (potential filled bubbles)
        _, binary_region = cv2.threshold(gray_region, 127, 255, cv2.THRESH_BINARY_INV)
        
        # Find contours in the binary image
        contours, _ = cv2.findContours(binary_region, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        logger.info(f"Found {len(contours)} contours in search region")
        
        # Filter contours that could be bubbles
        bubble_contours = []
        for contour in contours:
            x, y, w, h = cv2.boundingRect(contour)
            area = cv2.contourArea(contour)
            
            # Filter by size and shape
            if 50 <= area <= 500 and 0.5 <= w/h <= 2.0:
                bubble_contours.append((contour, x, y, w, h, area))
        
        logger.info(f"Found {len(bubble_contours)} potential bubble contours")
        
        # Sort by x position (left to right)
        bubble_contours.sort(key=lambda b: b[1])
        
        options = ['A', 'B', 'C', 'D', 'E']
        
        for i, (contour, x, y, w, h, area) in enumerate(bubble_contours[:5]):  # Max 5 options
            # Adjust coordinates back to original image
            abs_x = search_x_start + x
            abs_y = search_y_start + y
            
            # Calculate fill percentage based on contour area vs bounding box area
            bounding_area = w * h
            fill_percentage = (area / bounding_area) * 100 if bounding_area > 0 else 0
            
            # Also check pixel darkness in the region
            roi = gray_region[y:y+h, x:x+w]
            if roi.size > 0:
                dark_pixels = np.sum(roi < 127)
                total_pixels = roi.size
                darkness_percentage = (dark_pixels / total_pixels) * 100
                
                # Use the higher of the two percentages
                fill_percentage = max(fill_percentage, darkness_percentage)
            
            is_filled = fill_percentage >= self.bubble_fill_threshold
            
            bubble = Bubble(
                x=abs_x,
                y=abs_y,
                width=w,
                height=h,
                filled_percentage=fill_percentage,
                is_filled=is_filled,
                option=options[i] if i < len(options) else f'Option{i+1}'
            )
            bubbles.append(bubble)
            
            logger.info(f"Bubble {i}: option={bubble.option}, fill={fill_percentage:.1f}%, filled={is_filled}")
        
        return bubbles
    
    def calculate_bubble_fill(self, gray_region: np.ndarray, cx: int, cy: int, radius: int) -> float:
        """Calculate the fill percentage of a bubble"""
        # Create a mask for the circle
        mask = np.zeros(gray_region.shape, dtype=np.uint8)
        cv2.circle(mask, (cx, cy), radius-2, 255, -1)
        
        # Get pixels inside the circle
        circle_pixels = gray_region[mask == 255]
        
        if len(circle_pixels) == 0:
            return 0.0
        
        # Use Otsu's thresholding for better threshold detection
        try:
            threshold_value, _ = cv2.threshold(circle_pixels, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        except:
            threshold_value = 127
        
        # Count dark pixels (filled areas)
        dark_pixels = np.sum(circle_pixels < threshold_value)
        total_pixels = len(circle_pixels)
        
        fill_percentage = (dark_pixels / total_pixels) * 100
        return fill_percentage
    
    def create_debug_visualization(self, image: np.ndarray, columns: List[Column], 
                                 results: Dict) -> np.ndarray:
        """Create debug visualization"""
        debug_img = image.copy()
        
        # Draw column markers in blue
        for column in columns:
            for rect in column.marker.rectangles:
                cv2.rectangle(debug_img, (rect.x, rect.y), 
                            (rect.x + rect.width, rect.y + rect.height), (255, 0, 0), 2)
            
            # Draw column boundary
            cv2.line(debug_img, (column.marker.x_position, 0), 
                    (column.marker.x_position, debug_img.shape[0]), (255, 0, 0), 1)
            
            # Label column
            cv2.putText(debug_img, f"Col {column.index}", 
                       (column.marker.x_position + 10, 30), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 0, 0), 2)
        
        # Draw question markers in green
        question_counter = 1
        for column in columns:
            for question in column.questions:
                rect = question.rectangle
                cv2.rectangle(debug_img, (rect.x, rect.y), 
                            (rect.x + rect.width, rect.y + rect.height), (0, 255, 0), 2)
                
                # Label question number
                cv2.putText(debug_img, f"Q{question_counter}", 
                           (rect.x - 30, rect.y + rect.height//2), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 255, 0), 1)
                
                # Show answer if found
                if question_counter in results['answers'] and results['answers'][question_counter]:
                    answer = results['answers'][question_counter]
                    confidence = results['confidence_scores'][question_counter]
                    cv2.putText(debug_img, f"{answer}({confidence:.0f}%)", 
                               (rect.x + rect.width + 10, rect.y + rect.height//2), 
                               cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 0, 255), 1)
                
                question_counter += 1
        
        return debug_img
    
    def process_omr_sheet(self, image_path: str, exam_data: Dict) -> Dict:
        """Main processing function"""
        logger.info(f"Processing OMR sheet: {image_path}")
        
        # Load image
        image = cv2.imread(image_path)
        if image is None:
            raise ValueError(f"Could not load image: {image_path}")
        
        # Preprocess image
        binary_image = self.preprocess_image(image)
        
        # Detect rectangles
        rectangles = self.detect_rectangles(binary_image)
        
        if len(rectangles) == 0:
            return {
                'error': 'No rectangles detected',
                'total_questions': 0,
                'columns': 0,
                'answers': {},
                'confidence_scores': {}
            }
        
        # Analyze column structure
        column_markers = self.analyze_column_structure(rectangles)
        
        if len(column_markers) == 0:
            return {
                'error': 'No column markers detected',
                'total_questions': 0,
                'columns': 0,
                'answers': {},
                'confidence_scores': {}
            }
        
        # Find question markers
        question_markers = self.find_question_markers(rectangles, column_markers)
        
        # Organize into columns
        columns = self.organize_columns(column_markers, question_markers)
        
        # Process bubbles for each question
        results = {
            'total_questions': sum(len(col.questions) for col in columns),
            'columns': len(columns),
            'answers': {},
            'confidence_scores': {},
            'debug_info': {
                'rectangles_detected': len(rectangles),
                'column_markers_found': len(column_markers),
                'question_markers_found': len(question_markers)
            }
        }
        
        question_counter = 1
        
        for column in columns:
            logger.info(f"Processing column {column.index} with {len(column.questions)} questions")
            
            for question in column.questions:
                bubbles = self.detect_bubbles_for_question(image, question, column)
                
                # Find filled bubbles
                filled_bubbles = [b for b in bubbles if b.is_filled]
                
                if filled_bubbles:
                    # Take the most filled bubble as the answer
                    best_bubble = max(filled_bubbles, key=lambda b: b.filled_percentage)
                    results['answers'][question_counter] = best_bubble.option
                    results['confidence_scores'][question_counter] = best_bubble.filled_percentage
                else:
                    results['answers'][question_counter] = None
                    results['confidence_scores'][question_counter] = 0.0
                
                question_counter += 1
        
        # Create debug visualization
        if self.debug_mode:
            debug_img = self.create_debug_visualization(image, columns, results)
            debug_path = image_path.replace('.jpg', '_improved_debug.jpg').replace('.png', '_improved_debug.png')
            cv2.imwrite(debug_path, debug_img)
            logger.info(f"Debug visualization saved to: {debug_path}")
        
        answered_questions = len([a for a in results['answers'].values() if a is not None])
        logger.info(f"Processing complete. Found answers for {answered_questions}/{results['total_questions']} questions")
        
        return results

def main():
    """Test the processor"""
    processor = ImprovedLayoutOMRProcessor()
    
    exam_data = {
        "total_questions": 40,
        "options_per_question": 5
    }
    
    try:
        image_path = "test_image_40_questions.jpg"
        results = processor.process_omr_sheet(image_path, exam_data)
        
        print("\n=== Improved OMR Processing Results ===")
        print(f"Total Questions: {results['total_questions']}")
        print(f"Columns Found: {results['columns']}")
        
        if 'error' in results:
            print(f"Error: {results['error']}")
        else:
            answered = len([a for a in results['answers'].values() if a is not None])
            print(f"Answers Found: {answered}")
            
            print("\nAnswers:")
            for q_num, answer in results['answers'].items():
                confidence = results['confidence_scores'][q_num]
                print(f"Q{q_num}: {answer} (confidence: {confidence:.1f}%)")
        
        print(f"\nDebug Info: {results.get('debug_info', {})}")
        
    except Exception as e:
        logger.error(f"Error processing OMR sheet: {e}")
        return False
    
    return True

if __name__ == "__main__":
    main()