import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

const INPUT = process.env.INPUT;

export default defineConfig({
  plugins: [react(), ...(INPUT ? [viteSingleFile()] : [])],
  build: {
    rollupOptions: INPUT ? { input: INPUT } : undefined,
    outDir: 'dist',
  },
})
