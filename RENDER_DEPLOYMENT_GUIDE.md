# 🚀 Ultra-Precision OMR System - Render Deployment Guide

## 📋 Pre-Deployment Checklist

### ✅ Repository Preparation
- [x] Updated render.yaml configuration
- [x] Production-ready package.json files
- [x] Health check endpoint added
- [x] Environment variables configured
- [x] Dockerfile created (optional)

---

## 🔧 Render Dashboard Setup

### 1. **Create New Web Service (Backend)**

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository: `https://github.com/lobarrustamova494-art/techii.git`
4. Configure service:

```yaml
Name: ultra-precision-omr-backend
Environment: Node
Region: Oregon (or closest to your users)
Branch: main
Root Directory: (leave empty)
Build Command: cd server && npm install && npm run build
Start Command: cd server && npm start
```

### 2. **Environment Variables (Backend)**

Set these in Render Dashboard → Service → Environment:

```bash
# Auto-configured by Render
NODE_ENV=production
PORT=10000

# Database (auto-connected)
MONGODB_URI=[Auto-generated from database]

# Security (auto-generated)
JWT_SECRET=[Auto-generated]
JWT_EXPIRES_IN=7d

# Frontend URL (set after frontend deployment)
FRONTEND_URL=https://ultra-precision-omr-frontend.onrender.com

# AI Services (IMPORTANT: Set these manually)
GROQ_API_KEY=your_groq_api_key_here
OPENAI_API_KEY=your_openai_api_key_here

# Performance
MAX_FILE_SIZE=10485760
UPLOAD_TIMEOUT=30000
AI_TIMEOUT=60000
```

### 3. **Create Database**

1. In Render Dashboard → **"New +"** → **"PostgreSQL"** or **"MongoDB"**
2. Configure:
```yaml
Name: ultra-omr-db
Database Name: ultra_precision_omr
User: omr_admin
Plan: Free (or Starter for better performance)
```

### 4. **Create Static Site (Frontend)**

1. **"New +"** → **"Static Site"**
2. Same repository: `https://github.com/lobarrustamova494-art/techii.git`
3. Configure:

```yaml
Name: ultra-precision-omr-frontend
Branch: main
Root Directory: (leave empty)
Build Command: npm install && npm run build
Publish Directory: dist
```

---

## 🔗 Service Configuration

### Backend Service Settings:
- **Plan**: Starter ($7/month) for better performance
- **Health Check Path**: `/health`
- **Auto-Deploy**: Enabled
- **Environment**: Node 18+

### Frontend Service Settings:
- **Plan**: Free (Static sites are free)
- **Auto-Deploy**: Enabled
- **Custom Headers**: Security headers included

---

## 🌐 Environment Variables Setup

### Critical Variables to Set Manually:

1. **GROQ_API_KEY**
   ```
   Get from: https://console.groq.com/
   Purpose: Fallback AI analysis
   ```

2. **OPENAI_API_KEY**
   ```
   Get from: https://platform.openai.com/
   Purpose: Ultra-precision vision analysis
   ```

3. **FRONTEND_URL**
   ```
   Set to: https://ultra-precision-omr-frontend.onrender.com
   Purpose: CORS configuration
   ```

---

## 📊 Deployment Steps

### Step 1: Deploy Database
```bash
1. Create MongoDB database in Render
2. Note the connection string
3. Database will auto-connect to backend service
```

### Step 2: Deploy Backend
```bash
1. Create web service from GitHub repo
2. Set environment variables
3. Connect database
4. Deploy and wait for build
5. Test health endpoint: https://your-backend.onrender.com/health
```

### Step 3: Deploy Frontend
```bash
1. Create static site from same repo
2. Update API endpoints to point to backend
3. Deploy and test
```

### Step 4: Configure API Endpoints
Update frontend API base URL:
```typescript
// In src/services/api.ts
const API_BASE_URL = 'https://ultra-precision-omr-backend.onrender.com/api'
```

---

## 🔍 Post-Deployment Testing

### 1. Health Check
```bash
curl https://ultra-precision-omr-backend.onrender.com/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2026-01-08T...",
  "uptime": 123.45,
  "environment": "production",
  "version": "2.0.0",
  "services": {
    "database": "connected",
    "ai": "operational", 
    "omr": "ultra-precision"
  }
}
```

### 2. API Endpoints Test
```bash
# Test authentication
curl -X POST https://ultra-precision-omr-backend.onrender.com/api/auth/login

# Test OMR analysis
curl -X POST https://ultra-precision-omr-backend.onrender.com/api/ai/status
```

### 3. Frontend Test
1. Visit: `https://ultra-precision-omr-frontend.onrender.com`
2. Test login functionality
3. Test OMR upload and analysis
4. Verify 60% threshold detection

---

## ⚡ Performance Optimization

### Backend Optimizations:
- **Plan**: Upgrade to Starter for better CPU/memory
- **Region**: Choose closest to your users
- **Caching**: Redis cache (optional upgrade)

### Frontend Optimizations:
- **CDN**: Automatic with Render static sites
- **Compression**: Gzip enabled by default
- **Caching**: Browser caching configured

---

## 🔒 Security Configuration

### Headers (Auto-configured):
```yaml
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000
```

### CORS Settings:
```javascript
origin: [
  'https://ultra-precision-omr-frontend.onrender.com',
  /\.onrender\.com$/
]
```

---

## 📈 Monitoring & Logs

### Render Dashboard Features:
- **Metrics**: CPU, Memory, Response time
- **Logs**: Real-time application logs
- **Alerts**: Email notifications for issues
- **Health Checks**: Automatic service monitoring

### Log Monitoring:
```bash
# View logs in Render Dashboard
# Or use Render CLI
render logs -s ultra-precision-omr-backend
```

---

## 🚨 Troubleshooting

### Common Issues:

1. **Build Failures**
   ```bash
   # Check Node.js version compatibility
   # Verify package.json scripts
   # Check TypeScript compilation
   ```

2. **Environment Variables**
   ```bash
   # Ensure all required vars are set
   # Check API keys are valid
   # Verify database connection string
   ```

3. **CORS Issues**
   ```bash
   # Update FRONTEND_URL in backend
   # Check origin configuration
   # Verify domain names match
   ```

4. **Database Connection**
   ```bash
   # Check MongoDB URI format
   # Verify network access
   # Test connection in logs
   ```

---

## 🎯 Success Criteria

### Deployment Successful When:
- ✅ Health check returns 200 OK
- ✅ Frontend loads without errors
- ✅ User can login successfully
- ✅ OMR analysis works with 60% threshold
- ✅ All API endpoints respond correctly
- ✅ Database operations function properly

---

## 📞 Support Resources

- **Render Documentation**: https://render.com/docs
- **GitHub Repository**: https://github.com/lobarrustamova494-art/techii.git
- **Health Check**: `/health` endpoint
- **API Status**: `/api/ai/status` endpoint

---

## 🎉 Deployment Complete!

Once deployed successfully:

1. **Backend URL**: `https://ultra-precision-omr-backend.onrender.com`
2. **Frontend URL**: `https://ultra-precision-omr-frontend.onrender.com`
3. **Health Check**: `https://ultra-precision-omr-backend.onrender.com/health`

**Ultra-Precision OMR System is now live on Render! 🚀**