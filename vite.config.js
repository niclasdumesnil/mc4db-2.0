import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@css': path.resolve(__dirname, 'src', 'css'),
      '@components': path.resolve(__dirname, 'src', 'components'),
      '@utils': path.resolve(__dirname, 'src', 'utils')
    }
  },
  build: {
    outDir: path.resolve(__dirname, '..', 'react'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        card: path.resolve(__dirname, 'src', 'index.jsx')
      },
      output: {
        entryFileNames: 'js/[name].js',
        chunkFileNames: 'js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && assetInfo.name.endsWith('.css')) {
            return 'css/[name][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        }
      }
    }
  },
  css: {
    postcss: path.resolve(__dirname, '..', 'postcss.config.js')
  }
});
