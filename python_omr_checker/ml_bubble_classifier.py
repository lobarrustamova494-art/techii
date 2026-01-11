#!/usr/bin/env python3
"""
Machine Learning Bubble Classifier for EvalBee Professional OMR System
Uses trained models to classify bubble states with high accuracy
"""

import cv2
import numpy as np
import joblib
import logging
from typing import List, Dict, Tuple, Optional, Any
from dataclasses import dataclass
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report
import os

logger = logging.getLogger(__name__)

@dataclass
class BubbleFeatures:
    """Bubble feature extraction result"""
    intensity_mean: float
    intensity_std: float
    intensity_min: float
    intensity_max: float
    fill_ratio: float
    edge_density: float
    circularity: float
    compactness: float
    contrast_ratio: float
    gradient_magnitude: float

@dataclass
class MLClassificationResult:
    """ML classification result"""
    is_filled: bool
    confidence: float
    probability_filled: float
    probability_empty: float
    features: BubbleFeatures

class MLBubbleClassifier:
    """Machine Learning-based bubble classifier"""
    
    def __init__(self, model_path: Optional[str] = None):
        self.model = None
        self.is_trained = False
        self.model_path = model_path or "models/bubble_classifier.joblib"
        
        # Feature extraction parameters
        self.feature_params = {
            'blur_kernel': (3, 3),
            'edge_threshold1': 50,
            'edge_threshold2': 150,
            'morph_kernel_size': (3, 3)
        }
        
        # Load pre-trained model if available
        self.load_model()
    
    def extract_features(self, bubble_region: np.ndarray) -> BubbleFeatures:
        """Extract comprehensive features from bubble region"""
        
        if bubble_region.size == 0:
            return self._empty_features()
        
        # Ensure grayscale
        if len(bubble_region.shape) == 3:
            gray = cv2.cvtColor(bubble_region, cv2.COLOR_BGR2GRAY)
        else:
            gray = bubble_region.copy()
        
        # Basic intensity features
        intensity_mean = np.mean(gray)
        intensity_std = np.std(gray)
        intensity_min = np.min(gray)
        intensity_max = np.max(gray)
        
        # Fill ratio (dark pixels)
        _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        fill_ratio = np.sum(binary == 0) / binary.size
        
        # Edge density
        edges = cv2.Canny(gray, self.feature_params['edge_threshold1'], 
                         self.feature_params['edge_threshold2'])
        edge_density = np.sum(edges > 0) / edges.size
        
        # Shape features
        contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        if contours:
            # Find largest contour
            largest_contour = max(contours, key=cv2.contourArea)
            
            # Circularity
            area = cv2.contourArea(largest_contour)
            perimeter = cv2.arcLength(largest_contour, True)
            circularity = 4 * np.pi * area / (perimeter * perimeter) if perimeter > 0 else 0
            
            # Compactness
            hull = cv2.convexHull(largest_contour)
            hull_area = cv2.contourArea(hull)
            compactness = area / hull_area if hull_area > 0 else 0
        else:
            circularity = 0
            compactness = 0
        
        # Contrast ratio
        contrast_ratio = intensity_std / intensity_mean if intensity_mean > 0 else 0
        
        # Gradient magnitude
        grad_x = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=3)
        grad_y = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=3)
        gradient_magnitude = np.mean(np.sqrt(grad_x**2 + grad_y**2))
        
        return BubbleFeatures(
            intensity_mean=intensity_mean,
            intensity_std=intensity_std,
            intensity_min=intensity_min,
            intensity_max=intensity_max,
            fill_ratio=fill_ratio,
            edge_density=edge_density,
            circularity=circularity,
            compactness=compactness,
            contrast_ratio=contrast_ratio,
            gradient_magnitude=gradient_magnitude
        )
    
    def _empty_features(self) -> BubbleFeatures:
        """Return empty features for invalid regions"""
        return BubbleFeatures(
            intensity_mean=0, intensity_std=0, intensity_min=0, intensity_max=0,
            fill_ratio=0, edge_density=0, circularity=0, compactness=0,
            contrast_ratio=0, gradient_magnitude=0
        )
    
    def features_to_array(self, features: BubbleFeatures) -> np.ndarray:
        """Convert features to numpy array for ML model"""
        return np.array([
            features.intensity_mean,
            features.intensity_std,
            features.intensity_min,
            features.intensity_max,
            features.fill_ratio,
            features.edge_density,
            features.circularity,
            features.compactness,
            features.contrast_ratio,
            features.gradient_magnitude
        ]).reshape(1, -1)
    
    def classify_bubble(self, bubble_region: np.ndarray) -> MLClassificationResult:
        """Classify bubble using ML model"""
        
        # Extract features
        features = self.extract_features(bubble_region)
        
        if not self.is_trained:
            # Fallback to rule-based classification
            return self._rule_based_classification(features)
        
        # ML-based classification
        feature_array = self.features_to_array(features)
        
        try:
            # Get prediction and probabilities
            prediction = self.model.predict(feature_array)[0]
            probabilities = self.model.predict_proba(feature_array)[0]
            
            # Assuming binary classification: [empty, filled]
            prob_empty = probabilities[0]
            prob_filled = probabilities[1]
            
            is_filled = bool(prediction)
            confidence = max(prob_empty, prob_filled)
            
            return MLClassificationResult(
                is_filled=is_filled,
                confidence=confidence,
                probability_filled=prob_filled,
                probability_empty=prob_empty,
                features=features
            )
            
        except Exception as e:
            logger.error(f"ML classification failed: {e}")
            return self._rule_based_classification(features)
    
    def _rule_based_classification(self, features: BubbleFeatures) -> MLClassificationResult:
        """Fallback rule-based classification"""
        
        # Simple rule-based logic
        fill_threshold = 0.3
        is_filled = features.fill_ratio > fill_threshold
        
        # Calculate confidence based on how far from threshold
        distance_from_threshold = abs(features.fill_ratio - fill_threshold)
        confidence = min(0.95, 0.5 + distance_from_threshold * 2)
        
        prob_filled = features.fill_ratio
        prob_empty = 1.0 - features.fill_ratio
        
        return MLClassificationResult(
            is_filled=is_filled,
            confidence=confidence,
            probability_filled=prob_filled,
            probability_empty=prob_empty,
            features=features
        )
    
    def train_model(self, training_data: List[Tuple[np.ndarray, bool]], 
                   test_size: float = 0.2) -> Dict[str, Any]:
        """Train the ML model with labeled data"""
        
        logger.info("🤖 Training ML bubble classifier...")
        
        if len(training_data) < 10:
            raise ValueError("Need at least 10 training samples")
        
        # Extract features and labels
        features_list = []
        labels = []
        
        for bubble_region, is_filled in training_data:
            features = self.extract_features(bubble_region)
            feature_array = self.features_to_array(features).flatten()
            features_list.append(feature_array)
            labels.append(int(is_filled))
        
        X = np.array(features_list)
        y = np.array(labels)
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=test_size, random_state=42, stratify=y
        )
        
        # Train Random Forest model
        self.model = RandomForestClassifier(
            n_estimators=100,
            max_depth=10,
            min_samples_split=5,
            min_samples_leaf=2,
            random_state=42
        )
        
        self.model.fit(X_train, y_train)
        
        # Evaluate model
        y_pred = self.model.predict(X_test)
        accuracy = accuracy_score(y_test, y_pred)
        
        # Feature importance
        feature_names = [
            'intensity_mean', 'intensity_std', 'intensity_min', 'intensity_max',
            'fill_ratio', 'edge_density', 'circularity', 'compactness',
            'contrast_ratio', 'gradient_magnitude'
        ]
        
        feature_importance = dict(zip(feature_names, self.model.feature_importances_))
        
        self.is_trained = True
        
        logger.info(f"✅ Model trained with accuracy: {accuracy:.3f}")
        
        return {
            'accuracy': accuracy,
            'training_samples': len(X_train),
            'test_samples': len(X_test),
            'feature_importance': feature_importance,
            'classification_report': classification_report(y_test, y_pred, output_dict=True)
        }
    
    def save_model(self, path: Optional[str] = None) -> bool:
        """Save trained model to disk"""
        
        if not self.is_trained or self.model is None:
            logger.error("No trained model to save")
            return False
        
        save_path = path or self.model_path
        
        try:
            # Create directory if it doesn't exist
            os.makedirs(os.path.dirname(save_path), exist_ok=True)
            
            # Save model
            joblib.dump(self.model, save_path)
            
            logger.info(f"✅ Model saved to {save_path}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to save model: {e}")
            return False
    
    def load_model(self, path: Optional[str] = None) -> bool:
        """Load trained model from disk"""
        
        load_path = path or self.model_path
        
        if not os.path.exists(load_path):
            logger.info(f"No pre-trained model found at {load_path}")
            return False
        
        try:
            self.model = joblib.load(load_path)
            self.is_trained = True
            
            logger.info(f"✅ Model loaded from {load_path}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to load model: {e}")
            return False
    
    def generate_synthetic_training_data(self, count: int = 1000) -> List[Tuple[np.ndarray, bool]]:
        """Generate synthetic training data for initial model training"""
        
        logger.info(f"🎲 Generating {count} synthetic training samples...")
        
        training_data = []
        
        for i in range(count):
            # Create synthetic bubble region
            size = np.random.randint(15, 25)
            bubble = np.ones((size, size), dtype=np.uint8) * 255
            
            # Randomly decide if filled or empty
            is_filled = np.random.choice([True, False])
            
            if is_filled:
                # Create filled bubble
                center = (size // 2, size // 2)
                radius = np.random.randint(5, size // 2)
                cv2.circle(bubble, center, radius, 0, -1)
                
                # Add some noise
                noise = np.random.normal(0, 20, bubble.shape).astype(np.int16)
                bubble = np.clip(bubble.astype(np.int16) + noise, 0, 255).astype(np.uint8)
            else:
                # Create empty bubble (just circle outline)
                center = (size // 2, size // 2)
                radius = np.random.randint(5, size // 2)
                cv2.circle(bubble, center, radius, 100, 2)
                
                # Add some noise
                noise = np.random.normal(0, 10, bubble.shape).astype(np.int16)
                bubble = np.clip(bubble.astype(np.int16) + noise, 0, 255).astype(np.uint8)
            
            training_data.append((bubble, is_filled))
        
        logger.info(f"✅ Generated {len(training_data)} synthetic samples")
        return training_data

def main():
    """Test ML Bubble Classifier"""
    
    classifier = MLBubbleClassifier()
    
    # Generate synthetic training data
    training_data = classifier.generate_synthetic_training_data(1000)
    
    # Train model
    results = classifier.train_model(training_data)
    
    print("\n=== ML BUBBLE CLASSIFIER TRAINING RESULTS ===")
    print(f"Accuracy: {results['accuracy']:.3f}")
    print(f"Training samples: {results['training_samples']}")
    print(f"Test samples: {results['test_samples']}")
    
    print(f"\nFeature Importance:")
    for feature, importance in sorted(results['feature_importance'].items(), 
                                    key=lambda x: x[1], reverse=True):
        print(f"  {feature}: {importance:.3f}")
    
    # Save model
    classifier.save_model()
    
    # Test classification
    print(f"\n=== TESTING CLASSIFICATION ===")
    
    # Create test bubbles
    test_filled = np.ones((20, 20), dtype=np.uint8) * 255
    cv2.circle(test_filled, (10, 10), 8, 0, -1)
    
    test_empty = np.ones((20, 20), dtype=np.uint8) * 255
    cv2.circle(test_empty, (10, 10), 8, 100, 2)
    
    # Classify
    result_filled = classifier.classify_bubble(test_filled)
    result_empty = classifier.classify_bubble(test_empty)
    
    print(f"Filled bubble: {result_filled.is_filled} (conf: {result_filled.confidence:.3f})")
    print(f"Empty bubble: {result_empty.is_filled} (conf: {result_empty.confidence:.3f})")

if __name__ == "__main__":
    main()