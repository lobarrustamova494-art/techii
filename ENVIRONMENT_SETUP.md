# 🔧 Environment Setup Guide

## Overview

The EvalBee OMR system uses environment variables to configure service URLs and settings for different environments (development, production).

## Environment Files Structure

```
techii/
├── .env                    # Frontend production config
├── .env.local             # Frontend development config (git ignored)
├── .env.example           # Frontend template
├── server/
│   ├── .env               # Backend production config
│   ├── .env.local         # Backend development config (git ignored)
│   └── .env.example       # Backend template
└── python_omr_checker/
    ├── .env               # Python service production config
    ├── .env.local         # Python service development config (git ignored)
    └── .env.example       # Python service template
```

## Production URLs (Current Deployment)

### Service URLs
- **Frontend**: `https://ultra-precision-omr-frontend.onrender.com`
- **Node.js Backend**: `https://ultra-precision-omr-backend.onrender.com`
- **Python OMR Service**: `https://ultra-precision-python-omr.onrender.com`

### Production Configuration

#### Frontend (.env)
```bash
VITE_API_BASE_URL=https://ultra-precision-omr-backend.onrender.com/api
VITE_PYTHON_OMR_URL=https://ultra-precision-python-omr.onrender.com
VITE_DEBUG_MODE=false
```

#### Node.js Backend (server/.env)
```bash
NODE_ENV=production
FRONTEND_URL=https://ultra-precision-omr-frontend.onrender.com
PYTHON_OMR_URL=https://ultra-precision-python-omr.onrender.com
CORS_ORIGINS=https://ultra-precision-omr-frontend.onrender.com,https://ultra-precision-python-omr.onrender.com
```

#### Python OMR Service (python_omr_checker/.env)
```bash
FLASK_ENV=production
FRONTEND_URL=https://ultra-precision-omr-frontend.onrender.com
BACKEND_URL=https://ultra-precision-omr-backend.onrender.com
CORS_ORIGINS=https://ultra-precision-omr-frontend.onrender.com,https://ultra-precision-omr-backend.onrender.com
```

## Development Setup

### Local Development URLs
- **Frontend**: `http://localhost:5173`
- **Node.js Backend**: `http://localhost:10000`
- **Python OMR Service**: `http://localhost:5000`

### Development Configuration

#### Frontend (.env.local)
```bash
VITE_API_BASE_URL=http://localhost:10000/api
VITE_PYTHON_OMR_URL=http://localhost:5000
VITE_DEBUG_MODE=true
```

#### Node.js Backend (server/.env.local)
```bash
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
PYTHON_OMR_URL=http://localhost:5000
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

#### Python OMR Service (python_omr_checker/.env.local)
```bash
FLASK_ENV=development
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:10000
CORS_ORIGINS=http://localhost:5173,http://localhost:10000,http://localhost:3000
```

## Setup Instructions

### 1. Production Deployment
Production environment variables are already configured in `.env` files and Render deployment configs.

### 2. Local Development Setup

#### Step 1: Copy Environment Files
```bash
# Frontend
cp .env.example .env.local

# Backend
cp server/.env.example server/.env.local

# Python OMR Service
cp python_omr_checker/.env.example python_omr_checker/.env.local
```

#### Step 2: Update Development URLs
The `.env.local` files are already created with correct development URLs.

#### Step 3: Start Services
```bash
# Terminal 1: Frontend
npm run dev

# Terminal 2: Backend
cd server && npm run dev

# Terminal 3: Python OMR Service
cd python_omr_checker && python omr_server.py
```

## Environment Variable Priority

### Frontend (Vite)
1. `.env.local` (highest priority, git ignored)
2. `.env` (production config)
3. `.env.example` (template only)

### Node.js Backend
1. `server/.env.local` (highest priority, git ignored)
2. `server/.env` (production config)
3. `server/.env.example` (template only)

### Python OMR Service
1. `python_omr_checker/.env.local` (highest priority, git ignored)
2. `python_omr_checker/.env` (production config)
3. `python_omr_checker/.env.example` (template only)

## Communication Flow

### Development
```
Frontend (5173) ←→ Node.js Backend (10000) ←→ Python OMR (5000)
     ↓                                              ↑
     └─────────── Direct Communication ─────────────┘
```

### Production
```
Frontend (Render) ←→ Node.js Backend (Render) ←→ Python OMR (Render)
     ↓                                                    ↑
     └─────────────── Direct Communication ──────────────┘
```

## API Methods

### Frontend API Service

#### Hybrid Processing (Recommended)
```typescript
// Try direct Python first, fallback to Node.js backend
const result = await apiService.processOMRHybrid(
  file, answerKey, scoring, examId, examData
)
```

#### Direct Python OMR
```typescript
// Direct communication with Python service
const result = await apiService.processOMRDirectly(
  file, answerKey, examId, 'evalbee'
)
```

#### Via Node.js Backend
```typescript
// Via Node.js backend (with authentication, validation, etc.)
const result = await apiService.processOMRWithEvalBee(
  file, answerKey, scoring, examId, examData
)
```

## Health Checks

### Check All Services
```typescript
// Frontend health (implicit)
const frontendOk = window.location.href.includes('localhost:5173')

// Backend health
const backendHealth = await apiService.healthCheck()

// Python OMR health
const pythonHealth = await apiService.checkPythonOMRHealth()
```

### Manual Health Checks
```bash
# Development
curl http://localhost:5173/          # Frontend
curl http://localhost:10000/api/health  # Backend
curl http://localhost:5000/health       # Python OMR

# Production
curl https://ultra-precision-omr-frontend.onrender.com/
curl https://ultra-precision-omr-backend.onrender.com/api/health
curl https://ultra-precision-python-omr.onrender.com/health
```

## Troubleshooting

### Common Issues

#### 1. CORS Errors
- Check `CORS_ORIGINS` in all service `.env` files
- Ensure URLs match exactly (no trailing slashes)

#### 2. Service Connection Errors
- Verify service URLs in `.env` files
- Check if all services are running
- Use health check endpoints

#### 3. Environment Not Loading
- Check file names (`.env.local` for development)
- Restart services after changing environment variables
- Verify environment variable names (VITE_ prefix for frontend)

### Debug Commands

```bash
# Check environment variables
echo $VITE_API_BASE_URL           # Frontend
echo $PYTHON_OMR_URL              # Backend
echo $FRONTEND_URL                # Python OMR

# Test service connectivity
curl -v http://localhost:5000/health
curl -v http://localhost:10000/api/health
```

## Security Notes

- `.env.local` files are git ignored for security
- Production secrets are managed via Render dashboard
- API keys and sensitive data should never be in git
- Use different secrets for development and production

---

This setup ensures proper service communication in both development and production environments with appropriate security and flexibility.