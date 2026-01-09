#!/usr/bin/env python3
"""
Test Universal Coordinate Integration with Ultra-Precision OMR V2
"""

import cv2
import json
from ultra_precision_omr_processor_v2 import UltraPrecisionOMRProcessorV2

def test_universal_integration():
    """Test universal coordinate detection integration"""
    print("🧪 Testing Universal Coordinate Integration...")
    
    # Initialize processor
    processor = UltraPrecisionOMRProcessorV2()
    processor.set_debug_mode(True)
    
    # Test image paths
    test_image_paths = [
        '../../test-image.jpg',
        '../test-image.jpg', 
        'test_image_real.jpg',
        'test_image_40_questions.jpg'
    ]
    
    image_path = None
    for path in test_image_paths:
        try:
            image = cv2.imread(path)
            if image is not None:
                image_path = path
                print(f"✅ Test image found: {path}")
                break
        except:
            continue
    
    if not image_path:
        print("❌ No test image found!")
        return
    
    # Test universal coordinate detection directly
    print("\n=== TESTING UNIVERSAL COORDINATE DETECTION ===")
    universal_result = processor.detect_universal_coordinates(image_path)
    
    if universal_result and universal_result.get('success'):
        coordinate_mapping = universal_result.get('coordinate_mapping', {})
        questions = coordinate_mapping.get('questions', {})
        
        print(f"✅ Universal detection successful!")
        print(f"   Layout type: {coordinate_mapping.get('layout_type', 'unknown')}")
        print(f"   Total questions: {coordinate_mapping.get('total_questions', 0)}")
        print(f"   Questions detected: {len(questions)}")
        
        # Test coordinate conversion
        print("\n=== TESTING COORDINATE CONVERSION ===")
        real_coordinates = processor.convert_universal_to_real_coordinates(universal_result)
        print(f"✅ Converted coordinates: {len(real_coordinates)} questions")
        
        # Show first 5 questions
        print("\nFirst 5 questions coordinates:")
        for q_num in sorted(real_coordinates.keys())[:5]:
            coords = real_coordinates[q_num]
            print(f"  Q{q_num}: {coords}")
        
    else:
        print("❌ Universal detection failed!")
        if universal_result:
            print(f"   Error: {universal_result.get('error', 'Unknown')}")
    
    # Test full OMR processing with universal coordinates
    print("\n=== TESTING FULL OMR PROCESSING ===")
    answer_key = ['A'] * 40  # Test answer key
    
    try:
        result = processor.process_omr_sheet_ultra_v2(
            image_path, 
            answer_key, 
            use_universal=True
        )
        
        print(f"✅ OMR processing completed!")
        print(f"   Confidence: {result.confidence:.2f}")
        print(f"   Extracted answers: {len(result.extracted_answers)}")
        print(f"   Processing method: {result.processing_details.get('processing_method', 'Unknown')}")
        print(f"   Coordinate source: {result.processing_details.get('coordinate_source', 'Unknown')}")
        print(f"   Universal enabled: {result.processing_details.get('universal_coordinate_detection', False)}")
        
        # Count non-blank answers
        non_blank = [a for a in result.extracted_answers if a != 'BLANK']
        print(f"   Non-blank answers: {len(non_blank)}/40")
        
        # Show first 10 answers
        print(f"\nFirst 10 answers: {result.extracted_answers[:10]}")
        
    except Exception as e:
        print(f"❌ OMR processing failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_universal_integration()