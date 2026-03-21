<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import Password from 'primevue/password'

import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const form = reactive({
  identifier: '',
  password: '',
})

const error = ref('')
const submitting = ref(false)
const sessionMessage = computed(() =>
  route.query.reason === 'expired'
    ? 'Tu sesión expiró o dejó de ser válida. Ingresa de nuevo para continuar.'
    : '',
)

const nextRoute = computed(() => {
  const redirect = route.query.redirect
  return typeof redirect === 'string' && redirect.startsWith('/') ? redirect : '/'
})

const handleSubmit = async () => {
  const identifier = form.identifier.trim()

  if (!identifier || !form.password) {
    error.value = 'Debes ingresar correo o usuario y contraseña.'
    return
  }

  submitting.value = true
  error.value = ''

  try {
    await auth.login(identifier, form.password)
    await router.replace(nextRoute.value)
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Error desconocido iniciando sesión.'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <main class="login-page">
    <section class="login-panel">
      <div class="hero">
        <p class="eyebrow">Acceso</p>
        <h1>Publicador CMS</h1>
        <p class="subtitle">
          Inicia sesión con un usuario de Strapi `Users & Permissions` para administrar productos y
          publicar en Telegram.
        </p>
      </div>

      <form class="login-form" @submit.prevent="handleSubmit">
        <Message v-if="sessionMessage" severity="warn" :closable="false">{{
          sessionMessage
        }}</Message>
        <Message v-if="error" severity="error" :closable="false">{{ error }}</Message>

        <label class="field">
          <span>Correo o usuario</span>
          <InputText
            v-model="form.identifier"
            type="text"
            autocomplete="username"
            placeholder="usuario@dominio.com"
            fluid
          />
        </label>

        <label class="field">
          <span>Contraseña</span>
          <Password
            v-model="form.password"
            :feedback="false"
            toggle-mask
            autocomplete="current-password"
            placeholder="Tu contraseña"
            fluid
          />
        </label>

        <Button
          type="submit"
          :label="submitting ? 'Ingresando…' : 'Ingresar'"
          :loading="submitting"
          icon="pi pi-sign-in"
        />
      </form>
    </section>
  </main>
</template>

<style scoped>
.login-page {
  min-height: calc(100dvh - 1.8rem);
  display: grid;
  place-items: center;
  padding: 1rem 0;
}

.login-panel {
  width: min(100%, 460px);
  border: 1px solid var(--p-content-border-color);
  border-radius: 24px;
  background:
    radial-gradient(circle at top right, rgb(215 164 79 / 16%), transparent 32%),
    color-mix(in srgb, var(--p-content-background), #000 10%);
  box-shadow: 0 24px 60px rgb(0 0 0 / 32%);
  padding: 1.2rem;
}

.hero {
  display: grid;
  gap: 0.35rem;
  margin-bottom: 1rem;
}

.eyebrow {
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  font-size: 0.74rem;
  color: var(--p-primary-color);
  font-weight: 700;
}

h1 {
  margin: 0;
  font-size: clamp(1.8rem, 2vw, 2.15rem);
}

.subtitle {
  margin: 0;
  color: var(--text-soft);
  line-height: 1.5;
}

.login-form {
  display: grid;
  gap: 0.8rem;
}

.field {
  display: grid;
  gap: 0.32rem;
  font-size: 0.92rem;
  color: var(--text-soft);
}

.field > span {
  font-weight: 600;
}

@media (max-width: 640px) {
  .login-page {
    padding: 0.35rem 0;
  }

  .login-panel {
    padding: 0.9rem;
    border-radius: 18px;
  }
}
</style>
