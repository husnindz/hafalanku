import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      'onnxruntime-web/all': resolve(
        import.meta.dirname,
        'node_modules/onnxruntime-web/dist/ort.all.bundle.min.mjs'
      ),
      'onnxruntime-web': resolve(
        import.meta.dirname,
        'node_modules/onnxruntime-web/dist/ort.bundle.min.mjs'
      ),
    },
  },
  worker: {
    format: 'es',
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
});
