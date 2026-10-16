import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In local dev, /api calls go to the .NET service (run it with: dotnet run --urls http://localhost:5080).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': process.env.API_UPSTREAM || 'http://localhost:5080'
    }
  }
});
