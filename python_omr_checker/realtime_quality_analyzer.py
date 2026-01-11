#!/usr/bin/env python3
"""
Real-time Quality Analyzer for EvalBee Professional OMR System
Provides instant feedback during image capture and processing
"""

import cv2
import numpy as np
import json
import logging
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
import time

logger = logging.getLogger(__name__)

@dataclass
class QualityFeedback:
    """Real-time quality feedback result"""
    overall_score: float
    sharpness_score: float
    brightness_score: float
    contrast_score: float
    alignment_score: float
    recommendations: List[str]
    warnings: List[str]
    is_ready_for_processing: bool
    quality_level: str  # 'excellent', 'good', 'fair', 'poor'

class RealtimeQualityAnalyzer:
    """Real-time quality analyzer for camera feed and uploaded images"""
    
    def __init__(self):
        self.quality_thresholds = {
            'excellent': 0.85,
            'good': 0.70,
            'fair': 0.55,
            'poor': 0.0
        }
        
        # Quality criteria weights
        self.weights = {
            'sharpness': 0.30,
            'brightness': 0.25,
            'contrast': 0.25,
            'alignment': 0.20
        }
        
        # Optimal ranges
        self.optimal_ranges = {
            'brightness': (80, 180),
            'contrast_ratio': (0.3, 0.8),
            'sharpness_threshold': 100.0,
            'alignment_threshold': 0.7
        }
    
    def analyze_image_quality(self, image_data: np.ndarray) -> QualityFeedback:
        """Analyze image quality in real-time"""
        
        if image_data is None or image_data.size == 0:
            return self._create_error_feedback("Rasm ma'lumotlari topilmadi")
        
        try:
            # Convert to grayscale if needed
            if len(image_data.shape) == 3:
                gray = cv2.cvtColor(image_data, cv2.COLOR_BGR2GRAY)
            else:
                gray = image_data.copy()
            
            # Analyze different quality aspects
            sharpness_score = self._analyze_sharpness(gray)
            brightness_score = self._analyze_brightness(gray)
            contrast_score = self._analyze_contrast(gray)
            alignment_score = self._analyze_alignment(gray)
            
            # Calculate overall score
            overall_score = (
                sharpness_score * self.weights['sharpness'] +
                brightness_score * self.weights['brightness'] +
                contrast_score * self.weights['contrast'] +
                alignment_score * self.weights['alignment']
            )
            
            # Generate recommendations and warnings
            recommendations, warnings = self._generate_feedback(
                sharpness_score, brightness_score, contrast_score, alignment_score
            )
            
            # Determine quality level
            quality_level = self._determine_quality_level(overall_score)
            
            # Check if ready for processing
            is_ready = overall_score >= self.quality_thresholds['fair']
            
            return QualityFeedback(
                overall_score=overall_score,
                sharpness_score=sharpness_score,
                brightness_score=brightness_score,
                contrast_score=contrast_score,
                alignment_score=alignment_score,
                recommendations=recommendations,
                warnings=warnings,
                is_ready_for_processing=is_ready,
                quality_level=quality_level
            )
            
        except Exception as e:
            logger.error(f"Quality analysis error: {e}")
            return self._create_error_feedback(f"Tahlil xatosi: {str(e)}")
    
    def _analyze_sharpness(self, gray: np.ndarray) -> float:
        """Analyze image sharpness using Laplacian variance"""
        try:
            laplacian = cv2.Laplacian(gray, cv2.CV_64F)
            variance = laplacian.var()
            
            # Normalize to 0-1 scale
            normalized = min(1.0, variance / 200.0)
            return normalized
            
        except Exception:
            return 0.0
    
    def _analyze_brightness(self, gray: np.ndarray) -> float:
        """Analyze image brightness"""
        try:
            mean_brightness = np.mean(gray)
            
            # Check if within optimal range
            min_bright, max_bright = self.optimal_ranges['brightness']
            
            if min_bright <= mean_brightness <= max_bright:
                # Perfect brightness
                return 1.0
            elif mean_brightness < min_bright:
                # Too dark
                return max(0.0, mean_brightness / min_bright)
            else:
                # Too bright
                return max(0.0, 1.0 - (mean_brightness - max_bright) / (255 - max_bright))
                
        except Exception:
            return 0.0
    
    def _analyze_contrast(self, gray: np.ndarray) -> float:
        """Analyze image contrast"""
        try:
            std_dev = np.std(gray)
            mean_val = np.mean(gray)
            
            if mean_val == 0:
                return 0.0
            
            contrast_ratio = std_dev / mean_val
            
            # Check if within optimal range
            min_contrast, max_contrast = self.optimal_ranges['contrast_ratio']
            
            if min_contrast <= contrast_ratio <= max_contrast:
                return 1.0
            elif contrast_ratio < min_contrast:
                return max(0.0, contrast_ratio / min_contrast)
            else:
                return max(0.0, 1.0 - (contrast_ratio - max_contrast) / (1.0 - max_contrast))
                
        except Exception:
            return 0.0
    
    def _analyze_alignment(self, gray: np.ndarray) -> float:
        """Analyze paper alignment and orientation"""
        try:
            height, width = gray.shape
            
            # Simple edge detection for alignment
            edges = cv2.Canny(gray, 50, 150)
            
            # Find lines using Hough transform
            lines = cv2.HoughLines(edges, 1, np.pi/180, threshold=100)
            
            if lines is None or len(lines) == 0:
                return 0.5  # Neutral score if no lines detected
            
            # Analyze line angles
            angles = []
            for line in lines[:10]:  # Analyze first 10 lines
                rho, theta = line[0]
                angle = theta * 180 / np.pi
                angles.append(angle)
            
            # Check if lines are mostly horizontal/vertical
            horizontal_lines = sum(1 for angle in angles if abs(angle) < 10 or abs(angle - 180) < 10)
            vertical_lines = sum(1 for angle in angles if abs(angle - 90) < 10)
            
            alignment_ratio = (horizontal_lines + vertical_lines) / len(angles)
            
            return min(1.0, alignment_ratio * 1.2)
            
        except Exception:
            return 0.5
    
    def _generate_feedback(self, sharpness: float, brightness: float, 
                          contrast: float, alignment: float) -> Tuple[List[str], List[str]]:
        """Generate actionable feedback and warnings"""
        
        recommendations = []
        warnings = []
        
        # Sharpness feedback
        if sharpness < 0.6:
            warnings.append("Rasm aniq emas")
            recommendations.append("📱 Kamerani barqarorlashtirib, fokusni yaxshilang")
        elif sharpness < 0.8:
            recommendations.append("🔍 Fokusni biroz yaxshilash mumkin")
        
        # Brightness feedback
        if brightness < 0.6:
            warnings.append("Rasm qorong'i")
            recommendations.append("💡 Ko'proq yorug'lik kerak")
        elif brightness > 0.9:
            warnings.append("Rasm juda yorqin")
            recommendations.append("🌤️ Yorug'likni kamaytiring")
        
        # Contrast feedback
        if contrast < 0.6:
            warnings.append("Kontrast past")
            recommendations.append("🔆 Yorug'likni yaxshilang yoki boshqa burchakdan suratga oling")
        
        # Alignment feedback
        if alignment < 0.6:
            warnings.append("Qog'oz qiyshaygan")
            recommendations.append("📐 Qog'ozni to'g'ri joylashtiring")
        
        # Overall feedback
        overall = (sharpness + brightness + contrast + alignment) / 4
        if overall >= 0.85:
            recommendations.append("✅ Ajoyib sifat! Qayta ishlash uchun tayyor")
        elif overall >= 0.70:
            recommendations.append("👍 Yaxshi sifat, qayta ishlash mumkin")
        elif overall >= 0.55:
            recommendations.append("⚠️ O'rtacha sifat, yaxshilash tavsiya etiladi")
        else:
            warnings.append("❌ Past sifat")
            recommendations.append("🔄 Rasmni qayta oling")
        
        return recommendations, warnings
    
    def _determine_quality_level(self, overall_score: float) -> str:
        """Determine quality level based on overall score"""
        
        if overall_score >= self.quality_thresholds['excellent']:
            return 'excellent'
        elif overall_score >= self.quality_thresholds['good']:
            return 'good'
        elif overall_score >= self.quality_thresholds['fair']:
            return 'fair'
        else:
            return 'poor'
    
    def _create_error_feedback(self, error_message: str) -> QualityFeedback:
        """Create error feedback result"""
        
        return QualityFeedback(
            overall_score=0.0,
            sharpness_score=0.0,
            brightness_score=0.0,
            contrast_score=0.0,
            alignment_score=0.0,
            recommendations=[],
            warnings=[error_message],
            is_ready_for_processing=False,
            quality_level='poor'
        )
    
    def analyze_from_base64(self, base64_data: str) -> QualityFeedback:
        """Analyze quality from base64 encoded image"""
        try:
            import base64
            
            # Remove data URL prefix if present
            if ',' in base64_data:
                base64_data = base64_data.split(',')[1]
            
            # Decode base64
            image_bytes = base64.b64decode(base64_data)
            
            # Convert to numpy array
            nparr = np.frombuffer(image_bytes, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            return self.analyze_image_quality(image)
            
        except Exception as e:
            logger.error(f"Base64 analysis error: {e}")
            return self._create_error_feedback(f"Base64 tahlil xatosi: {str(e)}")
    
    def get_quality_summary(self, feedback: QualityFeedback) -> Dict:
        """Get quality summary for API response"""
        
        return {
            'overall_score': round(float(feedback.overall_score) * 100, 1),
            'quality_level': feedback.quality_level,
            'scores': {
                'sharpness': round(float(feedback.sharpness_score) * 100, 1),
                'brightness': round(float(feedback.brightness_score) * 100, 1),
                'contrast': round(float(feedback.contrast_score) * 100, 1),
                'alignment': round(float(feedback.alignment_score) * 100, 1)
            },
            'is_ready': bool(feedback.is_ready_for_processing),
            'recommendations': list(feedback.recommendations),
            'warnings': list(feedback.warnings),
            'status': self._get_status_message(feedback.quality_level),
            'color': self._get_status_color(feedback.quality_level)
        }
    
    def _get_status_message(self, quality_level: str) -> str:
        """Get status message in Uzbek"""
        
        messages = {
            'excellent': 'Ajoyib sifat',
            'good': 'Yaxshi sifat',
            'fair': 'O\'rtacha sifat',
            'poor': 'Past sifat'
        }
        
        return messages.get(quality_level, 'Noma\'lum')
    
    def _get_status_color(self, quality_level: str) -> str:
        """Get status color for UI"""
        
        colors = {
            'excellent': 'green',
            'good': 'blue',
            'fair': 'orange',
            'poor': 'red'
        }
        
        return colors.get(quality_level, 'gray')

def main():
    """Test real-time quality analyzer"""
    analyzer = RealtimeQualityAnalyzer()
    
    # Test with sample image
    try:
        image = cv2.imread('../../test_image_40_questions.jpg')
        if image is not None:
            feedback = analyzer.analyze_image_quality(image)
            summary = analyzer.get_quality_summary(feedback)
            
            print("\n=== REAL-TIME QUALITY ANALYSIS ===")
            print(f"Overall Score: {summary['overall_score']}%")
            print(f"Quality Level: {summary['quality_level']}")
            print(f"Status: {summary['status']}")
            print(f"Ready for Processing: {summary['is_ready']}")
            
            print(f"\nDetailed Scores:")
            for metric, score in summary['scores'].items():
                print(f"  {metric.capitalize()}: {score}%")
            
            print(f"\nRecommendations:")
            for rec in summary['recommendations']:
                print(f"  - {rec}")
            
            if summary['warnings']:
                print(f"\nWarnings:")
                for warning in summary['warnings']:
                    print(f"  ⚠️ {warning}")
        else:
            print("❌ Test image not found")
            
    except Exception as e:
        print(f"❌ Test error: {e}")

if __name__ == "__main__":
    main()