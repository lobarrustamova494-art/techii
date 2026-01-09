#!/usr/bin/env python3
"""
Bubble Intensity Debug Script V2
Yangi intensity calculation metodini test qilish
"""

import cv2
import numpy as np
import json
from ultra_precision_omr_processor_v2 import UltraPrecisionOMRProcessorV2

def debug_bubble_intensities_v2():
    """Yangi bubble intensity calculation metodini debug qilish"""
    print("=== BUBBLE INTENSITY DEBUG V2 ===")
    
    # Processor yaratish
    processor = UltraPrecisionOMRProcessorV2()
    processor.set_debug_mode(True)
    
    # Test image path
    image_path = "../../test-image.jpg"
    
    try:
        # Rasmni preprocessing qilish
        preprocessed_image, metadata = processor.preprocess_image_v2(image_path)
        print(f"✅ Image preprocessed: {metadata['width']}x{metadata['height']}")
        
        # Har bir column uchun bir nechta savollarni test qilish
        test_questions = {
            'Column 1': [1, 5, 10, 14],      # Column 1 questions
            'Column 2': [15, 20, 25, 27],    # Column 2 questions  
            'Column 3': [28, 32, 36, 40]     # Column 3 questions
        }
        
        all_intensities = []
        
        for column_name, questions in test_questions.items():
            print(f"\n=== {column_name.upper()} ===")
            
            for question_num in questions:
                if question_num in processor.real_coordinates:
                    print(f"\n--- QUESTION {question_num} ---")
                    coords = processor.real_coordinates[question_num]
                    question_intensities = {}
                    
                    for option in ['A', 'B', 'C', 'D', 'E']:
                        if option in coords:
                            x, y = coords[option]
                            
                            # Yangi intensity calculation
                            intensity = processor.analyze_bubble_intensity_v2_enhanced(
                                preprocessed_image, x, y, question_num, option
                            )
                            
                            question_intensities[option] = intensity
                            all_intensities.append(intensity)
                            
                            # Pixel analysis
                            height, width = preprocessed_image.shape
                            if 0 <= x < width and 0 <= y < height:
                                center_pixel = preprocessed_image[y, x]
                                
                                # Region analysis
                                radius = 20
                                y_start = max(0, y - radius)
                                y_end = min(height, y + radius)
                                x_start = max(0, x - radius)
                                x_end = min(width, x + radius)
                                
                                region = preprocessed_image[y_start:y_end, x_start:x_end]
                                avg_intensity = np.mean(region)
                                min_intensity = np.min(region)
                                
                                # Status indicator
                                threshold = processor.get_threshold_for_question(question_num)
                                status = "🔵 MARKED" if intensity >= threshold else "⚪ BLANK"
                                
                                print(f"  {option}: {intensity:.3f} ({int(intensity*100)}%) {status}")
                                print(f"      Center pixel: {center_pixel}, Avg: {avg_intensity:.1f}, Min: {min_intensity}")
                            else:
                                print(f"  {option}: OUT OF BOUNDS ({x}, {y})")
                    
                    # Best answer selection test
                    best_answer, confidence = processor.select_best_answer_v2_enhanced(
                        question_intensities, question_num
                    )
                    print(f"  🎯 Best answer: {best_answer} (confidence: {confidence:.3f})")
                    
                else:
                    print(f"\n❌ Question {question_num}: No coordinates found")
        
        # Statistics
        print(f"\n=== INTENSITY STATISTICS ===")
        if all_intensities:
            all_intensities = np.array(all_intensities)
            print(f"Total bubbles analyzed: {len(all_intensities)}")
            print(f"Average intensity: {np.mean(all_intensities):.3f}")
            print(f"Min intensity: {np.min(all_intensities):.3f}")
            print(f"Max intensity: {np.max(all_intensities):.3f}")
            print(f"Std deviation: {np.std(all_intensities):.3f}")
            
            # Intensity distribution
            low_intensity = np.sum(all_intensities < 0.2)
            medium_intensity = np.sum((all_intensities >= 0.2) & (all_intensities < 0.5))
            high_intensity = np.sum(all_intensities >= 0.5)
            
            print(f"\nIntensity distribution:")
            print(f"  Low (< 20%): {low_intensity} bubbles")
            print(f"  Medium (20-50%): {medium_intensity} bubbles")
            print(f"  High (≥ 50%): {high_intensity} bubbles")
        
        # Threshold information
        print(f"\n=== CURRENT THRESHOLDS ===")
        for col in [1, 2, 3]:
            threshold = processor.column_thresholds.get(col, 0.25)
            print(f"Column {col}: {threshold} ({int(threshold*100)}%)")
        
        # Create debug visualization
        debug_image = cv2.cvtColor(preprocessed_image, cv2.COLOR_GRAY2BGR)
        
        # Mark first 15 questions with colors
        colors = {
            'A': (255, 0, 0),    # Blue
            'B': (0, 255, 0),    # Green  
            'C': (0, 0, 255),    # Red
            'D': (255, 255, 0),  # Cyan
            'E': (255, 0, 255)   # Magenta
        }
        
        for question_num in range(1, 16):  # First 15 questions
            if question_num in processor.real_coordinates:
                coords = processor.real_coordinates[question_num]
                for option in ['A', 'B', 'C', 'D', 'E']:
                    if option in coords:
                        x, y = coords[option]
                        color = colors[option]
                        
                        # Get intensity for circle size
                        intensity = processor.analyze_bubble_intensity_v2_enhanced(
                            preprocessed_image, x, y, question_num, option
                        )
                        
                        # Circle size based on intensity
                        radius = int(10 + intensity * 10)  # 10-20 pixel radius
                        thickness = 3 if intensity >= processor.get_threshold_for_question(question_num) else 1
                        
                        cv2.circle(debug_image, (x, y), radius, color, thickness)
                        cv2.putText(debug_image, f"Q{question_num}{option}", 
                                   (x-15, y-25), cv2.FONT_HERSHEY_SIMPLEX, 0.3, color, 1)
        
        # Save debug image
        cv2.imwrite("debug_bubble_intensities_v2.jpg", debug_image)
        print(f"\n✅ Debug image saved: debug_bubble_intensities_v2.jpg")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    debug_bubble_intensities_v2()