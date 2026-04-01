import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import react from '@vitejs/plugin-react'
import { quasar, transformAssetUrls } from '@quasar/vite-plugin'

export default defineConfig({
  server: {
    // Always 5173 so the URL never “moves” to 5174 and confuses the browser.
    // If it says port in use, run: npm run kill:ports
    port: 5173,
    strictPort: true,
    // Set VITE_PROXY_LOCAL_API=0 to skip the proxy (e.g. `vercel dev` serving /api on the same host).
    ...(process.env.VITE_PROXY_LOCAL_API !== '0' && {
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:8787',
          changeOrigin: true,
        },
      },
    }),
  },
  plugins: [
    vue({ template: { transformAssetUrls } }),
    react({ include: /\.jsx$/ }),
    quasar({
      sassVariables: false,
      config: {
        brand: {
          primary: '#3d4047',
          secondary: '#3d4047',
          accent: '#ffa400',
          positive: '#21ba45',
          negative: '#c10015',
          info: '#31ccec',
          warning: '#ff8d28',
          dark: '#1d1d1d',
        }
      }
    })
  ]
})
