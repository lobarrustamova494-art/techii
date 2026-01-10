# 🚀 Python OMR Service Deployment Guide

## Current Issue
The main Node.js backend is trying to use subprocess to call Python OMR processor, but in production (Render), the Python dependencies are not available in the Node.js environment.

## Solution
Deploy Python OMR service as a separate web service on Render.

## Step-by-Step Deployment

### 1. Create New Web Service on Render

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Select the repository: `techii`

### 2. Configure Service Settings

**Basic Settings:**
- **Name**: `ultra-precision-python-omr`
- **Environment**: `Python 3`
- **Region**: `Oregon` (same as main app)
- **Branch**: `main`
- **Root Directory**: `python_omr_checker`

**Build & Deploy:**
- **Build Command**: `pip install --upgrade pip && pip install -r requirements.txt`
- **Start Command**: `python run_server.py`

### 3. Environment Variables

Add these in Render dashboard:

```bash
FLASK_ENV=production
PORT=5000
HOST=0.0.0.0
DEBUG=false
WORKERS=2
MAX_CONTENT_LENGTH=16777216
UPLOAD_FOLDER=uploads
DEBUG_OUTPUT_FOLDER=debug_output
LOG_FOLDER=logs
OPENCV_LOG_LEVEL=ERROR
PYTHONUNBUFFERED=1
CORS_ORIGINS=*
```

### 4. Advanced Settings

**Health Check:**
- **Health Check Path**: `/health`

**Auto-Deploy:**
- ✅ Enable auto-deploy from `main` branch

### 5. Deploy Service

1. Click **"Create Web Service"**
2. Wait for deployment to complete
3. Check logs for any errors
4. Test health endpoint: `https://ultra-precision-python-omr.onrender.com/health`

### 6. Update Main Backend

The main Node.js backend already has the correct environment variable:
```yaml
PYTHON_OMR_URL=https://ultra-precision-python-omr.onrender.com
```

### 7. Redeploy Main Backend

After Python service is running:
1. Go to main backend service: `ultra-precision-omr-backend`
2. Click **"Manual Deploy"** → **"Deploy latest commit"**
3. Wait for deployment to complete

## Verification Steps

### 1. Check Python Service Health
```bash
curl https://ultra-precision-python-omr.onrender.com/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "Python OMR Processor",
  "version": "1.0.0",
  "engines": ["standard", "enhanced", "ultra", "evalbee"]
}
```

### 2. Test OMR Processing
Use the EvalBee Camera Scanner to test image processing.

### 3. Check Logs
- Python service logs should show successful OpenCV import
- Main backend logs should show HTTP requests to Python service

## Troubleshooting

### Common Issues

#### 1. Build Fails - OpenCV Dependencies
**Error**: `ERROR: Failed building wheel for opencv-python-headless`

**Solution**: 
- Ensure `requirements.txt` uses `opencv-python-headless`
- Check build command includes `pip install --upgrade pip`

#### 2. Service Won't Start
**Error**: `ModuleNotFoundError: No module named 'cv2'`

**Solution**:
- Verify `opencv-python-headless>=4.8.1` in requirements.txt
- Check environment variables are set correctly
- Redeploy service

#### 3. Health Check Fails
**Error**: Health check endpoint returns 404

**Solution**:
- Verify `run_server.py` starts Flask app correctly
- Check PORT environment variable is set to 5000
- Ensure `/health` endpoint is implemented

#### 4. Main Backend Can't Connect
**Error**: `Python OMR processing failed: fetch failed`

**Solution**:
- Verify Python service URL is correct
- Check CORS settings allow requests from main backend
- Ensure both services are in same region

### Debug Commands

```bash
# Check Python service status
curl -v https://ultra-precision-python-omr.onrender.com/health

# Test OMR processing (with image file)
curl -X POST https://ultra-precision-python-omr.onrender.com/process-omr \
  -F "image=@test_image.jpg" \
  -F "answer_key=A,B,C,D"
```

## Expected Behavior After Deployment

1. **Python Service**: Runs independently with OpenCV support
2. **Main Backend**: Makes HTTP requests to Python service
3. **EvalBee Camera**: Successfully processes images
4. **No More Errors**: cv2 import errors should be resolved

## Service URLs

- **Python OMR Service**: `https://ultra-precision-python-omr.onrender.com`
- **Main Backend**: `https://ultra-precision-omr-backend.onrender.com`  
- **Frontend**: `https://ultra-precision-omr-frontend.onrender.com`

## Files Updated

- ✅ `python_omr_checker/requirements.txt` - Uses opencv-python-headless
- ✅ `python_omr_checker/render.yaml` - Deployment configuration
- ✅ `server/src/services/pythonOMRService.ts` - Production HTTP-only mode
- ✅ `render.yaml` - PYTHON_OMR_URL environment variable

---

**Next Steps**: Deploy the Python service using the steps above, then redeploy the main backend to use the new Python service.