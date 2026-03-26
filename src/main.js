import { createApp } from 'vue'
import { Quasar, Notify } from 'quasar'
import iconSet from 'quasar/icon-set/material-symbols-outlined'
import router from './router'
import App from './App.vue'

import 'quasar/src/css/index.sass'
import './css/app.css'

const app = createApp(App)
app.use(Quasar, {
  plugins: { Notify },
  iconSet,
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
app.use(router)
app.mount('#app')

if (import.meta.env.DEV) {
  import('./agentation.jsx')
}
