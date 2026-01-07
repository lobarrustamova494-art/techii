# Stitch OMR - Imtihon Boshqaruv Tizimi

OMR (Optical Mark Recognition) imtihon boshqaruv tizimi TypeScript va React yordamida qurilgan.

## Deploy

### Render.com da deploy qilish

1. **GitHub repository ni Render.com ga ulang**
2. **Frontend uchun Static Site yarating:**
   - Build Command: `npm install && npm run build`
   - Publish Directory: `dist`
   - Environment Variables:
     - `VITE_API_URL`: Backend URL manzili

3. **Backend uchun Web Service yarating:**
   - Build Command: `cd server && npm install && npm run build`
   - Start Command: `cd server && npm start`
   - Environment Variables:
     - `NODE_ENV`: production
     - `PORT`: 10000
     - `MONGODB_URI`: MongoDB connection string
     - `JWT_SECRET`: JWT secret key
     - `JWT_EXPIRES_IN`: 7d
     - `FRONTEND_URL`: Frontend URL manzili

4. **MongoDB Atlas database yarating va connection string ni qo'shing**

## Environment Variables

### Frontend (.env)
```env
VITE_API_URL=https://your-backend-url.onrender.com/api
```

### Backend (server/.env)
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/omr_system
PORT=10000
NODE_ENV=production
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d
FRONTEND_URL=https://your-frontend-url.onrender.com
```

## Xususiyatlar

- **Admin Boshqaruv Paneli** - asosiy boshqaruv paneli
- **Imtihon Yaratish** - imtihon yaratish interfeysi
- **OMR Varaq Yaratish** - OMR varaqlarini yaratish
- **Skan Yuklash Interfeysi** - skanerlangan varaqlarni yuklash
- **Backend API** - MongoDB bilan to'liq backend server
- **Yaxshilangan Loading Komponentlari** - professional spinner va loader komponentlari
- **AI Tahlilchi** - Groq AI yordamida rasm va matn tahlili

## Texnologiyalar

### Frontend
- React 18
- TypeScript
- Vite
- Tailwind CSS
- React Router DOM
- Lucide React (ikonlar)
- jsPDF & html2canvas (PDF/WebP export)

### Backend
- Node.js
- Express.js
- TypeScript
- MongoDB (Mongoose)
- JWT Authentication
- Joi Validation
- Helmet (Security)
- CORS

## O'rnatish

### Frontend
```bash
npm install
```

### Backend
```bash
cd server
npm install
```

## Konfiguratsiya

### Backend Environment Variables
`server/.env` faylini yarating:
```env
# Database
MONGODB_URI=your_mongodb_connection_string

# Server
PORT=5000
NODE_ENV=development

# JWT
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d

# CORS
FRONTEND_URL=http://localhost:5173
```

## Ishga tushirish

### Backend serverni ishga tushirish
```bash
cd server
npm run dev
```
Server `http://localhost:5000` da ishga tushadi.

### Frontend ishga tushirish
```bash
npm run dev
```
Frontend `http://localhost:5173` da ishga tushadi.

## API Endpoints

### Health Check
- `GET /api/health` - Server holatini tekshirish

### Authentication (kelgusida)
- `POST /api/auth/register` - Ro'yxatdan o'tish
- `POST /api/auth/login` - Kirish
- `GET /api/auth/me` - Foydalanuvchi ma'lumotlari

### Subjects (kelgusida)
- `GET /api/subjects` - Mavzular ro'yxati
- `POST /api/subjects` - Yangi mavzu yaratish
- `PUT /api/subjects/:id` - Mavzuni yangilash
- `DELETE /api/subjects/:id` - Mavzuni o'chirish

### Exams (kelgusida)
- `GET /api/exams` - Imtihonlar ro'yxati
- `POST /api/exams` - Yangi imtihon yaratish
- `PUT /api/exams/:id` - Imtihonni yangilash
- `DELETE /api/exams/:id` - Imtihonni o'chirish

## Ma'lumotlar bazasi modellari

### User
- Foydalanuvchi ma'lumotlari (admin, teacher, student)
- JWT authentication

### Subject
- Mavzu va bo'limlar
- Har bir bo'lim uchun savol turlari va baholash

### Exam
- Imtihon ma'lumotlari
- Mavzular bilan bog'lanish
- OMR konfiguratsiyasi

### Student
- O'quvchi ma'lumotlari
- Roll raqami va sinf ma'lumotlari

### OMRSheet
- Yaratilgan OMR varaqlar
- PDF/WebP fayllar

### ExamResult
- Imtihon natijalari
- Javoblar va ballar

## Loyiha strukturasi

```
├── src/                    # Frontend
│   ├── components/
│   │   ├── layout/
│   │   ├── ui/
│   │   └── OMRSheet.tsx
│   ├── pages/
│   ├── types/
│   ├── utils/
│   └── lib/
├── server/                 # Backend
│   ├── src/
│   │   ├── config/
│   │   ├── models/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── utils/
│   │   └── server.ts
│   └── .env
└── README.md
```

## Yangi Loading Komponentlari

Loyihada professional va zamonaviy loading komponentlari qo'shildi:

### LoadingSpinner
- **5 xil variant**: default, dots, pulse, bars, ring
- **5 xil o'lcham**: xs, sm, md, lg, xl
- **6 xil rang**: primary, secondary, success, warning, error, current
- **Matn bilan**: loading matn ko'rsatish imkoniyati
- **Full screen rejim**: butun ekranni qoplash

### SkeletonLoader
- **6 xil variant**: text, circular, rectangular, card, list, table
- **Moslashuvchan o'lcham**: width va height sozlash
- **Animatsiya**: yoqish/o'chirish imkoniyati
- **Ko'p qatorli**: text uchun qator soni

### ProgressBar
- **4 xil variant**: default, success, warning, error, gradient
- **3 xil o'lcham**: sm, md, lg
- **Label ko'rsatish**: foiz va matn
- **Animatsiya**: smooth transition

### LoadingButton
- **Loading holati**: avtomatik spinner ko'rsatish
- **Custom matn**: loading paytida boshqa matn
- **Icon qo'llab-quvvatlash**: button icon bilan
- **Barcha Button variantlari**: default, outline, ghost, destructive

### LoadingOverlay
- **Full screen overlay**: butun sahifani qoplash
- **Blur effekt**: orqa fon xiralashishi
- **Custom content**: qo'shimcha kontent qo'shish
- **Responsive**: barcha ekran o'lchamlari uchun

### LoadingState
- **4 xil variant**: page, card, inline, overlay
- **Skeleton yoki spinner**: ikki xil loading turi
- **Moslashuvchan**: har xil holatlar uchun

## Ishlatish misollari

```tsx
// Oddiy spinner
<LoadingSpinner size="lg" variant="dots" color="primary" />

// Matn bilan spinner
<LoadingSpinner 
  size="md" 
  variant="pulse" 
  text="Yuklanmoqda..." 
/>

// Loading button
<LoadingButton
  loading={isLoading}
  loadingText="Saqlanmoqda..."
  icon={<Save size={16} />}
  onClick={handleSave}
>
  Saqlash
</LoadingButton>

// Progress bar
<ProgressBar 
  value={progress} 
  variant="success"
  showLabel={true}
  label="Yuklanish jarayoni"
/>

// Skeleton loader
<SkeletonLoader variant="card" />
<SkeletonLoader variant="list" lines={5} />

// Loading overlay
<LoadingOverlay 
  isVisible={showOverlay}
  message="Jarayon davom etmoqda..."
  variant="pulse"
/>

// Loading state
<LoadingState 
  type="skeleton" 
  variant="page"
  skeletonType="list"
  lines={3}
/>
```

## AI Tahlilchi Xususiyatlari

Loyihaga Groq AI yordamida kuchli tahlil funksiyalari qo'shildi:

### Rasm Tahlili
- **OCR (Optical Character Recognition)** - rasmdan matnni ajratib olish
- **Ko'p tilni qo'llab-quvvatlash** - o'zbek, rus, ingliz tillari
- **Yuqori aniqlik** - 95% gacha aniqlik darajasi
- **Maxsus ko'rsatmalar** - foydalanuvchi o'z ko'rsatmasini berishi mumkin
- **Xatolarni aniqlash** - matn xatolarini topish va ko'rsatish

### Matn Yaxshilash
- **Grammatik tekshirish** - o'zbek tilidagi grammatik xatolarni topish
- **Uslub yaxshilash** - matn uslubini professional qilish
- **Kontekst hisobga olish** - matn turini (rasmiy, ilmiy, etc.) hisobga olish
- **Takliflar berish** - matnni yaxshilash bo'yicha takliflar

### Savol Tahlili
- **Qiyinlik darajasini aniqlash** - oson, o'rta, qiyin
- **Savol sifatini baholash** - savollar professional ekanligini tekshirish
- **Yaxshilash takliflari** - savollarni qanday yaxshilash mumkinligi
- **Avtomatik yaxshilash** - AI tomonidan yaxshilangan savollar

### Texnik Xususiyatlar
- **Groq AI** - tez va aniq AI model
- **Vision Model** - llama-3.2-11b-vision-preview rasm tahlili uchun
- **Text Model** - llama-3.1-70b-versatile matn tahlili uchun
- **Xavfsizlik** - JWT authentication bilan himoyalangan
- **File Upload** - 10MB gacha rasm yuklash imkoniyati
- **Real-time** - tez natija olish

### Qo'llab-quvvatlanadigan Formatlar
- **Rasmlar**: JPEG, PNG, WebP
- **Maksimal hajm**: 10MB
- **Base64 encoding** - xavfsiz fayl uzatish
- **Progress tracking** - jarayon ko'rsatkichi

## Ishlatish

### AI Tahlilchiga kirish
1. Dashboard dan "AI Tahlilchi" tugmasini bosing
2. Yoki to'g'ridan-to'g'ri `/ai-analysis` sahifasiga o'ting

### Rasm tahlili
```typescript
// Frontend da
const result = await AIService.analyzeImage(imageFile, "Faqat savol matnlarini ajrat")

// Backend API
POST /api/ai/analyze-image
{
  "image": "base64_encoded_image",
  "prompt": "optional_custom_prompt"
}
```

### Matn yaxshilash
```typescript
// Frontend da
const result = await AIService.analyzeText("Tahlil qilinadigan matn", "Rasmiy xat")

// Backend API
POST /api/ai/analyze-text
{
  "text": "your_text_here",
  "context": "optional_context"
}
```

### Savol tahlili
```typescript
// Frontend da
const result = await AIService.analyzeQuestions(["Savol 1", "Savol 2"])

// Backend API
POST /api/ai/analyze-questions
{
  "questions": ["question1", "question2"]
}
```

- **PDF Export** - Yuqori sifatli PDF fayllar
- **WebP Export** - Optimallashtirilgan rasm fayllar
- **Ko'p sahifali PDF** - Bir nechta to'plamlar uchun
- **Progress tracking** - Yuklanish jarayoni ko'rsatkichi

## Sahifalar

1. **Boshqaruv Paneli (/)** - asosiy sahifa
2. **Imtihon Yaratish (/exam-creation)** - 3 bosqichli imtihon yaratish
3. **OMR Varaq Yaratish (/omr-generation)** - OMR varaq yaratish va export
4. **Skan Yuklash (/scan-upload)** - skan yuklash
5. **AI Tahlilchi (/ai-analysis)** - rasm va matn tahlili
6. **Loading Demo (/loading-demo)** - yangi loading komponentlarini sinash

Loyiha to'liq o'zbek tilida tayyorlangan va quyidagi xususiyatlarni o'z ichiga oladi:
- O'zbek tilidagi interfeys
- Mahalliy formatlar
- O'zbek tilidagi xabar va bildirishnomalar
- MongoDB ma'lumotlari o'zbek tilida

## Xavfsizlik

- Helmet.js - HTTP headers xavfsizligi
- Rate limiting - So'rovlar cheklash
- CORS - Cross-origin requests boshqaruvi
- JWT - Token-based authentication
- Input validation - Joi bilan ma'lumotlar tekshiruvi

## Development

```bash
# Frontend development
npm run dev

# Backend development
cd server && npm run dev

# Build frontend
npm run build

# Build backend
cd server && npm run build
```