import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
    build: {
    outDir: 'dist',  // Set the output folder to 'dist'
  },
});

// vite.config.ts



