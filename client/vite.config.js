import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8080',
      '/socket.io': 'http://localhost:8080'
    }
  },
  build: {
    outDir: path.resolve(currentDirectory, '../public'),
    emptyOutDir: true,
    assetsDir: 'assets'
  }
});
