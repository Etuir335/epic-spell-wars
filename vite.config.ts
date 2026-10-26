import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// base = имя репозитория на GitHub Pages: https://<user>.github.io/epic-spell-wars/
export default defineConfig({
  base: '/epic-spell-wars/',
  plugins: [react()],
  // свой порт, чтобы не путаться с max-apocalypse (5173)
  server: { port: 5180, strictPort: true },
})
