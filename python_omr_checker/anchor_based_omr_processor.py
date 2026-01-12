#!/usr/bin/env python3
"""
Anchor-Based OMR Processor
Langor (Anchor) asosida savol raqamlarini topib, bubble koordinatalarini hisoblaydigan tizim
"""

import cv2
import numpy as np
import json
import logging
import re
from typing import List, Dict, Tuple, Optional, Any
from dataclasses import dataclass
import time

# Optional Tesseract import with fallback
TESSERACT_AVAILABLE = False
try:
    import pytesseract
    TESSERACT_AVAILABLE = True
    logger = logging.getLogger(__name__)
    logger.info("✅ Tesseract OCR is available")
except ImportError:
    logger = logging.getLogger(__name__)
    logger.warning("⚠️ Tesseract OCR not available - using coordinate-based fallback")

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@dataclass
class AnchorPoint:
    """Anchor (Langor) nuqta ma'lumotlari"""
    question_number: int
    x: int
    y: int
    confidence: float
    text: str
    bbox: Tuple[int, int, int, int]  # (x, y, width, height)

@dataclass
class BubbleRegion:
    """Bubble hudud ma'lumotlari"""
    question_number: int
    option: str
    x: int
    y: int
    width: int
    height: int
    density: float
    is_filled: bool
    confidence: float

@dataclass
class AnchorBasedResult:
    """Anchor-based OMR natijasi"""
    extracted_answers: List[str]
    confidence: float
    processing_time: float
    anchor_points: List[AnchorPoint]
    bubble_regions: List[BubbleRegion]
    processing_details: Dict[str, Any]
    detailed_results: List[Dict[str, Any]]

class AnchorBasedOMRProcessor:
    """Anchor (Langor) asosida OMR qayta ishlash tizimi"""
    
    def __init__(self):
        self.debug_mode = True
        self.tesseract_available = TESSERACT_AVAILABLE
        
        # Anchor detection parameters
        self.anchor_params = {
            'min_question_number': 1,
            'max_question_number': 40,
            'number_pattern': r'\b(\d{1,2})\s*[.)]',  # 1. yoki 1) formatida
            'min_confidence': 0.6,
            'tesseract_config': '--psm 6 -c tessedit_char_whitelist=0123456789.)()'
        }
        
        # Fallback coordinate-based detection (when Tesseract is not available)
        self.fallback_coordinates = self._generate_fallback_coordinates()
        
        # Bubble detection parameters
        self.bubble_params = {
            'bubble_width': 20,
            'bubble_height': 20,
            'horizontal_spacing': 35,  # A, B, C, D orasidagi masofa
            'vertical_offset': 0,      # Raqamdan bubble gacha vertikal masofa
            'horizontal_offset': 50,   # Raqamdan bubble gacha gorizontal masofa
            'options': ['A', 'B', 'C', 'D'],
            'density_threshold': 0.4   # Bubble to'ldirilganlik chegarasi (40%)
        }
        
        # Image preprocessing parameters
        self.preprocess_params = {
            'gaussian_blur_kernel': (3, 3),
            'adaptive_threshold_block_size': 11,
            'adaptive_threshold_c': 2,
            'morphology_kernel_size': (2, 2)
        }
    
    def _generate_fallback_coordinates(self) -> Dict[int, Tuple[int, int]]:
        """Generate fallback coordinates when Tesseract is not available"""
        # These are approximate coordinates for a standard OMR sheet layout
        # Based on common OMR sheet formats with 3 columns, 14 questions per column
        coordinates = {}
        
        # Column 1: Questions 1-14
        start_x, start_y = 250, 640
        for i in range(14):
            q_num = i + 1
            coordinates[q_num] = (start_x, start_y + i * 47)
        
        # Column 2: Questions 15-27 (13 questions)
        start_x, start_y = 800, 635
        for i in range(13):
            q_num = i + 15
            coordinates[q_num] = (start_x, start_y + i * 48)
        
        # Column 3: Questions 28-40 (13 questions)
        start_x, start_y = 1270, 627
        for i in range(13):
            q_num = i + 28
            coordinates[q_num] = (start_x, start_y + i * 48)
        
        return coordinates

    def detect_alignment_marks(self, image: np.ndarray) -> Optional[np.ndarray]:
        """
        Detect the 4 corner alignment marks (black squares)
        Returns 4 points: [Top-Left, Top-Right, Bottom-Right, Bottom-Left]
        """
        logger.info("🔍 Detecting alignment marks...")
        
        # Binary threshold (inverse, so black is white)
        _, binary = cv2.threshold(image, 100, 255, cv2.THRESH_BINARY_INV)
        
        # Find contours
        contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        # Filter for square-like contours of appropriate size
        squares = []
        height, width = image.shape
        min_area = (width * height) * 0.0001  # Minimum size relative to image
        max_area = (width * height) * 0.01    # Maximum size
        
        for cnt in contours:
            area = cv2.contourArea(cnt)
            if min_area < area < max_area:
                perimeter = cv2.arcLength(cnt, True)
                approx = cv2.approxPolyDP(cnt, 0.05 * perimeter, True)
                
                # Check if it's a square (4 corners)
                if len(approx) == 4:
                    x, y, w, h = cv2.boundingRect(approx)
                    aspect_ratio = float(w) / h
                    if 0.8 <= aspect_ratio <= 1.2:  # Square shape
                        squares.append(approx.reshape(4, 2))
        
        if len(squares) < 4:
            logger.warning(f"⚠️ Found only {len(squares)} potential alignment marks (need 4+)")
            return None
            
        # We expect 8 marks (4 left, 4 right). We need the 4 corners.
        # Convert all square centers to points
        points = []
        for sq in squares:
            M = cv2.moments(sq)
            if M["m00"] != 0:
                cX = int(M["m10"] / M["m00"])
                cY = int(M["m01"] / M["m00"])
                points.append([cX, cY])
        
        points = np.array(points)
        
        # Sort points to find corners
        # Top-Left: Smallest sum (x+y)
        # Bottom-Right: Largest sum (x+y)
        # Top-Right: Smallest diff (y-x)
        # Bottom-Left: Largest diff (y-x)
        
        sum_pts = points.sum(axis=1)
        diff_pts = np.diff(points, axis=1)
        
        tl = points[np.argmin(sum_pts)]
        br = points[np.argmax(sum_pts)]
        tr = points[np.argmin(diff_pts)]
        bl = points[np.argmax(diff_pts)]
        
        # Verify geometry (should form a rough rectangle)
        # Check if we have distinct points
        if np.array_equal(tl, br) or np.array_equal(tl, tr):
            logger.warning("⚠️ Could not distinguish unique corners")
            return None
            
        logger.info(f"✅ Alignment marks detected: TL{tl}, TR{tr}, BR{br}, BL{bl}")
        return np.array([tl, tr, br, bl], dtype="float32")

    def four_point_transform(self, image: np.ndarray, pts: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        """
        Apply perspective transform to warp image to standard view
        """
        (tl, tr, br, bl) = pts
        
        # Compute width of new image
        widthA = np.sqrt(((br[0] - bl[0]) ** 2) + ((br[1] - bl[1]) ** 2))
        widthB = np.sqrt(((tr[0] - tl[0]) ** 2) + ((tr[1] - tl[1]) ** 2))
        maxWidth = max(int(widthA), int(widthB))
        
        # Compute height of new image
        heightA = np.sqrt(((tr[0] - br[0]) ** 2) + ((tr[1] - br[1]) ** 2))
        heightB = np.sqrt(((tl[0] - bl[0]) ** 2) + ((tl[1] - bl[1]) ** 2))
        maxHeight = max(int(heightA), int(heightB))
        
        # Target points for standard view
        dst = np.array([
            [0, 0],
            [maxWidth - 1, 0],
            [maxWidth - 1, maxHeight - 1],
            [0, maxHeight - 1]
        ], dtype="float32")
        
        # Compute perspective transform matrix
        M = cv2.getPerspectiveTransform(pts, dst)
        warped = cv2.warpPerspective(image, M, (maxWidth, maxHeight))
        
        return warped, M

    def detect_timing_tracks(self, image: np.ndarray) -> List[AnchorPoint]:
        """
        Detect timing tracks (row markers) for each column.
        Strategy:
        1. Find Column Markers (3 large squares) to identify column starts.
        2. From each column start, scan down to find Row Markers (small squares).
        """
        logger.info("🔍 Detecting Timing Tracks...")
        
        height, width = image.shape
        anchor_points = []
        
        # Binary threshold (inverse, so black is white)
        _, binary = cv2.threshold(image, 100, 255, cv2.THRESH_BINARY_INV)
        
        # Find contours
        contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        # Separate contours by size
        # Column Markers: w-4 h-4 (~16px area) -> Larger
        # Row Markers: w-3 h-3 (~9px area) -> Smaller
        
        column_markers = []
        row_markers = []
        
        # Adjust area thresholds based on image resolution (assuming standard A4 ~2000px height)
        # These are relative heuristics
        total_area = width * height
        
        for cnt in contours:
            x, y, w, h = cv2.boundingRect(cnt)
            area = w * h
            aspect_ratio = float(w) / h
            
            # Filter for squares
            if 0.6 <= aspect_ratio <= 1.4:
                # Heuristic for Column Marker (Large)
                # Assuming image width ~1500px, w-4 is roughly 25-30px
                if 20 <= w <= 60 and 20 <= h <= 60:
                    column_markers.append((x, y, w, h))
                
                # Heuristic for Row Marker (Small)
                # w-3 is roughly 15-20px
                elif 10 <= w <= 25 and 10 <= h <= 25:
                    row_markers.append((x, y, w, h))
        
        logger.info(f"Found {len(column_markers)} potential column markers and {len(row_markers)} row markers")
        
        # Sort column markers by X position to group them into columns
        column_markers.sort(key=lambda m: m[0])
        
        # Group column markers into columns (based on X proximity)
        columns = []
        if column_markers:
            current_col = [column_markers[0]]
            for i in range(1, len(column_markers)):
                if abs(column_markers[i][0] - current_col[-1][0]) < 50: # Same column
                    current_col.append(column_markers[i])
                else:
                    columns.append(current_col)
                    current_col = [column_markers[i]]
            columns.append(current_col)
        
        # We expect 3 columns
        logger.info(f"Identified {len(columns)} potential columns")
        
        # Process each column
        question_counter = 1
        for col_idx, col_markers in enumerate(columns):
            if not col_markers: continue
            
            # Determine column X range
            col_x = int(np.mean([m[0] for m in col_markers]))
            
            # Find row markers that align with this column X
            col_row_markers = [
                rm for rm in row_markers 
                if abs(rm[0] - col_x) < 30 and rm[1] > min(m[1] for m in col_markers) # Below column header
            ]
            
            # Sort by Y position
            col_row_markers.sort(key=lambda rm: rm[1])
            
            # Create AnchorPoints
            for rm in col_row_markers:
                x, y, w, h = rm
                anchor_points.append(AnchorPoint(
                    question_number=question_counter,
                    x=x + w//2,
                    y=y + h//2,
                    confidence=1.0,
                    text=f"{question_counter}",
                    bbox=(x, y, w, h)
                ))
                question_counter += 1
                
        return anchor_points

    def process_omr_with_anchors(self, image_path: str, answer_key: List[str]) -> AnchorBasedResult:
        """Anchor-based OMR qayta ishlash asosiy funksiyasi"""
        logger.info("=== TIMING TRACK OMR PROCESSING STARTED ===")
        
        start_time = time.time()
        
        try:
            # Step 1: Rasmni yuklash va preprocessing
            original_image, gray_image, processed_image = self.preprocess_image(image_path)
            
            # Step 2: Detect Global Alignment Marks (4 corners)
            alignment_marks = self.detect_alignment_marks(processed_image)
            
            warped_image = processed_image
            warped_gray = gray_image
            
            if alignment_marks is not None:
                logger.info("✅ Using Alignment-Based Rectification")
                warped_image, M = self.four_point_transform(processed_image, alignment_marks)
                warped_gray, _ = self.four_point_transform(gray_image, alignment_marks)
            else:
                logger.warning("⚠️ Alignment marks not found, proceeding with unrectified image")

            # Step 3: Detect Timing Tracks (Row Markers)
            anchor_points = self.detect_timing_tracks(warped_image)
            
            if not anchor_points:
                logger.warning("⚠️ No timing tracks found! Falling back to grid/OCR logic.")
                # Fallback logic could go here if needed, but timing tracks are primary now
                if self.tesseract_available:
                     anchor_points = self.detect_anchor_points_ocr(warped_image, warped_image)
                if not anchor_points:
                     height, width = warped_image.shape[:2]
                     anchor_points = self.generate_grid_anchors(width, height)

            # Step 4: Calculate Bubble Coordinates relative to Row Markers
            bubble_regions = self.calculate_bubble_coordinates(anchor_points, warped_image)
            
            # Step 5: Bubble density tahlili (Grayscale)
            analyzed_bubbles = self.analyze_bubble_density(bubble_regions, warped_gray)
            
            # Step 6: Javoblarni aniqlash
            extracted_answers = self.determine_answers_from_bubbles(analyzed_bubbles)
            
            # Step 7: Natijalarni tayyorlash
            processing_time = time.time() - start_time
            confidence = self.calculate_overall_confidence(analyzed_bubbles)
            
            processing_method = 'Timing Track OMR' if alignment_marks is not None else 'Unrectified Timing Track OMR'
            
            result = AnchorBasedResult(
                extracted_answers=extracted_answers,
                confidence=confidence,
                processing_time=processing_time,
                anchor_points=anchor_points,
                bubble_regions=analyzed_bubbles,
                processing_details={
                    'anchors_found': len(anchor_points),
                    'bubbles_analyzed': len(analyzed_bubbles),
                    'processing_method': processing_method,
                    'image_dimensions': original_image.shape[:2],
                    'preprocessing_applied': True,
                    'alignment_marks_detected': alignment_marks is not None
                },
                detailed_results=self.create_detailed_results(analyzed_bubbles)
            )
            
            logger.info(f"✅ Processing completed in {processing_time:.2f}s")
            logger.info(f"📍 Anchors found: {len(anchor_points)}")
            logger.info(f"🔍 Bubbles analyzed: {len(analyzed_bubbles)}")
            logger.info(f"📊 Overall confidence: {confidence:.2f}")
            
            return result
            
        except Exception as e:
            logger.error(f"❌ Anchor-based processing failed: {e}")
            raise
    
    def preprocess_image(self, image_path: str) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        """Rasmni preprocessing qilish. Returns (original, gray, processed)"""
        logger.info("🔧 Image preprocessing started")
        
        # Original rasmni yuklash
        original = cv2.imread(image_path)
        if original is None:
            raise ValueError(f"Could not read image: {image_path}")
        
        # Grayscale ga o'tkazish
        gray = cv2.cvtColor(original, cv2.COLOR_BGR2GRAY)
        
        # Noise reduction
        denoised = cv2.GaussianBlur(gray, self.preprocess_params['gaussian_blur_kernel'], 0)
        
        # Contrast enhancement
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        enhanced = clahe.apply(denoised)
        
        # Adaptive thresholding
        processed = cv2.adaptiveThreshold(
            enhanced, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY,
            self.preprocess_params['adaptive_threshold_block_size'],
            self.preprocess_params['adaptive_threshold_c']
        )
        
        # Morphological operations
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, self.preprocess_params['morphology_kernel_size'])
        processed = cv2.morphologyEx(processed, cv2.MORPH_CLOSE, kernel)
        
        logger.info("✅ Image preprocessing completed")
        return original, gray, processed
    
    def detect_anchor_points_ocr(self, processed_image: np.ndarray, original_image: np.ndarray) -> List[AnchorPoint]:
        """OCR yordamida savol raqamlarini (anchor points) topish"""
        logger.info("🎯 Detecting anchor points using OCR")
        
        if not TESSERACT_AVAILABLE:
            logger.warning("⚠️ Tesseract not available for OCR detection")
            return []
        
        anchor_points = []
        
        try:
            # OCR bilan matnni aniqlash
            ocr_data = pytesseract.image_to_data(
                processed_image, 
                config=self.anchor_params['tesseract_config'],
                output_type=pytesseract.Output.DICT
            )
            
            # OCR natijalarini tahlil qilish
            for i in range(len(ocr_data['text'])):
                text = ocr_data['text'][i].strip()
                confidence = float(ocr_data['conf'][i])
                
                if confidence < self.anchor_params['min_confidence'] * 100:
                    continue
                
                # Savol raqamini topish
                match = re.search(self.anchor_params['number_pattern'], text)
                if match:
                    question_number = int(match.group(1))
                    
                    # Raqam oralig'ini tekshirish
                    if (self.anchor_params['min_question_number'] <= 
                        question_number <= self.anchor_params['max_question_number']):
                        
                        x = ocr_data['left'][i]
                        y = ocr_data['top'][i]
                        w = ocr_data['width'][i]
                        h = ocr_data['height'][i]
                        
                        anchor_point = AnchorPoint(
                            question_number=question_number,
                            x=x + w // 2,  # Markaziy nuqta
                            y=y + h // 2,
                            confidence=confidence / 100,
                            text=text,
                            bbox=(x, y, w, h)
                        )
                        
                        anchor_points.append(anchor_point)
                        
                        if self.debug_mode:
                            logger.info(f"📍 Found anchor: Q{question_number} at ({x + w//2}, {y + h//2}) - '{text}' (conf: {confidence:.1f}%)")
            
            # Anchor nuqtalarni savol raqami bo'yicha tartiblash
            anchor_points.sort(key=lambda ap: ap.question_number)
            
            logger.info(f"✅ Found {len(anchor_points)} anchor points using OCR")
            
            return anchor_points
            
        except Exception as e:
            logger.error(f"❌ OCR anchor detection failed: {e}")
            return []
    
    def generate_grid_anchors(self, width: int, height: int) -> List[AnchorPoint]:
        """Generate anchor points based on the warped image grid"""
        logger.info(f"📏 Generating grid anchors for {width}x{height} image")
        anchor_points = []
        
        # Estimated relative positions for 3-column layout on warped image
        # These ratios are based on the alignment marks forming the bounding box
        
        # Column X positions (relative to width)
        # Based on OMRSheet.tsx layout relative to alignment marks
        col_x_ratios = [0.15, 0.45, 0.75]
        
        # Row Y positions (relative to height)
        # Assuming questions start slightly below the top mark and end before bottom mark
        start_y_ratio = 0.15
        row_spacing_ratio = 0.06
        
        # Column 1: Q1-14
        for i in range(14):
            q_num = i + 1
            x = int(width * col_x_ratios[0])
            y = int(height * (start_y_ratio + i * row_spacing_ratio))
            anchor_points.append(AnchorPoint(q_num, x, y, 0.9, f"{q_num}.", (x-10, y-10, 20, 20)))
            
        # Column 2: Q15-27
        for i in range(13):
            q_num = i + 15
            x = int(width * col_x_ratios[1])
            y = int(height * (start_y_ratio + i * row_spacing_ratio))
            anchor_points.append(AnchorPoint(q_num, x, y, 0.9, f"{q_num}.", (x-10, y-10, 20, 20)))
            
        # Column 3: Q28-40
        for i in range(13):
            q_num = i + 28
            x = int(width * col_x_ratios[2])
            y = int(height * (start_y_ratio + i * row_spacing_ratio))
            anchor_points.append(AnchorPoint(q_num, x, y, 0.9, f"{q_num}.", (x-10, y-10, 20, 20)))
            
        return anchor_points

    def detect_anchor_points_fallback(self, processed_image: np.ndarray) -> List[AnchorPoint]:
        """Fallback method: Use predefined coordinates when OCR is not available"""
        logger.info("🎯 Using fallback coordinate-based anchor detection")
        
        anchor_points = []
        
        for question_number, (x, y) in self.fallback_coordinates.items():
            # Create anchor point with predefined coordinates
            anchor_point = AnchorPoint(
                question_number=question_number,
                x=x,
                y=y,
                confidence=0.8,  # Default confidence for coordinate-based detection
                text=f"{question_number}.",
                bbox=(x-10, y-10, 20, 20)  # Approximate bounding box
            )
            
            anchor_points.append(anchor_point)
            
            if self.debug_mode:
                logger.info(f"📍 Fallback anchor: Q{question_number} at ({x}, {y})")
        
        # Sort by question number
        anchor_points.sort(key=lambda ap: ap.question_number)
        
        logger.info(f"✅ Generated {len(anchor_points)} fallback anchor points")
        return anchor_points
    
    def calculate_bubble_coordinates(self, anchor_points: List[AnchorPoint], image: np.ndarray) -> List[BubbleRegion]:
        """Anchor nuqtalar asosida bubble koordinatalarini hisoblash"""
        logger.info("📐 Calculating bubble coordinates from anchors")
        
        bubble_regions = []
        height, width = image.shape[:2]
        
        for anchor in anchor_points:
            question_number = anchor.question_number
            anchor_x = anchor.x
            anchor_y = anchor.y
            
            if self.debug_mode:
                logger.info(f"🔍 Processing Q{question_number} anchor at ({anchor_x}, {anchor_y})")
            
            # Har bir option (A, B, C, D) uchun bubble koordinatalarini hisoblash
            for i, option in enumerate(self.bubble_params['options']):
                # Bubble koordinatalarini hisoblash
                bubble_x = anchor_x + self.bubble_params['horizontal_offset'] + (i * self.bubble_params['horizontal_spacing'])
                bubble_y = anchor_y + self.bubble_params['vertical_offset']
                
                # Rasm chegaralarini tekshirish
                if (0 <= bubble_x < width - self.bubble_params['bubble_width'] and
                    0 <= bubble_y < height - self.bubble_params['bubble_height']):
                    
                    bubble_region = BubbleRegion(
                        question_number=question_number,
                        option=option,
                        x=bubble_x,
                        y=bubble_y,
                        width=self.bubble_params['bubble_width'],
                        height=self.bubble_params['bubble_height'],
                        density=0.0,  # Keyinroq hisoblanadi
                        is_filled=False,  # Keyinroq aniqlanadi
                        confidence=anchor.confidence
                    )
                    
                    bubble_regions.append(bubble_region)
                    
                    if self.debug_mode:
                        logger.info(f"  📍 {option}: ({bubble_x}, {bubble_y})")
                else:
                    if self.debug_mode:
                        logger.warning(f"  ⚠️ {option}: ({bubble_x}, {bubble_y}) - out of bounds")
        
        logger.info(f"✅ Calculated {len(bubble_regions)} bubble coordinates")
        return bubble_regions
    
    def analyze_bubble_density(self, bubble_regions: List[BubbleRegion], image: np.ndarray) -> List[BubbleRegion]:
        """Bubble density (qorayish darajasi) tahlili"""
        logger.info("🔍 Analyzing bubble density")
        
        analyzed_bubbles = []
        
        # Update threshold to 0.4 (40%) as requested
        self.bubble_params['density_threshold'] = 0.4
        
        for bubble in bubble_regions:
            # Bubble hududini ajratib olish
            x, y = bubble.x, bubble.y
            w, h = bubble.width, bubble.height
            
            # Rasm chegaralarini tekshirish
            if x + w > image.shape[1] or y + h > image.shape[0]:
                continue
            
            bubble_region = image[y:y+h, x:x+w]
            
            if bubble_region.size == 0:
                continue
            
            # Density hisoblash (Grayscale intensity asosida)
            # 0 = qora (to'la), 255 = oq (bo'sh)
            # Density = 1.0 - (mean_intensity / 255.0)
            # Agar mean = 0 (qora) -> density = 1.0
            # Agar mean = 255 (oq) -> density = 0.0
            
            mean_intensity = np.mean(bubble_region)
            density = 1.0 - (mean_intensity / 255.0)
            
            # Bubble to'ldirilganligini aniqlash (40% dan yuqori)
            is_filled = density >= self.bubble_params['density_threshold']
            
            # Confidence hisoblash
            confidence = min(1.0, density * 1.5) if is_filled else max(0.1, 1.0 - density)
            
            # Yangilangan bubble ma'lumotlari
            updated_bubble = BubbleRegion(
                question_number=bubble.question_number,
                option=bubble.option,
                x=bubble.x,
                y=bubble.y,
                width=bubble.width,
                height=bubble.height,
                density=density,
                is_filled=is_filled,
                confidence=confidence
            )
            
            analyzed_bubbles.append(updated_bubble)
            
            if self.debug_mode:
                status = "FILLED" if is_filled else "EMPTY"
                logger.info(f"  Q{bubble.question_number}{bubble.option}: density={density:.3f}, {status} (conf: {confidence:.2f})")
        
        logger.info(f"✅ Analyzed {len(analyzed_bubbles)} bubbles")
        return analyzed_bubbles
    
    def determine_answers_from_bubbles(self, analyzed_bubbles: List[BubbleRegion]) -> List[str]:
        """Bubble tahlili asosida javoblarni aniqlash"""
        logger.info("🎯 Determining answers from bubble analysis")
        
        # Savollar bo'yicha guruhlash
        questions = {}
        for bubble in analyzed_bubbles:
            q_num = bubble.question_number
            if q_num not in questions:
                questions[q_num] = []
            questions[q_num].append(bubble)
        
        # Javoblarni aniqlash
        answers = []
        max_question = max(questions.keys()) if questions else 0
        
        for q_num in range(1, max_question + 1):
            if q_num not in questions:
                answers.append('BLANK')
                continue
            
            question_bubbles = questions[q_num]
            
            # To'ldirilgan bubblelarni topish
            filled_bubbles = [b for b in question_bubbles if b.is_filled]
            
            if len(filled_bubbles) == 0:
                # Hech qaysi bubble to'ldirilmagan
                answers.append('BLANK')
            elif len(filled_bubbles) == 1:
                # Bitta bubble to'ldirilgan (to'g'ri holat)
                answers.append(filled_bubbles[0].option)
            else:
                # Bir nechta bubble to'ldirilgan
                # Eng yuqori density ga ega bo'lganini tanlash
                best_bubble = max(filled_bubbles, key=lambda b: b.density)
                answers.append(f"MULTIPLE_{best_bubble.option}")
            
            if self.debug_mode:
                filled_options = [b.option for b in filled_bubbles]
                logger.info(f"Q{q_num}: {answers[-1]} (filled: {filled_options})")
        
        logger.info(f"✅ Determined {len(answers)} answers")
        return answers
    
    def calculate_overall_confidence(self, analyzed_bubbles: List[BubbleRegion]) -> float:
        """Umumiy ishonch darajasini hisoblash"""
        if not analyzed_bubbles:
            return 0.0
        
        # Har bir savol uchun eng yuqori confidence ni olish
        questions = {}
        for bubble in analyzed_bubbles:
            q_num = bubble.question_number
            if q_num not in questions:
                questions[q_num] = []
            questions[q_num].append(bubble)
        
        question_confidences = []
        for q_num, bubbles in questions.items():
            if bubbles:
                max_confidence = max(b.confidence for b in bubbles)
                question_confidences.append(max_confidence)
        
        return np.mean(question_confidences) if question_confidences else 0.0
    
    def create_detailed_results(self, analyzed_bubbles: List[BubbleRegion]) -> List[Dict[str, Any]]:
        """Batafsil natijalarni yaratish"""
        # Savollar bo'yicha guruhlash
        questions = {}
        for bubble in analyzed_bubbles:
            q_num = bubble.question_number
            if q_num not in questions:
                questions[q_num] = []
            questions[q_num].append(bubble)
        
        detailed_results = []
        for q_num in sorted(questions.keys()):
            bubbles = questions[q_num]
            
            # Bubble intensities va coordinates
            bubble_intensities = {}
            bubble_coordinates = {}
            
            for bubble in bubbles:
                bubble_intensities[bubble.option] = bubble.density
                bubble_coordinates[bubble.option] = {'x': bubble.x, 'y': bubble.y}
            
            # Javobni aniqlash
            filled_bubbles = [b for b in bubbles if b.is_filled]
            if len(filled_bubbles) == 0:
                detected_answer = 'BLANK'
                confidence = 0.2
            elif len(filled_bubbles) == 1:
                detected_answer = filled_bubbles[0].option
                confidence = filled_bubbles[0].confidence
            else:
                best_bubble = max(filled_bubbles, key=lambda b: b.density)
                detected_answer = f"MULTIPLE_{best_bubble.option}"
                confidence = best_bubble.confidence * 0.8  # Penalty for multiple
            
            detailed_results.append({
                'question': q_num,
                'detected_answer': detected_answer,
                'confidence': confidence,
                'bubble_intensities': bubble_intensities,
                'bubble_coordinates': bubble_coordinates,
                'processing_method': 'anchor_based_density_analysis'
            })
        
        return detailed_results

def main():
    """Test Anchor-Based OMR Processor"""
    processor = AnchorBasedOMRProcessor()
    
    # Test with sample image
    answer_key = ['A'] * 40
    
    try:
        result = processor.process_omr_with_anchors('../../test_image_40_questions.jpg', answer_key)
        
        print("\n=== ANCHOR-BASED OMR RESULTS ===")
        print(f"Processing time: {result.processing_time:.2f}s")
        print(f"Overall confidence: {result.confidence:.2f}")
        print(f"Anchors found: {result.processing_details['anchors_found']}")
        print(f"Bubbles analyzed: {result.processing_details['bubbles_analyzed']}")
        
        print(f"\nFirst 10 answers:")
        for i, answer in enumerate(result.extracted_answers[:10]):
            print(f"  Q{i+1}: {answer}")
        
        print(f"\nAnchor points found:")
        for anchor in result.anchor_points[:10]:
            print(f"  Q{anchor.question_number}: ({anchor.x}, {anchor.y}) - '{anchor.text}' (conf: {anchor.confidence:.2f})")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()