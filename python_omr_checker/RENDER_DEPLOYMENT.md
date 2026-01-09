# 🚀 Render Deployment Guide for Python OMR Server

## Overview

This guide explains how to deploy the Python OMR Processing Server on Render as a separate service from the main Node.js application.

## Prerequisites

- Render account
- GitHub repository with Python OMR code
- Main Node.js app already deployed on Render

## Deployment Steps

### 1. Create New Web Service

1. Go to Render Dashboard
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Select the repository containing the Python OMR code

### 2. Configure Service Settings

**Basic Settings:**
- **Name**: `ultra-precision-python-omr`
- **Environment**: `Python 3`
- **Region**: `Oregon` (or closest to your users)
- **Branch**: `main`
- **Root Directory**: `python_omr_checker` (if in subdirectory)

**Build & Deploy:**
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `python run_server.py`

### 3. Environment Variables

Add these environment variables in Render dashboard:

```bash
# Flask Configuration
FLASK_ENV=production
PORT=5000
HOST=0.0.0.0
DEBUG=false
WORKERS=2

# Performance Settings
MAX_CONTENT_LENGTH=16777216
UPLOAD_FOLDER=uploads
DEBUG_OUTPUT_FOLDER=debug_output
LOG_FOLDER=logs

# OpenCV Settings (IMPORTANT for cv2 module)
OPENCV_LOG_LEVEL=ERROR
PYTHONUNBUFFERED=1

# CORS Settings
CORS_ORIGINS=*
```

### 4. Important: OpenCV Dependencies

**CRITICAL FIX for cv2 ModuleNotFoundError:**

The `requirements.txt` has been updated to use `opencv-python-headless` instead of `opencv-python`:

```txt
# Use headless OpenCV for cloud deployment
opencv-python-headless>=4.8.1
```

This version doesn't require GUI dependencies and works on Render.

### 5. Health Check

The service includes a health check endpoint:
- **Health Check Path**: `/health`
- **Expected Response**: `{"status": "healthy", "service": "Python OMR Processor"}`

### 6. Service Plan

**Recommended Plan:**
- **Starter Plan** or higher (for OpenCV processing)
- **Memory**: At least 512MB for image processing
- **CPU**: Sufficient for OpenCV operations

### 7. Connect to Main App

After Python service is deployed, update your main Node.js app environment variables:

```bash
# In main app's environment variables
PYTHON_OMR_URL=https://ultra-precision-python-omr.onrender.com
```

### 8. Update Node.js Service

Ensure your Node.js `pythonOMRService.ts` uses the HTTP client for production:

```typescript
// In production, use HTTP client
if (process.env.PYTHON_OMR_URL) {
  // Use HTTP client to call Python service
  const response = await fetch(`${process.env.PYTHON_OMR_URL}/process-omr`, {
    method: 'POST',
    body: formData
  })
} else {
  // Development: use subprocess
  // ... subprocess code
}
```

## Troubleshooting

### Common Issues

#### 1. cv2 ModuleNotFoundError
**Solution**: Use `opencv-python-headless` in requirements.txt (already fixed)

#### 2. Memory Issues
**Solution**: Upgrade to Starter plan or higher

#### 3. Timeout Issues
**Solution**: Increase timeout in Node.js service calls

#### 4. CORS Issues
**Solution**: Set `CORS_ORIGINS=*` or specific domain

### Debugging

1. **Check Logs**: View deployment logs in Render dashboard
2. **Health Check**: Visit `https://your-service.onrender.com/health`
3. **Test Endpoint**: Use Postman to test `/process-omr` endpoint

### Performance Optimization

1. **Use Starter Plan**: Better CPU/memory for image processing
2. **Optimize Images**: Resize images before processing
3. **Caching**: Implement result caching if needed
4. **Monitoring**: Use Render metrics to monitor performance

## File Structure

```
python_omr_checker/
├── requirements.txt          # Updated with opencv-python-headless
├── runtime.txt              # Python 3.11.9
├── render.yaml              # Render configuration
├── run_server.py            # Production server runner
├── omr_server.py            # Flask application
├── omr_processor.py         # OMR processing logic
└── evalbee_omr_engine.py    # EvalBee engine
```

## Deployment Commands

```bash
# If deploying manually
git add .
git commit -m "fix: Update OpenCV to headless version for Render deployment"
git push origin main
```

## Testing Deployment

1. **Health Check**: `GET https://your-service.onrender.com/health`
2. **Process Test**: `POST https://your-service.onrender.com/process-omr`
3. **Integration**: Test from main app

## Security Notes

- Service runs in isolated environment
- No persistent storage (files are temporary)
- HTTPS enabled by default
- Environment variables are encrypted

## Cost Optimization

- **Free Tier**: Limited hours, good for testing
- **Starter Plan**: $7/month, recommended for production
- **Auto-scaling**: Render handles scaling automatically

---

**Important**: After updating `requirements.txt` with `opencv-python-headless`, redeploy the Python service on Render to fix the cv2 import error.