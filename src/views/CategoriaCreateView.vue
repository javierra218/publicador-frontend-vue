<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import Message from 'primevue/message'

import CategoriaForm from '@/components/CategoriaForm.vue'
import { createCategoria } from '@/services/strapi'
import type { CategoriaUpsertInput } from '@/types/producto'

const router = useRouter()
const isSaving = ref(false)
const error = ref('')
const result = ref('')
const formVersion = ref(0)

const goToList = () => {
  router.push({ name: 'categorias-list' })
}

const handleSubmit = async (payload: CategoriaUpsertInput) => {
  isSaving.value = true
  error.value = ''
  result.value = ''

  try {
    await createCategoria(payload)
    result.value = 'Categoría creada correctamente.'
    formVersion.value += 1
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Error desconocido creando categoría.'
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <main class="page">
    <header class="panel page-header">
      <div>
        <p class="eyebrow">Sección</p>
        <h2>Crear categoría</h2>
      </div>

      <Button
        label="Volver al listado"
        icon="pi pi-arrow-left"
        severity="secondary"
        outlined
        @click="goToList"
      />
    </header>

    <Message v-if="error" severity="error" :closable="false">{{ error }}</Message>
    <Message v-if="result" severity="success" :closable="false">{{ result }}</Message>

    <section class="panel form-panel">
      <CategoriaForm
        :key="formVersion"
        submit-label="Crear categoría"
        :submitting="isSaving"
        @submit="handleSubmit"
      />
    </section>
  </main>
</template>

<style scoped>
.page {
  display: grid;
  gap: 1rem;
}

.panel {
  border: 1px solid var(--p-content-border-color);
  border-radius: 16px;
  background: var(--p-content-background);
  box-shadow: 0 18px 36px rgb(0 0 0 / 28%);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
}

.eyebrow {
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--p-primary-color);
  font-size: 0.74rem;
  font-weight: 700;
}

h2 {
  margin: 0.3rem 0 0;
}

.form-panel {
  padding: 1rem;
  max-width: 680px;
}

@media (max-width: 700px) {
  .page {
    gap: 0.65rem;
  }

  .page-header {
    padding: 0.75rem;
    gap: 0.7rem;
    align-items: flex-start;
  }

  .form-panel {
    padding: 0.75rem;
  }
}
</style>
