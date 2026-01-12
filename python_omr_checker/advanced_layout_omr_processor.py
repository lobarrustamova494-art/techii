#!/usr/bin/env python3
"""
Advanced Layout-Based OMR Processor
Detects column markers (3 black rectangles) and question markers (1 black rectangle)
to properly identify OMR sheet structure and process bubbles.
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

class AdvancedLayoutOMRProcessor:
    def __init__(self):
        self.debug_mode = True
        self.min_rectangle_area = 200  # Increased minimum area
        self.max_rectangle_area = 600  # Reduced maximum area  
        self.column_marker_count = 3
        self.bubble_fill_threshold = 40.0  # 40% threshold
        self.debug_image = None  # Store debug image
        
    def preprocess_image(self, image: np.ndarray) -> np.ndarray:
        """Preprocess image for better marker detection"""
        # Convert to grayscale if needed
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image.copy()
        
        # Apply Gaussian blur to reduce noise
        blurred = cv2.GaussianBlur(gray, (3, 3), 0)
        
        # Apply adaptive threshold for better black rectangle detection
        binary = cv2.adaptiveThreshold(
            blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
            cv2.THRESH_BINARY_INV, 11, 2
        )
        
        return binary
    
    def detect_black_rectangles(self, binary_image: np.ndarray) -> List[Rectangle]:
        """Detect all black rectangles in the image with improved filtering"""
        # Find contours
        contours, _ = cv2.findContours(
            binary_image, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
        )
        
        rectangles = []
        
        for contour in contours:
            # Get bounding rectangle
            x, y, w, h = cv2.boundingRect(contour)
            area = w * h
            
            # More specific filtering for OMR sheet rectangles
            aspect_ratio = w / h if h > 0 else 0
            
            # Filter by area, aspect ratio, and minimum dimensions
            # Focus on larger rectangles that are likely markers, not bubbles
            if (self.min_rectangle_area <= area <= self.max_rectangle_area and
                0.5 <= aspect_ratio <= 2.0 and  # Square-ish rectangles
                w >= 15 and h >= 15):  # Minimum dimensions
                
                # Additional check: rectangle should be reasonably filled
                # (not just a thin outline)
                contour_area = cv2.contourArea(contour)
                fill_ratio = contour_area / area if area > 0 else 0
                
                if fill_ratio > 0.4:  # At least 40% filled
                    rectangles.append(Rectangle(x, y, w, h, area))
        
        # Sort rectangles by area (larger first) to prioritize important markers
        rectangles.sort(key=lambda r: r.area, reverse=True)
        
        logger.info(f"Detected {len(rectangles)} potential rectangles")
        
        # Log some statistics for debugging
        if rectangles:
            areas = [r.area for r in rectangles]
            widths = [r.width for r in rectangles]
            heights = [r.height for r in rectangles]
            x_positions = [r.x for r in rectangles]
            
            logger.info(f"Rectangle areas: min={min(areas)}, max={max(areas)}, avg={np.mean(areas):.1f}")
            logger.info(f"Rectangle widths: min={min(widths)}, max={max(widths)}, avg={np.mean(widths):.1f}")
            logger.info(f"Rectangle heights: min={min(heights)}, max={max(heights)}, avg={np.mean(heights):.1f}")
            logger.info(f"X positions: min={min(x_positions)}, max={max(x_positions)}")
        
        return rectangles
    
    def group_column_markers(self, rectangles: List[Rectangle]) -> List[ColumnMarker]:
        """Group rectangles into column markers (3 rectangles vertically aligned)"""
        column_markers = []
        used_rectangles = set()
        
        # Sort rectangles by x position first, then by y position
        sorted_rects = sorted(rectangles, key=lambda r: (r.x, r.y))
        
        logger.info(f"Searching for column markers among {len(sorted_rects)} rectangles")
        
        # First, identify potential column positions by looking for vertical clusters
        # Group rectangles by x position (with tolerance)
        x_groups = {}
        x_tolerance = 15
        
        for rect in sorted_rects:
            found_group = False
            for group_x in x_groups.keys():
                if abs(rect.x - group_x) <= x_tolerance:
                    x_groups[group_x].append(rect)
                    found_group = True
                    break
            
            if not found_group:
                x_groups[rect.x] = [rect]
        
        logger.info(f"Found {len(x_groups)} x-position groups")
        
        # For each x-group, look for column markers (groups of exactly 3 rectangles)
        for group_x, group_rects in x_groups.items():
            if len(group_rects) < 3:
                continue
                
            # Sort by y position
            group_rects.sort(key=lambda r: r.y)
            
            # Look for groups of 3 consecutive rectangles with reasonable spacing
            for i in range(len(group_rects) - 2):
                rect1, rect2, rect3 = group_rects[i], group_rects[i+1], group_rects[i+2]
                
                # Check if these 3 rectangles can form a column marker
                y_spacing1 = rect2.y - (rect1.y + rect1.height)
                y_spacing2 = rect3.y - (rect2.y + rect2.height)
                
                # Column markers should have consistent, reasonable spacing
                if (5 <= y_spacing1 <= 50 and 5 <= y_spacing2 <= 50):
                    # Check if spacing is consistent
                    spacing_diff = abs(y_spacing1 - y_spacing2)
                    avg_spacing = (y_spacing1 + y_spacing2) / 2
                    
                    if spacing_diff <= avg_spacing * 0.8:  # Allow some variation
                        # Check if this group is isolated (not part of a larger pattern)
                        # Column markers should be separate from the main bubble grid
                        
                        # Calculate total height of the group
                        total_height = rect3.y + rect3.height - rect1.y
                        
                        # Column markers should be reasonably tall
                        if total_height > 60:  # At least 60 pixels tall
                            
                            # Check if this x-position is likely a column marker position
                            # Column markers are typically at the leftmost part of each column
                            is_leftmost = self.is_leftmost_in_area(rect1, sorted_rects)
                            
                            if is_leftmost:
                                column_marker = ColumnMarker(
                                    rectangles=[rect1, rect2, rect3],
                                    x_position=int(np.mean([r.x for r in [rect1, rect2, rect3]])),
                                    y_start=rect1.y,
                                    y_end=rect3.y + rect3.height
                                )
                                column_markers.append(column_marker)
                                
                                # Mark these rectangles as used
                                for rect in [rect1, rect2, rect3]:
                                    used_rectangles.add((rect.x, rect.y, rect.width, rect.height))
                                
                                logger.info(f"Found column marker at x={column_marker.x_position}, "
                                          f"y_range=({column_marker.y_start}-{column_marker.y_end}), "
                                          f"spacing=({y_spacing1:.1f}, {y_spacing2:.1f})")
                                break  # Found a valid group, move to next x-group
        
        # Sort column markers by x position
        column_markers.sort(key=lambda cm: cm.x_position)
        
        # Filter out overlapping or too close column markers
        filtered_markers = []
        min_distance = 100  # Minimum distance between column markers
        
        for marker in column_markers:
            is_valid = True
            for existing in filtered_markers:
                if abs(marker.x_position - existing.x_position) < min_distance:
                    is_valid = False
                    break
            
            if is_valid:
                filtered_markers.append(marker)
        
        logger.info(f"Found {len(filtered_markers)} valid column markers after filtering")
        return filtered_markers
    
    def is_leftmost_in_area(self, rect: Rectangle, all_rects: List[Rectangle]) -> bool:
        """Check if this rectangle is the leftmost in its horizontal area"""
        y_tolerance = 20
        
        # Find rectangles in the same horizontal area
        same_area_rects = [
            r for r in all_rects 
            if abs(r.y - rect.y) <= y_tolerance and r.x < rect.x + 50  # Look to the right
        ]
        
        # Count how many rectangles are to the left
        left_count = len([r for r in same_area_rects if r.x < rect.x])
        
        # This should be leftmost or close to leftmost
        return left_count <= 2
    
    def identify_question_markers(self, rectangles: List[Rectangle], 
                                column_markers: List[ColumnMarker]) -> List[QuestionMarker]:
        """Identify single rectangles as question markers"""
        # Get all rectangles used in column markers
        used_rects = set()
        for cm in column_markers:
            for rect in cm.rectangles:
                used_rects.add((rect.x, rect.y, rect.width, rect.height))
        
        # Find unused rectangles (potential question markers)
        question_markers = []
        
        logger.info(f"Looking for question markers among {len(rectangles)} total rectangles")
        logger.info(f"Excluding {len(used_rects)} rectangles already used in column markers")
        
        for rect in rectangles:
            rect_tuple = (rect.x, rect.y, rect.width, rect.height)
            if rect_tuple not in used_rects:
                # Additional validation for question markers
                # Question markers should be smaller and more square-like than column markers
                aspect_ratio = rect.width / rect.height
                
                # Question markers typically have aspect ratio closer to 1 (square-ish)
                if 0.5 <= aspect_ratio <= 2.0 and rect.area >= 50:
                    # Determine which column this question marker belongs to
                    column_index = self.assign_to_column(rect, column_markers)
                    if column_index >= 0:
                        question_markers.append(QuestionMarker(
                            rectangle=rect,
                            question_number=0,  # Will be assigned later
                            column_index=column_index
                        ))
                        logger.info(f"Found question marker at ({rect.x}, {rect.y}) "
                                  f"assigned to column {column_index}")
        
        logger.info(f"Found {len(question_markers)} question markers")
        return question_markers
    
    def assign_to_column(self, rect: Rectangle, column_markers: List[ColumnMarker]) -> int:
        """Assign a question marker to the nearest column"""
        if not column_markers:
            return -1
        
        best_column = -1
        min_distance = float('inf')
        
        for i, cm in enumerate(column_markers):
            # Calculate horizontal distance from question marker to column marker
            horizontal_distance = abs(rect.x - cm.x_position)
            
            # Check if question marker is within reasonable vertical range of column
            vertical_overlap = not (rect.y + rect.height < cm.y_start or 
                                  rect.y > cm.y_end + 800)  # Allow extension below column
            
            # Question marker should be to the right of column marker (in the same row area)
            is_to_right = rect.x > cm.x_position
            
            if vertical_overlap and is_to_right and horizontal_distance < 400:  # Reasonable horizontal distance
                if horizontal_distance < min_distance:
                    min_distance = horizontal_distance
                    best_column = i
        
        if best_column >= 0:
            logger.info(f"Assigned question marker at ({rect.x}, {rect.y}) to column {best_column} "
                       f"(distance: {min_distance:.1f})")
        
        return best_column
    
    def organize_columns(self, column_markers: List[ColumnMarker], 
                        question_markers: List[QuestionMarker]) -> List[Column]:
        """Organize detected markers into column structures"""
        columns = []
        
        # Sort column markers by x position
        sorted_column_markers = sorted(column_markers, key=lambda cm: cm.x_position)
        
        logger.info(f"Organizing {len(sorted_column_markers)} columns")
        
        for i, cm in enumerate(sorted_column_markers):
            # Get question markers for this column
            column_questions = [qm for qm in question_markers if qm.column_index == i]
            
            # Sort questions by y position
            column_questions.sort(key=lambda qm: qm.rectangle.y)
            
            # Assign question numbers based on position in column
            for j, qm in enumerate(column_questions):
                qm.question_number = j + 1
            
            # Determine column boundaries more precisely
            if i == 0:
                x_start = 0
            else:
                prev_cm = sorted_column_markers[i-1]
                x_start = (prev_cm.x_position + cm.x_position) // 2
            
            if i == len(sorted_column_markers) - 1:
                x_end = 9999  # Use a large number for the last column
            else:
                next_cm = sorted_column_markers[i+1]
                x_end = (cm.x_position + next_cm.x_position) // 2
            
            column = Column(
                index=i,
                x_start=x_start,
                x_end=x_end,
                questions=column_questions,
                marker=cm
            )
            columns.append(column)
            
            logger.info(f"Column {i}: {len(column_questions)} questions, "
                       f"x_range=({x_start}-{x_end}), "
                       f"marker_at=({cm.x_position}, {cm.y_start}-{cm.y_end})")
        
        # Calculate questions per column statistics
        questions_per_column = [len(col.questions) for col in columns]
        if questions_per_column:
            avg_questions = np.mean(questions_per_column)
            logger.info(f"Average questions per column: {avg_questions:.1f}")
            logger.info(f"Questions per column: {questions_per_column}")
        
        return columns
    
    def detect_bubbles_for_question(self, image: np.ndarray, question: QuestionMarker, 
                                  column: Column) -> List[Bubble]:
        """Detect and analyze bubbles for a specific question"""
        bubbles = []
        
        # Define search area to the right of question marker
        qr = question.rectangle
        search_x_start = qr.x + qr.width + 10
        search_x_end = min(column.x_end, search_x_start + 300)  # Reasonable bubble area width
        search_y_start = qr.y - 5
        search_y_end = qr.y + qr.height + 5
        
        # Extract search region
        search_region = image[search_y_start:search_y_end, search_x_start:search_x_end]
        
        if search_region.size == 0:
            return bubbles
        
        # Convert to grayscale if needed
        if len(search_region.shape) == 3:
            gray_region = cv2.cvtColor(search_region, cv2.COLOR_BGR2GRAY)
        else:
            gray_region = search_region.copy()
        
        # Detect circular bubbles using HoughCircles
        circles = cv2.HoughCircles(
            gray_region,
            cv2.HOUGH_GRADIENT,
            dp=1,
            minDist=30,
            param1=50,
            param2=30,
            minRadius=8,
            maxRadius=25
        )
        
        if circles is not None:
            circles = np.round(circles[0, :]).astype("int")
            
            # Sort circles by x position (left to right)
            circles = sorted(circles, key=lambda c: c[0])
            
            options = ['A', 'B', 'C', 'D', 'E']
            
            for i, (x, y, r) in enumerate(circles[:5]):  # Max 5 options
                # Adjust coordinates back to original image
                abs_x = search_x_start + x
                abs_y = search_y_start + y
                
                # Calculate fill percentage
                fill_percentage = self.calculate_bubble_fill(gray_region, x, y, r)
                is_filled = fill_percentage >= self.bubble_fill_threshold
                
                bubble = Bubble(
                    x=abs_x,
                    y=abs_y,
                    width=r*2,
                    height=r*2,
                    filled_percentage=fill_percentage,
                    is_filled=is_filled,
                    option=options[i] if i < len(options) else f'Option{i+1}'
                )
                bubbles.append(bubble)
        
        return bubbles
    
    def calculate_bubble_fill(self, gray_region: np.ndarray, cx: int, cy: int, radius: int) -> float:
        """Calculate the fill percentage of a bubble with improved accuracy"""
        # Create a mask for the circle
        mask = np.zeros(gray_region.shape, dtype=np.uint8)
        cv2.circle(mask, (cx, cy), radius-2, 255, -1)  # Slightly smaller radius to avoid edges
        
        # Get pixels inside the circle
        circle_pixels = gray_region[mask == 255]
        
        if len(circle_pixels) == 0:
            return 0.0
        
        # Use Otsu's thresholding to find optimal threshold for this specific bubble
        try:
            threshold_value, _ = cv2.threshold(circle_pixels, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        except:
            threshold_value = 127  # Fallback threshold
        
        # Count dark pixels (filled areas)
        dark_pixels = np.sum(circle_pixels < threshold_value)
        total_pixels = len(circle_pixels)
        
        # Calculate fill percentage
        fill_percentage = (dark_pixels / total_pixels) * 100
        
        # Additional validation: check if the bubble has a clear dark center
        # Create a smaller inner circle to check core darkness
        inner_mask = np.zeros(gray_region.shape, dtype=np.uint8)
        inner_radius = max(1, radius // 2)
        cv2.circle(inner_mask, (cx, cy), inner_radius, 255, -1)
        
        inner_pixels = gray_region[inner_mask == 255]
        if len(inner_pixels) > 0:
            inner_darkness = np.sum(inner_pixels < threshold_value) / len(inner_pixels) * 100
            # If the center is very dark, boost the fill percentage slightly
            if inner_darkness > 70:
                fill_percentage = min(100, fill_percentage * 1.1)
        
        return fill_percentage
    
    def create_debug_visualization(self, image: np.ndarray, columns: List[Column], 
                                 results: Dict) -> np.ndarray:
        """Create debug visualization showing detected markers and bubbles"""
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
    
    def save_rectangle_debug_image(self, image: np.ndarray, rectangles: List[Rectangle], 
                                 output_path: str):
        """Save debug image showing all detected rectangles"""
        debug_img = image.copy()
        
        # Draw all rectangles with different colors based on size
        for i, rect in enumerate(rectangles):
            # Color based on area (larger = more red, smaller = more blue)
            max_area = max(r.area for r in rectangles) if rectangles else 1
            color_intensity = int(255 * (rect.area / max_area))
            color = (255 - color_intensity, 0, color_intensity)  # Blue to Red gradient
            
            cv2.rectangle(debug_img, (rect.x, rect.y), 
                        (rect.x + rect.width, rect.y + rect.height), color, 2)
            
            # Add area label
            cv2.putText(debug_img, f"{rect.area}", 
                       (rect.x, rect.y - 5), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.3, color, 1)
        
        cv2.imwrite(output_path, debug_img)
        logger.info(f"Rectangle debug image saved to: {output_path}")
    
    def process_omr_sheet(self, image_path: str, exam_data: Dict) -> Dict:
        """Main processing function"""
        logger.info(f"Processing OMR sheet: {image_path}")
        
        # Load image
        image = cv2.imread(image_path)
        if image is None:
            raise ValueError(f"Could not load image: {image_path}")
        
        self.debug_image = image.copy()
        
        # Preprocess image
        binary_image = self.preprocess_image(image)
        
        # Detect all black rectangles
        rectangles = self.detect_black_rectangles(binary_image)
        logger.info(f"Detected {len(rectangles)} total rectangles")
        
        # Save rectangle debug image
        if self.debug_mode:
            rect_debug_path = image_path.replace('.jpg', '_rectangles_debug.jpg').replace('.png', '_rectangles_debug.png')
            self.save_rectangle_debug_image(image, rectangles, rect_debug_path)
        
        # Group column markers (3 rectangles each)
        column_markers = self.group_column_markers(rectangles)
        
        if len(column_markers) == 0:
            logger.warning("No column markers found! Check image quality and rectangle detection.")
            return {
                'error': 'No column markers detected',
                'total_questions': 0,
                'columns': 0,
                'answers': {},
                'confidence_scores': {},
                'debug_info': {
                    'rectangles_detected': len(rectangles),
                    'column_markers_found': 0,
                    'question_markers_found': 0
                }
            }
        
        # Identify question markers (single rectangles)
        question_markers = self.identify_question_markers(rectangles, column_markers)
        
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
                'question_markers_found': len(question_markers),
                'columns_organized': len(columns),
                'questions_per_column': [len(col.questions) for col in columns]
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
                    
                    logger.info(f"Q{question_counter}: {best_bubble.option} "
                              f"(confidence: {best_bubble.filled_percentage:.1f}%)")
                else:
                    results['answers'][question_counter] = None
                    results['confidence_scores'][question_counter] = 0.0
                    logger.info(f"Q{question_counter}: No answer detected")
                
                question_counter += 1
        
        # Create debug visualization if enabled
        if self.debug_mode:
            debug_img = self.create_debug_visualization(image, columns, results)
            debug_path = image_path.replace('.jpg', '_debug.jpg').replace('.png', '_debug.png')
            cv2.imwrite(debug_path, debug_img)
            logger.info(f"Debug visualization saved to: {debug_path}")
        
        answered_questions = len([a for a in results['answers'].values() if a is not None])
        logger.info(f"Processing complete. Found answers for {answered_questions}/{results['total_questions']} questions")
        
        return results

def main():
    """Test the processor"""
    processor = AdvancedLayoutOMRProcessor()
    
    # Test with sample data
    exam_data = {
        "total_questions": 40,
        "options_per_question": 5
    }
    
    try:
        # Test with available image
        image_path = "test_image_40_questions.jpg"
        results = processor.process_omr_sheet(image_path, exam_data)
        
        print("\n=== OMR Processing Results ===")
        print(f"Total Questions: {results['total_questions']}")
        print(f"Columns Found: {results['columns']}")
        print(f"Answers Found: {len([a for a in results['answers'].values() if a is not None])}")
        
        print("\nAnswers:")
        for q_num, answer in results['answers'].items():
            confidence = results['confidence_scores'][q_num]
            print(f"Q{q_num}: {answer} (confidence: {confidence:.1f}%)")
        
        print(f"\nDebug Info: {results['debug_info']}")
        
    except Exception as e:
        logger.error(f"Error processing OMR sheet: {e}")
        return False
    
    return True

if __name__ == "__main__":
    main()