<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'

import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()
const targetRoute = computed(() => (auth.isAuthenticated ? { name: 'home' } : { name: 'login' }))
const targetLabel = computed(() => (auth.isAuthenticated ? 'Ir al panel' : 'Ir al login'))

const goBack = async () => {
  await router.replace(targetRoute.value)
}
</script>

<template>
  <main class="not-found-page">
    <section class="panel">
      <p class="eyebrow">404</p>
      <h1>Página no encontrada</h1>
      <p class="subtitle">
        La ruta solicitada no existe o ya no está disponible en este frontend.
      </p>
      <Button :label="targetLabel" icon="pi pi-arrow-left" @click="goBack" />
    </section>
  </main>
</template>

<style scoped>
.not-found-page {
  min-height: calc(100dvh - 1.8rem);
  display: grid;
  place-items: center;
}

.panel {
  width: min(100%, 520px);
  display: grid;
  gap: 0.75rem;
  border: 1px solid var(--p-content-border-color);
  border-radius: 24px;
  background: color-mix(in srgb, var(--p-content-background), #000 10%);
  box-shadow: 0 24px 60px rgb(0 0 0 / 32%);
  padding: 1.25rem;
}

.eyebrow {
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  font-size: 0.76rem;
  font-weight: 700;
  color: var(--p-primary-color);
}

h1 {
  margin: 0;
  font-size: clamp(1.8rem, 2vw, 2.2rem);
}

.subtitle {
  margin: 0;
  color: var(--text-soft);
  line-height: 1.5;
}

@media (max-width: 640px) {
  .panel {
    padding: 0.95rem;
    border-radius: 18px;
  }
}
</style>
