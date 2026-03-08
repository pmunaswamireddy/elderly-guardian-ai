import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

const httpsConfig = fs.existsSync(path.resolve(__dirname, '../backend/certs/key.pem')) && 
                    fs.existsSync(path.resolve(__dirname, '../backend/certs/cert.pem')) 
  ? {
      key: fs.readFileSync(path.resolve(__dirname, '../backend/certs/key.pem')),
      cert: fs.readFileSync(path.resolve(__dirname, '../backend/certs/cert.pem')),
    }
  : undefined;

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react()
  ],
  server: {
    host: true,
    https: httpsConfig
  }
})

