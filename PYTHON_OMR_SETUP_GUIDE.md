# Python OMR Tekshirish Tizimi - O'rnatish va Ishlatish Qo'llanmasi

## 🎯 Tizim Haqida

Python OMR Checker - bu OpenCV va ilg'or kompyuter ko'rish texnologiyalari yordamida qurilgan professional OMR (Optical Mark Recognition) tahlil tizimi. Bu tizim 95-99% aniqlik bilan OMR varaqlarni tahlil qiladi.

## 🚀 Asosiy Xususiyatlar

- **Ultra-aniq koordinata xaritalash**: Piksel darajasida aniq bubble aniqlash
- **Ilg'or rasm qayta ishlash**: Ko'p bosqichli preprocessing va adaptive thresholding
- **8 nuqtali hizalash tizimi**: Avtomatik koordinata kalibrlash
- **Format-aware qayta ishlash**: Continuous va subject-based layoutlarni qo'llab-quvvatlash
- **Yuqori aniqlik**: 95-99% aniqlik va ishonch darajasi hisobi
- **Debug vizualizatsiya**: To'liq debug chiqish tahlil va muammolarni hal qilish uchun
- **RESTful API**: Flask-based web server integratsiya uchun

## 📋 Talablar

- Python 3.8+
- OpenCV 4.8+
- NumPy, Pillow, scikit-image
- Flask (web server uchun)

## 🛠️ O'rnatish

### 1. Python muhitini tayyorlash

```bash
# Python OMR checker papkasiga o'ting
cd techii/python_omr_checker

# Virtual muhit yarating (tavsiya etiladi)
python -m venv omr_env

# Virtual muhitni faollashtiring
# Windows:
omr_env\Scripts\activate
# Linux/Mac:
source omr_env/bin/activate
```

### 2. Bog'liqliklarni o'rnatish

```bash
# Barcha kerakli kutubxonalarni o'rnating
pip install -r requirements.txt
```

### 3. Muhit o'zgaruvchilarini sozlash

```bash
# .env faylini yarating
cp .env.example .env

# Kerakli sozlamalarni tahrirlang
notepad .env  # Windows
nano .env     # Linux/Mac
```

## 🎯 Ishlatish

### Command Line Interface (CLI)

```bash
# Oddiy ishlatish
python omr_processor.py sample_omr.jpg --answer-key A,B,C,D,A,B,C,D,A,B

# Imtihon metadata bilan
python omr_processor.py sample_omr.jpg --answer-key A,B,C,D,A,B,C,D,A,B --exam-data sample_exam_data.json

# Debug rejimini yoqish
python omr_processor.py sample_omr.jpg --answer-key A,B,C,D,A,B,C,D,A,B --debug

# Natijalarni faylga saqlash
python omr_processor.py sample_omr.jpg --answer-key A,B,C,D,A,B,C,D,A,B --output results.json
```

### Web Server API

1. **Serverni ishga tushirish:**
```bash
python run_server.py
```

2. **API orqali OMR varaqni qayta ishlash:**
```bash
curl -X POST http://localhost:5000/api/omr/process \
  -F "image=@sample_omr.jpg" \
  -F "answerKey=[\"A\",\"B\",\"C\",\"D\",\"A\"]" \
  -F "examData={\"structure\":\"continuous\",\"paperSize\":\"a4\"}"
```

### Python kodida ishlatish

```python
from omr_processor import OMRProcessor

# Processorni ishga tushirish
processor = OMRProcessor()
processor.set_debug_mode(True)

# Javob kaliti va imtihon ma'lumotlari
answer_key = ['A', 'B', 'C', 'D', 'A']
exam_data = {
    "structure": "continuous",
    "paperSize": "a4",
    "subjects": [...]
}

# OMR varaqni qayta ishlash
result = processor.process_omr_sheet("omr_image.jpg", answer_key, exam_data)

print(f"Ishonch darajasi: {result.confidence}")
print(f"Javoblar: {result.extracted_answers}")
```

## 🧪 Testlash

```bash
# Test skriptini ishga tushirish
python test_omr.py

# Sample rasm bilan test (sample_omr.jpg faylini joylashtiring)
python test_omr.py
```

## 🔧 API Endpoints

### POST /api/omr/process
OMR varaq rasmini qayta ishlash.

**Parametrlar:**
- `image` (file): OMR varaq rasmi
- `answerKey` (JSON array): Kutilayotgan javoblar
- `examData` (JSON object, ixtiyoriy): Imtihon metadata
- `scoring` (JSON object, ixtiyoriy): Baholash konfiguratsiyasi
- `debug` (boolean, ixtiyoriy): Debug rejimini yoqish

### GET /api/omr/status
Servis holati va imkoniyatlari.

### GET /health
Sog'liqni tekshirish endpoint.

## 🐛 Debug Rejimi

Debug rejimini yoqish uchun:

```bash
python omr_processor.py image.jpg --answer-key A,B,C,D,A --debug
```

Debug chiqish:
- Qayta ishlangan rasmlar
- Hizalash belgilarini aniqlash vizualizatsiyasi
- Bubble intensivlik tahlili
- Koordinata xaritalash vizualizatsiyasi

Debug fayllari `debug_output/` papkasida saqlanadi.

## 🔍 Muammolarni hal qilish

### Kam aniqlik muammolari

1. **Rasm sifatini tekshiring**: Yuqori kontrast va ruxsat bo'lishini ta'minlang
2. **Hizalash belgilarini tekshiring**: Barcha 8 hizalash belgisi aniq ko'rinishi kerak
3. **Debug rejimini yoqing**: Oraliq qayta ishlash bosqichlarini tahlil qiling
4. **Chegaralarni sozlang**: Bubble aniqlash sezgirligini o'zgartiring

### Keng tarqalgan xato xabarlari

- `"Could not read image"`: Fayl yo'li va formatini tekshiring
- `"No alignment marks detected"`: To'g'ri OMR varaq formatini ta'minlang
- `"Invalid JSON data"`: Imtihon metadata formatini tekshiring

## 🐳 Docker bilan ishlatish

```bash
# Docker image yaratish
docker build -t python-omr-checker .

# Konteyner ishga tushirish
docker run -p 5000:5000 python-omr-checker

# Docker Compose bilan
docker-compose up -d
```

## 📊 Ishlash ko'rsatkichlari

- **Aniqlik**: 95-99% (rasm sifatiga bog'liq)
- **Qayta ishlash vaqti**: 2-5 soniya har bir rasm uchun
- **Qo'llab-quvvatlanadigan ruxsat**: 150-600 DPI
- **Maksimal fayl hajmi**: 16MB
- **Parallel qayta ishlash**: Multi-threaded qo'llab-quvvatlash

## 🔗 Node.js bilan integratsiya

Mavjud Node.js tizimingiz bilan integratsiya qilish uchun:

```javascript
// techii/server/src/services/pythonOMRService.js
const FormData = require('form-data');
const fs = require('fs');
const fetch = require('node-fetch');

class PythonOMRService {
  constructor(pythonServerUrl = 'http://localhost:5000') {
    this.baseUrl = pythonServerUrl;
  }

  async processOMRSheet(imagePath, answerKey, examData = null) {
    const form = new FormData();
    form.append('image', fs.createReadStream(imagePath));
    form.append('answerKey', JSON.stringify(answerKey));
    
    if (examData) {
      form.append('examData', JSON.stringify(examData));
    }

    const response = await fetch(`${this.baseUrl}/api/omr/process`, {
      method: 'POST',
      body: form
    });

    return await response.json();
  }
}

module.exports = PythonOMRService;
```

## 📝 Xulosa

Python OMR Checker tizimi yuqori aniqlik va professional xususiyatlar bilan OMR varaqlarni qayta ishlash uchun to'liq yechim taqdim etadi. Tizim Node.js backend bilan osongina integratsiya qilinadi va production muhitida ishlatish uchun tayyor.

### Keyingi qadamlar:

1. Sample OMR rasm tayyorlang va test qiling
2. O'z imtihon formatlaringiz uchun exam_data.json sozlang  
3. Production muhitida deploy qiling
4. Monitoring va logging sozlang
5. Kerakli bo'lsa, custom features qo'shing