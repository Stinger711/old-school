import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Replace REPO_NAME with your GitHub repository name (e.g. 'class-photos')
export default defineConfig({
  plugins: [react()],
  base: '/old-school/',
})
