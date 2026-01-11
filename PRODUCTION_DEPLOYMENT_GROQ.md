# GROQ AI Production Deployment Guide

## 🚀 Production Environment Setup

### 1. Render.com Environment Variables

Python OMR Service uchun quyidagi environment variable qo'shing:

```bash
GROQ_API=your_groq_api_key_here
```

### 2. Frontend Environment Variables

Frontend uchun GROQ AI ni yoqish:

```bash
VITE_ENABLE_GROQ_AI=true
```

### 3. Processing Priority Order

Production muhitida quyidagi tartibda ishlatiladi:

1. **EvalBee Professional** (primary - eng barqaror)
2. **Anchor-Based** (backup - langor + piksel tahlili)
3. **GROQ AI** (agar yoqilgan bo'lsa)
4. **Direct Python** (fallback)
5. **Node.js Backend** (final fallback)

### 4. GROQ AI Features

- **Model**: `llama-3.3-70b-versatile`
- **OpenCV + AI** hybrid tahlil
- **Real-time quality assessment**
- **Uzbek tilida tavsiyalar**
- **Confidence scoring**
- **Comparison with traditional methods**

### 5. Production Stability

- GROQ AI default holatda o'chirilgan (production stability uchun)
- Environment variable orqali yoqish/o'chirish mumkin
- Xatolik holatida avtomatik fallback
- Comprehensive error handling

### 6. Deployment Steps

1. **Python Service**:
   ```bash
   # Render.com da environment variable qo'shing:
   GROQ_API=your_groq_api_key_here
   ```

2. **Frontend**:
   ```bash
   # GROQ AI ni yoqish uchun:
   VITE_ENABLE_GROQ_AI=true
   ```

3. **Deploy**:
   ```bash
   git add .
   git commit -m "Production GROQ AI deployment"
   git push origin main
   ```

### 7. Testing

Production da test qilish:

```bash
# Local test
node test_groq_ai_omr.cjs

# Production test
# EvalBee Camera Scanner orqali test qiling
```

### 8. Monitoring

- Server logs orqali GROQ AI holatini kuzating
- Error rates ni monitoring qiling
- Performance metrics ni tekshiring

### 9. Troubleshooting

**Agar GROQ AI ishlamasa:**
- Environment variable to'g'ri qo'shilganini tekshiring
- API key haqiqiyligini tekshiring
- Server logs ni ko'ring
- Fallback methods avtomatik ishga tushadi

**Common Issues:**
- `model_decommissioned` - model yangilanishi kerak
- `invalid_api_key` - API key noto'g'ri
- `rate_limit_exceeded` - so'rovlar soni ko'p

### 10. Performance

- **GROQ AI**: 2-4 sekund (eng aniq)
- **Professional**: 1-2 sekund (barqaror)
- **Anchor-Based**: 1-3 sekund (yaxshi)
- **Traditional**: 0.5-1 sekund (tez)

## 🎯 Production Ready!

Tizim production muhitida to'liq ishga tayyor va barcha fallback mexanizmlari mavjud.