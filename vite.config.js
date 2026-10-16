import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In local dev, /api/chat goes to aip-chat-api (port 5081) and other /api calls to aip-api (port 5080).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api/chat': process.env.CHAT_UPSTREAM || 'http://localhost:5081',
      '/api': process.env.API_UPSTREAM || 'http://localhost:5080'
    }
  }
});
