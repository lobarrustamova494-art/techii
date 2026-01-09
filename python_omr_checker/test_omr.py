#!/usr/bin/env python3
"""
OMR Processor Test Script
Test the OMR processing functionality with sample data
"""

import json
import sys
from pathlib import Path
from omr_processor import OMRProcessor
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_sample_exam_data():
    """Create sample exam data for testing"""
    return {
        "name": "Test Imtihoni",
        "structure": "continuous",
        "paperSize": "a4",
        "subjects": [
            {
                "name": "Matematika",
                "sections": [
                    {
                        "name": "Algebra",
                        "questionCount": 10,
                        "questionType": "multiple_choice_5"
                    },
                    {
                        "name": "Geometriya", 
                        "questionCount": 10,
                        "questionType": "multiple_choice_5"
                    }
                ]
            },
            {
                "name": "Fizika",
                "sections": [
                    {
                        "name": "Mexanika",
                        "questionCount": 10,
                        "questionType": "multiple_choice_5"
                    }
                ]
            }
        ]
    }

def test_coordinate_generation():
    """Test coordinate generation functionality"""
    logger.info("=== TESTING COORDINATE GENERATION ===")
    
    processor = OMRProcessor()
    exam_data = create_sample_exam_data()
    
    # Generate coordinates
    coordinates = processor.generate_coordinate_map(exam_data)
    
    logger.info(f"Generated {len(coordinates)} bubble coordinates")
    
    # Group by question
    question_groups = {}
    for coord in coordinates:
        if coord.question_number not in question_groups:
            question_groups[coord.question_number] = []
        question_groups[coord.question_number].append(coord)
    
    logger.info(f"Questions with coordinates: {len(question_groups)}")
    
    # Show first few questions
    for q_num in sorted(list(question_groups.keys())[:3]):
        bubbles = question_groups[q_num]
        logger.info(f"Question {q_num}: {len(bubbles)} bubbles")
        for bubble in bubbles:
            logger.info(f"  {bubble.option}: ({bubble.x}, {bubble.y})")
    
    return coordinates

def test_image_processing():
    """Test image processing with a sample image"""
    logger.info("=== TESTING IMAGE PROCESSING ===")
    
    # Check if sample image exists
    sample_image = Path("sample_omr.jpg")
    if not sample_image.exists():
        logger.warning("Sample image not found. Creating placeholder...")
        logger.info("Please place a sample OMR image as 'sample_omr.jpg' for full testing")
        return None
    
    processor = OMRProcessor()
    processor.set_debug_mode(True)
    
    # Test preprocessing
    try:
        processed_image, metadata = processor.preprocess_image(str(sample_image))
        logger.info(f"Image processed successfully: {metadata}")
        
        # Test alignment mark detection
        alignment_marks = processor.detect_alignment_marks(processed_image)
        logger.info(f"Detected {len(alignment_marks)} alignment marks")
        
        return processed_image, alignment_marks
        
    except Exception as e:
        logger.error(f"Image processing failed: {e}")
        return None

def test_full_processing():
    """Test full OMR processing pipeline"""
    logger.info("=== TESTING FULL OMR PROCESSING ===")
    
    sample_image = Path("sample_omr.jpg")
    if not sample_image.exists():
        logger.warning("Sample image not found. Skipping full processing test.")
        return
    
    processor = OMRProcessor()
    processor.set_debug_mode(True)
    
    # Sample answer key
    answer_key = ['A', 'B', 'C', 'D', 'A', 'B', 'C', 'D', 'A', 'B',
                  'C', 'D', 'A', 'B', 'C', 'D', 'A', 'B', 'C', 'D',
                  'A', 'B', 'C', 'D', 'A', 'B', 'C', 'D', 'A', 'B']
    
    exam_data = create_sample_exam_data()
    
    try:
        result = processor.process_omr_sheet(str(sample_image), answer_key, exam_data)
        
        logger.info("=== PROCESSING RESULTS ===")
        logger.info(f"Confidence: {result.confidence:.2f}")
        logger.info(f"Extracted answers: {result.extracted_answers}")
        logger.info(f"Processing time: {result.processing_details.get('processing_time', 0):.2f}s")
        
        # Save results
        output_file = Path("test_results.json")
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump({
                'extracted_answers': result.extracted_answers,
                'confidence': result.confidence,
                'processing_details': result.processing_details,
                'detailed_results': result.detailed_results
            }, f, indent=2, ensure_ascii=False)
        
        logger.info(f"Results saved to: {output_file}")
        
    except Exception as e:
        logger.error(f"Full processing test failed: {e}")

def main():
    """Main test function"""
    logger.info("🧪 Starting OMR Processor Tests")
    
    # Test 1: Coordinate generation
    coordinates = test_coordinate_generation()
    
    # Test 2: Image processing (if sample image available)
    image_result = test_image_processing()
    
    # Test 3: Full processing pipeline (if sample image available)
    test_full_processing()
    
    logger.info("🎯 All tests completed!")
    
    # Instructions for user
    print("\n" + "="*60)
    print("📋 TESTING INSTRUCTIONS:")
    print("="*60)
    print("1. Place a sample OMR sheet image as 'sample_omr.jpg'")
    print("2. Run this script again for full testing")
    print("3. Check 'debug_output/' folder for debug images")
    print("4. Check 'test_results.json' for processing results")
    print("="*60)

if __name__ == '__main__':
    main()