import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [
    react({
      // Enable React Fast Refresh
      fastRefresh: true,
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
    // Optimize chunk splitting
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html')
      },
      output: {
        // Better chunk splitting for optimal loading
        manualChunks: {
          // Core React libraries
          'react-vendor': ['react', 'react-dom'],
          // Router
          'router': ['react-router-dom'],
          // UI libraries
          'ui-vendor': ['lucide-react', 'clsx', 'tailwind-merge'],
          // Heavy libraries
          'pdf-vendor': ['jspdf', 'html2canvas'],
          // API and utilities
          'utils': ['axios', 'form-data']
        },
        // Optimize chunk names
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId
          if (facadeModuleId) {
            const name = path.basename(facadeModuleId, path.extname(facadeModuleId))
            return `chunks/${name}-[hash].js`
          }
          return 'chunks/[name]-[hash].js'
        },
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
    // Optimize terser settings
    terserOptions: {
      compress: {
        drop_console: false, // Keep console.log for debugging
        drop_debugger: true,
        pure_funcs: ['console.debug'] // Only remove console.debug
      },
      mangle: {
        safari10: true
      }
    },
    chunkSizeWarningLimit: 1000,
    // Enable CSS code splitting
    cssCodeSplit: true,
    // Optimize asset inlining
    assetsInlineLimit: 4096
  },
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'lucide-react',
      'clsx',
      'tailwind-merge'
    ],
    exclude: [
      'jspdf',
      'html2canvas'
    ]
  },
  publicDir: 'public',
  define: {
    __APP_VERSION__: JSON.stringify('2.0.0'),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString())
  }
})