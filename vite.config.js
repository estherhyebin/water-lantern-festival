import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Dashboard copy-paste often uses Next.js names; expose both prefixes.
  envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
})
