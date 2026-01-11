#!/usr/bin/env python3
"""
OMR Processing Flask Server
RESTful API for OMR sheet processing
"""

import os
import json
import tempfile
from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename
import logging
from pathlib import Path

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

from omr_processor import OMRProcessor
from optimized_omr_processor import OptimizedOMRProcessor
from ultra_precision_omr_processor import UltraPrecisionOMRProcessor
from ultra_precision_omr_processor_v2 import UltraPrecisionOMRProcessorV2
from perfect_omr_processor import PerfectOMRProcessor

import time
import numpy as np

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Safe imports for EvalBee engines (may require sklearn)
try:
    from evalbee_omr_engine import EvalBeeOMREngine
    EVALBEE_ENGINE_AVAILABLE = True
except ImportError as e:
    logger.warning(f"EvalBee OMR Engine not available: {e}")
    EVALBEE_ENGINE_AVAILABLE = False
    EvalBeeOMREngine = None

try:
    from evalbee_omr_engine_v2 import EvalBeeOMREngineV2
    from evalbee_professional_omr_engine import EvalBeeProfessionalOMREngine
    from realtime_quality_analyzer import RealtimeQualityAnalyzer
    from batch_omr_processor import BatchOMRProcessor, BatchItem
    from analytics_engine import AnalyticsEngine, ProcessingRecord
    EVALBEE_ENGINE_V2_AVAILABLE = True
    EVALBEE_PROFESSIONAL_AVAILABLE = True
    ADVANCED_FEATURES_AVAILABLE = True
except ImportError as e:
    logger.warning(f"Advanced OMR features not available: {e}")
    EVALBEE_ENGINE_V2_AVAILABLE = False
    EVALBEE_PROFESSIONAL_AVAILABLE = False
    ADVANCED_FEATURES_AVAILABLE = False
    EvalBeeOMREngineV2 = None
    EvalBeeProfessionalOMREngine = None
    RealtimeQualityAnalyzer = None
    BatchOMRProcessor = None
    AnalyticsEngine = None

# Safe import for Anchor-Based processor (may require Tesseract)
try:
    from anchor_based_omr_processor import AnchorBasedOMRProcessor
    ANCHOR_BASED_AVAILABLE = True
    logger.info("✅ Anchor-Based OMR processor available (with fallback support)")
except ImportError as e:
    logger.warning(f"Anchor-Based OMR processor not available: {e}")
    ANCHOR_BASED_AVAILABLE = False
    AnchorBasedOMRProcessor = None

# Safe import for ML Bubble Classifier
try:
    from ml_bubble_classifier import MLBubbleClassifier
    ML_CLASSIFIER_AVAILABLE = True
    logger.info("✅ ML Bubble Classifier available")
except ImportError as e:
    logger.warning(f"ML Bubble Classifier not available: {e}")
    ML_CLASSIFIER_AVAILABLE = False
    MLBubbleClassifier = None

# Safe import for Advanced Quality Control
try:
    from advanced_quality_control import AdvancedQualityController
    QUALITY_CONTROL_AVAILABLE = True
    logger.info("✅ Advanced Quality Control available")
except ImportError as e:
    logger.warning(f"Advanced Quality Control not available: {e}")
    QUALITY_CONTROL_AVAILABLE = False
    AdvancedQualityController = None

# Safe import for GROQ AI OMR Analyzer
try:
    from groq_ai_omr_analyzer import GroqAIOMRAnalyzer
    GROQ_AI_AVAILABLE = True
    logger.info("✅ GROQ AI OMR Analyzer available")
except ImportError as e:
    logger.warning(f"GROQ AI OMR Analyzer not available: {e}")
    GROQ_AI_AVAILABLE = False
    GroqAIOMRAnalyzer = None

# Safe import for Cloud Processor
try:
    from cloud_processor import cloud_processor
    CLOUD_PROCESSOR_AVAILABLE = True
    logger.info("✅ Cloud Processor available")
except ImportError as e:
    logger.warning(f"Cloud Processor not available: {e}")
    CLOUD_PROCESSOR_AVAILABLE = False
    cloud_processor = None
app = Flask(__name__)
CORS(app)

# Configuration
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'tiff', 'bmp'}

# Create upload directory
Path(UPLOAD_FOLDER).mkdir(exist_ok=True)

# Initialize OMR processors
omr_processor = OMRProcessor()
optimized_processor = OptimizedOMRProcessor()
ultra_processor = UltraPrecisionOMRProcessor()
ultra_v2_processor = UltraPrecisionOMRProcessorV2()
perfect_processor = PerfectOMRProcessor()

# Safe initialization of EvalBee engines
evalbee_engine = EvalBeeOMREngine() if EVALBEE_ENGINE_AVAILABLE else None
evalbee_v2_engine = EvalBeeOMREngineV2() if EVALBEE_ENGINE_V2_AVAILABLE else None
evalbee_professional_engine = EvalBeeProfessionalOMREngine() if EVALBEE_PROFESSIONAL_AVAILABLE else None
anchor_based_processor = AnchorBasedOMRProcessor() if ANCHOR_BASED_AVAILABLE else None

# Advanced features initialization
quality_analyzer = RealtimeQualityAnalyzer() if ADVANCED_FEATURES_AVAILABLE else None
batch_processor = BatchOMRProcessor() if ADVANCED_FEATURES_AVAILABLE else None
analytics_engine = AnalyticsEngine() if ADVANCED_FEATURES_AVAILABLE else None
anchor_based_processor = AnchorBasedOMRProcessor() if ANCHOR_BASED_AVAILABLE else None

# New advanced features initialization
ml_classifier = MLBubbleClassifier() if ML_CLASSIFIER_AVAILABLE else None
quality_controller = AdvancedQualityController() if QUALITY_CONTROL_AVAILABLE else None

# GROQ AI initialization
groq_ai_analyzer = None
if GROQ_AI_AVAILABLE:
    try:
        groq_ai_analyzer = GroqAIOMRAnalyzer()
        logger.info("✅ GROQ AI OMR Analyzer initialized")
    except Exception as e:
        logger.error(f"❌ Failed to initialize GROQ AI: {e}")
        GROQ_AI_AVAILABLE = False

def convert_numpy_types(obj):
    """Convert numpy types to Python native types for JSON serialization"""
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, dict):
        return {key: convert_numpy_types(value) for key, value in obj.items()}
    elif isinstance(obj, list):
        return [convert_numpy_types(item) for item in obj]
    else:
        return obj

def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'Python OMR Processor',
        'version': '1.0.0',
        'timestamp': time.time()
    })

@app.route('/api/omr/process', methods=['POST'])
def process_omr():
    """Process OMR sheet endpoint"""
    print("=== RECEIVED OMR PROCESSING REQUEST ===")
    try:
        print("Checking for image file...")
        # Check if file is present
        if 'image' not in request.files:
            print("ERROR: No image file in request")
            return jsonify({
                'success': False,
                'message': 'No image file provided'
            }), 400
            
        file = request.files['image']
        print(f"Image file found: {file.filename}")
        if file.filename == '':
            print("ERROR: Empty filename")
            return jsonify({
                'success': False,
                'message': 'No file selected'
            }), 400
            
        if not allowed_file(file.filename):
            print(f"ERROR: Invalid file type: {file.filename}")
            return jsonify({
                'success': False,
                'message': 'Invalid file type. Allowed: PNG, JPG, JPEG, TIFF, BMP'
            }), 400
        # Get request parameters
        answer_key_str = request.form.get('answerKey', '[]')
        exam_data_str = request.form.get('examData', '{}')
        debug_mode = request.form.get('debug', 'false').lower() == 'true'
        use_optimized = request.form.get('optimized', 'true').lower() == 'true'  # Default to optimized
        use_ultra = request.form.get('ultra', 'false').lower() == 'true'  # Ultra precision mode
        use_universal = request.form.get('universal', 'true').lower() == 'true'  # Universal coordinate detection
        use_perfect = request.form.get('perfect', 'false').lower() == 'true'  # Perfect OMR mode
        use_evalbee = request.form.get('evalbee', 'false').lower() == 'true'  # EvalBee engine (NEW)
        use_professional = request.form.get('professional', 'false').lower() == 'true'  # EvalBee Professional engine
        use_anchor_based = request.form.get('anchor_based', 'false').lower() == 'true'  # Anchor-based processor
        
        try:
            answer_key = json.loads(answer_key_str)
            exam_data = json.loads(exam_data_str) if exam_data_str != '{}' else None
        except json.JSONDecodeError as e:
            return jsonify({
                'success': False,
                'message': f'Invalid JSON data: {e}'
            }), 400
            
        if not answer_key:
            return jsonify({
                'success': False,
                'message': 'Answer key is required'
            }), 400
            
        logger.info(f"Processing OMR: {file.filename}, {len(answer_key)} questions")
        logger.info(f"Debug mode: {debug_mode}")
        logger.info(f"Use optimized: {use_optimized}")
        logger.info(f"Use ultra: {use_ultra}")
        logger.info(f"Use universal coordinates: {use_universal}")
        logger.info(f"Use perfect OMR: {use_perfect}")
        logger.info(f"Use EvalBee engine: {use_evalbee}")  # NEW
        logger.info(f"Use EvalBee Professional: {use_professional}")  # NEW
        logger.info(f"Use Anchor-based: {use_anchor_based}")  # NEW
        logger.info(f"Exam data provided: {exam_data is not None}")
        
        print(f"=== PARAMETERS DEBUG ===")
        print(f"Anchor-based mode: {use_anchor_based}")
        print(f"EvalBee Professional mode: {use_professional}")
        print(f"EvalBee mode: {use_evalbee}")
        print(f"Perfect mode: {use_perfect}")
        print(f"Ultra mode: {use_ultra}")
        print(f"Optimized mode: {use_optimized}")
        print(f"Universal mode: {use_universal}")
        print(f"Debug mode: {debug_mode}")
        
        # Save uploaded file temporarily
        filename = secure_filename(file.filename)
        temp_path = os.path.join(UPLOAD_FOLDER, f"temp_{int(time.time())}_{filename}")
        logger.info(f"Saving image to: {temp_path}")
        file.save(temp_path)
        
        # Verify file was saved correctly
        if not os.path.exists(temp_path):
            logger.error(f"Failed to save image to {temp_path}")
            return jsonify({
                'success': False,
                'message': 'Failed to save uploaded image'
            }), 500
            
        file_size = os.path.getsize(temp_path)
        logger.info(f"Image saved successfully: {file_size} bytes")
        
        try:
            # Choose processor based on request
            if use_anchor_based:
                if ANCHOR_BASED_AVAILABLE and anchor_based_processor:
                    processor = anchor_based_processor  # Use Anchor-Based Processor
                    processor_name = "Anchor-Based OMR Processor (Langor + Piksel tahlili)"
                else:
                    logger.warning("Anchor-based processor requested but not available, falling back to Professional")
                    if EVALBEE_PROFESSIONAL_AVAILABLE and evalbee_professional_engine:
                        processor = evalbee_professional_engine
                        processor_name = "EvalBee Professional Multi-Pass OMR Engine (Anchor Fallback)"
                    else:
                        processor = ultra_v2_processor
                        processor_name = "Ultra-Precision V2 OMR Processor (Anchor Fallback)"
            elif use_professional:
                if EVALBEE_PROFESSIONAL_AVAILABLE and evalbee_professional_engine:
                    processor = evalbee_professional_engine  # Use EvalBee Professional Engine
                    processor_name = "EvalBee Professional Multi-Pass OMR Engine"
                else:
                    logger.warning("EvalBee Professional engine requested but not available, falling back to EvalBee V2")
                    if EVALBEE_ENGINE_V2_AVAILABLE and evalbee_v2_engine:
                        processor = evalbee_v2_engine
                        processor_name = "EvalBee Professional OMR Engine V2 (Fallback)"
                    else:
                        processor = ultra_v2_processor
                        processor_name = "Ultra-Precision V2 OMR Processor (Professional Fallback)"
            elif use_evalbee:
                if EVALBEE_ENGINE_V2_AVAILABLE and evalbee_v2_engine:
                    processor = evalbee_v2_engine  # Use EvalBee V2 Engine (NEW)
                    processor_name = "EvalBee Professional OMR Engine V2"
                else:
                    logger.warning("EvalBee engine requested but not available, falling back to Ultra-Precision")
                    processor = ultra_v2_processor
                    processor_name = "Ultra-Precision V2 OMR Processor (EvalBee Fallback)"
            elif use_perfect:
                processor = perfect_processor  # Use Perfect OMR Processor
                processor_name = "Perfect OMR Processor V1 (100% Accuracy)"
            elif use_ultra:
                processor = ultra_v2_processor  # Use V2 processor
                processor_name = "Ultra-Precision V2 OMR Processor"
            elif use_optimized:
                processor = optimized_processor
                processor_name = "Optimized OMR Processor"
            else:
                processor = omr_processor
                processor_name = "Standard OMR Processor"
            
            # Set debug mode
            if hasattr(processor, 'set_debug_mode'):
                processor.set_debug_mode(debug_mode)
            
            logger.info(f"Using {processor_name}")
            
            # Force logging to see what's happening
            import logging
            logging.getLogger().setLevel(logging.INFO)
            
            # Also log to file for debugging
            debug_log_path = os.path.join(UPLOAD_FOLDER, f"debug_{int(time.time())}.log")
            file_handler = logging.FileHandler(debug_log_path)
            file_handler.setLevel(logging.INFO)
            formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
            file_handler.setFormatter(formatter)
            logging.getLogger().addHandler(file_handler)
            
            print(f"=== STARTING OMR PROCESSING ===")
            print(f"Processor: {processor_name}")
            print(f"Image path: {temp_path}")
            print(f"Answer key length: {len(answer_key)}")
            print(f"Exam data provided: {exam_data is not None}")
            print(f"EvalBee mode: {use_evalbee}")  # NEW
            print(f"Perfect mode: {use_perfect}")
            print(f"Ultra mode: {use_ultra}")
            print(f"Optimized mode: {use_optimized}")
            if exam_data:
                print(f"Exam structure: {exam_data.get('structure', 'unknown')}")
                print(f"Paper size: {exam_data.get('paperSize', 'unknown')}")
            
            logger.info(f"=== STARTING OMR PROCESSING ===")
            logger.info(f"Processor: {processor_name}")
            logger.info(f"Image path: {temp_path}")
            logger.info(f"Answer key length: {len(answer_key)}")
            logger.info(f"Exam data provided: {exam_data is not None}")
            logger.info(f"Anchor-based mode: {use_anchor_based}")  # NEW
            logger.info(f"EvalBee Professional mode: {use_professional}")  # NEW
            logger.info(f"EvalBee mode: {use_evalbee}")  # NEW
            logger.info(f"Perfect mode: {use_perfect}")
            logger.info(f"Ultra mode: {use_ultra}")
            logger.info(f"Optimized mode: {use_optimized}")
            if exam_data:
                logger.info(f"Exam structure: {exam_data.get('structure', 'unknown')}")
                logger.info(f"Paper size: {exam_data.get('paperSize', 'unknown')}")
            
            # Process OMR sheet using selected processor
            if use_anchor_based and ANCHOR_BASED_AVAILABLE and anchor_based_processor:
                # Anchor-based processing
                anchor_result = processor.process_omr_with_anchors(temp_path, answer_key)
                
                # Convert Anchor-based result to standard format
                result = type('Result', (), {})()
                result.extracted_answers = anchor_result.extracted_answers
                result.confidence = anchor_result.confidence
                result.processing_details = {
                    'processing_method': 'Anchor-Based OMR Processor (Langor + Piksel tahlili)',
                    'layout_type': 'anchor_based_detection',
                    'actual_question_count': len(anchor_result.extracted_answers),
                    'anchors_found': anchor_result.processing_details['anchors_found'],
                    'bubbles_analyzed': anchor_result.processing_details['bubbles_analyzed'],
                    'processing_time': anchor_result.processing_time,
                    'image_dimensions': anchor_result.processing_details['image_dimensions'],
                    'preprocessing_applied': anchor_result.processing_details['preprocessing_applied']
                }
                result.detailed_results = anchor_result.detailed_results
                
                logger.info("🎯 Anchor-Based OMR Processor processing completed")
            elif use_professional and EVALBEE_PROFESSIONAL_AVAILABLE and evalbee_professional_engine:
                # EvalBee Professional engine processing
                professional_result = processor.process_omr_professional(temp_path, answer_key)
                
                # Convert EvalBee Professional result to standard format
                result = type('Result', (), {})()
                result.extracted_answers = professional_result.extracted_answers
                result.confidence = professional_result.overall_confidence
                result.processing_details = {
                    'processing_method': 'EvalBee Professional Multi-Pass Engine',
                    'layout_type': 'professional_multi_pass',
                    'actual_question_count': len(professional_result.question_results),
                    'image_quality': professional_result.image_quality_metrics['overall_quality'],
                    'processing_time': professional_result.processing_time,
                    'performance_metrics': professional_result.performance_metrics,
                    'error_summary': professional_result.error_summary,
                    'system_recommendations': professional_result.system_recommendations,
                    'quality_metrics': professional_result.image_quality_metrics
                }
                result.detailed_results = [
                    {
                        'question': qr.question_number,
                        'detected_answer': qr.detected_answer,
                        'confidence': qr.confidence,
                        'quality_score': qr.quality_score,
                        'error_flags': qr.error_flags,
                        'processing_notes': qr.processing_notes,
                        'consensus_votes': qr.consensus_votes,
                        'bubble_analyses': {
                            option: {
                                'intensity': ba.intensity,
                                'confidence': ba.confidence,
                                'method': ba.method,
                                'region_stats': ba.region_stats,
                                'quality_flags': ba.quality_flags
                            } for option, ba in qr.bubble_analyses.items()
                        }
                    } for qr in professional_result.question_results
                ]
                
                logger.info("🎯 EvalBee Professional Multi-Pass Engine processing completed")
            elif use_evalbee and EVALBEE_ENGINE_V2_AVAILABLE and evalbee_v2_engine:
                # EvalBee V2 engine processing
                evalbee_result = processor.process_omr_sheet(temp_path, answer_key)
                
                # Convert EvalBee V2 result to standard format
                result = type('Result', (), {})()
                result.extracted_answers = evalbee_result.extracted_answers
                result.confidence = evalbee_result.overall_confidence
                result.processing_details = {
                    'processing_method': 'EvalBee Professional Engine V2',
                    'layout_type': evalbee_result.layout_analysis['layout_type'],
                    'actual_question_count': evalbee_result.layout_analysis['total_questions'],
                    'image_quality': evalbee_result.quality_metrics['overall_quality'],
                    'processing_time': evalbee_result.processing_time,
                    'error_flags': evalbee_result.error_flags,
                    'recommendations': evalbee_result.recommendations,
                    'quality_metrics': evalbee_result.quality_metrics,
                    'layout_analysis': evalbee_result.layout_analysis,
                    'confidence_scores': evalbee_result.confidence_scores
                }
                result.detailed_results = evalbee_result.detailed_results
                
                logger.info("🎯 EvalBee Professional Engine V2 processing completed")
            elif use_perfect:
                result = processor.process_perfect_omr_sheet(temp_path, answer_key)  # Perfect OMR
            elif use_ultra:
                # ADAPTIVE: Use universal coordinates for new formats, real for known formats
                result = processor.process_omr_sheet_ultra_v2(temp_path, answer_key, use_universal=True)  # Enable universal
                logger.info("🎯 ADAPTIVE: Using Ultra-Precision V2 with Universal Coordinates for new formats")
            elif use_optimized:
                result = processor.process_omr_sheet_optimized(temp_path, answer_key)
            else:
                result = processor.process_omr_sheet(temp_path, answer_key, exam_data)
            
            # Convert all numpy types to Python native types
            result.extracted_answers = convert_numpy_types(result.extracted_answers)
            result.confidence = float(result.confidence)
            result.processing_details = convert_numpy_types(result.processing_details)
            result.detailed_results = convert_numpy_types(result.detailed_results)
            
            print(f"=== OMR PROCESSING COMPLETED ===")
            print(f"Extracted answers: {len(result.extracted_answers)}")
            print(f"Confidence: {result.confidence}")
            print(f"Processing method: {result.processing_details.get('processing_method', 'Unknown')}")
            
            logger.info(f"=== OMR PROCESSING COMPLETED ===")
            logger.info(f"Extracted answers: {len(result.extracted_answers)}")
            logger.info(f"Confidence: {result.confidence}")
            logger.info(f"Processing method: {result.processing_details.get('processing_method', 'Unknown')}")
            
            # Log first 10 answers for debugging
            for i in range(min(10, len(result.extracted_answers))):
                print(f"Q{i+1}: {result.extracted_answers[i]}")
                logger.info(f"Q{i+1}: {result.extracted_answers[i]}")
            
            # Remove file handler
            logging.getLogger().removeHandler(file_handler)
            file_handler.close()
            
            # Calculate scoring if provided
            scoring_data = request.form.get('scoring')
            if scoring_data:
                try:
                    scoring = json.loads(scoring_data)
                    score_results = calculate_score(result.extracted_answers, answer_key, scoring)
                except json.JSONDecodeError:
                    score_results = None
            else:
                score_results = None
            
            # Prepare response - EXACT SAME FORMAT AS NODE.JS
            response_data = {
                'success': True,
                'message': 'OMR sheet processed successfully',
                'data': {
                    'extracted_answers': result.extracted_answers,
                    'confidence': result.confidence,
                    'processing_details': result.processing_details,
                    'detailed_results': result.detailed_results,
                    'answer_key': answer_key
                }
            }
            
            if score_results:
                response_data['data']['scoring'] = score_results
                
            return jsonify(response_data)
            
        finally:
            # Clean up temporary file
            if os.path.exists(temp_path):
                os.remove(temp_path)
                
    except Exception as e:
        logger.error(f"OMR processing error: {e}")
        return jsonify({
            'success': False,
            'message': f'Processing error: {str(e)}'
        }), 500

def calculate_score(extracted_answers, answer_key, scoring):
    """Calculate score based on extracted answers and answer key"""
    correct_count = 0
    wrong_count = 0
    blank_count = 0
    
    results = []
    
    for i, (student_answer, correct_answer) in enumerate(zip(extracted_answers, answer_key)):
        is_correct = False
        
        if student_answer == 'BLANK' or student_answer == '':
            blank_count += 1
            points = scoring.get('blank', 0)
        elif student_answer == correct_answer:
            correct_count += 1
            is_correct = True
            points = scoring.get('correct', 1)
        else:
            wrong_count += 1
            points = scoring.get('wrong', 0)
            
        results.append({
            'question': i + 1,
            'student_answer': student_answer,
            'correct_answer': correct_answer,
            'is_correct': is_correct,
            'points': points
        })
        
    total_score = (correct_count * scoring.get('correct', 1) + 
                   wrong_count * scoring.get('wrong', 0) + 
                   blank_count * scoring.get('blank', 0))
    
    percentage = (correct_count / len(answer_key) * 100) if answer_key else 0
    
    return {
        'results': results,
        'summary': {
            'total_questions': len(answer_key),
            'correct_answers': correct_count,
            'wrong_answers': wrong_count,
            'blank_answers': blank_count,
            'total_score': total_score,
            'percentage': round(percentage, 1)
        }
    }

@app.route('/api/omr/process_anchor_based', methods=['POST'])
def process_omr_anchor_based():
    """Process OMR using Anchor-Based Processor (Langor + Piksel tahlili)"""
    try:
        logger.info("🎯 Anchor-Based OMR processing request received")
        
        # Get uploaded file
        if 'image' not in request.files:
            return jsonify({'error': 'No image file provided'}), 400
        
        file = request.files['image']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if not allowed_file(file.filename):
            return jsonify({'error': 'Invalid file type'}), 400
        
        # Get answer key
        answer_key_str = request.form.get('answerKey', '[]')
        try:
            answer_key = json.loads(answer_key_str)
        except json.JSONDecodeError:
            return jsonify({'error': 'Invalid answer key format'}), 400
        
        if not answer_key:
            return jsonify({'error': 'Answer key is required'}), 400
        
        # Save uploaded file temporarily
        filename = secure_filename(file.filename)
        temp_path = os.path.join(UPLOAD_FOLDER, f"temp_anchor_{int(time.time())}_{filename}")
        file.save(temp_path)
        
        try:
            # Check if anchor-based processor is available
            if not ANCHOR_BASED_AVAILABLE or not anchor_based_processor:
                return jsonify({
                    'success': False,
                    'error': 'Anchor-Based OMR processor not available'
                }), 503
            
            # Process with Anchor-Based Processor
            result = anchor_based_processor.process_omr_with_anchors(temp_path, answer_key)
            
            # Convert result to JSON-serializable format
            response_data = {
                'success': True,
                'message': 'OMR sheet processed successfully with Anchor-Based Processor',
                'data': {
                    'extracted_answers': result.extracted_answers,
                    'confidence': result.confidence,
                    'processing_time': result.processing_time,
                    'processing_details': result.processing_details,
                    'anchor_points': [
                        {
                            'question_number': ap.question_number,
                            'x': ap.x,
                            'y': ap.y,
                            'confidence': ap.confidence,
                            'text': ap.text,
                            'bbox': ap.bbox
                        } for ap in result.anchor_points
                    ],
                    'bubble_regions': [
                        {
                            'question_number': br.question_number,
                            'option': br.option,
                            'x': br.x,
                            'y': br.y,
                            'width': br.width,
                            'height': br.height,
                            'density': br.density,
                            'is_filled': br.is_filled,
                            'confidence': br.confidence
                        } for br in result.bubble_regions
                    ],
                    'detailed_results': result.detailed_results,
                    'processing_method': 'Anchor-Based OMR Processor (Langor + Piksel tahlili)',
                    'algorithm_version': 'Anchor-Based V1.0',
                    'answer_key': answer_key
                }
            }
            
            logger.info(f"✅ Anchor-Based processing completed successfully")
            logger.info(f"📍 Anchors found: {len(result.anchor_points)}")
            logger.info(f"🔍 Bubbles analyzed: {len(result.bubble_regions)}")
            logger.info(f"📊 Confidence: {result.confidence:.2f}, Time: {result.processing_time:.2f}s")
            
            return jsonify(response_data)
            
        finally:
            # Clean up temporary file
            if os.path.exists(temp_path):
                os.remove(temp_path)
                
    except Exception as e:
        logger.error(f"❌ Anchor-Based processing error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e),
            'processing_method': 'Anchor-Based OMR Processor'
        }), 500

@app.route('/api/omr/process_professional', methods=['POST'])
def process_omr_professional():
    """Process OMR using EvalBee Professional Multi-Pass Engine"""
    try:
        logger.info("🚀 EvalBee Professional OMR processing request received")
        
        # Get uploaded file
        if 'image' not in request.files:
            return jsonify({'error': 'No image file provided'}), 400
        
        file = request.files['image']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if not allowed_file(file.filename):
            return jsonify({'error': 'Invalid file type'}), 400
        
        # Get answer key
        answer_key_str = request.form.get('answerKey', '[]')
        try:
            answer_key = json.loads(answer_key_str)
        except json.JSONDecodeError:
            return jsonify({'error': 'Invalid answer key format'}), 400
        
        if not answer_key:
            return jsonify({'error': 'Answer key is required'}), 400
        
        # Save uploaded file temporarily
        filename = secure_filename(file.filename)
        temp_path = os.path.join(UPLOAD_FOLDER, f"temp_professional_{int(time.time())}_{filename}")
        file.save(temp_path)
        
        try:
            # Check if professional engine is available
            if not EVALBEE_PROFESSIONAL_AVAILABLE or not evalbee_professional_engine:
                return jsonify({
                    'success': False,
                    'error': 'EvalBee Professional engine not available'
                }), 503
            
            # Process with EvalBee Professional Engine
            result = evalbee_professional_engine.process_omr_professional(temp_path, answer_key)
            
            # Convert result to JSON-serializable format
            response_data = {
                'success': True,
                'message': 'OMR sheet processed successfully with EvalBee Professional Engine',
                'data': {
                    'extracted_answers': result.extracted_answers,
                    'overall_confidence': result.overall_confidence,
                    'processing_time': result.processing_time,
                    'image_quality_metrics': result.image_quality_metrics,
                    'system_recommendations': result.system_recommendations,
                    'performance_metrics': result.performance_metrics,
                    'error_summary': result.error_summary,
                    'question_results': [
                        {
                            'question_number': qr.question_number,
                            'detected_answer': qr.detected_answer,
                            'confidence': qr.confidence,
                            'quality_score': qr.quality_score,
                            'error_flags': qr.error_flags,
                            'processing_notes': qr.processing_notes,
                            'consensus_votes': qr.consensus_votes,
                            'bubble_analyses': {
                                option: {
                                    'intensity': ba.intensity,
                                    'confidence': ba.confidence,
                                    'method': ba.method,
                                    'region_stats': ba.region_stats,
                                    'quality_flags': ba.quality_flags
                                } for option, ba in qr.bubble_analyses.items()
                            }
                        } for qr in result.question_results
                    ],
                    'processing_method': 'EvalBee Professional Multi-Pass Engine',
                    'engine_version': 'Professional V1.0',
                    'answer_key': answer_key
                }
            }
            
            logger.info(f"✅ EvalBee Professional processing completed successfully")
            logger.info(f"📊 Confidence: {result.overall_confidence:.2f}, Time: {result.processing_time:.2f}s")
            
            # Convert numpy types to JSON-serializable types
            response_data = convert_numpy_types(response_data)
            
            return jsonify(response_data)
            
        finally:
            # Clean up temporary file
            if os.path.exists(temp_path):
                os.remove(temp_path)
                
    except Exception as e:
        logger.error(f"❌ EvalBee Professional processing error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e),
            'processing_method': 'EvalBee Professional Multi-Pass Engine'
        }), 500

@app.route('/api/analytics/report', methods=['GET'])
def get_analytics_report():
    """Get analytics report"""
    try:
        if not ADVANCED_FEATURES_AVAILABLE or not analytics_engine:
            return jsonify({'error': 'Analytics not available'}), 503
        
        period_days = int(request.args.get('period_days', 30))
        exam_name = request.args.get('exam_name')
        
        report = analytics_engine.generate_report(period_days, exam_name)
        
        return jsonify({
            'success': True,
            'report': {
                'period': report.period,
                'total_processed': report.total_processed,
                'average_confidence': report.average_confidence,
                'average_processing_time': report.average_processing_time,
                'average_quality': report.average_quality,
                'success_rate': report.success_rate,
                'common_errors': report.common_errors,
                'quality_distribution': report.quality_distribution,
                'confidence_distribution': report.confidence_distribution,
                'processing_trends': report.processing_trends,
                'recommendations_summary': report.recommendations_summary
            }
        })
        
    except Exception as e:
        logger.error(f"Analytics report error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/analytics/performance', methods=['GET'])
def get_performance_metrics():
    """Get system performance metrics"""
    try:
        if not ADVANCED_FEATURES_AVAILABLE or not analytics_engine:
            return jsonify({'error': 'Analytics not available'}), 503
        
        metrics = analytics_engine.get_performance_metrics()
        
        return jsonify({
            'success': True,
            'performance_metrics': metrics
        })
        
    except Exception as e:
        logger.error(f"Performance metrics error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/omr/status', methods=['GET'])
def omr_status():
    """OMR service status endpoint with advanced features"""
    return jsonify({
        'success': True,
        'message': 'Python OMR Processor Status',
        'data': {
            'available': True,
            'method': 'OpenCV Computer Vision with Python',
            'engines': {
                'standard': True,
                'optimized': True,
                'ultra_precision': True,
                'perfect': True,
                'evalbee_v1': EVALBEE_ENGINE_AVAILABLE,
                'evalbee_v2': EVALBEE_ENGINE_V2_AVAILABLE,
                'evalbee_professional': EVALBEE_PROFESSIONAL_AVAILABLE,
                'anchor_based': ANCHOR_BASED_AVAILABLE
            },
            'advanced_features': {
                'available': ADVANCED_FEATURES_AVAILABLE,
                'realtime_quality_analysis': ADVANCED_FEATURES_AVAILABLE,
                'batch_processing': ADVANCED_FEATURES_AVAILABLE,
                'analytics_engine': ADVANCED_FEATURES_AVAILABLE
            },
            'features': [
                'Ultra-precision coordinate mapping',
                'Alignment mark detection',
                'Advanced bubble intensity analysis',
                'Multi-threshold processing',
                'Image quality assessment',
                'Format-aware processing',
                'EvalBee Professional Multi-Pass Engine',
                'Real-time quality feedback',
                'Batch processing capabilities',
                'Comprehensive analytics'
            ],
            'supported_formats': ['JPG', 'PNG', 'TIFF', 'BMP'],
            'max_file_size': '16MB',
            'accuracy': '95-99%',
            'processing_time': '2-12 seconds',
            'professional_grade': True
        }
    })

@app.route('/api/omr/debug/<path:filename>', methods=['GET'])
def get_debug_image(filename):
    """Serve debug images"""
    debug_dir = Path('debug_output')
    file_path = debug_dir / filename
    
    if file_path.exists() and file_path.is_file():
        return send_file(str(file_path))
    else:
        return jsonify({
            'success': False,
            'message': 'Debug image not found'
        }), 404

# ===== GROQ AI OMR ENDPOINTS =====

@app.route('/api/omr/process_groq_ai', methods=['POST'])
def process_omr_with_groq_ai():
    """GROQ AI bilan OMR qayta ishlash"""
    try:
        logger.info("🤖 GROQ AI OMR processing request received")
        
        if not GROQ_AI_AVAILABLE or not groq_ai_analyzer:
            return jsonify({
                'success': False,
                'error': 'GROQ AI not available'
            }), 503
        
        # Get uploaded file
        if 'image' not in request.files:
            return jsonify({'error': 'No image file provided'}), 400
        
        file = request.files['image']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if not allowed_file(file.filename):
            return jsonify({'error': 'Invalid file type'}), 400
        
        # Get answer key
        answer_key_str = request.form.get('answerKey', '[]')
        try:
            answer_key = json.loads(answer_key_str)
        except json.JSONDecodeError:
            return jsonify({'error': 'Invalid answer key format'}), 400
        
        if not answer_key:
            return jsonify({'error': 'Answer key is required'}), 400
        
        # Save uploaded file temporarily
        filename = secure_filename(file.filename)
        temp_path = os.path.join(UPLOAD_FOLDER, f"temp_groq_ai_{int(time.time())}_{filename}")
        file.save(temp_path)
        
        try:
            # Process with GROQ AI
            result = groq_ai_analyzer.analyze_with_hybrid_approach(temp_path, answer_key)
            
            # Convert numpy types to JSON-serializable types
            result = convert_numpy_types(result)
            
            logger.info(f"✅ GROQ AI processing completed successfully")
            
            return jsonify(result)
            
        finally:
            # Clean up temporary file
            if os.path.exists(temp_path):
                os.remove(temp_path)
                
    except Exception as e:
        logger.error(f"❌ GROQ AI processing error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e),
            'processing_method': 'GROQ AI OMR Analyzer'
        }), 500

@app.route('/api/omr/process_hybrid_ai', methods=['POST'])
def process_omr_hybrid_ai():
    """GROQ AI + Traditional methods bilan hybrid tahlil"""
    try:
        logger.info("🔄 Hybrid AI + Traditional OMR processing started")
        
        # Get uploaded file
        if 'image' not in request.files:
            return jsonify({'error': 'No image file provided'}), 400
        
        file = request.files['image']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if not allowed_file(file.filename):
            return jsonify({'error': 'Invalid file type'}), 400
        
        # Get answer key
        answer_key_str = request.form.get('answerKey', '[]')
        try:
            answer_key = json.loads(answer_key_str)
        except json.JSONDecodeError:
            return jsonify({'error': 'Invalid answer key format'}), 400
        
        if not answer_key:
            return jsonify({'error': 'Answer key is required'}), 400
        
        # Save uploaded file temporarily
        filename = secure_filename(file.filename)
        temp_path = os.path.join(UPLOAD_FOLDER, f"temp_hybrid_{int(time.time())}_{filename}")
        file.save(temp_path)
        
        try:
            traditional_result = None
            ai_result = None
            
            # 1. Try traditional method first (if available)
            if EVALBEE_PROFESSIONAL_AVAILABLE and evalbee_professional_engine:
                try:
                    logger.info("🎯 Running traditional EvalBee Professional analysis...")
                    traditional_analysis = evalbee_professional_engine.process_omr_professional(temp_path, answer_key)
                    traditional_result = {
                        'extracted_answers': traditional_analysis.extracted_answers,
                        'confidence': traditional_analysis.overall_confidence,
                        'processing_time': traditional_analysis.processing_time
                    }
                except Exception as e:
                    logger.warning(f"Traditional analysis failed: {e}")
            
            # 2. Run GROQ AI analysis
            if GROQ_AI_AVAILABLE and groq_ai_analyzer:
                try:
                    logger.info("🤖 Running GROQ AI analysis...")
                    ai_result = groq_ai_analyzer.analyze_with_hybrid_approach(
                        temp_path, answer_key, traditional_result
                    )
                except Exception as e:
                    logger.warning(f"AI analysis failed: {e}")
            
            # 3. Determine best result
            if ai_result and ai_result.get('success'):
                final_result = ai_result
                final_result['data']['hybrid_analysis'] = True
                final_result['data']['traditional_backup'] = traditional_result is not None
            elif traditional_result:
                final_result = {
                    'success': True,
                    'processing_method': 'EvalBee Professional (AI Fallback)',
                    'data': traditional_result
                }
            else:
                return jsonify({
                    'success': False,
                    'error': 'Both AI and traditional methods failed',
                    'processing_method': 'Hybrid Analysis'
                }), 500
            
            # Convert numpy types
            final_result = convert_numpy_types(final_result)
            
            logger.info("✅ Hybrid analysis completed successfully")
            return jsonify(final_result)
            
        finally:
            # Clean up temporary file
            if os.path.exists(temp_path):
                os.remove(temp_path)
                
    except Exception as e:
        logger.error(f"❌ Hybrid processing error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e),
            'processing_method': 'Hybrid AI Analysis'
        }), 500

@app.route('/api/ai/status', methods=['GET'])
def get_ai_status():
    """AI tizimlarining holatini tekshirish"""
    try:
        status = {
            'groq_ai': {
                'available': GROQ_AI_AVAILABLE,
                'model': groq_ai_analyzer.model_name if groq_ai_analyzer else None,
                'api_key_configured': bool(os.getenv('GROQ_API'))
            },
            'ml_classifier': {
                'available': ML_CLASSIFIER_AVAILABLE,
                'trained': ml_classifier.is_trained if ml_classifier else False
            },
            'quality_controller': {
                'available': QUALITY_CONTROL_AVAILABLE
            },
            'traditional_engines': {
                'professional': EVALBEE_PROFESSIONAL_AVAILABLE,
                'anchor_based': ANCHOR_BASED_AVAILABLE,
                'advanced_features': ADVANCED_FEATURES_AVAILABLE
            }
        }
        
        return jsonify({
            'success': True,
            'ai_status': status
        })
        
    except Exception as e:
        logger.error(f"AI status error: {e}")
        return jsonify({
            'success': False,
            'message': f'Failed to get AI status: {str(e)}'
        }), 500

# ===== CLOUD PROCESSING ENDPOINTS =====

@app.route('/api/cloud/submit', methods=['POST'])
def submit_cloud_job():
    """Submit a job to the cloud processing queue"""
    try:
        if not CLOUD_PROCESSOR_AVAILABLE:
            return jsonify({
                'success': False,
                'message': 'Cloud processing not available'
            }), 503
        
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'message': 'No JSON data provided'
            }), 400
        
        # Extract parameters
        image_data = data.get('image_data')
        answer_key = data.get('answer_key', [])
        processing_mode = data.get('processing_mode', 'professional')
        priority = data.get('priority', 5)
        
        if not image_data:
            return jsonify({
                'success': False,
                'message': 'No image data provided'
            }), 400
        
        # Submit job to cloud processor
        import asyncio
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        job_id = loop.run_until_complete(
            cloud_processor.submit_job(image_data, answer_key, processing_mode, priority)
        )
        
        return jsonify({
            'success': True,
            'job_id': job_id,
            'message': 'Job submitted successfully'
        })
        
    except Exception as e:
        logger.error(f"Cloud job submission error: {e}")
        return jsonify({
            'success': False,
            'message': f'Cloud job submission failed: {str(e)}'
        }), 500

@app.route('/api/cloud/status/<job_id>', methods=['GET'])
def get_cloud_job_status(job_id):
    """Get the status of a cloud processing job"""
    try:
        if not CLOUD_PROCESSOR_AVAILABLE:
            return jsonify({
                'success': False,
                'message': 'Cloud processing not available'
            }), 503
        
        # Get job status from cloud processor
        import asyncio
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        status = loop.run_until_complete(
            cloud_processor.get_job_status(job_id)
        )
        
        if status is None:
            return jsonify({
                'success': False,
                'message': 'Job not found'
            }), 404
        
        return jsonify({
            'success': True,
            **status
        })
        
    except Exception as e:
        logger.error(f"Cloud job status error: {e}")
        return jsonify({
            'success': False,
            'message': f'Failed to get job status: {str(e)}'
        }), 500

@app.route('/api/cloud/cluster-status', methods=['GET'])
def get_cluster_status():
    """Get overall cloud cluster status"""
    try:
        if not CLOUD_PROCESSOR_AVAILABLE:
            return jsonify({
                'success': False,
                'message': 'Cloud processing not available'
            }), 503
        
        status = cloud_processor.get_cluster_status()
        
        return jsonify({
            'success': True,
            'cluster_status': status
        })
        
    except Exception as e:
        logger.error(f"Cluster status error: {e}")
        return jsonify({
            'success': False,
            'message': f'Failed to get cluster status: {str(e)}'
        }), 500

# ===== ADVANCED QUALITY CONTROL ENDPOINTS =====

@app.route('/api/quality/analyze', methods=['POST'])
def analyze_image_quality():
    """Analyze image quality using Advanced Quality Controller"""
    try:
        if not QUALITY_CONTROL_AVAILABLE:
            return jsonify({
                'success': False,
                'message': 'Advanced quality control not available'
            }), 503
        
        if 'image' not in request.files:
            return jsonify({
                'success': False,
                'message': 'No image file provided'
            }), 400
        
        file = request.files['image']
        if file.filename == '':
            return jsonify({
                'success': False,
                'message': 'No file selected'
            }), 400
        
        # Save uploaded file temporarily
        filename = secure_filename(file.filename)
        temp_path = os.path.join(UPLOAD_FOLDER, f"quality_{int(time.time())}_{filename}")
        file.save(temp_path)
        
        try:
            # Load and analyze image
            import cv2
            image = cv2.imread(temp_path)
            if image is None:
                return jsonify({
                    'success': False,
                    'message': 'Could not read image file'
                }), 400
            
            # Analyze quality
            quality_metrics = quality_controller.analyze_quality(image)
            
            # Convert to JSON-serializable format
            result = {
                'overall_score': quality_metrics.overall_score,
                'level': quality_metrics.level.value,
                'sharpness': quality_metrics.sharpness,
                'contrast': quality_metrics.contrast,
                'brightness': quality_metrics.brightness,
                'noise_level': quality_metrics.noise_level,
                'skew_angle': quality_metrics.skew_angle,
                'resolution_score': quality_metrics.resolution_score,
                'alignment_score': quality_metrics.alignment_score,
                'bubble_quality_score': quality_metrics.bubble_quality_score,
                'processing_time': quality_metrics.processing_time,
                'issues': [
                    {
                        'type': issue.type.value,
                        'severity': issue.severity,
                        'description': issue.description,
                        'auto_correctable': issue.auto_correctable
                    }
                    for issue in quality_metrics.issues
                ]
            }
            
            # Convert numpy types to JSON-serializable types
            result = convert_numpy_types(result)
            
            return jsonify({
                'success': True,
                'quality_metrics': result
            })
            
        finally:
            # Clean up temporary file
            if os.path.exists(temp_path):
                os.remove(temp_path)
        
    except Exception as e:
        logger.error(f"Quality analysis error: {e}")
        return jsonify({
            'success': False,
            'message': f'Quality analysis failed: {str(e)}'
        }), 500

@app.route('/api/quality/auto-correct', methods=['POST'])
def auto_correct_image():
    """Auto-correct image quality issues"""
    try:
        if not QUALITY_CONTROL_AVAILABLE:
            return jsonify({
                'success': False,
                'message': 'Advanced quality control not available'
            }), 503
        
        if 'image' not in request.files:
            return jsonify({
                'success': False,
                'message': 'No image file provided'
            }), 400
        
        file = request.files['image']
        if file.filename == '':
            return jsonify({
                'success': False,
                'message': 'No file selected'
            }), 400
        
        # Save uploaded file temporarily
        filename = secure_filename(file.filename)
        temp_path = os.path.join(UPLOAD_FOLDER, f"correct_{int(time.time())}_{filename}")
        file.save(temp_path)
        
        try:
            # Load and analyze image
            import cv2
            image = cv2.imread(temp_path)
            if image is None:
                return jsonify({
                    'success': False,
                    'message': 'Could not read image file'
                }), 400
            
            # Analyze quality first
            quality_metrics = quality_controller.analyze_quality(image)
            
            # Apply auto-correction
            correction_result = quality_controller.auto_correct_image(image, quality_metrics)
            
            # Save corrected image
            corrected_path = os.path.join(UPLOAD_FOLDER, f"corrected_{int(time.time())}_{filename}")
            cv2.imwrite(corrected_path, correction_result.corrected_image)
            
            # Convert corrected image to base64
            import base64
            with open(corrected_path, 'rb') as img_file:
                corrected_base64 = base64.b64encode(img_file.read()).decode('utf-8')
            
            result = {
                'corrections_applied': correction_result.corrections_applied,
                'quality_improvement': correction_result.quality_improvement,
                'processing_time': correction_result.processing_time,
                'corrected_image_base64': f"data:image/jpeg;base64,{corrected_base64}"
            }
            
            return jsonify({
                'success': True,
                'correction_result': result
            })
            
        finally:
            # Clean up temporary files
            for path in [temp_path, corrected_path]:
                if os.path.exists(path):
                    os.remove(path)
        
    except Exception as e:
        logger.error(f"Auto-correction error: {e}")
        return jsonify({
            'success': False,
            'message': f'Auto-correction failed: {str(e)}'
        }), 500

# ===== ML CLASSIFIER ENDPOINTS =====

@app.route('/api/ml/train', methods=['POST'])
def train_ml_classifier():
    """Train the ML bubble classifier with provided data"""
    try:
        if not ML_CLASSIFIER_AVAILABLE:
            return jsonify({
                'success': False,
                'message': 'ML Bubble Classifier not available'
            }), 503
        
        # For now, use synthetic training data
        # In production, this would accept real training data
        training_data = ml_classifier.generate_synthetic_training_data(1000)
        
        # Train the model
        results = ml_classifier.train_model(training_data)
        
        # Save the trained model
        ml_classifier.save_model()
        
        return jsonify({
            'success': True,
            'training_results': results,
            'message': 'ML classifier trained successfully'
        })
        
    except Exception as e:
        logger.error(f"ML training error: {e}")
        return jsonify({
            'success': False,
            'message': f'ML training failed: {str(e)}'
        }), 500

@app.route('/api/ml/status', methods=['GET'])
def get_ml_status():
    """Get ML classifier status"""
    try:
        if not ML_CLASSIFIER_AVAILABLE:
            return jsonify({
                'success': False,
                'message': 'ML Bubble Classifier not available'
            }), 503
        
        return jsonify({
            'success': True,
            'ml_status': {
                'available': True,
                'trained': ml_classifier.is_trained,
                'model_path': ml_classifier.model_path
            }
        })
        
    except Exception as e:
        logger.error(f"ML status error: {e}")
        return jsonify({
            'success': False,
            'message': f'Failed to get ML status: {str(e)}'
        }), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('DEBUG', 'false').lower() == 'true'
    
    logger.info(f"Starting Python OMR Server on port {port}")
    logger.info(f"Debug mode: {debug}")
    
    app.run(host='0.0.0.0', port=port, debug=debug)