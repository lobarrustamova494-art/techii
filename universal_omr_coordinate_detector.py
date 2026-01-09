import cv2
import numpy as np
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle
import json
from collections import defaultdict

class UniversalOMRCoordinateDetector:
    """
    Har qanday OMR rasmini tahlil qilib, universal koordinatalashtirish tizimi yaratadi
    """
    
    def __init__(self):
        self.debug_mode = True
        self.min_bubble_area = 200
        self.max_bubble_area = 3000
        self.aspect_ratio_tolerance = 0.3  # 0.7 dan 1.3 gacha
        self.row_tolerance = 40  # Y koordinatasi farqi
        self.column_tolerance = 50  # X koordinatasi farqi
        
    def preprocess_image(self, image_path):
        """Rasmni preprocessing qilish"""
        image = cv2.imread(image_path)
        if image is None:
            raise ValueError(f"Rasm yuklanmadi: {image_path}")
        
        # Grayskalega o'tkazish
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Gaussian blur qo'llash (shovqinni kamaytirish)
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        
        # Adaptive threshold (turli yorug'lik sharoitlari uchun)
        binary = cv2.adaptiveThreshold(
            blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
            cv2.THRESH_BINARY_INV, 11, 2
        )
        
        # Morphological operations (shovqinni tozalash)
        kernel = np.ones((3, 3), np.uint8)
        cleaned = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel)
        cleaned = cv2.morphologyEx(cleaned, cv2.MORPH_OPEN, kernel)
        
        return image, gray, cleaned
    
    def detect_bubbles(self, binary_image):
        """Bubble kandidatlarini topish"""
        contours, _ = cv2.findContours(
            binary_image, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
        )
        
        bubbles = []
        for contour in contours:
            area = cv2.contourArea(contour)
            
            # Maydon bo'yicha filtrlash
            if self.min_bubble_area <= area <= self.max_bubble_area:
                x, y, w, h = cv2.boundingRect(contour)
                
                # Aspect ratio tekshirish (taxminan kvadrat)
                aspect_ratio = w / h
                if (1 - self.aspect_ratio_tolerance) <= aspect_ratio <= (1 + self.aspect_ratio_tolerance):
                    
                    # Kontur yopiqligini tekshirish
                    perimeter = cv2.arcLength(contour, True)
                    circularity = 4 * np.pi * area / (perimeter * perimeter)
                    
                    if circularity > 0.3:  # Yetarlicha yumaloq
                        bubbles.append({
                            'x': x,
                            'y': y,
                            'width': w,
                            'height': h,
                            'center_x': x + w // 2,
                            'center_y': y + h // 2,
                            'area': area,
                            'aspect_ratio': aspect_ratio,
                            'circularity': circularity
                        })
        
        if self.debug_mode:
            print(f"Topilgan bubble kandidatlari: {len(bubbles)}")
        
        return bubbles
    
    def group_bubbles_into_rows(self, bubbles):
        """Bubblelarni qatorlarga guruhlash"""
        if not bubbles:
            return []
        
        # Y koordinatasi bo'yicha saralash
        sorted_bubbles = sorted(bubbles, key=lambda b: b['center_y'])
        
        rows = []
        current_row = [sorted_bubbles[0]]
        
        for bubble in sorted_bubbles[1:]:
            # Oxirgi qatordagi o'rtacha Y koordinatasi
            avg_y = sum(b['center_y'] for b in current_row) / len(current_row)
            
            if abs(bubble['center_y'] - avg_y) <= self.row_tolerance:
                current_row.append(bubble)
            else:
                # Yangi qator
                if len(current_row) >= 2:  # Kamida 2 ta bubble
                    rows.append(sorted(current_row, key=lambda b: b['center_x']))
                current_row = [bubble]
        
        # Oxirgi qatorni qo'shish
        if len(current_row) >= 2:
            rows.append(sorted(current_row, key=lambda b: b['center_x']))
        
        if self.debug_mode:
            print(f"Topilgan qatorlar: {len(rows)}")
            for i, row in enumerate(rows):
                print(f"  Qator {i+1}: {len(row)} bubble")
        
        return rows
    
    def detect_column_structure(self, rows):
        """Ustunlar tuzilishini aniqlash"""
        if not rows:
            return {}
        
        # Har qatordagi bubblelar sonini hisoblash
        row_lengths = [len(row) for row in rows]
        
        # Eng ko'p uchraydigan uzunlikni topish
        length_counts = defaultdict(int)
        for length in row_lengths:
            length_counts[length] += 1
        
        standard_length = max(length_counts.keys(), key=lambda k: length_counts[k])
        
        # Standart uzunlikdagi qatorlarni topish
        standard_rows = [row for row in rows if len(row) == standard_length]
        
        if not standard_rows:
            return {}
        
        # Ustun pozitsiyalarini hisoblash
        column_positions = []
        for col_idx in range(standard_length):
            x_positions = [row[col_idx]['center_x'] for row in standard_rows]
            avg_x = sum(x_positions) / len(x_positions)
            column_positions.append(int(avg_x))
        
        # Ustunlar orasidagi masofani hisoblash
        column_spacing = []
        if len(column_positions) > 1:
            for i in range(1, len(column_positions)):
                spacing = column_positions[i] - column_positions[i-1]
                column_spacing.append(spacing)
        
        avg_spacing = sum(column_spacing) / len(column_spacing) if column_spacing else 0
        
        return {
            'standard_columns': standard_length,
            'column_positions': column_positions,
            'average_spacing': avg_spacing,
            'total_standard_rows': len(standard_rows)
        }
    
    def create_coordinate_system(self, rows, column_structure):
        """Universal koordinatalashtirish tizimi yaratish"""
        if not rows or not column_structure:
            return {}
        
        coordinate_system = {
            'layout_type': 'multi_column',
            'total_rows': len(rows),
            'standard_columns': column_structure['standard_columns'],
            'column_positions': column_structure['column_positions'],
            'average_column_spacing': column_structure['average_spacing'],
            'rows': []
        }
        
        for row_idx, row in enumerate(rows):
            row_data = {
                'row_number': row_idx + 1,
                'y_position': int(sum(b['center_y'] for b in row) / len(row)),
                'bubble_count': len(row),
                'is_standard_row': len(row) == column_structure['standard_columns'],
                'columns': []
            }
            
            # Har bir bubble uchun ustun raqamini aniqlash
            for bubble in row:
                # Eng yaqin ustun pozitsiyasini topish
                closest_column = 0
                min_distance = float('inf')
                
                for col_idx, col_pos in enumerate(column_structure['column_positions']):
                    distance = abs(bubble['center_x'] - col_pos)
                    if distance < min_distance:
                        min_distance = distance
                        closest_column = col_idx + 1
                
                column_data = {
                    'column_number': closest_column,
                    'x_position': bubble['center_x'],
                    'y_position': bubble['center_y'],
                    'width': bubble['width'],
                    'height': bubble['height'],
                    'area': bubble['area'],
                    'distance_from_standard': min_distance
                }
                
                row_data['columns'].append(column_data)
            
            # Ustunlar bo'yicha saralash
            row_data['columns'].sort(key=lambda c: c['column_number'])
            coordinate_system['rows'].append(row_data)
        
        return coordinate_system
    
    def analyze_image(self, image_path):
        """Asosiy tahlil funksiyasi"""
        try:
            # Rasmni preprocessing qilish
            original, gray, binary = self.preprocess_image(image_path)
            height, width = gray.shape
            
            print(f"Rasm o'lchami: {width}x{height}")
            
            # Bubblelarni topish
            bubbles = self.detect_bubbles(binary)
            
            if not bubbles:
                print("Hech qanday bubble topilmadi!")
                return None
            
            # Qatorlarga guruhlash
            rows = self.group_bubbles_into_rows(bubbles)
            
            if not rows:
                print("Qatorlar aniqlanmadi!")
                return None
            
            # Ustunlar tuzilishini aniqlash
            column_structure = self.detect_column_structure(rows)
            
            # Koordinatalashtirish tizimini yaratish
            coordinate_system = self.create_coordinate_system(rows, column_structure)
            
            # Vizualizatsiya
            self.visualize_results(original, rows, column_structure)
            
            # Natijalarni saqlash
            result = {
                'image_info': {
                    'path': image_path,
                    'width': width,
                    'height': height
                },
                'detection_stats': {
                    'total_bubbles': len(bubbles),
                    'total_rows': len(rows),
                    'bubbles_per_row': [len(row) for row in rows]
                },
                'coordinate_system': coordinate_system
            }
            
            return result
            
        except Exception as e:
            print(f"Xatolik: {e}")
            return None
    
    def visualize_results(self, image, rows, column_structure):
        """Natijalarni vizualizatsiya qilish"""
        plt.figure(figsize=(20, 15))
        plt.imshow(cv2.cvtColor(image, cv2.COLOR_BGR2RGB))
        
        # Rang palitrasini yaratish
        colors = ['red', 'blue', 'green', 'orange', 'purple', 'brown', 'pink', 'gray', 'olive']
        
        # Qatorlarni ranglash
        for row_idx, row in enumerate(rows):
            color = colors[row_idx % len(colors)]
            
            for bubble in row:
                # Bubble atrofida to'rtburchak chizish
                rect = Rectangle(
                    (bubble['x'], bubble['y']), 
                    bubble['width'], bubble['height'],
                    linewidth=2, edgecolor=color, facecolor='none'
                )
                plt.gca().add_patch(rect)
                
                # Bubble markazida nuqta
                plt.plot(bubble['center_x'], bubble['center_y'], 'o', 
                        color=color, markersize=3)
        
        # Ustun pozitsiyalarini ko'rsatish
        if column_structure and 'column_positions' in column_structure:
            for col_pos in column_structure['column_positions']:
                plt.axvline(x=col_pos, color='yellow', linestyle='--', alpha=0.7, linewidth=1)
        
        plt.title(f'Universal OMR Coordinate System\n'
                 f'{len(rows)} qator, {column_structure.get("standard_columns", "?")} standart ustun')
        plt.axis('off')
        plt.tight_layout()
        plt.savefig('universal_omr_analysis.jpg', dpi=150, bbox_inches='tight')
        plt.close()
        
        print("Vizualizatsiya 'universal_omr_analysis.jpg' faylida saqlandi")

def main():
    detector = UniversalOMRCoordinateDetector()
    
    # test-image.jpg ni tahlil qilish
    result = detector.analyze_image('../test-image.jpg')
    
    if result:
        # Natijalarni JSON faylga saqlash
        with open('universal_coordinate_system.json', 'w', encoding='utf-8') as f:
            json.dump(result, f, indent=2, ensure_ascii=False)
        
        print("\n=== UNIVERSAL KOORDINATALASHTIRISH TIZIMI ===")
        coord_sys = result['coordinate_system']
        
        print(f"Layout turi: {coord_sys['layout_type']}")
        print(f"Jami qatorlar: {coord_sys['total_rows']}")
        print(f"Standart ustunlar: {coord_sys['standard_columns']}")
        print(f"O'rtacha ustun oralig'i: {coord_sys['average_column_spacing']:.1f}px")
        
        print(f"\nUstun pozitsiyalari (X koordinatalari):")
        for i, pos in enumerate(coord_sys['column_positions']):
            print(f"  Ustun {i+1}: X={pos}")
        
        print(f"\nQatorlar tafsiloti:")
        for row in coord_sys['rows']:
            status = "✓" if row['is_standard_row'] else "⚠"
            print(f"  {status} Qator {row['row_number']}: Y={row['y_position']}, "
                  f"{row['bubble_count']} bubble")
        
        print(f"\nNatijalar 'universal_coordinate_system.json' faylida saqlandi")
    else:
        print("Tahlil muvaffaqiyatsiz tugadi!")

if __name__ == "__main__":
    main()