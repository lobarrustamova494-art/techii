# 🔧 Render Manual Setup - Backend Deploy Fix

## ❌ Muammo: 
```
sh: 1: Syntax error: end of file unexpected (expecting "then")
==> Build failed 😞
```

## ✅ Yechim: Manual Service Setup

### 1. **Backend Service (Manual)**

Render Dashboard da quyidagi sozlamalarni kiriting:

#### Basic Settings:
```
Name: ultra-precision-omr-backend
Environment: Node
Region: Oregon (yoki yaqin region)
Branch: main
Root Directory: (bo'sh qoldiring)
```

#### Build & Deploy:
```
Build Command: cd server && npm install && npm run build
Start Command: cd server && npm start
```

#### Advanced Settings:
```
Node Version: 18 (yoki 20)
Health Check Path: /health
Auto-Deploy: Yes
```

### 2. **Environment Variables**

Service yaratilgandan keyin **Environment** tab ga quyidagilarni qo'shing:

```bash
NODE_ENV=production
PORT=10000
JWT_SECRET=your_jwt_secret_here_32_characters_min
JWT_EXPIRES_IN=7d
GROQ_API_KEY=your_groq_api_key
OPENAI_API_KEY=your_openai_api_key
MAX_FILE_SIZE=10485760
UPLOAD_TIMEOUT=30000
AI_TIMEOUT=60000
```

### 3. **Database Connection**

MongoDB yaratgandan keyin:
```bash
MONGODB_URI=mongodb://username:password@host:port/database
```

### 4. **Frontend URL (keyinroq)**

Frontend deploy bo'lgandan keyin qo'shing:
```bash
FRONTEND_URL=https://your-frontend-name.onrender.com
```

## 🚀 Deploy Qadamlari:

1. **Database yarating** (MongoDB yoki PostgreSQL)
2. **Backend service yarating** (yuqoridagi sozlamalar bilan)
3. **Environment variables qo'shing**
4. **Deploy tugashini kuting** (5-10 daqiqa)
5. **Health check test qiling**: `https://your-backend.onrender.com/health`

## 🔍 Test Commands:

```bash
# Health check
curl https://your-backend-name.onrender.com/health

# API test
curl https://your-backend-name.onrender.com/api/test
```

## ⚠️ Muhim:

- **render.yaml ishlatmang** - manual setup ishlatamiz
- **Environment variables** to'liq to'ldiring
- **Database** birinchi yarating
- **API keys** tayyorlang

Deploy muvaffaqiyatli bo'lgandan keyin frontend uchun ham xuddi shunday qilamiz!