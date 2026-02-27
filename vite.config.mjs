import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  root: path.resolve(__dirname, 'react-src'),
  resolve: {
    alias: {
      '@css': path.resolve(__dirname, 'react-src', 'src', 'css'),
      '@components': path.resolve(__dirname, 'react-src', 'src', 'components'),
      '@utils': path.resolve(__dirname, 'react-src', 'src', 'utils')
    }
  },
  build: {
    outDir: path.resolve(__dirname, 'react'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        card: path.resolve(__dirname, 'react-src', 'src', 'index.jsx')
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
});
