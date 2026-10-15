import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In local dev, /api calls go to the .NET service (run it with: dotnet run --urls http://localhost:8080).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': process.env.API_UPSTREAM || 'http://localhost:8080'
    }
  }
});
