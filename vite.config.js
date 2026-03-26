import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { quasar, transformAssetUrls } from '@quasar/vite-plugin'

export default defineConfig({
  plugins: [
    vue({ template: { transformAssetUrls } }),
    quasar({
      sassVariables: false,
      config: {
        brand: {
          primary: '#743ee4',
          secondary: '#743ee4',
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
