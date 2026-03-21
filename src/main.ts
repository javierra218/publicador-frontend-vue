import './assets/main.css'
import 'primeicons/primeicons.css'

import { createApp } from 'vue'
import PrimeVue from 'primevue/config'
import Aura from '@primeuix/themes/aura'

import App from './App.vue'
import { pinia } from './pinia'
import router from './router'
import { useAuthStore } from './stores/auth'

document.documentElement.classList.add('app-dark')

const app = createApp(App)
const authStore = useAuthStore(pinia)
authStore.hydrate()

app.use(pinia)
app.use(router)
app.use(PrimeVue, {
  theme: {
    preset: Aura,
    options: {
      darkModeSelector: '.app-dark',
    },
  },
})

app.mount('#app')
