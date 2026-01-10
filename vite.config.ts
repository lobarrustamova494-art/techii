import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [
    react({
      // Optimize JSX runtime
      jsxRuntime: 'automatic'
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser',
    target: 'es2020',
    // Optimize chunk size limits
    chunkSizeWarningLimit: 800,
    // Enable tree shaking
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html')
      },
      output: {
        // Aggressive chunk splitting for optimal loading
        manualChunks: (id: string) => {
          // Core React libraries
          if (id.indexOf('react') !== -1 || id.indexOf('react-dom') !== -1) {
            return 'react-vendor'
          }
          // Router
          if (id.indexOf('react-router-dom') !== -1) {
            return 'router'
          }
          // UI libraries
          if (id.indexOf('lucide-react') !== -1 || id.indexOf('clsx') !== -1 || id.indexOf('tailwind-merge') !== -1) {
            return 'ui-vendor'
          }
          // Heavy PDF libraries - separate chunks (lazy loaded)
          if (id.indexOf('jspdf') !== -1) {
            return 'pdf-jspdf'
          }
          if (id.indexOf('html2canvas') !== -1) {
            return 'pdf-html2canvas'
          }
          // API and utilities
          if (id.indexOf('axios') !== -1 || id.indexOf('form-data') !== -1) {
            return 'api-vendor'
          }
          // Large components - separate chunks
          if (id.indexOf('EvalBeeCameraScanner') !== -1) {
            return 'camera-scanner'
          }
          if (id.indexOf('MobileDebugModal') !== -1) {
            return 'debug-modal'
          }
          // Node modules
          if (id.indexOf('node_modules') !== -1) {
            return 'vendor'
          }
        },
        // Optimize chunk names
        chunkFileNames: 'chunks/[name]-[hash].js',
        // Optimize asset names
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name?.split('.') || []
          const ext = info[info.length - 1]
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
            return `assets/images/[name]-[hash][extname]`
          }
          if (/css/i.test(ext)) {
            return `assets/css/[name]-[hash][extname]`
          }
          return `assets/[name]-[hash][extname]`
        }
      }
    },
    // Optimize terser settings for better compression
    terserOptions: {
      compress: {
        drop_console: false, // Keep console.log for debugging
        drop_debugger: true,
        pure_funcs: ['console.debug'], // Only remove console.debug
        passes: 2, // Multiple passes for better compression
        unsafe_arrows: true,
        unsafe_methods: true,
        unsafe_proto: true
      },
      mangle: {
        safari10: true
      },
      format: {
        comments: false
      }
    },
    // Enable CSS code splitting
    cssCodeSplit: true,
    // Optimize asset inlining
    assetsInlineLimit: 2048 // Reduced inline limit
  },
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'lucide-react',
      'clsx',
      'tailwind-merge',
      'axios'
    ],
    exclude: [
      'jspdf',
      'html2canvas'
    ]
  },
  define: {
    __APP_VERSION__: JSON.stringify('2.0.0'),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString())
  }
})