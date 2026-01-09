# 🔍 Python OMR Checker

Advanced Optical Mark Recognition (OMR) processing engine with EvalBee integration.

## Features

- **Multiple OMR Engines**: Standard, Enhanced, Ultra-Precision, and EvalBee engines
- **Advanced Image Processing**: OpenCV-based bubble detection and analysis
- **Quality Control**: Image quality assessment and enhancement
- **Flexible Deployment**: Local development and cloud deployment support
- **RESTful API**: Flask-based web service
- **Real-time Processing**: Fast and accurate OMR sheet processing

## Installation

### Local Development

```bash
# Install development dependencies (includes GUI support)
pip install -r requirements-dev.txt
```

### Production/Cloud Deployment

```bash
# Install production dependencies (headless OpenCV)
pip install -r requirements.txt
```

## OpenCV Dependencies

### For Local Development
- Uses `opencv-python` with GUI support
- Suitable for development and testing with visual debugging

### For Cloud Deployment (Render, Heroku, etc.)
- Uses `opencv-python-headless` without GUI dependencies
- Optimized for cloud environments without display servers
- Fixes `ModuleNotFoundError: No module named 'cv2'` in cloud deployments

## Usage

### Start the Server

```bash
# Development
python omr_server.py

# Production
python run_server.py
```

### API Endpoints

#### Health Check
```bash
GET /health
```

#### Process OMR Sheet
```bash
POST /process-omr
Content-Type: multipart/form-data

Parameters:
- image: OMR sheet image file
- answer_key: JSON array of correct answers
- exam_id: Unique exam identifier
- processing_mode: Engine type (standard, enhanced, ultra, evalbee)
```

### Example Request

```python
import requests

files = {'image': open('omr_sheet.jpg', 'rb')}
data = {
    'answer_key': '["A", "B", "C", "D"]',
    'exam_id': 'exam_001',
    'processing_mode': 'evalbee'
}

response = requests.post('http://localhost:5000/process-omr', 
                        files=files, data=data)
print(response.json())
```

## Available Engines

### 1. Standard OMR Processor
- Basic bubble detection
- Fast processing
- Good for simple OMR sheets

### 2. Enhanced OMR Processor  
- Advanced image preprocessing
- Better accuracy
- Handles various image qualities

### 3. Ultra-Precision OMR Processor
- Maximum accuracy
- Advanced algorithms
- Best for critical applications

### 4. EvalBee OMR Engine
- AI-powered processing
- Adaptive algorithms
- Professional-grade accuracy
- Real-time quality analysis

## Configuration

### Environment Variables

```bash
# Flask Configuration
FLASK_ENV=development
PORT=5000
HOST=localhost
DEBUG=true

# File Upload Settings
MAX_CONTENT_LENGTH=16777216  # 16MB
UPLOAD_FOLDER=uploads
DEBUG_OUTPUT_FOLDER=debug_output

# OpenCV Settings
OPENCV_LOG_LEVEL=ERROR

# CORS Settings
CORS_ORIGINS=*
```

### Development vs Production

#### Development (.env)
```bash
DEBUG=true
FLASK_ENV=development
HOST=localhost
```

#### Production (.env)
```bash
DEBUG=false
FLASK_ENV=production
HOST=0.0.0.0
WORKERS=2
```

## Deployment

### Local Development
```bash
git clone <repository>
cd python_omr_checker
pip install -r requirements-dev.txt
python omr_server.py
```

### Render Deployment
1. Update `requirements.txt` with `opencv-python-headless`
2. Set environment variables in Render dashboard
3. Deploy using `render.yaml` configuration
4. See `RENDER_DEPLOYMENT.md` for detailed instructions

### Docker Deployment
```bash
docker build -t python-omr-checker .
docker run -p 5000:5000 python-omr-checker
```

## File Structure

```
python_omr_checker/
├── requirements.txt              # Production dependencies (headless OpenCV)
├── requirements-dev.txt          # Development dependencies (full OpenCV)
├── runtime.txt                   # Python version specification
├── render.yaml                   # Render deployment configuration
├── Dockerfile                    # Docker configuration
├── .env                         # Environment variables
├── .env.example                 # Environment template
├── omr_server.py                # Flask web server
├── run_server.py                # Production server runner
├── omr_processor.py             # Standard OMR processor
├── enhanced_omr_processor.py    # Enhanced OMR processor
├── ultra_precision_omr_processor.py  # Ultra-precision processor
├── evalbee_omr_engine.py        # EvalBee AI engine
├── uploads/                     # Temporary upload directory
├── debug_output/                # Debug images and logs
└── logs/                        # Application logs
```

## Troubleshooting

### Common Issues

#### 1. cv2 Import Error in Cloud
```
ModuleNotFoundError: No module named 'cv2'
```
**Solution**: Use `opencv-python-headless` in production requirements.txt

#### 2. Memory Issues
**Solution**: Increase server memory or optimize image processing

#### 3. Timeout Issues  
**Solution**: Increase request timeout or optimize processing algorithms

#### 4. Image Quality Issues
**Solution**: Use enhanced or ultra-precision processors

### Debug Mode

Enable debug mode to save processed images:

```bash
DEBUG=true
DEBUG_OUTPUT_FOLDER=debug_output
```

Debug images will be saved showing:
- Original image
- Preprocessed image  
- Detected bubbles
- Analysis results

## Performance Optimization

### Image Processing
- Resize large images before processing
- Use appropriate compression
- Optimize bubble detection parameters

### Server Configuration
- Use multiple workers in production
- Enable caching for repeated requests
- Monitor memory usage

### Algorithm Selection
- Use standard processor for simple sheets
- Use EvalBee engine for maximum accuracy
- Use enhanced processor for balanced performance

## API Response Format

```json
{
  "success": true,
  "data": {
    "extracted_answers": ["A", "B", "C", "D"],
    "confidence_scores": [0.95, 0.87, 0.92, 0.89],
    "processing_time": 1.23,
    "image_quality": {
      "sharpness": 0.85,
      "contrast": 0.78,
      "brightness": 0.65
    },
    "detected_bubbles": 40,
    "processing_mode": "evalbee"
  },
  "message": "OMR processing completed successfully"
}
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Install development dependencies: `pip install -r requirements-dev.txt`
4. Make your changes
5. Run tests: `pytest`
6. Submit a pull request

## License

This project is licensed under the MIT License.

---

**Note**: Always use `requirements.txt` for production deployments and `requirements-dev.txt` for local development to ensure proper OpenCV compatibility.