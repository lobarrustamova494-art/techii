# Python OMR Server - Render.com Deployment Guide

## Overview
This guide explains how to deploy the Python OMR Processing Server as a separate service on Render.com.

## Architecture
```
Frontend (Static Site) → Node.js Backend → Python OMR Server
     ↓                        ↓                    ↓
Render Static Site      Render Web Service    Render Web Service
```

## Deployment Steps

### 1. Create New Web Service on Render

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure the service:

**Basic Settings:**
- **Name**: `ultra-precision-python-omr`
- **Region**: `Oregon (US West)`
- **Branch**: `main`
- **Root Directory**: `python_omr_checker`
- **Runtime**: `Python 3.11.9` (specified in runtime.txt)
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `python run_server.py`

**Advanced Settings:**
- **Plan**: `Starter` (recommended for OpenCV processing)
- **Health Check Path**: `/health`
- **Auto-Deploy**: `Yes`

### 2. Environment Variables

Set these environment variables in Render dashboard:

```bash
# Server Configuration
FLASK_ENV=production
HOST=0.0.0.0
PORT=5000
DEBUG=false
WORKERS=2

# Performance Settings
MAX_CONTENT_LENGTH=16777216
PROCESSING_TIMEOUT=300
MAX_REQUESTS=1000
PYTHONUNBUFFERED=1

# OpenCV Settings
OPENCV_LOG_LEVEL=ERROR

# CORS Settings
CORS_ORIGINS=*

# File Storage
UPLOAD_FOLDER=uploads
DEBUG_OUTPUT_FOLDER=debug_output
LOG_FOLDER=logs
```

### 3. Disk Storage (Optional)

If you need persistent storage for uploads:

1. Go to service settings
2. Add disk storage:
   - **Name**: `python-omr-storage`
   - **Mount Path**: `/opt/render/project/src/uploads`
   - **Size**: `1 GB`

### 4. Update Node.js Backend

The Node.js backend will automatically detect the Python server URL via environment variable:

```bash
PYTHON_OMR_URL=https://ultra-precision-python-omr.onrender.com
```

### 5. Service URLs

After deployment, your services will be available at:

- **Frontend**: `https://ultra-precision-omr-frontend.onrender.com`
- **Node.js Backend**: `https://ultra-precision-omr-backend.onrender.com`
- **Python OMR Server**: `https://ultra-precision-python-omr.onrender.com`

## API Endpoints

### Health Check
```bash
GET /health
```

### Process OMR
```bash
POST /process-omr
Content-Type: multipart/form-data

Fields:
- image: File (JPG/PNG)
- answer_key: String (comma-separated)
- exam_data: String (JSON, optional)
- debug: String ("true"/"false", optional)
```

## Testing Deployment

### 1. Health Check
```bash
curl https://ultra-precision-python-omr.onrender.com/health
```

### 2. Process Test Image
```bash
curl -X POST https://ultra-precision-python-omr.onrender.com/process-omr \
  -F "image=@test_image.jpg" \
  -F "answer_key=A,B,C,D,A"
```

## Performance Considerations

### 1. Cold Start
- First request may take 30-60 seconds (cold start)
- Subsequent requests are fast (2-5 seconds)

### 2. Memory Usage
- OpenCV requires significant memory
- Starter plan (512MB RAM) is minimum
- Standard plan (2GB RAM) recommended for production

### 3. Processing Time
- Simple OMR: 2-5 seconds
- Complex OMR: 5-15 seconds
- Timeout set to 5 minutes

## Monitoring

### 1. Logs
View logs in Render dashboard:
- Build logs
- Runtime logs
- Error logs

### 2. Metrics
Monitor in Render dashboard:
- CPU usage
- Memory usage
- Response times
- Error rates

## Troubleshooting

### 1. Build Failures
```bash
# Check requirements.txt
pip install -r requirements.txt

# Check Python version
python --version  # Should be 3.8+
```

### 2. Runtime Errors
```bash
# Check OpenCV installation
python -c "import cv2; print(cv2.__version__)"

# Check Flask app
python -c "from omr_server import app; print('OK')"
```

### 3. Memory Issues
- Upgrade to Standard plan
- Optimize image processing
- Add memory monitoring

## Security

### 1. CORS Configuration
```python
# In omr_server.py
CORS(app, origins=["https://ultra-precision-omr-frontend.onrender.com"])
```

### 2. File Upload Limits
```python
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB
```

### 3. Input Validation
- Validate file types
- Sanitize filenames
- Check file sizes

## Scaling

### 1. Horizontal Scaling
- Multiple worker processes
- Load balancing
- Queue system for heavy processing

### 2. Vertical Scaling
- Upgrade to higher plans
- More CPU/memory
- Faster processing

## Cost Optimization

### 1. Plan Selection
- **Free**: Development/testing only
- **Starter ($7/month)**: Small production
- **Standard ($25/month)**: Production with traffic

### 2. Resource Usage
- Monitor CPU/memory usage
- Optimize image processing
- Cache results when possible

## Backup & Recovery

### 1. Code Backup
- GitHub repository
- Automatic deployments
- Version control

### 2. Data Backup
- No persistent data stored
- Temporary files only
- Stateless service

## Support

For issues:
1. Check Render logs
2. Review this documentation
3. Test locally first
4. Contact support if needed