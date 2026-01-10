# 🏗️ EvalBee OMR System Architecture

## Service Overview

The EvalBee OMR system consists of three main services that communicate with each other:

### 1. 🎨 Frontend (React + Vite)
- **Development**: `http://localhost:5173`
- **Production**: `https://ultra-precision-omr-frontend.onrender.com`
- **Technology**: React, TypeScript, Tailwind CSS
- **Purpose**: User interface, camera scanner, results display

### 2. 🚀 Node.js Backend (Express + MongoDB)
- **Development**: `http://localhost:10000`
- **Production**: `https://ultra-precision-omr-backend.onrender.com`
- **Technology**: Node.js, Express, MongoDB, TypeScript
- **Purpose**: API server, authentication, data management

### 3. 🐍 Python OMR Service (Flask + OpenCV)
- **Development**: `http://localhost:5000`
- **Production**: `https://ultra-precision-python-omr.onrender.com`
- **Technology**: Python, Flask, OpenCV, scikit-learn
- **Purpose**: OMR image processing, bubble detection, AI analysis

## Communication Flow

### Direct Frontend → Python OMR
```
Frontend → Python OMR Service
├── Health Check: GET /health
├── Process OMR: POST /process-omr
└── Direct processing for faster response
```

### Frontend → Node.js Backend → Python OMR
```
Frontend → Node.js Backend → Python OMR Service
├── Authentication & validation
├── Data persistence
├── Fallback processing
└── Enhanced error handling
```

### Hybrid Processing (Recommended)
```
Frontend → Try Direct Python → Fallback to Node.js Backend
├── 1. Direct Python OMR (fastest)
├── 2. If fails → Node.js Backend
└── 3. Best of both worlds
```

## Environment Variables

### Frontend (.env)
```bash
# API URLs
VITE_API_BASE_URL=http://localhost:10000
VITE_PYTHON_OMR_URL=http://localhost:5000

# Production URLs
# VITE_API_BASE_URL=https://ultra-precision-omr-backend.onrender.com/api
# VITE_PYTHON_OMR_URL=https://ultra-precision-python-omr.onrender.com

# App Configuration
VITE_APP_NAME=EvalBee OMR Scanner
VITE_DEBUG_MODE=true
```

### Node.js Backend (server/.env)
```bash
# Service URLs
FRONTEND_URL=http://localhost:5173
PYTHON_OMR_URL=http://localhost:5000

# Production URLs
# FRONTEND_URL=https://ultra-precision-omr-frontend.onrender.com
# PYTHON_OMR_URL=https://ultra-precision-python-omr.onrender.com

# Database & Auth
MONGODB_URI=mongodb://localhost:27017/ultra_precision_omr
JWT_SECRET=your-secret-key
```

### Python OMR Service (python_omr_checker/.env)
```bash
# Service URLs
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:10000

# Production URLs
# FRONTEND_URL=https://ultra-precision-omr-frontend.onrender.com
# BACKEND_URL=https://ultra-precision-omr-backend.onrender.com

# Flask Configuration
FLASK_ENV=development
PORT=5000
DEBUG=true
```

## API Endpoints

### Frontend API Service Methods

#### Direct Python OMR
```typescript
// Direct communication with Python service
await apiService.processOMRDirectly(file, answerKey, examId, 'evalbee')
await apiService.checkPythonOMRHealth()
```

#### Node.js Backend
```typescript
// Via Node.js backend
await apiService.processOMRWithEvalBee(file, answerKey, scoring, examId, examData)
```

#### Hybrid Processing
```typescript
// Try direct first, fallback to backend
await apiService.processOMRHybrid(file, answerKey, scoring, examId, examData)
```

### Python OMR Service Endpoints
```
GET  /health                 - Health check
POST /process-omr           - Process OMR image
GET  /status                - Service status
POST /analyze-quality       - Image quality analysis
```

### Node.js Backend Endpoints
```
GET  /api/health            - Health check
POST /api/omr/process       - Process OMR via Python service
GET  /api/exams             - Get exams
POST /api/auth/login        - User authentication
```

## Deployment Architecture

### Development Setup
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Frontend  │    │   Node.js   │    │   Python    │
│   :5173     │◄──►│   :10000    │◄──►│   :5000     │
└─────────────┘    └─────────────┘    └─────────────┘
```

### Production Setup (Render)
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Frontend  │    │   Node.js   │    │   Python    │
│  Static     │◄──►│   Backend   │◄──►│   OMR       │
│  Site       │    │   Service   │    │   Service   │
└─────────────┘    └─────────────┘    └─────────────┘
```

## Benefits of This Architecture

### 🚀 Performance
- **Direct Python**: Fastest processing for OMR images
- **Hybrid Approach**: Automatic fallback ensures reliability
- **Parallel Processing**: Multiple services can handle different tasks

### 🔧 Flexibility
- **Independent Scaling**: Each service can be scaled separately
- **Technology Choice**: Best tool for each job
- **Maintenance**: Services can be updated independently

### 🛡️ Reliability
- **Fallback Mechanisms**: If one service fails, others continue
- **Health Checks**: Monitor service availability
- **Error Handling**: Graceful degradation

### 🔒 Security
- **Service Isolation**: Each service has its own security context
- **CORS Configuration**: Controlled cross-origin access
- **Environment Variables**: Secure configuration management

## Monitoring & Debugging

### Health Checks
```typescript
// Check all services
const frontendHealth = await fetch('/health')
const backendHealth = await apiService.healthCheck()
const pythonHealth = await apiService.checkPythonOMRHealth()
```

### Mobile Debug Console
- Real-time logging across all services
- Copy logs for troubleshooting
- Export functionality for support

### Service Status Dashboard
- Monitor all three services
- Performance metrics
- Error tracking

## Development Workflow

### 1. Local Development
```bash
# Terminal 1: Frontend
cd techii
npm run dev

# Terminal 2: Node.js Backend
cd techii/server
npm run dev

# Terminal 3: Python OMR Service
cd techii/python_omr_checker
python omr_server.py
```

### 2. Testing Integration
```bash
# Test all services
curl http://localhost:5173/health     # Frontend
curl http://localhost:10000/api/health # Backend
curl http://localhost:5000/health      # Python OMR
```

### 3. Production Deployment
1. Deploy Python OMR service first
2. Deploy Node.js backend (with Python OMR URL)
3. Deploy frontend (with both service URLs)

## Troubleshooting

### Common Issues
1. **CORS Errors**: Check CORS_ORIGINS in all services
2. **Connection Refused**: Verify service URLs in .env files
3. **Authentication Errors**: Check JWT configuration
4. **Processing Failures**: Use hybrid processing for reliability

### Debug Tools
- Mobile debug console for real-time logs
- Service health checks
- Network tab in browser dev tools
- Server logs in Render dashboard

---

This architecture provides a robust, scalable, and maintainable OMR processing system with multiple communication paths and fallback mechanisms.