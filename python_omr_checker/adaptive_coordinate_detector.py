#!/usr/bin/env python3
"""
Universal OMR Coordinate Detector - Har qanday OMR rasmni avtomatik koordinatalashtirish
Qora to'rtburchaklar (alignment markers) asosida ishlaydi

MARKER TIZIMI:
- Qog'ozning 2 yon tomonida 4 tadan qora to'rtburchak (jami 8 ta)
- Har bir ustunning chap tomonida 3 ta qora to'rtburchak
- Har bir savolning chap tomonida qora to'rtburchak
"""

import cv2
import numpy as np
import logging
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass

logger = logging.getLogger(__name__)

@dataclass
class AlignmentMarker:
    """Alignment marker ma'lumotlari"""
    x: int
    y: int
    width: int
    height: int
    confidence: float
    marker_type: str  # 'side', 'column', 'question'

@dataclass
class ColumnInfo:
    """Ustun ma'lumotlari"""
    column_number: int
    x_position: int
    y_start: int
    y_end: int
    markers: List[AlignmentMarker]  # Column markers (3 ta)

@dataclass
class QuestionRow:
    """Savol qatori ma'lumotlari"""
    question_number: int
    y_position: int
    marker_x: int
    column_number: int
    bubble_positions: List[Tuple[int, int]]  # [(x, y), ...]

class UniversalOMRDetector:
    """Har qanday OMR rasmni avtomatik koordinatalashtiruvchi - UNIVERSAL SYSTEM"""
    
    def __init__(self):
        self.side_markers = []  # Yon tomonlardagi 8 ta marker
        self.column_markers = []  # Ustun markerlari
        self.question_markers = []  # Savol markerlari
        self.columns = []  # Ustunlar ma'lumoti
        self.question_rows = []  # Savol qatorlari
        
    def detect_all_markers(self, image: np.ndarray) -> Dict[str, List[AlignmentMarker]]:
        """Barcha alignment markerlarni aniqlash - UNIVERSAL APPROACH"""
        logger.info("🔍 UNIVERSAL OMR MARKER DETECTION...")
        
        height, width = image.shape
        
        # 1. Qora to'rtburchaklarni topish
        rectangles = self._find_dark_rectangles_universal(image)
        
        # 2. Markerlarni turlarga ajratish - UNIVERSAL CLASSIFICATION
        side_markers = []
        column_markers = []
        question_markers = []
        
        for rect in rectangles:
            x, y, w, h = rect['x'], rect['y'], rect['width'], rect['height']
            
            # SIDE MARKERS: Qog'ozning eng chap va o'ng tomonlarida (8 ta)
            if x < width * 0.08 or x > width * 0.92:  # Eng chekkada
                if 20 < w < 100 and 20 < h < 100:  # Katta markerlar
                    side_markers.append(AlignmentMarker(
                        x=x, y=y, width=w, height=h,
                        confidence=rect['confidence'],
                        marker_type='side'
                    ))
            
            # COLUMN MARKERS: Ustunlarning chap tomonida (har ustunda 3 ta)
            elif width * 0.08 < x < width * 0.4:  # Chap yarmi
                if 15 < w < 60 and 15 < h < 60:  # O'rta o'lcham
                    column_markers.append(AlignmentMarker(
                        x=x, y=y, width=w, height=h,
                        confidence=rect['confidence'],
                        marker_type='column'
                    ))
            
            # QUESTION MARKERS: Har bir savolning chap tomonida
            elif width * 0.05 < x < width * 0.95:  # Very wide area (was 0.1-0.9)
                if 5 < w < 50 and 5 < h < 50:  # Very flexible size (was 8-40)
                    question_markers.append(AlignmentMarker(
                        x=x, y=y, width=w, height=h,
                        confidence=rect['confidence'],
                        marker_type='question'
                    ))
        
        # 3. Markerlarni saralash va filtrlash
        side_markers.sort(key=lambda m: (m.x, m.y))
        column_markers.sort(key=lambda m: (m.x, m.y))
        question_markers.sort(key=lambda m: m.y)
        
        # Side markerlarni 8 ta bilan cheklash
        if len(side_markers) > 8:
            side_markers = side_markers[:8]
        
        # Savol markerlarni filtrlash (bir-biriga yaqin bo'lganlarni olib tashlash)
        filtered_question_markers = []
        min_distance = 15  # Reduced from 20
        
        for marker in question_markers:
            is_too_close = False
            for existing in filtered_question_markers:
                distance = abs(marker.y - existing.y)
                if distance < min_distance:
                    is_too_close = True
                    break
            
            if not is_too_close:
                filtered_question_markers.append(marker)
                
            if len(filtered_question_markers) >= 60:  # Increased from 50
                break
        
        question_markers = filtered_question_markers
        
        logger.info(f"✅ UNIVERSAL MARKER DETECTION:")
        logger.info(f"   Side markers: {len(side_markers)} (expected: 8)")
        logger.info(f"   Column markers: {len(column_markers)} (expected: 9+ for 3 columns)")
        logger.info(f"   Question markers: {len(question_markers)} (expected: up to 50)")
        
        self.side_markers = side_markers
        self.column_markers = column_markers
        self.question_markers = question_markers
        
        return {
            'side_markers': side_markers,
            'column_markers': column_markers,
            'question_markers': question_markers
        }
    
    def _find_dark_rectangles_universal(self, image: np.ndarray) -> List[Dict]:
        """Qora to'rtburchaklarni topish - UNIVERSAL VERSION"""
        # Multiple threshold approach for better detection
        rectangles = []
        
        # Try different thresholds to catch all markers
        thresholds = [70, 90, 110, 130]
        
        for threshold in thresholds:
            _, binary = cv2.threshold(image, threshold, 255, cv2.THRESH_BINARY_INV)
            
            # Morphological operations
            kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (2, 2))
            binary = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel)
            binary = cv2.morphologyEx(binary, cv2.MORPH_OPEN, kernel)
            
            # Find contours
            contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            for contour in contours:
                area = cv2.contourArea(contour)
                if area < 50 or area > 8000:  # Very wide range
                    continue
                
                x, y, w, h = cv2.boundingRect(contour)
                
                # Shape analysis
                aspect_ratio = w / h if h > 0 else 0
                extent = area / (w * h) if w * h > 0 else 0
                
                # Very flexible criteria for universal detection
                if (0.3 < aspect_ratio < 3.0 and  # Very flexible aspect ratio
                    extent > 0.4 and  # Very flexible shape
                    50 < area < 6000 and  # Wide area range
                    w > 5 and h > 5 and  # Very small minimum
                    w < 150 and h < 150):  # Large maximum
                    
                    # Calculate confidence
                    shape_score = min(extent * 2, 1.0)
                    size_score = min(area / 1000, 1.0)
                    confidence = (shape_score + size_score) / 2
                    
                    # Check if this rectangle is already found
                    is_duplicate = False
                    for existing in rectangles:
                        if (abs(existing['x'] - x) < 10 and 
                            abs(existing['y'] - y) < 10):
                            is_duplicate = True
                            break
                    
                    if not is_duplicate:
                        rectangles.append({
                            'x': x, 'y': y, 'width': w, 'height': h,
                            'area': area, 'confidence': confidence,
                            'threshold': threshold
                        })
        
        # Sort by confidence and return best ones
        rectangles.sort(key=lambda r: r['confidence'], reverse=True)
        return rectangles[:200]  # Return top 200 candidates
    
    
    def analyze_column_structure(self, image: np.ndarray) -> List[ColumnInfo]:
        """Ustunlar tuzilishini tahlil qilish"""
        logger.info("📊 Analyzing column structure...")
        
        if not image is None:
            height, width = image.shape
        columns = []
        
        # Column markerlarni X pozitsiyasi bo'yicha guruhlash
        column_groups = {}
        tolerance = 80  # X pozitsiyasi uchun tolerantlik (increased)
        
        for marker in self.column_markers:
            # Qaysi guruhga tegishli ekanligini aniqlash
            assigned = False
            for group_x in column_groups:
                if abs(marker.x - group_x) < tolerance:
                    column_groups[group_x].append(marker)
                    assigned = True
                    break
            
            if not assigned:
                column_groups[marker.x] = [marker]
        
        # Har bir guruhni ustun sifatida qayta ishlash
        column_number = 1
        for group_x in sorted(column_groups.keys()):
            markers = column_groups[group_x]
            markers.sort(key=lambda m: m.y)  # Y bo'yicha saralash
            
            if len(markers) >= 1:  # Kamida 1 ta marker bo'lishi kerak (reduced from 2)
                y_start = markers[0].y - 100  # Expand range
                y_end = markers[-1].y + 500   # Expand range
                
                column = ColumnInfo(
                    column_number=column_number,
                    x_position=group_x,
                    y_start=y_start,
                    y_end=y_end,
                    markers=markers
                )
                columns.append(column)
                column_number += 1
        
        logger.info(f"✅ Found {len(columns)} columns")
        for col in columns:
            logger.info(f"   Column {col.column_number}: X={col.x_position}, Y={col.y_start}-{col.y_end}, Markers={len(col.markers)}")
        
        self.columns = columns
        return columns
    
    def detect_question_rows_universal(self, image: np.ndarray) -> List[QuestionRow]:
        """Savol qatorlarini aniqlash - UNIVERSAL APPROACH"""
        logger.info("📝 Detecting question rows universally...")
        
        height, width = image.shape
        question_rows = []
        
        if not self.columns:
            logger.warning("⚠️ No columns detected, using fallback method")
            return self._detect_rows_by_content_universal(image)
        
        # Har bir ustun uchun savol qatorlarini aniqlash
        for column in self.columns:
            column_question_markers = []
            
            # Bu ustun hududidagi question markerlarni topish
            for marker in self.question_markers:
                # Marker bu ustun hududida ekanligini tekshirish (more flexible)
                if (column.x_position - 200 < marker.x < column.x_position + 400 and
                    column.y_start - 100 < marker.y < column.y_end + 100):
                    column_question_markers.append(marker)
            
            # Bu ustundagi savollarni qayta ishlash
            column_question_markers.sort(key=lambda m: m.y)
            
            for i, marker in enumerate(column_question_markers):
                # Question number ni hisoblash (global)
                question_number = len(question_rows) + 1
                
                # Bubble pozitsiyalarini aniqlash
                bubble_positions = self._find_bubbles_in_row_universal(
                    image, marker.y, marker.x, column.column_number
                )
                
                if bubble_positions:
                    question_row = QuestionRow(
                        question_number=question_number,
                        y_position=marker.y,
                        marker_x=marker.x,
                        column_number=column.column_number,
                        bubble_positions=bubble_positions
                    )
                    question_rows.append(question_row)
        
        logger.info(f"✅ {len(question_rows)} ta savol qatori topildi")
        self.question_rows = question_rows
        
        return question_rows
    
    def _find_bubbles_in_row_universal(self, image: np.ndarray, row_y: int, 
                                     marker_x: int, column_number: int) -> List[Tuple[int, int]]:
        """Bir qatordagi bubble'larni topish - UNIVERSAL METHOD"""
        height, width = image.shape
        
        # Qator atrofidagi hududni tekshirish
        search_height = 25  # Qator balandligi
        y_start = max(0, row_y - search_height // 2)
        y_end = min(height, row_y + search_height // 2)
        
        # Markerdan o'ngda bubble'larni qidirish
        x_start = marker_x + 25  # Markerdan 25px o'ngda
        x_end = min(width, marker_x + 250)  # 250px gacha
        
        roi = image[y_start:y_end, x_start:x_end]
        
        bubble_positions = []
        
        # Method 1: Rectangle detection (for square/rectangular bubbles)
        # Binary threshold for better rectangle detection
        _, binary = cv2.threshold(roi, 200, 255, cv2.THRESH_BINARY)  # White bubbles on dark background
        
        # Find contours for rectangular bubbles
        contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        for contour in contours:
            area = cv2.contourArea(contour)
            if 50 < area < 800:  # Bubble size range
                x, y, w, h = cv2.boundingRect(contour)
                
                # Check if it's bubble-like (roughly square/circular)
                aspect_ratio = w / h if h > 0 else 0
                if 0.5 < aspect_ratio < 2.0:  # Flexible aspect ratio
                    center_x = x + w // 2
                    center_y = y + h // 2
                    
                    global_x = x_start + center_x
                    global_y = y_start + center_y
                    bubble_positions.append((global_x, global_y))
        
        # Method 2: Circle detection (fallback)
        if len(bubble_positions) < 3:
            circles = cv2.HoughCircles(
                roi, cv2.HOUGH_GRADIENT, dp=1, minDist=20,
                param1=50, param2=20, minRadius=5, maxRadius=18
            )
            
            if circles is not None:
                circles = np.round(circles[0, :]).astype("int")
                for (x, y, r) in circles:
                    global_x = x_start + x
                    global_y = y_start + y
                    bubble_positions.append((global_x, global_y))
        
        # Method 3: Template matching for standard spacing (if still not enough)
        if len(bubble_positions) < 4:
            # Standard bubble spacing based on image analysis
            bubble_spacing = 40  # Adjusted spacing
            first_bubble_x = x_start + 15
            
            for i in range(5):  # A, B, C, D, E
                bubble_x = first_bubble_x + (i * bubble_spacing)
                bubble_y = row_y
                
                if bubble_x < width:
                    # Check if there's actually content at this position
                    check_x = bubble_x - x_start if bubble_x >= x_start else 0
                    check_y = row_y - y_start if row_y >= y_start else 0
                    
                    if (0 <= check_x < roi.shape[1] and 0 <= check_y < roi.shape[0]):
                        # Add position regardless (will be filtered by intensity analysis)
                        bubble_positions.append((bubble_x, bubble_y))
        
        # Remove duplicates and sort by X position
        unique_positions = []
        for pos in bubble_positions:
            is_duplicate = False
            for existing in unique_positions:
                if abs(pos[0] - existing[0]) < 20 and abs(pos[1] - existing[1]) < 15:
                    is_duplicate = True
                    break
            if not is_duplicate:
                unique_positions.append(pos)
        
        # Sort by X position (A, B, C, D, E order)
        unique_positions.sort(key=lambda pos: pos[0])
        
        # Ensure we have exactly 5 positions (A, B, C, D, E)
        if len(unique_positions) < 5:
            # Fill missing positions with estimated coordinates
            if unique_positions:
                # Use existing positions to estimate spacing
                if len(unique_positions) >= 2:
                    avg_spacing = (unique_positions[-1][0] - unique_positions[0][0]) / (len(unique_positions) - 1)
                else:
                    avg_spacing = 40
                
                # Fill to 5 positions
                while len(unique_positions) < 5:
                    if unique_positions:
                        next_x = unique_positions[-1][0] + avg_spacing
                        next_y = unique_positions[-1][1]
                    else:
                        next_x = x_start + 15 + len(unique_positions) * 40
                        next_y = row_y
                    
                    unique_positions.append((int(next_x), int(next_y)))
            else:
                # No positions found, use default spacing
                for i in range(5):
                    bubble_x = x_start + 15 + (i * 40)
                    bubble_y = row_y
                    unique_positions.append((bubble_x, bubble_y))
        
        # Return exactly 5 positions
        return unique_positions[:5]
    
    def _detect_rows_by_content_universal(self, image: np.ndarray) -> List[QuestionRow]:
        """Content asosida qatorlarni aniqlash - UNIVERSAL FALLBACK"""
        logger.info("🔍 Using universal content-based row detection...")
        
        height, width = image.shape
        question_rows = []
        
        # Gorizontal proyeksiya - har bir qatordagi qora pixellar
        horizontal_projection = np.sum(image < 120, axis=1)
        
        # Peak'larni topish (savol qatorlari)
        peaks = []
        threshold = np.mean(horizontal_projection) * 1.2
        
        for i in range(1, len(horizontal_projection) - 1):
            if (horizontal_projection[i] > threshold and
                horizontal_projection[i] > horizontal_projection[i-1] and
                horizontal_projection[i] > horizontal_projection[i+1]):
                peaks.append(i)
        
        # Peak'lar orasidagi minimal masofa
        min_distance = 25
        filtered_peaks = []
        
        for peak in peaks:
            if not filtered_peaks or peak - filtered_peaks[-1] >= min_distance:
                filtered_peaks.append(peak)
        
        # Har bir peak uchun bubble'larni topish
        for i, peak_y in enumerate(filtered_peaks):
            question_number = i + 1
            
            # Chap tomonda marker qidirish
            marker_x = self._find_row_marker_universal(image, peak_y)
            
            # Column number ni aniqlash
            column_number = self._determine_column_number(marker_x, width)
            
            # Bubble pozitsiyalarini aniqlash
            bubble_positions = self._find_bubbles_in_row_universal(
                image, peak_y, marker_x, column_number
            )
            
            if bubble_positions:
                question_row = QuestionRow(
                    question_number=question_number,
                    y_position=peak_y,
                    marker_x=marker_x,
                    column_number=column_number,
                    bubble_positions=bubble_positions
                )
                question_rows.append(question_row)
        
        return question_rows
    
    def _find_row_marker_universal(self, image: np.ndarray, row_y: int) -> int:
        """Qator markerini topish - UNIVERSAL"""
        height, width = image.shape
        
        # Chap tomonda marker qidirish
        search_width = int(width * 0.3)  # Chap 30%
        y_start = max(0, row_y - 15)
        y_end = min(height, row_y + 15)
        
        roi = image[y_start:y_end, 0:search_width]
        
        # Eng qora hudud topish
        min_val = np.min(roi)
        min_locations = np.where(roi == min_val)
        
        if len(min_locations[1]) > 0:
            marker_x = int(np.mean(min_locations[1]))
        else:
            marker_x = 50  # Default
        
        return marker_x
    
    def _determine_column_number(self, marker_x: int, image_width: int) -> int:
        """Marker X pozitsiyasiga asosan ustun raqamini aniqlash"""
        # 3 ustunli layout uchun
        if marker_x < image_width * 0.33:
            return 1
        elif marker_x < image_width * 0.66:
            return 2
        else:
            return 3
    
    
    def calibrate_coordinate_system_universal(self, image_width: int, image_height: int) -> Dict[str, any]:
        """Koordinata tizimini kalibrlash - UNIVERSAL APPROACH"""
        logger.info("📐 UNIVERSAL coordinate system calibration...")
        
        # Side markerlar asosida kalibrlash
        if len(self.side_markers) >= 4:
            logger.info("✅ Using side markers for calibration")
            return self._calibrate_with_side_markers(image_width, image_height)
        
        # Column markerlar asosida kalibrlash
        elif len(self.column_markers) >= 6:
            logger.info("✅ Using column markers for calibration")
            return self._calibrate_with_column_markers(image_width, image_height)
        
        # Question markerlar asosida kalibrlash
        elif len(self.question_markers) >= 10:
            logger.info("✅ Using question markers for calibration")
            return self._calibrate_with_question_markers(image_width, image_height)
        
        # Fallback kalibrlash
        else:
            logger.warning("⚠️ Using fallback calibration")
            return self._fallback_calibration_universal(image_width, image_height)
    
    def _calibrate_with_side_markers(self, image_width: int, image_height: int) -> Dict[str, any]:
        """Side markerlar asosida kalibrlash"""
        # Chap va o'ng markerlarni ajratish
        left_markers = [m for m in self.side_markers if m.x < image_width / 2]
        right_markers = [m for m in self.side_markers if m.x >= image_width / 2]
        
        left_markers.sort(key=lambda m: m.y)
        right_markers.sort(key=lambda m: m.y)
        
        if len(left_markers) >= 2 and len(right_markers) >= 2:
            # Content area ni aniqlash
            content_left = left_markers[0].x + 30
            content_right = right_markers[0].x - 30
            content_top = min(left_markers[0].y, right_markers[0].y)
            content_bottom = max(left_markers[-1].y, right_markers[-1].y)
            
            content_width = content_right - content_left
            content_height = content_bottom - content_top
            
            return {
                'offset_x': float(content_left),
                'offset_y': float(content_top),
                'scale_x': float(content_width / 2000),  # Normalized scale
                'scale_y': float(content_height / 2800),  # Normalized scale
                'content_width': float(content_width),
                'content_height': float(content_height),
                'accuracy': 0.95,
                'method': 'side_markers'
            }
        
        return self._fallback_calibration_universal(image_width, image_height)
    
    def _calibrate_with_column_markers(self, image_width: int, image_height: int) -> Dict[str, any]:
        """Column markerlar asosida kalibrlash"""
        if not self.columns:
            self.analyze_column_structure(None)  # Dummy call to analyze
        
        if self.columns:
            # Birinchi va oxirgi ustunlar asosida content area ni aniqlash
            first_column = min(self.columns, key=lambda c: c.x_position)
            last_column = max(self.columns, key=lambda c: c.x_position)
            
            content_left = first_column.x_position - 50
            content_right = last_column.x_position + 300
            content_top = min(col.y_start for col in self.columns) - 50
            content_bottom = max(col.y_end for col in self.columns) + 50
            
            content_width = content_right - content_left
            content_height = content_bottom - content_top
            
            return {
                'offset_x': float(content_left),
                'offset_y': float(content_top),
                'scale_x': float(content_width / 1800),
                'scale_y': float(content_height / 2500),
                'content_width': float(content_width),
                'content_height': float(content_height),
                'accuracy': 0.85,
                'method': 'column_markers'
            }
        
        return self._fallback_calibration_universal(image_width, image_height)
    
    def _calibrate_with_question_markers(self, image_width: int, image_height: int) -> Dict[str, any]:
        """Question markerlar asosida kalibrlash"""
        if len(self.question_markers) >= 10:
            # Question markerlar asosida content area ni aniqlash
            min_x = min(m.x for m in self.question_markers)
            max_x = max(m.x for m in self.question_markers)
            min_y = min(m.y for m in self.question_markers)
            max_y = max(m.y for m in self.question_markers)
            
            content_left = min_x - 30
            content_right = max_x + 350  # Bubble'lar uchun joy
            content_top = min_y - 30
            content_bottom = max_y + 30
            
            content_width = content_right - content_left
            content_height = content_bottom - content_top
            
            return {
                'offset_x': float(content_left),
                'offset_y': float(content_top),
                'scale_x': float(content_width / 1600),
                'scale_y': float(content_height / 2200),
                'content_width': float(content_width),
                'content_height': float(content_height),
                'accuracy': 0.75,
                'method': 'question_markers'
            }
        
        return self._fallback_calibration_universal(image_width, image_height)
    
    def _fallback_calibration_universal(self, image_width: int, image_height: int) -> Dict[str, any]:
        """Universal fallback kalibrlash"""
        logger.warning("⚠️ Using universal fallback calibration")
        
        # Standart nisbatlar
        scale_x = image_width / 2480
        scale_y = image_height / 3508
        
        return {
            'offset_x': float(image_width * 0.1),
            'offset_y': float(image_height * 0.15),
            'scale_x': float(scale_x),
            'scale_y': float(scale_y),
            'content_width': float(image_width * 0.8),
            'content_height': float(image_height * 0.7),
            'accuracy': 0.6,
            'method': 'universal_fallback'
        }
    
    def generate_bubble_coordinates_universal(self, calibration: Dict[str, any]) -> List[Dict[str, any]]:
        """Bubble koordinatalarini generatsiya qilish - UNIVERSAL"""
        logger.info("🎯 Generating universal bubble coordinates...")
        
        coordinates = []
        
        for row in self.question_rows:
            question_number = row.question_number
            
            # Har bir bubble pozitsiyasi uchun
            for i, (bubble_x, bubble_y) in enumerate(row.bubble_positions):
                if i < 5:  # Maksimal 5 ta variant (A, B, C, D, E)
                    option = chr(65 + i)  # A, B, C, D, E
                    
                    coordinates.append({
                        'x': int(bubble_x),
                        'y': int(bubble_y),
                        'option': option,
                        'question_number': int(question_number),
                        'question_type': 'multiple_choice_5',
                        'column_number': int(row.column_number),
                        'confidence': float(calibration['accuracy'])
                    })
        
        logger.info(f"✅ {len(coordinates)} ta bubble koordinatasi generatsiya qilindi")
        
        return coordinates
    
    def save_debug_image_universal(self, image: np.ndarray, filename: str = "universal_omr_debug.jpg"):
        """Debug rasmini saqlash - UNIVERSAL"""
        debug_image = cv2.cvtColor(image, cv2.COLOR_GRAY2BGR)
        
        # Side markerlarni chizish (Yashil)
        for marker in self.side_markers:
            cv2.rectangle(debug_image, 
                         (marker.x, marker.y), 
                         (marker.x + marker.width, marker.y + marker.height),
                         (0, 255, 0), 3)
            cv2.putText(debug_image, "SIDE", 
                       (marker.x, marker.y - 5),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
        
        # Column markerlarni chizish (Ko'k)
        for marker in self.column_markers:
            cv2.rectangle(debug_image, 
                         (marker.x, marker.y), 
                         (marker.x + marker.width, marker.y + marker.height),
                         (255, 0, 0), 2)
            cv2.putText(debug_image, "COL", 
                       (marker.x, marker.y - 5),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 0, 0), 1)
        
        # Question markerlarni chizish (Qizil)
        for marker in self.question_markers:
            cv2.rectangle(debug_image, 
                         (marker.x, marker.y), 
                         (marker.x + marker.width, marker.y + marker.height),
                         (0, 0, 255), 2)
            cv2.putText(debug_image, "Q", 
                       (marker.x, marker.y - 5),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 0, 255), 1)
        
        # Bubble'larni chizish (Sariq)
        for row in self.question_rows:
            for i, (x, y) in enumerate(row.bubble_positions):
                option = chr(65 + i)
                cv2.circle(debug_image, (x, y), 12, (0, 255, 255), 2)
                cv2.putText(debug_image, f"Q{row.question_number}{option}", 
                           (x - 25, y - 20),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 255, 255), 1)
        
        # Ustun chegaralarini chizish
        for column in self.columns:
            cv2.line(debug_image, 
                    (column.x_position, column.y_start), 
                    (column.x_position, column.y_end),
                    (255, 255, 0), 2)
            cv2.putText(debug_image, f"Col{column.column_number}", 
                       (column.x_position + 5, column.y_start - 10),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 0), 2)
        
        cv2.imwrite(f"debug_output/{filename}", debug_image)
        logger.info(f"Universal debug rasm saqlandi: debug_output/{filename}")


# Main class alias for compatibility
AdaptiveCoordinateDetector = UniversalOMRDetector


def test_universal_detector():
    """Universal detector'ni test qilish"""
    image_path = "../../test-image.jpg"
    
    # Rasmni yuklash
    image = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
    if image is None:
        print(f"Rasm yuklanmadi: {image_path}")
        return
    
    height, width = image.shape
    print(f"Rasm o'lchami: {width}x{height}")
    
    # Universal detector yaratish
    detector = UniversalOMRDetector()
    
    # 1. Markerlarni aniqlash
    markers = detector.detect_all_markers(image)
    
    # 2. Ustunlar tuzilishini tahlil qilish
    columns = detector.analyze_column_structure(image)
    
    # 3. Koordinata tizimini kalibrlash
    calibration = detector.calibrate_coordinate_system_universal(width, height)
    
    # 4. Savol qatorlarini aniqlash
    question_rows = detector.detect_question_rows_universal(image)
    
    # 5. Bubble koordinatalarini generatsiya qilish
    coordinates = detector.generate_bubble_coordinates_universal(calibration)
    
    # 6. Debug rasmini saqlash
    detector.save_debug_image_universal(image)
    
    print(f"\n✅ UNIVERSAL OMR DETECTION yakunlandi:")
    print(f"   Side markerlar: {len(markers['side_markers'])}")
    print(f"   Column markerlari: {len(markers['column_markers'])}")
    print(f"   Question markerlari: {len(markers['question_markers'])}")
    print(f"   Ustunlar: {len(columns)}")
    print(f"   Savol qatorlari: {len(question_rows)}")
    print(f"   Bubble koordinatalari: {len(coordinates)}")
    print(f"   Kalibrlash aniqligi: {int(calibration['accuracy'] * 100)}%")
    print(f"   Kalibrlash usuli: {calibration['method']}")


if __name__ == '__main__':
    test_universal_detector()