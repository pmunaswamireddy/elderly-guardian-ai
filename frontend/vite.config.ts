import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react()
  ],
  server: {
    host: true,
    https: fs.existsSync(path.resolve(__dirname, '../backend/certs/key.pem')) && 
           fs.existsSync(path.resolve(__dirname, '../backend/certs/cert.pem')) 
      ? {
          key: fs.readFileSync(path.resolve(__dirname, '../backend/certs/key.pem')),
          cert: fs.readFileSync(path.resolve(__dirname, '../backend/certs/cert.pem')),
        }
      : false
  }
})

