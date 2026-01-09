# 🐛 EvalBee Mobile Debug System

## Overview

EvalBee Camera Scanner endi professional mobile debugging tizimi bilan jihozlangan. Bu tizim telefonda real-time log monitoring va debugging imkoniyatlarini beradi.

## Features

### 📱 Mobile Debug Modal
- **Real-time log capture**: Console loglarni real-time da yig'adi
- **Log filtering**: Error, Warning, Info, Log darajalariga bo'lingan
- **Copy functionality**: Har bir log yoki barcha loglarni copy qilish
- **Export functionality**: Loglarni fayl sifatida export qilish
- **Mobile-optimized UI**: Telefon uchun optimallashtirilgan interfeys

### 🎯 Debug Button Locations
1. **EvalBee Camera Scanner Page**: Exam ma'lumotlari yonida debug tugmasi
2. **Camera Interface**: Kamera ochiq bo'lganda ham debug tugmasi mavjud

### 📊 Automatic Logging
- Camera initialization
- Quality analysis metrics
- Capture status changes
- Processing errors
- API responses

## Usage Instructions

### 1. Debug Modal ochish
```
1. EvalBee Camera Scanner sahifasiga o'ting
2. Debug tugmasini bosing (Bug icon bilan)
3. Modal oyna ochiladi
```

### 2. Log Capture
```
- Start Logging: Loglarni yig'ishni boshlash
- Stop Logging: Loglarni yig'ishni to'xtatish
- Clear: Barcha loglarni o'chirish
```

### 3. Copy Functions
```
- Copy tugmasi (har bir log yonida): Bitta logni copy qilish
- Copy All tugmasi: Barcha loglarni copy qilish
- Export tugmasi: Loglarni .txt fayl sifatida yuklab olish
```

### 4. Mobile Testing
```
1. Telefonda EvalBee Camera Scanner ochish
2. Debug tugmasini bosish
3. Camera ishlatish va loglarni kuzatish
4. Xatoliklarni copy qilib developer bilan bo'lishish
```

## Log Types

### 🔵 Info Logs
- Camera initialization
- Quality metrics
- Capture events

### 🟡 Warning Logs
- Quality issues
- Performance warnings
- User guidance

### 🔴 Error Logs
- Camera errors
- API failures
- Processing errors

### ⚪ Debug Logs
- Detailed analysis data
- Internal state changes

## Technical Implementation

### Console Logger Hook
```typescript
const {
  logs,
  isCapturing,
  startCapturing,
  stopCapturing,
  clearLogs,
  exportLogs
} = useConsoleLogger()
```

### Mobile Debug Modal
```typescript
<MobileDebugModal
  isOpen={showDebugModal}
  onClose={() => setShowDebugModal(false)}
  logs={logs}
  isCapturing={isLoggingActive}
  onStartCapturing={startLogging}
  onStopCapturing={stopLogging}
  onClearLogs={clearLogs}
  onExportLogs={exportLogs}
/>
```

### Camera Integration
```typescript
// Camera component automatically logs:
console.log('📊 EvalBee Camera Analysis:', metrics)
console.log('🎯 Capture status changed:', status)
console.log('📸 Image captured:', details)
```

## Benefits

### 👨‍💻 For Developers
- Real-time debugging on mobile devices
- Easy error reproduction and sharing
- Performance monitoring
- Quality analysis insights

### 👥 For Users
- Better support experience
- Easy error reporting
- Transparent system behavior
- Professional debugging tools

### 🔧 For Support
- Detailed error logs
- Copy-paste functionality
- Export capabilities
- Mobile-friendly interface

## Example Usage Scenarios

### Scenario 1: Camera Quality Issues
```
1. User reports poor image quality
2. Open Debug Modal
3. Start logging
4. Use camera and observe quality metrics
5. Copy relevant logs
6. Share with support team
```

### Scenario 2: Processing Errors
```
1. User encounters processing error
2. Debug modal shows error details
3. Copy error log with full context
4. Developer can reproduce and fix
```

### Scenario 3: Performance Analysis
```
1. Monitor camera performance metrics
2. Export logs for analysis
3. Identify bottlenecks
4. Optimize system performance
```

## File Structure

```
techii/
├── src/
│   ├── hooks/
│   │   └── useConsoleLogger.ts          # Console logging hook
│   ├── components/
│   │   ├── MobileDebugModal.tsx         # Debug modal component
│   │   └── EvalBeeCameraScanner.tsx     # Camera with debug logging
│   └── pages/
│       └── EvalBeeCameraScanner.tsx     # Page with debug button
├── test_mobile_debug.html               # Test page for debugging
└── MOBILE_DEBUG_GUIDE.md               # This guide
```

## Testing

### Test Page
`test_mobile_debug.html` faylida test funksiyalari mavjud:
- Info log generation
- Warning log generation  
- Error log generation
- Camera flow simulation

### Manual Testing
1. Telefonda sahifani oching
2. Debug tugmasini bosing
3. Loglarni generate qiling
4. Copy funksiyalarini test qiling
5. Export funksiyasini test qiling

## Future Enhancements

- [ ] Log filtering by type
- [ ] Search functionality in logs
- [ ] Log persistence across sessions
- [ ] Remote log sharing
- [ ] Performance metrics dashboard
- [ ] Automatic error reporting

---

**Note**: Bu debugging tizimi faqat development va testing uchun mo'ljallangan. Production da log capture avtomatik ravishda o'chirilishi mumkin.