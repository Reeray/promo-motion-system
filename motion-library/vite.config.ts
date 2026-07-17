import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  root: 'site',
  base: './',
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    strictPort: false,
    allowedHosts: true,
  },
  build: {
    outDir: '../../docs',
    emptyOutDir: false, // docs/ also holds the rendered MP4
  },
});
