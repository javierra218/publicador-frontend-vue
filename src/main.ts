import './assets/main.css'
import 'primeicons/primeicons.css'

import { createApp } from 'vue'
import PrimeVue from 'primevue/config'
import { definePreset } from '@primeuix/themes'
import Aura from '@primeuix/themes/aura'

import App from './App.vue'
import { pinia } from './pinia'
import router from './router'
import { useAuthStore } from './stores/auth'

document.documentElement.classList.add('app-dark')

const FirePreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '{amber.50}',
      100: '{amber.100}',
      200: '{amber.200}',
      300: '{orange.300}',
      400: '{orange.400}',
      500: '{orange.500}',
      600: '{orange.600}',
      700: '{orange.700}',
      800: '{orange.800}',
      900: '{orange.900}',
      950: '{orange.950}',
    },
  },
})

const app = createApp(App)
const authStore = useAuthStore(pinia)
authStore.hydrate()

app.use(pinia)
app.use(router)
app.use(PrimeVue, {
  theme: {
    preset: FirePreset,
    options: {
      darkModeSelector: '.app-dark',
    },
  },
})

app.mount('#app')
