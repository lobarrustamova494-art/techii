#!/usr/bin/env python3
"""
EvalBee-Style OMR Processing Engine
Professional-grade OMR system with advanced features
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

# Safe sklearn import with fallback
try:
    from sklearn.cluster import DBSCAN
    SKLEARN_AVAILABLE = True
except ImportError:
    logger.warning("sklearn not available, clustering features will be disabled")
    SKLEARN_AVAILABLE = False
    # Create a dummy DBSCAN class for fallback
    class DBSCAN:
        def __init__(self, *args, **kwargs):
            pass
        def fit_predict(self, data):
            # Simple fallback: return all points as separate clusters
            return list(range(len(data)))

import scipy.ndimage as ndimage

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@dataclass
class BubbleCandidate:
    """Advanced bubble candidate with comprehensive metrics"""
    x: int
    y: int
    width: int
    height: int
    center_x: int
    center_y: int
    area: float
    perimeter: float
    aspect_ratio: float
    circularity: float
    solidity: float
    extent: float
    intensity: float
    confidence: float
    filled_percentage: float
    edge_sharpness: float

@dataclass
class LayoutStructure:
    """Comprehensive layout analysis"""
    layout_type: str
    total_questions: int
    columns: int
    rows_per_column: List[int]
    column_positions: List[int]
    row_positions: List[int]
    bubble_spacing: Dict[str, float]
    format_confidence: float
    alignment_markers: List[Tuple[int, int]]

@dataclass
class ProcessingResult:
    """Comprehensive processing result"""
    extracted_answers: List[str]
    confidence_scores: List[float]
    overall_confidence: float
    processing_time: float
    layout_analysis: LayoutStructure
    quality_metrics: Dict[str, float]
    detailed_results: List[Dict[str, Any]]
    error_flags: List[str]
    recommendations: List[str]

class EvalBeeOMREngine:
    """EvalBee-style professional OMR processing engine"""
    
    def __init__(self):
        self.debug_mode = True
        
        # Advanced detection parameters
        self.bubble_detection = {
            'min_area': 50,
            'max_area': 2000,
            'min_circularity': 0.3,
            'min_solidity': 0.6,
            'aspect_ratio_range': (0.5, 2.0),
            'intensity_threshold': 0.15
        }
        
        # Layout detection parameters
        self.layout_detection = {
            'clustering_eps': 30,
            'min_samples': 3,
            'row_tolerance': 25,
            'column_tolerance': 40,
            'alignment_threshold': 0.85
        }
        
        # Quality assessment thresholds
        self.quality_thresholds = {
            'image_sharpness': 100,
            'contrast_ratio': 0.3,
            'brightness_range': (50, 200),
            'noise_level': 0.1,
            'skew_angle': 5.0
        }
        
        # Processing modes
        self.processing_modes = {
            'high_accuracy': {'multi_scale': True, 'edge_enhancement': True, 'noise_reduction': True},
            'fast_processing': {'multi_scale': False, 'edge_enhancement': False, 'noise_reduction': False},
            'robust_detection': {'multi_scale': True, 'edge_enhancement': True, 'noise_reduction': True}
        }
        
    def process_omr_sheet(self, image_path: str, answer_key: List[str], 
                         processing_mode: str = 'high_accuracy') -> ProcessingResult:
        """Main EvalBee-style OMR processing function"""
        logger.info("🚀 EvalBee OMR Engine started")
        start_time = time.time()
        
        try:
            # Step 1: Advanced image preprocessing
            image, quality_metrics = self.advanced_preprocessing(image_path, processing_mode)
            
            # Step 2: Intelligent layout detection
            layout = self.detect_layout_structure(image)
            
            # Step 3: Advanced bubble detection
            bubble_candidates = self.detect_bubble_candidates(image, layout)
            
            # Step 4: Bubble classification and validation
            validated_bubbles = self.validate_and_classify_bubbles(bubble_candidates, layout)
            
            # Step 5: Answer extraction with confidence scoring
            answers, confidences = self.extract_answers_with_confidence(validated_bubbles, layout)
            
            # Step 6: Quality control and error detection
            error_flags, recommendations = self.quality_control_analysis(
                image, answers, confidences, quality_metrics
            )
            
            # Step 7: Generate comprehensive results
            processing_time = time.time() - start_time
            
            result = ProcessingResult(
                extracted_answers=answers,
                confidence_scores=confidences,
                overall_confidence=np.mean(confidences) if confidences else 0.0,
                processing_time=processing_time,
                layout_analysis=layout,
                quality_metrics=quality_metrics,
                detailed_results=self.generate_detailed_results(validated_bubbles, layout),
                error_flags=error_flags,
                recommendations=recommendations
            )
            
            logger.info(f"✅ EvalBee processing completed in {processing_time:.2f}s")
            return result
            
        except Exception as e:
            logger.error(f"❌ EvalBee processing failed: {e}")
            raise
    
    def advanced_preprocessing(self, image_path: str, mode: str) -> Tuple[np.ndarray, Dict[str, float]]:
        """Advanced image preprocessing with quality assessment"""
        logger.info("🔧 Advanced preprocessing started")
        
        try:
            # Load image
            original = cv2.imread(image_path)
            if original is None:
                raise ValueError(f"Could not load image: {image_path}")
            
            logger.info(f"📸 Image loaded: {original.shape}")
            
            # Convert to grayscale
            gray = cv2.cvtColor(original, cv2.COLOR_BGR2GRAY)
            logger.info(f"📸 Grayscale shape: {gray.shape}")
            
            height, width = gray.shape
            logger.info(f"📸 Dimensions: {width}x{height}")
            
            # Quality assessment
            quality_metrics = self.assess_image_quality(gray)
            logger.info(f"📊 Quality metrics calculated")
            
            # Adaptive preprocessing based on quality
            processed = gray.copy()
            
            # 1. Skew correction
            if quality_metrics['skew_angle'] > 1.0:
                processed = self.correct_skew(processed, quality_metrics['skew_angle'])
            
            # 2. Noise reduction (if needed)
            if quality_metrics['noise_level'] > self.quality_thresholds['noise_level']:
                processed = cv2.bilateralFilter(processed, 9, 75, 75)
            
            # 3. Contrast enhancement
            if quality_metrics['contrast_ratio'] < self.quality_thresholds['contrast_ratio']:
                clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
                processed = clahe.apply(processed)
            
            # 4. Sharpening (if needed)
            if quality_metrics['sharpness'] < self.quality_thresholds['image_sharpness']:
                kernel = np.array([[-1,-1,-1], [-1,9,-1], [-1,-1,-1]])
                processed = cv2.filter2D(processed, -1, kernel)
            
            # 5. Morphological operations for bubble enhancement
            kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
            processed = cv2.morphologyEx(processed, cv2.MORPH_CLOSE, kernel)
            
            logger.info(f"📊 Image quality: {quality_metrics}")
            return processed, quality_metrics
            
        except Exception as e:
            logger.error(f"❌ Preprocessing error: {e}")
            raise
    
    def assess_image_quality(self, image: np.ndarray) -> Dict[str, float]:
        """Comprehensive image quality assessment"""
        
        # Sharpness (Laplacian variance)
        sharpness = cv2.Laplacian(image, cv2.CV_64F).var()
        
        # Contrast ratio
        contrast_ratio = np.std(image) / np.mean(image) if np.mean(image) > 0 else 0
        
        # Brightness assessment
        brightness = np.mean(image)
        
        # Noise level estimation
        noise_level = np.std(cv2.GaussianBlur(image, (5, 5), 0) - image)
        
        # Skew detection
        skew_angle = self.detect_skew_angle(image)
        
        return {
            'sharpness': sharpness,
            'contrast_ratio': contrast_ratio,
            'brightness': brightness,
            'noise_level': noise_level,
            'skew_angle': abs(skew_angle),
            'overall_quality': min(1.0, (sharpness / 100 + contrast_ratio / 0.5) / 2)
        }
    
    def detect_skew_angle(self, image: np.ndarray) -> float:
        """Detect image skew angle using Hough transform"""
        try:
            edges = cv2.Canny(image, 50, 150, apertureSize=3)
            lines = cv2.HoughLines(edges, 1, np.pi/180, threshold=100)
            
            if lines is not None:
                angles = []
                for line in lines[:10]:  # Use first 10 lines
                    if len(line) >= 2:  # Ensure we have both rho and theta
                        rho, theta = line[0], line[1] if len(line) > 1 else line[0]
                        angle = np.degrees(theta) - 90
                        if abs(angle) < 45:  # Filter reasonable angles
                            angles.append(angle)
                
                if angles:
                    return np.median(angles)
        except Exception as e:
            logger.warning(f"Skew detection failed: {e}")
        
        return 0.0
    
    def correct_skew(self, image: np.ndarray, angle: float) -> np.ndarray:
        """Correct image skew"""
        height, width = image.shape
        center = (width // 2, height // 2)
        
        # Rotation matrix
        M = cv2.getRotationMatrix2D(center, angle, 1.0)
        
        # Apply rotation
        corrected = cv2.warpAffine(image, M, (width, height), 
                                  flags=cv2.INTER_CUBIC, 
                                  borderMode=cv2.BORDER_REPLICATE)
        
        return corrected
    
    def detect_layout_structure(self, image: np.ndarray) -> LayoutStructure:
        """Intelligent layout structure detection"""
        logger.info("🔍 Detecting layout structure")
        
        # Find potential bubbles for layout analysis
        contours = self.find_bubble_contours(image)
        bubble_centers = []
        
        for contour in contours:
            # Basic filtering
            area = cv2.contourArea(contour)
            if self.bubble_detection['min_area'] < area < self.bubble_detection['max_area']:
                M = cv2.moments(contour)
                if M["m00"] != 0:
                    cx = int(M["m10"] / M["m00"])
                    cy = int(M["m01"] / M["m00"])
                    bubble_centers.append((cx, cy))
        
        if len(bubble_centers) < 10:
            raise ValueError("Insufficient bubbles detected for layout analysis")
        
        # Cluster analysis for layout detection
        centers_array = np.array(bubble_centers)
        
        if SKLEARN_AVAILABLE:
            # Detect rows using Y-coordinate clustering
            y_coords = centers_array[:, 1].reshape(-1, 1)
            row_clustering = DBSCAN(eps=self.layout_detection['row_tolerance'], 
                                   min_samples=self.layout_detection['min_samples']).fit(y_coords)
            
            # Detect columns using X-coordinate clustering
            x_coords = centers_array[:, 0].reshape(-1, 1)
            col_clustering = DBSCAN(eps=self.layout_detection['column_tolerance'], 
                                   min_samples=self.layout_detection['min_samples']).fit(x_coords)
            
            # Analyze clustering results
            unique_rows = len(set(row_clustering.labels_)) - (1 if -1 in row_clustering.labels_ else 0)
            unique_cols = len(set(col_clustering.labels_)) - (1 if -1 in col_clustering.labels_ else 0)
        else:
            # Fallback: Simple grid-based detection without clustering
            logger.warning("Using fallback layout detection without sklearn clustering")
            y_coords = centers_array[:, 1]
            x_coords = centers_array[:, 0]
            
            # Simple binning approach
            y_bins = np.histogram_bin_edges(y_coords, bins='auto')
            x_bins = np.histogram_bin_edges(x_coords, bins='auto')
            
            unique_rows = len(y_bins) - 1
            unique_cols = len(x_bins) - 1
            
            # Create dummy clustering results for compatibility
            row_clustering = type('obj', (object,), {'labels_': np.digitize(y_coords, y_bins) - 1})
            col_clustering = type('obj', (object,), {'labels_': np.digitize(x_coords, x_bins) - 1})
        
        # Determine layout type
        total_bubbles = len(bubble_centers)
        estimated_questions = unique_rows
        
        if unique_cols >= 15:  # 3 columns × 5 options
            layout_type = "3_column_layout"
            columns = 3
        elif unique_cols >= 10:  # 2 columns × 5 options
            layout_type = "2_column_layout"
            columns = 2
        else:
            layout_type = "single_column_layout"
            columns = 1
        
        # Calculate spacing
        if len(bubble_centers) > 1:
            x_spacing = np.mean([abs(p1[0] - p2[0]) for p1, p2 in zip(bubble_centers[:-1], bubble_centers[1:])])
            y_spacing = np.mean([abs(p1[1] - p2[1]) for p1, p2 in zip(bubble_centers[:-1], bubble_centers[1:])])
        else:
            x_spacing = y_spacing = 50
        
        layout = LayoutStructure(
            layout_type=layout_type,
            total_questions=estimated_questions,
            columns=columns,
            rows_per_column=[estimated_questions // columns] * columns,
            column_positions=sorted(list(set([c[0] for c in bubble_centers]))),
            row_positions=sorted(list(set([c[1] for c in bubble_centers]))),
            bubble_spacing={'x': x_spacing, 'y': y_spacing},
            format_confidence=min(1.0, total_bubbles / (estimated_questions * 5)),
            alignment_markers=[]
        )
        
        logger.info(f"📋 Layout detected: {layout.layout_type}, {layout.total_questions} questions")
        return layout
    
    def find_bubble_contours(self, image: np.ndarray) -> List[np.ndarray]:
        """Find bubble contours using multiple methods"""
        
        # Method 1: Adaptive threshold
        binary1 = cv2.adaptiveThreshold(image, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
                                       cv2.THRESH_BINARY_INV, 11, 2)
        
        # Method 2: Otsu threshold
        _, binary2 = cv2.threshold(image, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
        
        # Method 3: Multi-scale approach
        binary3 = cv2.adaptiveThreshold(image, 255, cv2.ADAPTIVE_THRESH_MEAN_C, 
                                       cv2.THRESH_BINARY_INV, 15, 3)
        
        # Combine methods
        combined = cv2.bitwise_or(cv2.bitwise_or(binary1, binary2), binary3)
        
        # Morphological operations
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
        combined = cv2.morphologyEx(combined, cv2.MORPH_CLOSE, kernel)
        combined = cv2.morphologyEx(combined, cv2.MORPH_OPEN, kernel)
        
        # Find contours
        contours, _ = cv2.findContours(combined, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        return contours
    
    def detect_bubble_candidates(self, image: np.ndarray, layout: LayoutStructure) -> List[BubbleCandidate]:
        """Advanced bubble detection with comprehensive metrics"""
        logger.info("🎯 Detecting bubble candidates")
        
        contours = self.find_bubble_contours(image)
        candidates = []
        
        for contour in contours:
            # Basic measurements
            area = cv2.contourArea(contour)
            perimeter = cv2.arcLength(contour, True)
            
            if area < self.bubble_detection['min_area'] or area > self.bubble_detection['max_area']:
                continue
            
            # Bounding rectangle
            x, y, w, h = cv2.boundingRect(contour)
            
            # Advanced metrics
            aspect_ratio = w / h if h > 0 else 0
            
            # Circularity: 4π*area/perimeter²
            circularity = 4 * np.pi * area / (perimeter * perimeter) if perimeter > 0 else 0
            
            # Solidity: area/convex_hull_area
            hull = cv2.convexHull(contour)
            hull_area = cv2.contourArea(hull)
            solidity = area / hull_area if hull_area > 0 else 0
            
            # Extent: area/bounding_rectangle_area
            extent = area / (w * h) if (w * h) > 0 else 0
            
            # Filter based on shape criteria
            if (circularity < self.bubble_detection['min_circularity'] or
                solidity < self.bubble_detection['min_solidity'] or
                not (self.bubble_detection['aspect_ratio_range'][0] <= aspect_ratio <= 
                     self.bubble_detection['aspect_ratio_range'][1])):
                continue
            
            # Center point
            M = cv2.moments(contour)
            if M["m00"] == 0:
                continue
                
            center_x = int(M["m10"] / M["m00"])
            center_y = int(M["m01"] / M["m00"])
            
            # Intensity analysis
            mask = np.zeros(image.shape, dtype=np.uint8)
            cv2.fillPoly(mask, [contour], 255)
            intensity = self.calculate_bubble_intensity(image, mask, center_x, center_y)
            
            # Edge sharpness
            edge_sharpness = self.calculate_edge_sharpness(image, contour)
            
            # Confidence score
            confidence = self.calculate_bubble_confidence(
                circularity, solidity, aspect_ratio, intensity, edge_sharpness
            )
            
            candidate = BubbleCandidate(
                x=x, y=y, width=w, height=h,
                center_x=center_x, center_y=center_y,
                area=area, perimeter=perimeter,
                aspect_ratio=aspect_ratio, circularity=circularity,
                solidity=solidity, extent=extent,
                intensity=intensity, confidence=confidence,
                filled_percentage=intensity * 100,
                edge_sharpness=edge_sharpness
            )
            
            candidates.append(candidate)
        
        logger.info(f"🔍 Found {len(candidates)} bubble candidates")
        return candidates
    
    def calculate_bubble_intensity(self, image: np.ndarray, mask: np.ndarray, 
                                 center_x: int, center_y: int) -> float:
        """Calculate bubble fill intensity"""
        
        # Extract bubble region
        bubble_pixels = image[mask > 0]
        if len(bubble_pixels) == 0:
            return 0.0
        
        # Multiple intensity measures
        avg_intensity = np.mean(bubble_pixels)
        min_intensity = np.min(bubble_pixels)
        center_intensity = image[center_y, center_x] if (0 <= center_y < image.shape[0] and 
                                                        0 <= center_x < image.shape[1]) else 255
        
        # Normalize to 0-1 scale (darker = higher intensity)
        normalized_avg = 1.0 - (avg_intensity / 255.0)
        normalized_min = 1.0 - (min_intensity / 255.0)
        normalized_center = 1.0 - (center_intensity / 255.0)
        
        # Weighted combination
        intensity = (0.4 * normalized_avg + 0.3 * normalized_center + 0.3 * normalized_min)
        
        return max(0.0, min(1.0, intensity))
    
    def calculate_edge_sharpness(self, image: np.ndarray, contour: np.ndarray) -> float:
        """Calculate edge sharpness of bubble"""
        
        # Create mask for contour edge
        mask = np.zeros(image.shape, dtype=np.uint8)
        cv2.drawContours(mask, [contour], -1, 255, 2)
        
        # Apply Sobel edge detection
        sobel_x = cv2.Sobel(image, cv2.CV_64F, 1, 0, ksize=3)
        sobel_y = cv2.Sobel(image, cv2.CV_64F, 0, 1, ksize=3)
        sobel_magnitude = np.sqrt(sobel_x**2 + sobel_y**2)
        
        # Calculate average edge strength along contour
        edge_pixels = sobel_magnitude[mask > 0]
        if len(edge_pixels) == 0:
            return 0.0
        
        return np.mean(edge_pixels) / 255.0
    
    def calculate_bubble_confidence(self, circularity: float, solidity: float, 
                                  aspect_ratio: float, intensity: float, 
                                  edge_sharpness: float) -> float:
        """Calculate overall bubble detection confidence"""
        
        # Shape confidence
        shape_conf = (circularity + solidity) / 2
        
        # Aspect ratio confidence (closer to 1.0 is better)
        aspect_conf = 1.0 - abs(aspect_ratio - 1.0)
        
        # Intensity confidence
        intensity_conf = intensity if intensity > 0.1 else 0.5  # Neutral for empty bubbles
        
        # Edge confidence
        edge_conf = min(1.0, edge_sharpness * 2)
        
        # Weighted combination
        confidence = (0.3 * shape_conf + 0.2 * aspect_conf + 
                     0.3 * intensity_conf + 0.2 * edge_conf)
        
        return max(0.0, min(1.0, confidence))
    
    def validate_and_classify_bubbles(self, candidates: List[BubbleCandidate], 
                                    layout: LayoutStructure) -> Dict[int, Dict[str, BubbleCandidate]]:
        """Validate and classify bubbles into questions and options"""
        logger.info("✅ Validating and classifying bubbles")
        
        # Group bubbles by rows (questions)
        questions = defaultdict(list)
        
        for candidate in candidates:
            # Find closest row
            closest_row = min(layout.row_positions, 
                            key=lambda r: abs(r - candidate.center_y))
            row_index = layout.row_positions.index(closest_row)
            
            if abs(closest_row - candidate.center_y) <= layout.bubble_spacing['y']:
                questions[row_index + 1].append(candidate)
        
        # Sort bubbles in each question by X coordinate and assign options
        validated_questions = {}
        
        for question_num, bubbles in questions.items():
            if len(bubbles) < 3:  # Minimum 3 options required
                continue
            
            # Sort by X coordinate
            bubbles.sort(key=lambda b: b.center_x)
            
            # Assign option letters
            options = {}
            option_letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
            
            for i, bubble in enumerate(bubbles[:len(option_letters)]):
                options[option_letters[i]] = bubble
            
            if len(options) >= 3:  # Valid question
                validated_questions[question_num] = options
        
        logger.info(f"✅ Validated {len(validated_questions)} questions")
        return validated_questions
    
    def extract_answers_with_confidence(self, validated_bubbles: Dict[int, Dict[str, BubbleCandidate]], 
                                      layout: LayoutStructure) -> Tuple[List[str], List[float]]:
        """Extract answers with confidence scoring"""
        logger.info("📝 Extracting answers with confidence")
        
        answers = []
        confidences = []
        
        max_question = max(validated_bubbles.keys()) if validated_bubbles else 0
        
        for question_num in range(1, max_question + 1):
            if question_num not in validated_bubbles:
                answers.append('BLANK')
                confidences.append(0.2)
                continue
            
            options = validated_bubbles[question_num]
            
            # Calculate selection scores for each option
            option_scores = {}
            for option, bubble in options.items():
                # Multi-factor scoring
                intensity_score = bubble.intensity
                confidence_score = bubble.confidence
                shape_score = (bubble.circularity + bubble.solidity) / 2
                
                # Combined score
                total_score = (0.5 * intensity_score + 0.3 * confidence_score + 0.2 * shape_score)
                option_scores[option] = total_score
            
            # Find best option
            if not option_scores:
                answers.append('BLANK')
                confidences.append(0.2)
                continue
            
            best_option = max(option_scores.keys(), key=lambda k: option_scores[k])
            best_score = option_scores[best_option]
            
            # Determine if it's marked (threshold-based)
            threshold = 0.25  # Adaptive threshold could be implemented
            
            if best_score >= threshold:
                # Check for multiple answers
                marked_options = [opt for opt, score in option_scores.items() if score >= threshold]
                
                if len(marked_options) > 1:
                    # Multiple answers detected
                    answers.append(f"MULTIPLE({','.join(marked_options)})")
                    confidences.append(0.6)  # Lower confidence for multiple answers
                else:
                    answers.append(best_option)
                    # Calculate confidence based on score and separation
                    second_best = sorted(option_scores.values(), reverse=True)[1] if len(option_scores) > 1 else 0
                    separation = best_score - second_best
                    confidence = min(0.95, 0.5 + best_score * 0.3 + separation * 0.2)
                    confidences.append(confidence)
            else:
                answers.append('BLANK')
                confidences.append(0.3)
        
        logger.info(f"📝 Extracted {len(answers)} answers")
        return answers, confidences
    
    def quality_control_analysis(self, image: np.ndarray, answers: List[str], 
                               confidences: List[float], quality_metrics: Dict[str, float]) -> Tuple[List[str], List[str]]:
        """Comprehensive quality control and error detection"""
        
        error_flags = []
        recommendations = []
        
        # Image quality checks
        if quality_metrics['sharpness'] < self.quality_thresholds['image_sharpness']:
            error_flags.append('LOW_SHARPNESS')
            recommendations.append('Image appears blurry. Use better lighting or focus.')
        
        if quality_metrics['contrast_ratio'] < self.quality_thresholds['contrast_ratio']:
            error_flags.append('LOW_CONTRAST')
            recommendations.append('Low contrast detected. Ensure good lighting conditions.')
        
        if quality_metrics['skew_angle'] > self.quality_thresholds['skew_angle']:
            error_flags.append('IMAGE_SKEWED')
            recommendations.append('Image is skewed. Take photo from directly above.')
        
        # Answer pattern analysis
        blank_count = answers.count('BLANK')
        multiple_count = len([a for a in answers if a.startswith('MULTIPLE')])
        
        if blank_count > len(answers) * 0.3:
            error_flags.append('HIGH_BLANK_RATE')
            recommendations.append('High number of blank answers detected. Check bubble filling.')
        
        if multiple_count > len(answers) * 0.1:
            error_flags.append('HIGH_MULTIPLE_ANSWERS')
            recommendations.append('Multiple answers detected. Ensure only one option per question.')
        
        # Confidence analysis
        avg_confidence = np.mean(confidences) if confidences else 0
        if avg_confidence < 0.7:
            error_flags.append('LOW_CONFIDENCE')
            recommendations.append('Low overall confidence. Consider retaking the photo.')
        
        return error_flags, recommendations
    
    def generate_detailed_results(self, validated_bubbles: Dict[int, Dict[str, BubbleCandidate]], 
                                layout: LayoutStructure) -> List[Dict[str, Any]]:
        """Generate detailed results for each question"""
        
        detailed_results = []
        
        for question_num, options in validated_bubbles.items():
            bubble_data = {}
            coordinates = {}
            intensities = {}
            
            for option, bubble in options.items():
                coordinates[option] = {'x': bubble.center_x, 'y': bubble.center_y}
                intensities[option] = bubble.intensity
                
            detailed_results.append({
                'question': question_num,
                'bubble_coordinates': coordinates,
                'bubble_intensities': intensities,
                'question_type': 'multiple_choice',
                'status': 'processed'
            })
        
        return detailed_results

def main():
    """Test the EvalBee OMR Engine"""
    engine = EvalBeeOMREngine()
    
    # Test with sample image
    answer_key = ['A'] * 40
    
    try:
        result = engine.process_omr_sheet('../../test-image.jpg', answer_key)
        
        print("\n=== EVALBEE OMR ENGINE RESULTS ===")
        print(f"Processing time: {result.processing_time:.2f}s")
        print(f"Overall confidence: {result.overall_confidence:.2f}")
        print(f"Layout: {result.layout_analysis.layout_type}")
        print(f"Questions detected: {result.layout_analysis.total_questions}")
        print(f"Error flags: {result.error_flags}")
        print(f"Recommendations: {result.recommendations}")
        
        print(f"\nFirst 10 answers:")
        for i, (answer, conf) in enumerate(zip(result.extracted_answers[:10], result.confidence_scores[:10])):
            print(f"  Q{i+1}: {answer} (confidence: {conf:.2f})")
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    main()