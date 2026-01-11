#!/usr/bin/env python3
"""
Advanced Quality Control System for EvalBee Professional OMR
Implements comprehensive quality monitoring and automatic corrections
"""

import cv2
import numpy as np
import json
import logging
from typing import List, Dict, Tuple, Optional, Any
from dataclasses import dataclass
import time
from enum import Enum

logger = logging.getLogger(__name__)

class QualityLevel(Enum):
    EXCELLENT = "excellent"
    GOOD = "good"
    ACCEPTABLE = "acceptable"
    POOR = "poor"
    UNACCEPTABLE = "unacceptable"

class IssueType(Enum):
    BLUR = "blur"
    LOW_CONTRAST = "low_contrast"
    POOR_LIGHTING = "poor_lighting"
    SKEW = "skew"
    NOISE = "noise"
    RESOLUTION = "resolution"
    ALIGNMENT = "alignment"
    BUBBLE_QUALITY = "bubble_quality"

@dataclass
class QualityIssue:
    """Quality issue detection result"""
    type: IssueType
    severity: float  # 0.0 to 1.0
    description: str
    location: Optional[Tuple[int, int, int, int]]  # (x, y, w, h)
    auto_correctable: bool
    correction_applied: bool = False

@dataclass
class QualityMetrics:
    """Comprehensive quality metrics"""
    overall_score: float
    level: QualityLevel
    sharpness: float
    contrast: float
    brightness: float
    noise_level: float
    skew_angle: float
    resolution_score: float
    alignment_score: float
    bubble_quality_score: float
    issues: List[QualityIssue]
    processing_time: float

@dataclass
class CorrectionResult:
    """Image correction result"""
    corrected_image: np.ndarray
    corrections_applied: List[str]
    quality_improvement: float
    processing_time: float

class AdvancedQualityController:
    """Advanced quality control and correction system"""
    
    def __init__(self):
        # Quality thresholds
        self.thresholds = {
            'sharpness': {
                'excellent': 200,
                'good': 100,
                'acceptable': 50,
                'poor': 20
            },
            'contrast': {
                'excellent': 0.6,
                'good': 0.4,
                'acceptable': 0.25,
                'poor': 0.15
            },
            'brightness': {
                'optimal_min': 80,
                'optimal_max': 180,
                'acceptable_min': 50,
                'acceptable_max': 220
            },
            'noise': {
                'excellent': 10,
                'good': 20,
                'acceptable': 35,
                'poor': 50
            },
            'skew': {
                'excellent': 1.0,
                'good': 2.0,
                'acceptable': 5.0,
                'poor': 10.0
            }
        }
        
        # Auto-correction settings
        self.auto_correction_enabled = True
        self.correction_params = {
            'gaussian_blur_kernel': (3, 3),
            'bilateral_filter_d': 9,
            'bilateral_filter_sigma': 75,
            'clahe_clip_limit': 3.0,
            'clahe_tile_size': (8, 8),
            'unsharp_mask_sigma': 1.0,
            'unsharp_mask_strength': 1.5
        }
    
    def analyze_quality(self, image: np.ndarray) -> QualityMetrics:
        """Comprehensive quality analysis"""
        start_time = time.time()
        
        logger.info("🔍 Starting advanced quality analysis...")
        
        # Convert to grayscale if needed
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image.copy()
        
        # Individual quality assessments
        sharpness = self._assess_sharpness(gray)
        contrast = self._assess_contrast(gray)
        brightness = self._assess_brightness(gray)
        noise_level = self._assess_noise(gray)
        skew_angle = self._assess_skew(gray)
        resolution_score = self._assess_resolution(gray)
        alignment_score = self._assess_alignment(gray)
        bubble_quality_score = self._assess_bubble_quality(gray)
        
        # Detect issues
        issues = self._detect_issues(gray, {
            'sharpness': sharpness,
            'contrast': contrast,
            'brightness': brightness,
            'noise_level': noise_level,
            'skew_angle': skew_angle,
            'resolution_score': resolution_score,
            'alignment_score': alignment_score,
            'bubble_quality_score': bubble_quality_score
        })
        
        # Calculate overall score
        overall_score = self._calculate_overall_score({
            'sharpness': sharpness,
            'contrast': contrast,
            'brightness': brightness,
            'noise_level': noise_level,
            'skew_angle': skew_angle,
            'resolution_score': resolution_score,
            'alignment_score': alignment_score,
            'bubble_quality_score': bubble_quality_score
        })
        
        # Determine quality level
        level = self._determine_quality_level(overall_score)
        
        processing_time = time.time() - start_time
        
        metrics = QualityMetrics(
            overall_score=overall_score,
            level=level,
            sharpness=sharpness,
            contrast=contrast,
            brightness=brightness,
            noise_level=noise_level,
            skew_angle=skew_angle,
            resolution_score=resolution_score,
            alignment_score=alignment_score,
            bubble_quality_score=bubble_quality_score,
            issues=issues,
            processing_time=processing_time
        )
        
        logger.info(f"✅ Quality analysis completed: {level.value} ({overall_score:.2f})")
        
        return metrics
    
    def auto_correct_image(self, image: np.ndarray, quality_metrics: QualityMetrics) -> CorrectionResult:
        """Automatically correct image quality issues"""
        start_time = time.time()
        
        logger.info("🔧 Starting automatic image correction...")
        
        corrected = image.copy()
        corrections_applied = []
        initial_score = quality_metrics.overall_score
        
        # Apply corrections based on detected issues
        for issue in quality_metrics.issues:
            if issue.auto_correctable and issue.severity > 0.3:
                
                if issue.type == IssueType.BLUR:
                    corrected = self._correct_blur(corrected)
                    corrections_applied.append("Sharpening filter applied")
                    issue.correction_applied = True
                
                elif issue.type == IssueType.LOW_CONTRAST:
                    corrected = self._correct_contrast(corrected)
                    corrections_applied.append("Contrast enhancement applied")
                    issue.correction_applied = True
                
                elif issue.type == IssueType.POOR_LIGHTING:
                    corrected = self._correct_lighting(corrected)
                    corrections_applied.append("Lighting correction applied")
                    issue.correction_applied = True
                
                elif issue.type == IssueType.NOISE:
                    corrected = self._correct_noise(corrected)
                    corrections_applied.append("Noise reduction applied")
                    issue.correction_applied = True
                
                elif issue.type == IssueType.SKEW:
                    corrected = self._correct_skew(corrected, quality_metrics.skew_angle)
                    corrections_applied.append("Skew correction applied")
                    issue.correction_applied = True
        
        # Re-analyze quality to measure improvement
        final_metrics = self.analyze_quality(corrected)
        quality_improvement = final_metrics.overall_score - initial_score
        
        processing_time = time.time() - start_time
        
        result = CorrectionResult(
            corrected_image=corrected,
            corrections_applied=corrections_applied,
            quality_improvement=quality_improvement,
            processing_time=processing_time
        )
        
        logger.info(f"✅ Auto-correction completed: {len(corrections_applied)} corrections, "
                   f"improvement: {quality_improvement:.3f}")
        
        return result
    
    def _assess_sharpness(self, gray: np.ndarray) -> float:
        """Assess image sharpness using Laplacian variance"""
        laplacian = cv2.Laplacian(gray, cv2.CV_64F)
        return laplacian.var()
    
    def _assess_contrast(self, gray: np.ndarray) -> float:
        """Assess image contrast"""
        return np.std(gray) / np.mean(gray) if np.mean(gray) > 0 else 0
    
    def _assess_brightness(self, gray: np.ndarray) -> float:
        """Assess image brightness"""
        return np.mean(gray)
    
    def _assess_noise(self, gray: np.ndarray) -> float:
        """Assess noise level using high-frequency content"""
        # Apply Gaussian blur and measure difference
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        noise = np.std(gray.astype(np.float32) - blurred.astype(np.float32))
        return noise
    
    def _assess_skew(self, gray: np.ndarray) -> float:
        """Assess document skew angle"""
        # Use Hough line transform to detect dominant lines
        edges = cv2.Canny(gray, 50, 150, apertureSize=3)
        lines = cv2.HoughLines(edges, 1, np.pi/180, threshold=100)
        
        if lines is None or len(lines) == 0:
            return 0.0
        
        # Calculate angles of detected lines
        angles = []
        for line in lines[:20]:  # Use first 20 lines
            rho, theta = line[0]
            angle = theta * 180 / np.pi
            # Normalize to [-90, 90] range
            if angle > 90:
                angle -= 180
            angles.append(angle)
        
        # Find the most common angle (document orientation)
        if angles:
            # Use median to avoid outliers
            skew_angle = np.median(angles)
            return abs(skew_angle)
        
        return 0.0
    
    def _assess_resolution(self, gray: np.ndarray) -> float:
        """Assess image resolution adequacy"""
        height, width = gray.shape
        
        # Minimum recommended resolution for OMR
        min_width, min_height = 1200, 1600
        
        # Calculate resolution score
        width_score = min(1.0, width / min_width)
        height_score = min(1.0, height / min_height)
        
        return (width_score + height_score) / 2
    
    def _assess_alignment(self, gray: np.ndarray) -> float:
        """Assess document alignment quality"""
        # Detect rectangular contours (potential alignment marks)
        edges = cv2.Canny(gray, 50, 150)
        contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        # Look for rectangular shapes
        rectangles = []
        for contour in contours:
            area = cv2.contourArea(contour)
            if area > 100:  # Minimum area threshold
                # Approximate contour
                epsilon = 0.02 * cv2.arcLength(contour, True)
                approx = cv2.approxPolyDP(contour, epsilon, True)
                
                if len(approx) == 4:  # Rectangle
                    rectangles.append(approx)
        
        # Score based on number of detected rectangles
        # More rectangles usually indicate better alignment marks detection
        alignment_score = min(1.0, len(rectangles) / 10)
        
        return alignment_score
    
    def _assess_bubble_quality(self, gray: np.ndarray) -> float:
        """Assess bubble region quality"""
        # Use HoughCircles to detect circular shapes (bubbles)
        circles = cv2.HoughCircles(
            gray,
            cv2.HOUGH_GRADIENT,
            dp=1,
            minDist=30,
            param1=50,
            param2=30,
            minRadius=10,
            maxRadius=30
        )
        
        if circles is not None:
            circles = np.round(circles[0, :]).astype("int")
            
            # Analyze detected circles for quality
            quality_scores = []
            
            for (x, y, r) in circles[:20]:  # Analyze first 20 circles
                # Extract circle region
                mask = np.zeros(gray.shape, dtype=np.uint8)
                cv2.circle(mask, (x, y), r, 255, -1)
                
                circle_region = cv2.bitwise_and(gray, gray, mask=mask)
                circle_pixels = circle_region[circle_region > 0]
                
                if len(circle_pixels) > 0:
                    # Calculate circle quality metrics
                    uniformity = 1.0 - (np.std(circle_pixels) / np.mean(circle_pixels))
                    quality_scores.append(max(0, uniformity))
            
            if quality_scores:
                return np.mean(quality_scores)
        
        return 0.5  # Default score if no circles detected
    
    def _detect_issues(self, gray: np.ndarray, metrics: Dict[str, float]) -> List[QualityIssue]:
        """Detect quality issues based on metrics"""
        issues = []
        
        # Sharpness issues
        if metrics['sharpness'] < self.thresholds['sharpness']['poor']:
            severity = 1.0 - (metrics['sharpness'] / self.thresholds['sharpness']['poor'])
            issues.append(QualityIssue(
                type=IssueType.BLUR,
                severity=min(1.0, severity),
                description="Image appears blurry or out of focus",
                location=None,
                auto_correctable=True
            ))
        
        # Contrast issues
        if metrics['contrast'] < self.thresholds['contrast']['poor']:
            severity = 1.0 - (metrics['contrast'] / self.thresholds['contrast']['poor'])
            issues.append(QualityIssue(
                type=IssueType.LOW_CONTRAST,
                severity=min(1.0, severity),
                description="Low contrast between text and background",
                location=None,
                auto_correctable=True
            ))
        
        # Brightness issues
        brightness = metrics['brightness']
        if (brightness < self.thresholds['brightness']['acceptable_min'] or 
            brightness > self.thresholds['brightness']['acceptable_max']):
            
            if brightness < self.thresholds['brightness']['optimal_min']:
                severity = (self.thresholds['brightness']['optimal_min'] - brightness) / 50
            else:
                severity = (brightness - self.thresholds['brightness']['optimal_max']) / 50
            
            issues.append(QualityIssue(
                type=IssueType.POOR_LIGHTING,
                severity=min(1.0, severity),
                description="Poor lighting conditions detected",
                location=None,
                auto_correctable=True
            ))
        
        # Noise issues
        if metrics['noise_level'] > self.thresholds['noise']['acceptable']:
            severity = (metrics['noise_level'] - self.thresholds['noise']['acceptable']) / 30
            issues.append(QualityIssue(
                type=IssueType.NOISE,
                severity=min(1.0, severity),
                description="High noise level detected",
                location=None,
                auto_correctable=True
            ))
        
        # Skew issues
        if metrics['skew_angle'] > self.thresholds['skew']['acceptable']:
            severity = (metrics['skew_angle'] - self.thresholds['skew']['acceptable']) / 10
            issues.append(QualityIssue(
                type=IssueType.SKEW,
                severity=min(1.0, severity),
                description=f"Document skew detected: {metrics['skew_angle']:.1f}°",
                location=None,
                auto_correctable=True
            ))
        
        # Resolution issues
        if metrics['resolution_score'] < 0.8:
            severity = 1.0 - metrics['resolution_score']
            issues.append(QualityIssue(
                type=IssueType.RESOLUTION,
                severity=severity,
                description="Image resolution may be too low for accurate processing",
                location=None,
                auto_correctable=False
            ))
        
        return issues
    
    def _calculate_overall_score(self, metrics: Dict[str, float]) -> float:
        """Calculate overall quality score"""
        
        # Normalize individual scores
        sharpness_score = min(1.0, metrics['sharpness'] / self.thresholds['sharpness']['excellent'])
        contrast_score = min(1.0, metrics['contrast'] / self.thresholds['contrast']['excellent'])
        
        # Brightness score (optimal range)
        brightness = metrics['brightness']
        if self.thresholds['brightness']['optimal_min'] <= brightness <= self.thresholds['brightness']['optimal_max']:
            brightness_score = 1.0
        else:
            brightness_score = max(0, 1.0 - abs(brightness - 130) / 100)
        
        noise_score = max(0, 1.0 - metrics['noise_level'] / self.thresholds['noise']['poor'])
        skew_score = max(0, 1.0 - metrics['skew_angle'] / self.thresholds['skew']['poor'])
        
        # Weighted combination
        weights = {
            'sharpness': 0.25,
            'contrast': 0.20,
            'brightness': 0.20,
            'noise': 0.15,
            'skew': 0.10,
            'resolution': 0.05,
            'alignment': 0.03,
            'bubble_quality': 0.02
        }
        
        overall_score = (
            sharpness_score * weights['sharpness'] +
            contrast_score * weights['contrast'] +
            brightness_score * weights['brightness'] +
            noise_score * weights['noise'] +
            skew_score * weights['skew'] +
            metrics['resolution_score'] * weights['resolution'] +
            metrics['alignment_score'] * weights['alignment'] +
            metrics['bubble_quality_score'] * weights['bubble_quality']
        )
        
        return min(1.0, overall_score)
    
    def _determine_quality_level(self, overall_score: float) -> QualityLevel:
        """Determine quality level from overall score"""
        if overall_score >= 0.9:
            return QualityLevel.EXCELLENT
        elif overall_score >= 0.75:
            return QualityLevel.GOOD
        elif overall_score >= 0.6:
            return QualityLevel.ACCEPTABLE
        elif overall_score >= 0.4:
            return QualityLevel.POOR
        else:
            return QualityLevel.UNACCEPTABLE
    
    def _correct_blur(self, image: np.ndarray) -> np.ndarray:
        """Apply sharpening filter to correct blur"""
        # Unsharp mask
        gaussian = cv2.GaussianBlur(image, (0, 0), self.correction_params['unsharp_mask_sigma'])
        unsharp_mask = cv2.addWeighted(image, 1 + self.correction_params['unsharp_mask_strength'], 
                                      gaussian, -self.correction_params['unsharp_mask_strength'], 0)
        return unsharp_mask
    
    def _correct_contrast(self, image: np.ndarray) -> np.ndarray:
        """Apply contrast enhancement"""
        # CLAHE (Contrast Limited Adaptive Histogram Equalization)
        if len(image.shape) == 3:
            lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
            clahe = cv2.createCLAHE(clipLimit=self.correction_params['clahe_clip_limit'], 
                                   tileGridSize=self.correction_params['clahe_tile_size'])
            lab[:,:,0] = clahe.apply(lab[:,:,0])
            return cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)
        else:
            clahe = cv2.createCLAHE(clipLimit=self.correction_params['clahe_clip_limit'], 
                                   tileGridSize=self.correction_params['clahe_tile_size'])
            return clahe.apply(image)
    
    def _correct_lighting(self, image: np.ndarray) -> np.ndarray:
        """Correct lighting issues"""
        # Gamma correction for brightness adjustment
        if len(image.shape) == 3:
            hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
            mean_brightness = np.mean(hsv[:,:,2])
            
            if mean_brightness < 100:
                gamma = 0.7  # Brighten
            elif mean_brightness > 180:
                gamma = 1.3  # Darken
            else:
                return image  # No correction needed
            
            # Apply gamma correction
            inv_gamma = 1.0 / gamma
            table = np.array([((i / 255.0) ** inv_gamma) * 255 for i in np.arange(0, 256)]).astype("uint8")
            hsv[:,:,2] = cv2.LUT(hsv[:,:,2], table)
            
            return cv2.cvtColor(hsv, cv2.COLOR_HSV2BGR)
        else:
            mean_brightness = np.mean(image)
            
            if mean_brightness < 100:
                gamma = 0.7
            elif mean_brightness > 180:
                gamma = 1.3
            else:
                return image
            
            inv_gamma = 1.0 / gamma
            table = np.array([((i / 255.0) ** inv_gamma) * 255 for i in np.arange(0, 256)]).astype("uint8")
            
            return cv2.LUT(image, table)
    
    def _correct_noise(self, image: np.ndarray) -> np.ndarray:
        """Apply noise reduction"""
        # Bilateral filter for noise reduction while preserving edges
        return cv2.bilateralFilter(image, 
                                  self.correction_params['bilateral_filter_d'],
                                  self.correction_params['bilateral_filter_sigma'],
                                  self.correction_params['bilateral_filter_sigma'])
    
    def _correct_skew(self, image: np.ndarray, skew_angle: float) -> np.ndarray:
        """Correct document skew"""
        if abs(skew_angle) < 0.5:
            return image  # No correction needed
        
        # Get image dimensions
        (h, w) = image.shape[:2]
        center = (w // 2, h // 2)
        
        # Create rotation matrix
        M = cv2.getRotationMatrix2D(center, skew_angle, 1.0)
        
        # Apply rotation
        corrected = cv2.warpAffine(image, M, (w, h), flags=cv2.INTER_CUBIC, 
                                  borderMode=cv2.BORDER_REPLICATE)
        
        return corrected

def main():
    """Test advanced quality control system"""
    
    controller = AdvancedQualityController()
    
    # Test with sample image
    try:
        image = cv2.imread('../../test_image_40_questions.jpg')
        if image is not None:
            # Analyze quality
            metrics = controller.analyze_quality(image)
            
            print("\n=== ADVANCED QUALITY ANALYSIS ===")
            print(f"Overall Score: {metrics.overall_score:.3f}")
            print(f"Quality Level: {metrics.level.value}")
            print(f"Processing Time: {metrics.processing_time:.3f}s")
            
            print(f"\nDetailed Metrics:")
            print(f"  Sharpness: {metrics.sharpness:.1f}")
            print(f"  Contrast: {metrics.contrast:.3f}")
            print(f"  Brightness: {metrics.brightness:.1f}")
            print(f"  Noise Level: {metrics.noise_level:.1f}")
            print(f"  Skew Angle: {metrics.skew_angle:.1f}°")
            print(f"  Resolution Score: {metrics.resolution_score:.3f}")
            print(f"  Alignment Score: {metrics.alignment_score:.3f}")
            print(f"  Bubble Quality: {metrics.bubble_quality_score:.3f}")
            
            if metrics.issues:
                print(f"\nDetected Issues:")
                for issue in metrics.issues:
                    print(f"  - {issue.type.value}: {issue.description} (severity: {issue.severity:.2f})")
            
            # Apply auto-correction if needed
            if metrics.level in [QualityLevel.POOR, QualityLevel.ACCEPTABLE]:
                print(f"\n=== APPLYING AUTO-CORRECTION ===")
                correction_result = controller.auto_correct_image(image, metrics)
                
                print(f"Corrections Applied: {len(correction_result.corrections_applied)}")
                for correction in correction_result.corrections_applied:
                    print(f"  - {correction}")
                
                print(f"Quality Improvement: {correction_result.quality_improvement:.3f}")
                print(f"Correction Time: {correction_result.processing_time:.3f}s")
        else:
            print("❌ Test image not found")
            
    except Exception as e:
        print(f"❌ Test error: {e}")

if __name__ == "__main__":
    main()