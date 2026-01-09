import cv2
import numpy as np
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle
import json
from collections import defaultdict
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class EnhancedUniversalOMRDetector:
    """
    Yanada yaxshilangan universal OMR koordinatalashtirish tizimi
    Har qanday OMR rasmini tahlil qilib, aniq koordinatalar yaratadi
    """
    
    def __init__(self):
        self.debug_mode = True
        
        # Bubble detection parameters
        self.min_bubble_area = 150
        self.max_bubble_area = 4000
        self.aspect_ratio_tolerance = 0.4  # 0.6 dan 1.4 gacha
        self.circularity_threshold = 0.2
        
        # Layout detection parameters
        self.row_tolerance = 50  # Y koordinatasi farqi
        self.column_tolerance = 60  # X koordinatasi farqi
        self.min_bubbles_per_row = 3
        self.min_rows_for_valid_layout = 5
        
        # Coordinate mapping
        self.coordinate_mapping = {}
        self.layout_info = {}
        
    def preprocess_image_advanced(self, image_path):
        """Ilg'or rasm preprocessing"""
        logger.info(f"🔧 Ilg'or preprocessing boshlandi: {image_path}")
        
        # Rasmni yuklash
        image = cv2.imread(image_path)
        if image is None:
            raise ValueError(f"Rasm yuklanmadi: {image_path}")
        
        # Grayskalega o'tkazish
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        height, width = gray.shape
        
        logger.info(f"📊 Rasm o'lchami: {width}x{height}")
        
        # Noise reduction
        denoised = cv2.medianBlur(gray, 3)
        
        # Contrast enhancement
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
        enhanced = clahe.apply(denoised)
        
        # Adaptive threshold
        binary = cv2.adaptiveThreshold(
            enhanced, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
            cv2.THRESH_BINARY_INV, 15, 3
        )
        
        # Morphological operations
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
        cleaned = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel)
        cleaned = cv2.morphologyEx(cleaned, cv2.MORPH_OPEN, kernel)
        
        return image, gray, cleaned
    
    def detect_bubbles_advanced(self, binary_image):
        """Ilg'or bubble detection"""
        logger.info("🎯 Ilg'or bubble detection boshlandi...")
        
        contours, _ = cv2.findContours(
            binary_image, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
        )
        
        bubbles = []
        for contour in contours:
            area = cv2.contourArea(contour)
            
            # Maydon filtri
            if self.min_bubble_area <= area <= self.max_bubble_area:
                x, y, w, h = cv2.boundingRect(contour)
                
                # Aspect ratio tekshirish
                aspect_ratio = w / h
                if (1 - self.aspect_ratio_tolerance) <= aspect_ratio <= (1 + self.aspect_ratio_tolerance):
                    
                    # Circularity tekshirish
                    perimeter = cv2.arcLength(contour, True)
                    if perimeter > 0:
                        circularity = 4 * np.pi * area / (perimeter * perimeter)
                        
                        if circularity > self.circularity_threshold:
                            # Solidity tekshirish (kontur to'liqligini)
                            hull = cv2.convexHull(contour)
                            hull_area = cv2.contourArea(hull)
                            solidity = area / hull_area if hull_area > 0 else 0
                            
                            if solidity > 0.7:  # Yetarlicha to'liq shakl
                                bubbles.append({
                                    'x': x,
                                    'y': y,
                                    'width': w,
                                    'height': h,
                                    'center_x': x + w // 2,
                                    'center_y': y + h // 2,
                                    'area': area,
                                    'aspect_ratio': aspect_ratio,
                                    'circularity': circularity,
                                    'solidity': solidity,
                                    'contour': contour
                                })
        
        logger.info(f"✅ Topilgan bubble kandidatlari: {len(bubbles)}")
        return bubbles
    
    def analyze_layout_structure(self, bubbles):
        """Layout tuzilishini tahlil qilish"""
        logger.info("📊 Layout tuzilishini tahlil qilish...")
        
        if not bubbles:
            return {}
        
        # Y koordinatasi bo'yicha saralash
        sorted_bubbles = sorted(bubbles, key=lambda b: b['center_y'])
        
        # Qatorlarni aniqlash (clustering approach)
        rows = []
        current_row = [sorted_bubbles[0]]
        
        for bubble in sorted_bubbles[1:]:
            # Oxirgi qatordagi o'rtacha Y koordinatasi
            avg_y = sum(b['center_y'] for b in current_row) / len(current_row)
            
            if abs(bubble['center_y'] - avg_y) <= self.row_tolerance:
                current_row.append(bubble)
            else:
                # Yangi qator
                if len(current_row) >= self.min_bubbles_per_row:
                    rows.append(sorted(current_row, key=lambda b: b['center_x']))
                current_row = [bubble]
        
        # Oxirgi qatorni qo'shish
        if len(current_row) >= self.min_bubbles_per_row:
            rows.append(sorted(current_row, key=lambda b: b['center_x']))
        
        if len(rows) < self.min_rows_for_valid_layout:
            logger.warning(f"⚠️ Yetarli qatorlar topilmadi: {len(rows)}")
            return {}
        
        # Ustunlar tuzilishini aniqlash
        column_analysis = self.analyze_column_structure(rows)
        
        # Layout turini aniqlash
        layout_type = self.determine_layout_type(rows, column_analysis)
        
        layout_info = {
            'rows': rows,
            'total_rows': len(rows),
            'column_analysis': column_analysis,
            'layout_type': layout_type,
            'bubbles_per_row': [len(row) for row in rows],
            'row_positions': [int(sum(b['center_y'] for b in row) / len(row)) for row in rows]
        }
        
        logger.info(f"✅ Layout tahlili tugadi:")
        logger.info(f"   Qatorlar: {len(rows)}")
        logger.info(f"   Layout turi: {layout_type}")
        logger.info(f"   Ustunlar: {column_analysis.get('total_columns', 0)}")
        
        return layout_info
    
    def analyze_column_structure(self, rows):
        """Ustunlar tuzilishini tahlil qilish"""
        if not rows:
            return {}
        
        # Har qatordagi bubblelar sonini hisoblash
        row_lengths = [len(row) for row in rows]
        
        # Eng ko'p uchraydigan uzunlikni topish
        length_counts = defaultdict(int)
        for length in row_lengths:
            length_counts[length] += 1
        
        # Standart qator uzunligini aniqlash
        standard_length = max(length_counts.keys(), key=lambda k: length_counts[k])
        standard_rows = [row for row in rows if len(row) == standard_length]
        
        if not standard_rows:
            return {'total_columns': 0}
        
        # Ustun pozitsiyalarini hisoblash
        column_positions = []
        column_widths = []
        
        for col_idx in range(standard_length):
            x_positions = [row[col_idx]['center_x'] for row in standard_rows]
            avg_x = sum(x_positions) / len(x_positions)
            std_x = np.std(x_positions)
            
            column_positions.append(int(avg_x))
            column_widths.append(std_x)
        
        # Ustunlar orasidagi masofani hisoblash
        column_spacing = []
        if len(column_positions) > 1:
            for i in range(1, len(column_positions)):
                spacing = column_positions[i] - column_positions[i-1]
                column_spacing.append(spacing)
        
        avg_spacing = sum(column_spacing) / len(column_spacing) if column_spacing else 0
        
        # Ustunlar guruhlarini aniqlash (katta bo'shliqlar bo'yicha)
        column_groups = self.detect_column_groups(column_positions, column_spacing)
        
        return {
            'total_columns': standard_length,
            'column_positions': column_positions,
            'column_widths': column_widths,
            'average_spacing': avg_spacing,
            'column_spacing': column_spacing,
            'standard_rows_count': len(standard_rows),
            'column_groups': column_groups
        }
    
    def detect_column_groups(self, column_positions, column_spacing):
        """Ustunlar guruhlarini aniqlash"""
        if len(column_spacing) < 2:
            return [{'start': 0, 'end': len(column_positions)-1, 'columns': len(column_positions)}]
        
        # O'rtacha spacing
        avg_spacing = sum(column_spacing) / len(column_spacing)
        
        # Katta bo'shliqlarni topish (o'rtachadan 2 marta katta)
        large_gaps = []
        for i, spacing in enumerate(column_spacing):
            if spacing > avg_spacing * 1.8:  # 1.8x dan katta bo'shliq
                large_gaps.append(i)
        
        # Guruhlarni yaratish
        groups = []
        start_idx = 0
        
        for gap_idx in large_gaps:
            if gap_idx > start_idx:
                groups.append({
                    'start': start_idx,
                    'end': gap_idx,
                    'columns': gap_idx - start_idx + 1,
                    'start_x': column_positions[start_idx],
                    'end_x': column_positions[gap_idx]
                })
            start_idx = gap_idx + 1
        
        # Oxirgi guruhni qo'shish
        if start_idx < len(column_positions):
            groups.append({
                'start': start_idx,
                'end': len(column_positions) - 1,
                'columns': len(column_positions) - start_idx,
                'start_x': column_positions[start_idx],
                'end_x': column_positions[-1]
            })
        
        return groups
    
    def determine_layout_type(self, rows, column_analysis):
        """Layout turini aniqlash"""
        total_columns = column_analysis.get('total_columns', 0)
        column_groups = column_analysis.get('column_groups', [])
        
        if len(column_groups) >= 3:
            return 'multi_section'  # 3+ bo'lim (masalan, 3 ustun guruh)
        elif len(column_groups) == 2:
            return 'two_section'    # 2 bo'lim
        elif total_columns >= 10:
            return 'wide_single'    # Keng bitta bo'lim
        elif total_columns >= 5:
            return 'standard_single' # Standart bitta bo'lim
        else:
            return 'narrow_single'   # Tor bitta bo'lim
    
    def create_coordinate_mapping(self, layout_info):
        """Koordinatalar mapping yaratish"""
        logger.info("🗺️ Koordinatalar mapping yaratish...")
        
        if not layout_info or 'rows' not in layout_info:
            return {}
        
        rows = layout_info['rows']
        column_analysis = layout_info['column_analysis']
        layout_type = layout_info['layout_type']
        
        coordinate_mapping = {
            'layout_type': layout_type,
            'total_questions': 0,
            'questions': {}
        }
        
        question_number = 1
        
        # Layout turiga qarab mapping yaratish
        if layout_type == 'multi_section':
            coordinate_mapping = self.create_multi_section_mapping(
                rows, column_analysis, question_number
            )
        elif layout_type == 'two_section':
            coordinate_mapping = self.create_two_section_mapping(
                rows, column_analysis, question_number
            )
        else:
            coordinate_mapping = self.create_single_section_mapping(
                rows, column_analysis, question_number
            )
        
        logger.info(f"✅ Mapping yaratildi:")
        logger.info(f"   Jami savollar: {coordinate_mapping['total_questions']}")
        logger.info(f"   Layout turi: {coordinate_mapping['layout_type']}")
        
        return coordinate_mapping
    
    def create_multi_section_mapping(self, rows, column_analysis, start_question=1):
        """Ko'p bo'limli layout uchun mapping"""
        column_groups = column_analysis.get('column_groups', [])
        questions = {}
        question_number = start_question
        
        # Har bir qator uchun
        for row_idx, row in enumerate(rows):
            # Har bir ustun guruhi uchun
            for group in column_groups:
                # Guruh ichidagi bubblelarni olish
                group_bubbles = row[group['start']:group['end']+1]
                
                if len(group_bubbles) >= 5:  # Kamida 5 ta variant (A, B, C, D, E)
                    question_data = {
                        'question_number': question_number,
                        'row_index': row_idx,
                        'group_index': column_groups.index(group),
                        'options': {}
                    }
                    
                    # Har bir variant uchun
                    options = ['A', 'B', 'C', 'D', 'E']
                    for i, bubble in enumerate(group_bubbles[:5]):
                        if i < len(options):
                            question_data['options'][options[i]] = {
                                'x': bubble['center_x'],
                                'y': bubble['center_y'],
                                'width': bubble['width'],
                                'height': bubble['height']
                            }
                    
                    questions[question_number] = question_data
                    question_number += 1
        
        return {
            'layout_type': 'multi_section',
            'total_questions': question_number - start_question,
            'questions': questions,
            'column_groups': column_groups
        }
    
    def create_two_section_mapping(self, rows, column_analysis, start_question=1):
        """Ikki bo'limli layout uchun mapping"""
        column_groups = column_analysis.get('column_groups', [])
        questions = {}
        question_number = start_question
        
        # Har bir qator uchun
        for row_idx, row in enumerate(rows):
            # Har bir ustun guruhi uchun (2 ta bo'lim)
            for group in column_groups:
                # Guruh ichidagi bubblelarni olish
                group_bubbles = row[group['start']:group['end']+1]
                
                if len(group_bubbles) >= 4:  # Kamida 4 ta variant
                    question_data = {
                        'question_number': question_number,
                        'row_index': row_idx,
                        'section_index': column_groups.index(group),
                        'options': {}
                    }
                    
                    # Variant sonini aniqlash
                    option_count = min(len(group_bubbles), 5)
                    options = ['A', 'B', 'C', 'D', 'E'][:option_count]
                    
                    for i, bubble in enumerate(group_bubbles[:option_count]):
                        question_data['options'][options[i]] = {
                            'x': bubble['center_x'],
                            'y': bubble['center_y'],
                            'width': bubble['width'],
                            'height': bubble['height']
                        }
                    
                    questions[question_number] = question_data
                    question_number += 1
        
        return {
            'layout_type': 'two_section',
            'total_questions': question_number - start_question,
            'questions': questions,
            'column_groups': column_groups
        }
    
    def create_single_section_mapping(self, rows, column_analysis, start_question=1):
        """Bitta bo'limli layout uchun mapping"""
        questions = {}
        question_number = start_question
        
        # Har bir qator = bitta savol
        for row_idx, row in enumerate(rows):
            if len(row) >= 2:  # Kamida 2 ta variant
                question_data = {
                    'question_number': question_number,
                    'row_index': row_idx,
                    'options': {}
                }
                
                # Variant sonini aniqlash
                option_count = min(len(row), 5)
                options = ['A', 'B', 'C', 'D', 'E'][:option_count]
                
                for i, bubble in enumerate(row[:option_count]):
                    question_data['options'][options[i]] = {
                        'x': bubble['center_x'],
                        'y': bubble['center_y'],
                        'width': bubble['width'],
                        'height': bubble['height']
                    }
                
                questions[question_number] = question_data
                question_number += 1
        
        return {
            'layout_type': 'single_section',
            'total_questions': question_number - start_question,
            'questions': questions
        }
    
    def analyze_image(self, image_path):
        """Asosiy tahlil funksiyasi"""
        logger.info("=== ENHANCED UNIVERSAL OMR ANALYSIS STARTED ===")
        
        try:
            # 1. Ilg'or preprocessing
            original, gray, binary = self.preprocess_image_advanced(image_path)
            height, width = gray.shape
            
            # 2. Ilg'or bubble detection
            bubbles = self.detect_bubbles_advanced(binary)
            
            if not bubbles:
                logger.error("❌ Hech qanday bubble topilmadi!")
                return None
            
            # Remove contour objects from bubbles for JSON serialization
            for bubble in bubbles:
                if 'contour' in bubble:
                    del bubble['contour']
            
            # 3. Layout tuzilishini tahlil qilish
            layout_info = self.analyze_layout_structure(bubbles)
            
            if not layout_info:
                logger.error("❌ Layout tuzilishi aniqlanmadi!")
                return None
            
            # 4. Koordinatalar mapping yaratish
            coordinate_mapping = self.create_coordinate_mapping(layout_info)
            
            # 5. Vizualizatsiya
            self.visualize_enhanced_results(original, layout_info, coordinate_mapping)
            
            # 6. Natijalarni tayyorlash
            result = {
                'image_info': {
                    'path': image_path,
                    'width': width,
                    'height': height
                },
                'detection_stats': {
                    'total_bubbles': len(bubbles),
                    'valid_rows': layout_info['total_rows'],
                    'layout_type': layout_info['layout_type']
                },
                'layout_analysis': layout_info,
                'coordinate_mapping': coordinate_mapping,
                'processing_method': 'Enhanced Universal OMR Detection'
            }
            
            return result
            
        except Exception as e:
            logger.error(f"❌ Xatolik: {e}")
            return None
    
    def visualize_enhanced_results(self, image, layout_info, coordinate_mapping):
        """Yaxshilangan vizualizatsiya"""
        plt.figure(figsize=(25, 20))
        plt.imshow(cv2.cvtColor(image, cv2.COLOR_BGR2RGB))
        
        if 'rows' not in layout_info:
            return
        
        rows = layout_info['rows']
        layout_type = layout_info['layout_type']
        
        # Rang palitrasini yaratish
        colors = ['red', 'blue', 'green', 'orange', 'purple', 'brown', 'pink', 'gray', 'olive', 'cyan']
        
        # Qatorlarni ranglash
        for row_idx, row in enumerate(rows):
            color = colors[row_idx % len(colors)]
            
            for bubble_idx, bubble in enumerate(row):
                # Bubble atrofida to'rtburchak
                rect = Rectangle(
                    (bubble['x'], bubble['y']), 
                    bubble['width'], bubble['height'],
                    linewidth=2, edgecolor=color, facecolor='none', alpha=0.8
                )
                plt.gca().add_patch(rect)
                
                # Bubble markazida nuqta
                plt.plot(bubble['center_x'], bubble['center_y'], 'o', 
                        color=color, markersize=4)
                
                # Bubble raqamini yozish
                plt.text(bubble['center_x'], bubble['center_y'], 
                        str(bubble_idx + 1), 
                        ha='center', va='center', fontsize=8, 
                        color='white', weight='bold')
        
        # Ustun guruhlarini ko'rsatish
        column_analysis = layout_info.get('column_analysis', {})
        column_groups = column_analysis.get('column_groups', [])
        
        for group in column_groups:
            start_x = group.get('start_x', 0)
            end_x = group.get('end_x', 0)
            plt.axvline(x=start_x, color='yellow', linestyle='--', alpha=0.7, linewidth=2)
            plt.axvline(x=end_x, color='yellow', linestyle='--', alpha=0.7, linewidth=2)
        
        plt.title(f'Enhanced Universal OMR Analysis\n'
                 f'Layout: {layout_type}, Qatorlar: {layout_info["total_rows"]}, '
                 f'Savollar: {coordinate_mapping.get("total_questions", 0)}')
        plt.axis('off')
        plt.tight_layout()
        plt.savefig('enhanced_omr_analysis.jpg', dpi=150, bbox_inches='tight')
        plt.close()
        
        logger.info("✅ Vizualizatsiya 'enhanced_omr_analysis.jpg' faylida saqlandi")

def main():
    detector = EnhancedUniversalOMRDetector()
    
    # test-image.jpg ni tahlil qilish
    result = detector.analyze_image('../test-image.jpg')
    
    if result:
        # Natijalarni JSON faylga saqlash
        with open('enhanced_coordinate_system.json', 'w', encoding='utf-8') as f:
            json.dump(result, f, indent=2, ensure_ascii=False)
        
        print("\n=== ENHANCED UNIVERSAL OMR ANALYSIS RESULTS ===")
        
        layout = result['layout_analysis']
        mapping = result['coordinate_mapping']
        
        print(f"Layout turi: {layout['layout_type']}")
        print(f"Jami qatorlar: {layout['total_rows']}")
        print(f"Jami savollar: {mapping['total_questions']}")
        
        column_analysis = layout.get('column_analysis', {})
        if 'column_groups' in column_analysis:
            print(f"\nUstun guruhlari:")
            for i, group in enumerate(column_analysis['column_groups']):
                print(f"  Guruh {i+1}: {group['columns']} ustun, "
                      f"X={group['start_x']}-{group['end_x']}")
        
        print(f"\nQatorlar tafsiloti:")
        bubbles_per_row = layout['bubbles_per_row']
        for i, count in enumerate(bubbles_per_row):
            print(f"  Qator {i+1}: {count} bubble")
        
        print(f"\nBirinchi 5 ta savol koordinatalari:")
        questions = mapping.get('questions', {})
        for q_num in sorted(questions.keys())[:5]:
            q_data = questions[q_num]
            print(f"  Savol {q_num}:")
            for option, coords in q_data['options'].items():
                print(f"    {option}: ({coords['x']}, {coords['y']})")
        
        print(f"\nNatijalar 'enhanced_coordinate_system.json' faylida saqlandi")
    else:
        print("❌ Tahlil muvaffaqiyatsiz tugadi!")

if __name__ == "__main__":
    main()