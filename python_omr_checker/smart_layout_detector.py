#!/usr/bin/env python3
"""
Smart Layout Detector for OMR Sheets
Analyzes the actual structure of OMR sheets to identify columns and questions
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
class ColumnInfo:
    x_start: int
    x_end: int
    question_markers: List[Rectangle]
    column_markers: List[Rectangle]

class SmartLayoutDetector:
    def __init__(self):
        self.debug_mode = True
        
    def analyze_omr_structure(self, image_path: str) -> Dict:
        """Analyze OMR sheet structure intelligently"""
        logger.info(f"Analyzing OMR structure: {image_path}")
        
        # Load image
        image = cv2.imread(image_path)
        if image is None:
            raise ValueError(f"Could not load image: {image_path}")
        
        # Convert to grayscale
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Apply threshold to get binary image
        _, binary = cv2.threshold(gray, 127, 255, cv2.THRESH_BINARY_INV)
        
        # Find all contours
        contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        # Filter contours to get rectangles
        rectangles = []
        for contour in contours:
            x, y, w, h = cv2.boundingRect(contour)
            area = w * h
            
            # Filter by size and aspect ratio
            if 200 <= area <= 500 and 0.5 <= w/h <= 2.0:
                rectangles.append(Rectangle(x, y, w, h, area))
        
        logger.info(f"Found {len(rectangles)} potential rectangles")
        
        # Analyze horizontal distribution
        x_positions = [r.x for r in rectangles]
        x_positions.sort()
        
        # Find gaps in x positions to identify columns
        gaps = []
        for i in range(1, len(x_positions)):
            gap = x_positions[i] - x_positions[i-1]
            if gap > 50:  # Significant gap
                gaps.append((x_positions[i-1], x_positions[i], gap))
        
        logger.info(f"Found {len(gaps)} significant gaps in x positions")
        
        # Group rectangles by approximate x position
        x_groups = self.group_by_x_position(rectangles)
        
        # Analyze each group to identify column structure
        columns = []
        for group_x, group_rects in x_groups.items():
            column_info = self.analyze_column_group(group_rects)
            if column_info:
                columns.append(column_info)
        
        # Create debug visualization
        if self.debug_mode:
            self.create_structure_debug(image, rectangles, columns, image_path)
        
        return {
            'total_rectangles': len(rectangles),
            'columns_detected': len(columns),
            'x_groups': len(x_groups),
            'structure_analysis': {
                'x_positions_range': (min(x_positions), max(x_positions)) if x_positions else (0, 0),
                'gaps_found': len(gaps),
                'major_gaps': [g for g in gaps if g[2] > 100]
            }
        }
    
    def group_by_x_position(self, rectangles: List[Rectangle], tolerance: int = 30) -> Dict[int, List[Rectangle]]:
        """Group rectangles by x position with tolerance"""
        groups = {}
        
        for rect in rectangles:
            found_group = False
            for group_x in groups.keys():
                if abs(rect.x - group_x) <= tolerance:
                    groups[group_x].append(rect)
                    found_group = True
                    break
            
            if not found_group:
                groups[rect.x] = [rect]
        
        return groups
    
    def analyze_column_group(self, rectangles: List[Rectangle]) -> Optional[ColumnInfo]:
        """Analyze a group of rectangles to determine column structure"""
        if len(rectangles) < 3:
            return None
        
        # Sort by y position
        rectangles.sort(key=lambda r: r.y)
        
        # Look for patterns - column markers vs question markers
        # Column markers: groups of 3 consecutive rectangles with small gaps
        # Question markers: single rectangles with larger gaps
        
        column_markers = []
        question_markers = []
        
        i = 0
        while i < len(rectangles) - 2:
            rect1, rect2, rect3 = rectangles[i], rectangles[i+1], rectangles[i+2]
            
            # Check if these 3 form a column marker group
            gap1 = rect2.y - (rect1.y + rect1.height)
            gap2 = rect3.y - (rect2.y + rect2.height)
            
            if 5 <= gap1 <= 30 and 5 <= gap2 <= 30:
                # This looks like a column marker
                column_markers.extend([rect1, rect2, rect3])
                i += 3
            else:
                # This is likely a question marker
                question_markers.append(rect1)
                i += 1
        
        # Add remaining rectangles as question markers
        while i < len(rectangles):
            question_markers.append(rectangles[i])
            i += 1
        
        if column_markers:
            x_positions = [r.x for r in rectangles]
            return ColumnInfo(
                x_start=min(x_positions),
                x_end=max(x_positions) + max(r.width for r in rectangles),
                question_markers=question_markers,
                column_markers=column_markers
            )
        
        return None
    
    def create_structure_debug(self, image: np.ndarray, rectangles: List[Rectangle], 
                             columns: List[ColumnInfo], image_path: str):
        """Create debug visualization of structure analysis"""
        debug_img = image.copy()
        
        # Draw all rectangles in blue
        for rect in rectangles:
            cv2.rectangle(debug_img, (rect.x, rect.y), 
                        (rect.x + rect.width, rect.y + rect.height), (255, 0, 0), 1)
        
        # Draw column boundaries in green
        for i, column in enumerate(columns):
            cv2.line(debug_img, (column.x_start, 0), 
                    (column.x_start, debug_img.shape[0]), (0, 255, 0), 2)
            cv2.line(debug_img, (column.x_end, 0), 
                    (column.x_end, debug_img.shape[0]), (0, 255, 0), 2)
            
            # Label column
            cv2.putText(debug_img, f"Col {i}", 
                       (column.x_start + 5, 30), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
        
        # Save debug image
        debug_path = image_path.replace('.jpg', '_structure_debug.jpg').replace('.png', '_structure_debug.png')
        cv2.imwrite(debug_path, debug_img)
        logger.info(f"Structure debug image saved to: {debug_path}")

def main():
    """Test the detector"""
    detector = SmartLayoutDetector()
    
    try:
        image_path = "test_image_40_questions.jpg"
        results = detector.analyze_omr_structure(image_path)
        
        print("\n=== OMR Structure Analysis ===")
        print(f"Total Rectangles: {results['total_rectangles']}")
        print(f"Columns Detected: {results['columns_detected']}")
        print(f"X Groups: {results['x_groups']}")
        print(f"Structure Analysis: {results['structure_analysis']}")
        
    except Exception as e:
        logger.error(f"Error analyzing OMR structure: {e}")
        return False
    
    return True

if __name__ == "__main__":
    main()