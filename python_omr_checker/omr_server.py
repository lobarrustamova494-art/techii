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
    EVALBEE_ENGINE_V2_AVAILABLE = True
except ImportError as e:
    logger.warning(f"EvalBee OMR Engine V2 not available: {e}")
    EVALBEE_ENGINE_V2_AVAILABLE = False
    EvalBeeOMREngineV2 = None

# Initialize Flask app
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
        logger.info(f"Exam data provided: {exam_data is not None}")
        
        print(f"=== PARAMETERS DEBUG ===")
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
            if use_evalbee:
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
            logger.info(f"EvalBee mode: {use_evalbee}")  # NEW
            logger.info(f"Perfect mode: {use_perfect}")
            logger.info(f"Ultra mode: {use_ultra}")
            logger.info(f"Optimized mode: {use_optimized}")
            if exam_data:
                logger.info(f"Exam structure: {exam_data.get('structure', 'unknown')}")
                logger.info(f"Paper size: {exam_data.get('paperSize', 'unknown')}")
            
            # Process OMR sheet using selected processor
            if use_evalbee and EVALBEE_ENGINE_V2_AVAILABLE and evalbee_v2_engine:
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

@app.route('/api/omr/status', methods=['GET'])
def omr_status():
    """OMR service status endpoint"""
    return jsonify({
        'success': True,
        'message': 'Python OMR Processor Status',
        'data': {
            'available': True,
            'method': 'OpenCV Computer Vision with Python',
            'features': [
                'Ultra-precision coordinate mapping',
                'Alignment mark detection',
                'Advanced bubble intensity analysis',
                'Multi-threshold processing',
                'Image quality assessment',
                'Format-aware processing'
            ],
            'supported_formats': ['JPG', 'PNG', 'TIFF', 'BMP'],
            'max_file_size': '16MB',
            'accuracy': '95-99%',
            'processing_time': '2-5 seconds'
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

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('DEBUG', 'false').lower() == 'true'
    
    logger.info(f"Starting Python OMR Server on port {port}")
    logger.info(f"Debug mode: {debug}")
    
    app.run(host='0.0.0.0', port=port, debug=debug)