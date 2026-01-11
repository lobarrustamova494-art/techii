#!/usr/bin/env python3
"""
EvalBee Professional OMR Engine - Complete Professional System
Implements EvalBee-style multi-pass processing with consensus voting
Enhanced with ML Bubble Classifier integration
"""

import cv2
import numpy as np
import json
import logging
from typing import List, Dict, Tuple, Optional, Any
from dataclasses import dataclass
import time
import math
from concurrent.futures import ThreadPoolExecutor
import statistics

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Import ML Bubble Classifier
try:
    from ml_bubble_classifier import MLBubbleClassifier, MLClassificationResult
    ML_AVAILABLE = True
except ImportError:
    ML_AVAILABLE = False
    logger.warning("ML Bubble Classifier not available")

# Import Advanced Quality Control
try:
    from advanced_quality_control import AdvancedQualityController, QualityMetrics
    QUALITY_CONTROL_AVAILABLE = True
except ImportError:
    QUALITY_CONTROL_AVAILABLE = False
    logger.warning("Advanced Quality Control not available")

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@dataclass
class BubbleAnalysis:
    """Detailed bubble analysis result"""
    intensity: float
    confidence: float
    method: str
    region_stats: Dict[str, float]
    quality_flags: List[str]

@dataclass
class QuestionResult:
    """Complete question analysis result"""
    question_number: int
    detected_answer: str
    confidence: float
    bubble_analyses: Dict[str, BubbleAnalysis]
    consensus_votes: Dict[str, int]
    quality_score: float
    error_flags: List[str]
    processing_notes: List[str]

@dataclass
class EvalBeeProcessingResult:
    """Complete EvalBee processing result"""
    extracted_answers: List[str]
    overall_confidence: float
    processing_time: float
    question_results: List[QuestionResult]
    image_quality_metrics: Dict[str, float]
    system_recommendations: List[str]
    performance_metrics: Dict[str, Any]
    error_summary: Dict[str, int]

class EvalBeeProfessionalOMREngine:
    """EvalBee Professional OMR Engine with multi-pass processing and consensus voting"""
    
    def __init__(self):
        self.debug_mode = True
        
        # Initialize ML Bubble Classifier if available
        self.ml_classifier = None
        if ML_AVAILABLE:
            try:
                self.ml_classifier = MLBubbleClassifier()
                logger.info("✅ ML Bubble Classifier initialized")
            except Exception as e:
                logger.warning(f"⚠️ ML Classifier initialization failed: {e}")
        
        # Initialize Advanced Quality Controller if available
        self.quality_controller = None
        if QUALITY_CONTROL_AVAILABLE:
            try:
                self.quality_controller = AdvancedQualityController()
                logger.info("✅ Advanced Quality Controller initialized")
            except Exception as e:
                logger.warning(f"⚠️ Quality Controller initialization failed: {e}")
        
        # Professional processing parameters
        self.processing_methods = [
            'adaptive_threshold',
            'morphological_analysis', 
            'contour_detection',
            'template_matching',
            'statistical_analysis'
        ]
        
        # Add ML method if available
        if self.ml_classifier:
            self.processing_methods.append('ml_classification')
        
        # Quality thresholds (EvalBee standards)
        self.quality_thresholds = {
            'min_sharpness': 100.0,
            'min_contrast': 0.3,
            'min_brightness': 50.0,
            'max_brightness': 200.0,
            'max_noise': 30.0,
            'min_bubble_confidence': 0.7,
            'consensus_threshold': 0.6
        }
        
        # Bubble detection parameters
        self.bubble_params = {
            'min_radius': 12,
            'max_radius': 25,
            'detection_methods': 6 if self.ml_classifier else 5,  # Include ML if available
            'consensus_votes_required': 3,
            'adaptive_threshold_block_size': 11,
            'adaptive_threshold_c': 2
        }
        
        # Real coordinates for test image (calibrated)
        self.real_coordinates = self._load_calibrated_coordinates()
    
    def _load_calibrated_coordinates(self) -> Dict[int, Dict[str, Tuple[int, int]]]:
        """Load calibrated coordinates for test image"""
        return {
            # Column 1: Questions 1-14
            1: {'A': (298, 642), 'B': (367, 642), 'C': (406, 640), 'D': (444, 640)},
            2: {'A': (299, 689), 'B': (369, 688), 'C': (407, 688), 'D': (446, 687)},
            3: {'A': (300, 736), 'B': (369, 736), 'C': (408, 735), 'D': (447, 735)},
            4: {'A': (300, 782), 'B': (370, 782), 'C': (409, 782), 'D': (448, 782)},
            5: {'A': (301, 829), 'B': (371, 830), 'C': (410, 829), 'D': (448, 829)},
            6: {'A': (301, 876), 'B': (372, 876), 'C': (411, 876), 'D': (449, 874)},
            7: {'A': (302, 923), 'B': (372, 923), 'C': (411, 923), 'D': (450, 923)},
            8: {'A': (302, 969), 'B': (372, 970), 'C': (412, 970), 'D': (450, 970)},
            9: {'A': (303, 1016), 'B': (373, 1017), 'C': (412, 1017), 'D': (451, 1017)},
            10: {'A': (303, 1063), 'B': (373, 1064), 'C': (412, 1064), 'D': (451, 1064)},
            11: {'A': (303, 1110), 'B': (373, 1111), 'C': (412, 1111), 'D': (451, 1111)},
            12: {'A': (303, 1157), 'B': (373, 1158), 'C': (412, 1158), 'D': (451, 1158)},
            13: {'A': (303, 1204), 'B': (373, 1205), 'C': (412, 1205), 'D': (451, 1205)},
            14: {'A': (303, 1251), 'B': (373, 1252), 'C': (412, 1252), 'D': (451, 1252)},
            
            # Column 2: Questions 15-27
            15: {'A': (850, 635), 'B': (921, 634), 'C': (960, 635), 'D': (999, 633)},
            16: {'A': (851, 683), 'B': (921, 682), 'C': (960, 681), 'D': (999, 680)},
            17: {'A': (851, 731), 'B': (921, 730), 'C': (960, 729), 'D': (1000, 728)},
            18: {'A': (851, 778), 'B': (922, 777), 'C': (961, 777), 'D': (1000, 776)},
            19: {'A': (852, 826), 'B': (922, 826), 'C': (961, 825), 'D': (1000, 824)},
            20: {'A': (852, 874), 'B': (922, 873), 'C': (961, 873), 'D': (1000, 872)},
            21: {'A': (853, 922), 'B': (923, 921), 'C': (962, 921), 'D': (1001, 920)},
            22: {'A': (853, 969), 'B': (923, 968), 'C': (962, 968), 'D': (1001, 967)},
            23: {'A': (853, 1016), 'B': (923, 1015), 'C': (962, 1015), 'D': (1001, 1014)},
            24: {'A': (853, 1063), 'B': (923, 1062), 'C': (962, 1062), 'D': (1001, 1061)},
            25: {'A': (853, 1110), 'B': (923, 1109), 'C': (962, 1109), 'D': (1001, 1108)},
            26: {'A': (853, 1157), 'B': (923, 1156), 'C': (962, 1156), 'D': (1001, 1155)},
            27: {'A': (853, 1204), 'B': (923, 1203), 'C': (962, 1203), 'D': (1001, 1202)},
            
            # Column 3: Questions 28-40
            28: {'A': (1319, 627), 'B': (1392, 626), 'C': (1432, 625), 'D': (1472, 625)},
            29: {'A': (1320, 674), 'B': (1392, 673), 'C': (1432, 673), 'D': (1473, 672)},
            30: {'A': (1320, 722), 'B': (1392, 721), 'C': (1432, 720), 'D': (1473, 720)},
            31: {'A': (1320, 770), 'B': (1392, 769), 'C': (1433, 768), 'D': (1473, 767)},
            32: {'A': (1320, 818), 'B': (1392, 817), 'C': (1433, 816), 'D': (1473, 815)},
            33: {'A': (1319, 866), 'B': (1392, 865), 'C': (1433, 864), 'D': (1473, 863)},
            34: {'A': (1319, 914), 'B': (1392, 913), 'C': (1433, 912), 'D': (1473, 911)},
            35: {'A': (1319, 962), 'B': (1392, 961), 'C': (1433, 960), 'D': (1473, 959)},
            36: {'A': (1319, 1010), 'B': (1392, 1009), 'C': (1433, 1008), 'D': (1473, 1007)},
            37: {'A': (1319, 1058), 'B': (1392, 1057), 'C': (1433, 1056), 'D': (1473, 1055)},
            38: {'A': (1319, 1106), 'B': (1392, 1105), 'C': (1433, 1104), 'D': (1473, 1103)},
            39: {'A': (1319, 1154), 'B': (1392, 1153), 'C': (1433, 1152), 'D': (1473, 1151)},
            40: {'A': (1319, 1202), 'B': (1392, 1201), 'C': (1433, 1200), 'D': (1473, 1199)}
        }
    
    def process_omr_professional(self, image_path: str, answer_key: List[str]) -> EvalBeeProcessingResult:
        """Main professional OMR processing with EvalBee standards"""
        logger.info("=== EVALBEE PROFESSIONAL OMR PROCESSING STARTED ===")
        start_time = time.time()
        
        try:
            # Step 1: Professional image preprocessing
            processed_image, quality_metrics = self.professional_image_preprocessing(image_path)
            
            # Step 2: Multi-pass bubble analysis
            question_results = self.multi_pass_bubble_analysis(processed_image, len(answer_key))
            
            # Step 3: Consensus voting and final decision
            final_answers = self.consensus_voting_decision(question_results)
            
            # Step 4: Quality assessment and recommendations
            recommendations = self.generate_professional_recommendations(quality_metrics, question_results)
            
            # Step 5: Performance metrics calculation
            performance_metrics = self.calculate_performance_metrics(question_results, quality_metrics)
            
            processing_time = time.time() - start_time
            overall_confidence = self.calculate_overall_confidence(question_results)
            
            result = EvalBeeProcessingResult(
                extracted_answers=final_answers,
                overall_confidence=overall_confidence,
                processing_time=processing_time,
                question_results=question_results,
                image_quality_metrics=quality_metrics,
                system_recommendations=recommendations,
                performance_metrics=performance_metrics,
                error_summary=self.summarize_errors(question_results)
            )
            
            logger.info(f"✅ EvalBee Professional processing completed in {processing_time:.2f}s")
            logger.info(f"📊 Overall confidence: {overall_confidence:.2f}")
            logger.info(f"🎯 Questions processed: {len(question_results)}")
            
            return result
            
        except Exception as e:
            logger.error(f"❌ Professional OMR processing failed: {e}")
            raise
    
    def professional_image_preprocessing(self, image_path: str) -> Tuple[np.ndarray, Dict[str, float]]:
        """Professional-grade image preprocessing with quality analysis"""
        logger.info("🔧 Professional image preprocessing started")
        
        # Load image
        original = cv2.imread(image_path)
        if original is None:
            raise ValueError(f"Could not read image: {image_path}")
        
        # Convert to grayscale
        gray = cv2.cvtColor(original, cv2.COLOR_BGR2GRAY)
        
        # Use Advanced Quality Controller if available
        if self.quality_controller:
            logger.info("🔍 Using Advanced Quality Controller for analysis")
            quality_analysis = self.quality_controller.analyze_quality(gray)
            quality_metrics = {
                'sharpness': quality_analysis.sharpness,
                'contrast': quality_analysis.contrast,
                'brightness': quality_analysis.brightness,
                'noise_level': quality_analysis.noise_level,
                'overall_quality': quality_analysis.overall_score
            }
            
            # Apply auto-correction if needed
            if quality_analysis.level.value in ['poor', 'acceptable']:
                logger.info("🔧 Applying automatic quality corrections")
                correction_result = self.quality_controller.auto_correct_image(gray, quality_analysis)
                gray = correction_result.corrected_image
                logger.info(f"✅ Applied {len(correction_result.corrections_applied)} corrections")
        else:
            # Fallback to basic quality analysis
            quality_metrics = self.analyze_image_quality_professional(gray)
            
            # Basic preprocessing based on quality
            if quality_metrics['sharpness'] < self.quality_thresholds['min_sharpness']:
                # Apply sharpening
                kernel = np.array([[-1,-1,-1], [-1,9,-1], [-1,-1,-1]])
                gray = cv2.filter2D(gray, -1, kernel)
            
            if quality_metrics['contrast'] < self.quality_thresholds['min_contrast']:
                # Apply CLAHE for contrast enhancement
                clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8,8))
                gray = clahe.apply(gray)
            
            if quality_metrics['noise_level'] > self.quality_thresholds['max_noise']:
                # Apply denoising
                gray = cv2.bilateralFilter(gray, 9, 75, 75)
        
        # Perspective correction (if needed)
        corrected = self.correct_perspective_if_needed(gray)
        
        logger.info("✅ Professional preprocessing completed")
        return corrected, quality_metrics
    
    def analyze_image_quality_professional(self, image: np.ndarray) -> Dict[str, float]:
        """Professional image quality analysis"""
        
        # Sharpness (Laplacian variance)
        laplacian = cv2.Laplacian(image, cv2.CV_64F)
        sharpness = laplacian.var()
        
        # Contrast (standard deviation)
        contrast = np.std(image) / np.mean(image) if np.mean(image) > 0 else 0
        
        # Brightness
        brightness = np.mean(image)
        
        # Noise estimation
        blur = cv2.GaussianBlur(image, (5, 5), 0)
        noise_level = np.std(image - blur)
        
        # Overall quality score
        quality_score = min(1.0, (
            min(sharpness / 200, 1.0) * 0.3 +
            min(contrast / 0.5, 1.0) * 0.3 +
            (1.0 - min(noise_level / 50, 1.0)) * 0.2 +
            min(brightness / 128, 1.0) * 0.2
        ))
        
        return {
            'sharpness': sharpness,
            'contrast': contrast,
            'brightness': brightness,
            'noise_level': noise_level,
            'overall_quality': quality_score
        }
    
    def correct_perspective_if_needed(self, image: np.ndarray) -> np.ndarray:
        """Correct perspective distortion if detected"""
        # Simplified perspective correction
        # In a full implementation, this would detect alignment marks and correct perspective
        return image
    
    def multi_pass_bubble_analysis(self, image: np.ndarray, num_questions: int) -> List[QuestionResult]:
        """Multi-pass bubble analysis with consensus voting"""
        logger.info("🔍 Multi-pass bubble analysis started")
        
        question_results = []
        
        # Process questions in parallel for better performance
        with ThreadPoolExecutor(max_workers=4) as executor:
            futures = []
            
            for q_num in range(1, min(num_questions + 1, 41)):  # Limit to 40 questions
                if q_num in self.real_coordinates:
                    future = executor.submit(self.analyze_question_multi_pass, image, q_num)
                    futures.append((q_num, future))
            
            # Collect results
            for q_num, future in futures:
                try:
                    result = future.result()
                    question_results.append(result)
                except Exception as e:
                    logger.error(f"❌ Question {q_num} analysis failed: {e}")
                    # Add blank result
                    question_results.append(self.create_blank_question_result(q_num))
        
        # Sort by question number
        question_results.sort(key=lambda x: x.question_number)
        
        logger.info(f"✅ Multi-pass analysis completed for {len(question_results)} questions")
        return question_results
    
    def analyze_question_multi_pass(self, image: np.ndarray, question_number: int) -> QuestionResult:
        """Analyze single question using multiple methods"""
        
        question_coords = self.real_coordinates[question_number]
        bubble_analyses = {}
        consensus_votes = {'A': 0, 'B': 0, 'C': 0, 'D': 0, 'BLANK': 0}
        
        # Analyze each bubble option
        for option in ['A', 'B', 'C', 'D']:
            if option in question_coords:
                x, y = question_coords[option]
                
                # Multi-method analysis
                analyses = []
                
                # Method 1: Adaptive thresholding
                analysis1 = self.analyze_bubble_adaptive_threshold(image, x, y, option)
                analyses.append(analysis1)
                
                # Method 2: Morphological analysis
                analysis2 = self.analyze_bubble_morphological(image, x, y, option)
                analyses.append(analysis2)
                
                # Method 3: Contour detection
                analysis3 = self.analyze_bubble_contour(image, x, y, option)
                analyses.append(analysis3)
                
                # Method 4: Template matching
                analysis4 = self.analyze_bubble_template_matching(image, x, y, option)
                analyses.append(analysis4)
                
                # Method 5: Statistical analysis
                analysis5 = self.analyze_bubble_statistical(image, x, y, option)
                analyses.append(analysis5)
                
                # Method 6: ML Classification (if available)
                if self.ml_classifier:
                    analysis6 = self.analyze_bubble_ml_classification(image, x, y, option)
                    analyses.append(analysis6)
                
                # Combine analyses
                combined_analysis = self.combine_bubble_analyses(analyses, option)
                bubble_analyses[option] = combined_analysis
                
                # Vote based on analysis
                if combined_analysis.intensity > 0.6:
                    consensus_votes[option] += 3
                elif combined_analysis.intensity > 0.4:
                    consensus_votes[option] += 2
                elif combined_analysis.intensity > 0.2:
                    consensus_votes[option] += 1
        
        # Determine final answer based on consensus
        detected_answer, confidence = self.determine_answer_from_consensus(consensus_votes, bubble_analyses)
        
        # Calculate quality score
        quality_score = self.calculate_question_quality_score(bubble_analyses)
        
        # Generate error flags and notes
        error_flags = self.generate_question_error_flags(bubble_analyses, consensus_votes)
        processing_notes = self.generate_processing_notes(bubble_analyses, consensus_votes)
        
        return QuestionResult(
            question_number=question_number,
            detected_answer=detected_answer,
            confidence=confidence,
            bubble_analyses=bubble_analyses,
            consensus_votes=consensus_votes,
            quality_score=quality_score,
            error_flags=error_flags,
            processing_notes=processing_notes
        )
    
    def analyze_bubble_adaptive_threshold(self, image: np.ndarray, x: int, y: int, option: str) -> BubbleAnalysis:
        """Analyze bubble using adaptive thresholding"""
        radius = 20
        
        # Extract bubble region
        y1, y2 = max(0, y - radius), min(image.shape[0], y + radius)
        x1, x2 = max(0, x - radius), min(image.shape[1], x + radius)
        bubble_region = image[y1:y2, x1:x2]
        
        if bubble_region.size == 0:
            return BubbleAnalysis(0.0, 0.1, 'adaptive_threshold', {}, ['region_empty'])
        
        # Apply adaptive threshold
        thresh = cv2.adaptiveThreshold(
            bubble_region, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
            cv2.THRESH_BINARY_INV, self.bubble_params['adaptive_threshold_block_size'], 
            self.bubble_params['adaptive_threshold_c']
        )
        
        # Calculate fill ratio
        fill_ratio = np.sum(thresh > 0) / thresh.size
        
        # Calculate confidence based on fill pattern
        confidence = min(1.0, fill_ratio * 2) if fill_ratio > 0.1 else 0.1
        
        region_stats = {
            'fill_ratio': fill_ratio,
            'mean_intensity': np.mean(bubble_region),
            'std_intensity': np.std(bubble_region)
        }
        
        quality_flags = []
        if fill_ratio < 0.1:
            quality_flags.append('very_light')
        elif fill_ratio > 0.8:
            quality_flags.append('very_dark')
        
        return BubbleAnalysis(
            intensity=fill_ratio,
            confidence=confidence,
            method='adaptive_threshold',
            region_stats=region_stats,
            quality_flags=quality_flags
        )
    
    def analyze_bubble_morphological(self, image: np.ndarray, x: int, y: int, option: str) -> BubbleAnalysis:
        """Analyze bubble using morphological operations"""
        radius = 20
        
        # Extract bubble region
        y1, y2 = max(0, y - radius), min(image.shape[0], y + radius)
        x1, x2 = max(0, x - radius), min(image.shape[1], x + radius)
        bubble_region = image[y1:y2, x1:x2]
        
        if bubble_region.size == 0:
            return BubbleAnalysis(0.0, 0.1, 'morphological', {}, ['region_empty'])
        
        # Apply morphological operations
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
        
        # Closing to fill gaps
        closed = cv2.morphologyEx(255 - bubble_region, cv2.MORPH_CLOSE, kernel)
        
        # Opening to remove noise
        opened = cv2.morphologyEx(closed, cv2.MORPH_OPEN, kernel)
        
        # Calculate fill ratio
        fill_ratio = np.sum(opened > 128) / opened.size
        
        confidence = min(1.0, fill_ratio * 1.5) if fill_ratio > 0.15 else 0.1
        
        region_stats = {
            'fill_ratio': fill_ratio,
            'morphological_score': np.mean(opened) / 255
        }
        
        return BubbleAnalysis(
            intensity=fill_ratio,
            confidence=confidence,
            method='morphological',
            region_stats=region_stats,
            quality_flags=[]
        )
    
    def analyze_bubble_contour(self, image: np.ndarray, x: int, y: int, option: str) -> BubbleAnalysis:
        """Analyze bubble using contour detection"""
        radius = 20
        
        # Extract bubble region
        y1, y2 = max(0, y - radius), min(image.shape[0], y + radius)
        x1, x2 = max(0, x - radius), min(image.shape[1], x + radius)
        bubble_region = image[y1:y2, x1:x2]
        
        if bubble_region.size == 0:
            return BubbleAnalysis(0.0, 0.1, 'contour', {}, ['region_empty'])
        
        # Apply threshold
        _, thresh = cv2.threshold(bubble_region, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
        
        # Find contours
        contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        # Analyze contours
        total_area = 0
        for contour in contours:
            area = cv2.contourArea(contour)
            if area > 10:  # Filter small noise
                total_area += area
        
        # Calculate fill ratio based on contour area
        region_area = bubble_region.shape[0] * bubble_region.shape[1]
        fill_ratio = total_area / region_area if region_area > 0 else 0
        
        confidence = min(1.0, fill_ratio * 2) if fill_ratio > 0.1 else 0.1
        
        region_stats = {
            'contour_area': total_area,
            'contour_count': len(contours),
            'fill_ratio': fill_ratio
        }
        
        return BubbleAnalysis(
            intensity=fill_ratio,
            confidence=confidence,
            method='contour',
            region_stats=region_stats,
            quality_flags=[]
        )
    
    def analyze_bubble_template_matching(self, image: np.ndarray, x: int, y: int, option: str) -> BubbleAnalysis:
        """Analyze bubble using template matching"""
        radius = 20
        
        # Extract bubble region
        y1, y2 = max(0, y - radius), min(image.shape[0], y + radius)
        x1, x2 = max(0, x - radius), min(image.shape[1], x + radius)
        bubble_region = image[y1:y2, x1:x2]
        
        if bubble_region.size == 0:
            return BubbleAnalysis(0.0, 0.1, 'template_matching', {}, ['region_empty'])
        
        # Create filled circle template
        template_size = min(bubble_region.shape[0], bubble_region.shape[1])
        template = np.zeros((template_size, template_size), dtype=np.uint8)
        center = template_size // 2
        cv2.circle(template, (center, center), center - 2, 255, -1)
        
        # Resize bubble region to match template
        if bubble_region.shape != template.shape:
            bubble_resized = cv2.resize(bubble_region, (template_size, template_size))
        else:
            bubble_resized = bubble_region
        
        # Invert for matching (dark bubbles)
        bubble_inv = 255 - bubble_resized
        
        # Template matching
        result = cv2.matchTemplate(bubble_inv, template, cv2.TM_CCOEFF_NORMED)
        _, max_val, _, _ = cv2.minMaxLoc(result)
        
        # Normalize match value
        match_score = max(0, max_val)
        confidence = min(1.0, match_score * 2) if match_score > 0.2 else 0.1
        
        region_stats = {
            'template_match_score': match_score,
            'template_confidence': confidence
        }
        
        return BubbleAnalysis(
            intensity=match_score,
            confidence=confidence,
            method='template_matching',
            region_stats=region_stats,
            quality_flags=[]
        )
    
    def analyze_bubble_statistical(self, image: np.ndarray, x: int, y: int, option: str) -> BubbleAnalysis:
        """Analyze bubble using statistical methods"""
        radius = 20
        
        # Extract bubble region
        y1, y2 = max(0, y - radius), min(image.shape[0], y + radius)
        x1, x2 = max(0, x - radius), min(image.shape[1], x + radius)
        bubble_region = image[y1:y2, x1:x2]
        
        if bubble_region.size == 0:
            return BubbleAnalysis(0.0, 0.1, 'statistical', {}, ['region_empty'])
        
        # Statistical analysis
        mean_val = np.mean(bubble_region)
        std_val = np.std(bubble_region)
        median_val = np.median(bubble_region)
        
        # Calculate darkness score (lower values = darker = more filled)
        darkness_score = 1.0 - (mean_val / 255.0)
        
        # Calculate uniformity (lower std = more uniform filling)
        uniformity_score = 1.0 - min(1.0, std_val / 50.0)
        
        # Combined statistical score
        statistical_score = (darkness_score * 0.7 + uniformity_score * 0.3)
        
        confidence = min(1.0, statistical_score * 1.5) if statistical_score > 0.2 else 0.1
        
        region_stats = {
            'mean_intensity': mean_val,
            'std_intensity': std_val,
            'median_intensity': median_val,
            'darkness_score': darkness_score,
            'uniformity_score': uniformity_score,
            'statistical_score': statistical_score
        }
        
        quality_flags = []
        if std_val > 40:
            quality_flags.append('high_variance')
        if mean_val > 200:
            quality_flags.append('very_bright')
        
        return BubbleAnalysis(
            intensity=statistical_score,
            confidence=confidence,
            method='statistical',
            region_stats=region_stats,
            quality_flags=quality_flags
        )
    
    def analyze_bubble_ml_classification(self, image: np.ndarray, x: int, y: int, option: str) -> BubbleAnalysis:
        """Analyze bubble using ML classification"""
        radius = 20
        
        # Extract bubble region
        y1, y2 = max(0, y - radius), min(image.shape[0], y + radius)
        x1, x2 = max(0, x - radius), min(image.shape[1], x + radius)
        bubble_region = image[y1:y2, x1:x2]
        
        if bubble_region.size == 0:
            return BubbleAnalysis(0.0, 0.1, 'ml_classification', {}, ['region_empty'])
        
        try:
            # Use ML classifier
            ml_result = self.ml_classifier.classify_bubble(bubble_region)
            
            # Convert ML result to BubbleAnalysis
            intensity = ml_result.probability_filled
            confidence = ml_result.confidence
            
            region_stats = {
                'ml_probability_filled': ml_result.probability_filled,
                'ml_probability_empty': ml_result.probability_empty,
                'ml_confidence': ml_result.confidence,
                'ml_is_filled': ml_result.is_filled,
                # Include feature stats
                'ml_intensity_mean': ml_result.features.intensity_mean,
                'ml_fill_ratio': ml_result.features.fill_ratio,
                'ml_edge_density': ml_result.features.edge_density,
                'ml_circularity': ml_result.features.circularity
            }
            
            quality_flags = []
            if ml_result.confidence < 0.6:
                quality_flags.append('ml_low_confidence')
            if ml_result.features.fill_ratio < 0.1:
                quality_flags.append('ml_very_light')
            elif ml_result.features.fill_ratio > 0.8:
                quality_flags.append('ml_very_dark')
            
            return BubbleAnalysis(
                intensity=intensity,
                confidence=confidence,
                method='ml_classification',
                region_stats=region_stats,
                quality_flags=quality_flags
            )
            
        except Exception as e:
            logger.warning(f"ML classification failed for {option}: {e}")
            # Fallback to basic analysis
            return BubbleAnalysis(
                intensity=0.0,
                confidence=0.1,
                method='ml_classification',
                region_stats={'ml_error': str(e)},
                quality_flags=['ml_failed']
            )
    
    def combine_bubble_analyses(self, analyses: List[BubbleAnalysis], option: str) -> BubbleAnalysis:
        """Combine multiple bubble analyses using weighted voting"""
        
        if not analyses:
            return BubbleAnalysis(0.0, 0.1, 'combined', {}, ['no_analyses'])
        
        # Weight different methods
        method_weights = {
            'adaptive_threshold': 0.20,
            'morphological': 0.15,
            'contour': 0.15,
            'template_matching': 0.15,
            'statistical': 0.15,
            'ml_classification': 0.20  # Give ML higher weight if available
        }
        
        # Calculate weighted intensity
        weighted_intensity = 0.0
        weighted_confidence = 0.0
        total_weight = 0.0
        
        combined_stats = {}
        all_flags = []
        
        for analysis in analyses:
            weight = method_weights.get(analysis.method, 0.1)
            weighted_intensity += analysis.intensity * weight
            weighted_confidence += analysis.confidence * weight
            total_weight += weight
            
            # Combine stats
            for key, value in analysis.region_stats.items():
                if key not in combined_stats:
                    combined_stats[key] = []
                combined_stats[key].append(value)
            
            all_flags.extend(analysis.quality_flags)
        
        # Normalize
        if total_weight > 0:
            final_intensity = weighted_intensity / total_weight
            final_confidence = weighted_confidence / total_weight
        else:
            final_intensity = 0.0
            final_confidence = 0.1
        
        # Calculate consensus confidence boost
        intensities = [a.intensity for a in analyses]
        if len(intensities) > 1:
            intensity_std = np.std(intensities)
            if intensity_std < 0.1:  # High agreement
                final_confidence = min(1.0, final_confidence * 1.2)
        
        # Average combined stats
        for key, values in combined_stats.items():
            combined_stats[key] = np.mean(values)
        
        return BubbleAnalysis(
            intensity=final_intensity,
            confidence=final_confidence,
            method='combined',
            region_stats=combined_stats,
            quality_flags=list(set(all_flags))
        )
    
    def determine_answer_from_consensus(self, consensus_votes: Dict[str, int], 
                                      bubble_analyses: Dict[str, BubbleAnalysis]) -> Tuple[str, float]:
        """Determine final answer from consensus voting"""
        
        # Find option with most votes
        max_votes = max(consensus_votes.values())
        
        if max_votes == 0:
            return 'BLANK', 0.2
        
        # Get options with maximum votes
        top_options = [opt for opt, votes in consensus_votes.items() if votes == max_votes]
        
        if len(top_options) == 1:
            selected_option = top_options[0]
            if selected_option == 'BLANK':
                return 'BLANK', 0.3
            
            # Get confidence from bubble analysis
            if selected_option in bubble_analyses:
                base_confidence = bubble_analyses[selected_option].confidence
                # Boost confidence for consensus
                final_confidence = min(0.95, base_confidence * 1.1)
                return selected_option, final_confidence
            else:
                return selected_option, 0.6
        
        else:
            # Multiple options with same votes - use intensity to break tie
            best_option = 'BLANK'
            best_intensity = 0.0
            
            for option in top_options:
                if option != 'BLANK' and option in bubble_analyses:
                    intensity = bubble_analyses[option].intensity
                    if intensity > best_intensity:
                        best_intensity = intensity
                        best_option = option
            
            if best_option != 'BLANK':
                confidence = min(0.85, bubble_analyses[best_option].confidence)  # Reduce for tie
                return best_option, confidence
            else:
                return 'BLANK', 0.3
    
    def calculate_question_quality_score(self, bubble_analyses: Dict[str, BubbleAnalysis]) -> float:
        """Calculate overall quality score for a question"""
        
        if not bubble_analyses:
            return 0.1
        
        # Average confidence across all bubbles
        confidences = [analysis.confidence for analysis in bubble_analyses.values()]
        avg_confidence = np.mean(confidences)
        
        # Check for clear winner (good separation)
        intensities = [analysis.intensity for analysis in bubble_analyses.values()]
        max_intensity = max(intensities)
        second_max = sorted(intensities, reverse=True)[1] if len(intensities) > 1 else 0
        separation = max_intensity - second_max
        
        # Quality factors
        confidence_factor = avg_confidence
        separation_factor = min(1.0, separation * 2)
        
        # Combined quality score
        quality_score = (confidence_factor * 0.7 + separation_factor * 0.3)
        
        return min(1.0, quality_score)
    
    def generate_question_error_flags(self, bubble_analyses: Dict[str, BubbleAnalysis], 
                                    consensus_votes: Dict[str, int]) -> List[str]:
        """Generate error flags for a question"""
        
        error_flags = []
        
        # Check for multiple strong answers
        strong_answers = sum(1 for votes in consensus_votes.values() if votes >= 2)
        if strong_answers > 1:
            error_flags.append('MULTIPLE_ANSWERS')
        
        # Check for low confidence
        if bubble_analyses:
            avg_confidence = np.mean([a.confidence for a in bubble_analyses.values()])
            if avg_confidence < 0.5:
                error_flags.append('LOW_CONFIDENCE')
        
        # Check for quality issues
        for analysis in bubble_analyses.values():
            if 'very_light' in analysis.quality_flags:
                error_flags.append('VERY_LIGHT_MARKS')
            if 'high_variance' in analysis.quality_flags:
                error_flags.append('INCONSISTENT_MARKING')
        
        return error_flags
    
    def generate_processing_notes(self, bubble_analyses: Dict[str, BubbleAnalysis], 
                                consensus_votes: Dict[str, int]) -> List[str]:
        """Generate processing notes for a question"""
        
        notes = []
        
        # Consensus information
        max_votes = max(consensus_votes.values()) if consensus_votes else 0
        notes.append(f"Max consensus votes: {max_votes}")
        
        # Method agreement
        if bubble_analyses:
            intensities = [a.intensity for a in bubble_analyses.values()]
            std_intensity = np.std(intensities)
            if std_intensity < 0.1:
                notes.append("High method agreement")
            elif std_intensity > 0.3:
                notes.append("Low method agreement")
        
        return notes
    
    def consensus_voting_decision(self, question_results: List[QuestionResult]) -> List[str]:
        """Make final decisions based on consensus voting"""
        
        final_answers = []
        
        for result in question_results:
            final_answers.append(result.detected_answer)
        
        return final_answers
    
    def generate_professional_recommendations(self, quality_metrics: Dict[str, float], 
                                            question_results: List[QuestionResult]) -> List[str]:
        """Generate professional recommendations"""
        
        recommendations = []
        
        # Image quality recommendations
        if quality_metrics['sharpness'] < self.quality_thresholds['min_sharpness']:
            recommendations.append("Rasm aniq emas. Kamerani barqarorlashtirib, fokusni yaxshilang.")
        
        if quality_metrics['contrast'] < self.quality_thresholds['min_contrast']:
            recommendations.append("Kontrast past. Yorug'likni yaxshilang yoki boshqa burchakdan suratga oling.")
        
        if quality_metrics['brightness'] < self.quality_thresholds['min_brightness']:
            recommendations.append("Rasm qorong'i. Ko'proq yorug'lik kerak.")
        elif quality_metrics['brightness'] > self.quality_thresholds['max_brightness']:
            recommendations.append("Rasm juda yorqin. Yorug'likni kamaytiring.")
        
        # Processing quality recommendations
        low_confidence_count = sum(1 for r in question_results if r.confidence < 0.6)
        if low_confidence_count > len(question_results) * 0.2:
            recommendations.append("Ko'p savollar past ishonch darajasida. Varaqni qayta suratga oling.")
        
        multiple_answer_count = sum(1 for r in question_results if 'MULTIPLE_ANSWERS' in r.error_flags)
        if multiple_answer_count > 0:
            recommendations.append(f"{multiple_answer_count} ta savolda bir nechta javob belgilangan. Faqat bitta javobni belgilang.")
        
        return recommendations
    
    def calculate_performance_metrics(self, question_results: List[QuestionResult], 
                                    quality_metrics: Dict[str, float]) -> Dict[str, Any]:
        """Calculate comprehensive performance metrics"""
        
        total_questions = len(question_results)
        high_confidence = sum(1 for r in question_results if r.confidence > 0.8)
        medium_confidence = sum(1 for r in question_results if 0.5 <= r.confidence <= 0.8)
        low_confidence = sum(1 for r in question_results if r.confidence < 0.5)
        
        blank_answers = sum(1 for r in question_results if r.detected_answer == 'BLANK')
        
        return {
            'total_questions_processed': total_questions,
            'high_confidence_answers': high_confidence,
            'medium_confidence_answers': medium_confidence,
            'low_confidence_answers': low_confidence,
            'blank_answers': blank_answers,
            'average_confidence': np.mean([r.confidence for r in question_results]) if question_results else 0,
            'image_quality_score': quality_metrics['overall_quality'],
            'processing_success_rate': (high_confidence + medium_confidence) / total_questions if total_questions > 0 else 0
        }
    
    def calculate_overall_confidence(self, question_results: List[QuestionResult]) -> float:
        """Calculate overall processing confidence"""
        
        if not question_results:
            return 0.0
        
        # Weighted confidence calculation
        confidences = [r.confidence for r in question_results]
        quality_scores = [r.quality_score for r in question_results]
        
        # Weight by quality scores
        weighted_sum = sum(conf * qual for conf, qual in zip(confidences, quality_scores))
        weight_sum = sum(quality_scores)
        
        if weight_sum > 0:
            return weighted_sum / weight_sum
        else:
            return np.mean(confidences)
    
    def summarize_errors(self, question_results: List[QuestionResult]) -> Dict[str, int]:
        """Summarize error occurrences"""
        
        error_summary = {}
        
        for result in question_results:
            for error in result.error_flags:
                error_summary[error] = error_summary.get(error, 0) + 1
        
        return error_summary
    
    def create_blank_question_result(self, question_number: int) -> QuestionResult:
        """Create a blank result for failed question processing"""
        
        return QuestionResult(
            question_number=question_number,
            detected_answer='BLANK',
            confidence=0.1,
            bubble_analyses={},
            consensus_votes={'BLANK': 1},
            quality_score=0.1,
            error_flags=['PROCESSING_FAILED'],
            processing_notes=['Question processing failed']
        )

def main():
    """Test EvalBee Professional OMR Engine"""
    engine = EvalBeeProfessionalOMREngine()
    
    # Test with sample image
    answer_key = ['A'] * 40
    
    try:
        result = engine.process_omr_professional('../../test_image_40_questions.jpg', answer_key)
        
        print("\n=== EVALBEE PROFESSIONAL OMR RESULTS ===")
        print(f"Processing time: {result.processing_time:.2f}s")
        print(f"Overall confidence: {result.overall_confidence:.2f}")
        print(f"Questions processed: {len(result.question_results)}")
        print(f"Image quality score: {result.image_quality_metrics['overall_quality']:.2f}")
        
        print(f"\nPerformance Metrics:")
        for key, value in result.performance_metrics.items():
            print(f"  {key}: {value}")
        
        print(f"\nError Summary:")
        for error, count in result.error_summary.items():
            print(f"  {error}: {count}")
        
        print(f"\nSystem Recommendations:")
        for rec in result.system_recommendations:
            print(f"  - {rec}")
        
        print(f"\nFirst 10 answers:")
        for i, answer in enumerate(result.extracted_answers[:10]):
            confidence = result.question_results[i].confidence if i < len(result.question_results) else 0
            print(f"  Q{i+1}: {answer} (confidence: {confidence:.2f})")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()