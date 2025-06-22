// frontend/vite.config.ts - SANITIZED for API Gateway Architecture

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // ========================================================================
  // DEVELOPMENT SERVER CONFIGURATION
  // ========================================================================
  server: {
    port: 3000,
    host: true, // Listen on all addresses for Docker compatibility
    
    // Proxy configuration for development - ALL requests go through backend
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
        timeout: 120000, // 2 minutes for ML operations
      }
    }
  },

  // ========================================================================
  // BUILD CONFIGURATION
  // ========================================================================
  build: {
    outDir: 'dist',
    sourcemap: false, // Disable for smaller production builds
    minify: 'terser',
    
    // Optimize build for production
    rollupOptions: {
      output: {
        manualChunks: {
          // Split vendor chunks for better caching
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['@headlessui/react', 'framer-motion', 'lucide-react'],
          'data-vendor': ['axios', 'react-query', 'zustand']
        }
      }
    },
    
    // Optimize for demo deployment
    chunkSizeWarningLimit: 1000,
    assetsInlineLimit: 4096
  },

  // ========================================================================
  // ENVIRONMENT VARIABLES
  // ========================================================================
  define: {
    // Ensure environment variables are available at build time
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
    __BUILD_DATE__: JSON.stringify(new Date().toISOString()),
  },

  // ========================================================================
  // PATH RESOLUTION
  // ========================================================================
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@services': path.resolve(__dirname, './src/services'),
      '@stores': path.resolve(__dirname, './src/stores'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@types': path.resolve(__dirname, './src/types')
    }
  },

  // ========================================================================
  // PREVIEW CONFIGURATION
  // ========================================================================
  preview: {
    port: 3000,
    host: true
  },

  // ========================================================================
  // OPTIMIZATION
  // ========================================================================
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'axios',
      'react-query',
      'zustand'
    ]
  }

  // ========================================================================
  // REMOVED CONFIGURATIONS:
  // - Direct ML service proxy (all requests go through backend now)
  // - File upload size limits (no file uploads)
  // - Complex asset handling (simplified)
  // - Multi-service proxy rules (single backend gateway)
  // - Development SSL setup (simplified for demo)
  // 
  // SIMPLIFIED FOR:
  // - Single API gateway pattern (backend only)
  // - Faster development builds
  // - Optimized production deployment
  // - Clean development experience
  // ========================================================================
})