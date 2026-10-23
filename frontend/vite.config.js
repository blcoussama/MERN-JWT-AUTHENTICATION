import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// In development the API is proxied: the browser only talks to the Vite origin,
// so the SameSite=Strict, httpOnly cookies work without any CORS configuration.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': process.env.VITE_API_PROXY_TARGET || 'http://localhost:3000',
    },
  },
})
