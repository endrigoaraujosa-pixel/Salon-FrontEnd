import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';

// Lê o version.json gerado pelo script de pré-build
const versionInfo = (() => {
  try {
    return JSON.parse(fs.readFileSync(path.resolve(__dirname, 'public/version.json'), 'utf-8'));
  } catch {
    // Fallback para desenvolvimento local (quando version.json não existe)
    return { version: '0.0.0', build: 'dev', commit: 'local', date: new Date().toISOString() };
  }
})();

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify(versionInfo),
  },
  server: {
    port: 4000
  }
});
