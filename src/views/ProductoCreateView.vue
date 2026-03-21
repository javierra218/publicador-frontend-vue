<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import Message from 'primevue/message'

import ProductoForm from '@/components/ProductoForm.vue'
import { createProducto, fetchCategorias } from '@/services/strapi'
import type { Categoria, ProductoUpsertInput } from '@/types/producto'

const router = useRouter()
const isSaving = ref(false)
const error = ref('')
const result = ref('')
const formVersion = ref(0)
const categorias = ref<Categoria[]>([])

const loadCategorias = async () => {
  try {
    categorias.value = await fetchCategorias()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Error desconocido cargando categorías.'
  }
}

const goToList = () => {
  router.push({ name: 'productos-list' })
}

const handleSubmit = async (payload: ProductoUpsertInput) => {
  if (!payload.nombre.trim()) {
    error.value = 'El nombre es obligatorio.'
    return
  }

  isSaving.value = true
  error.value = ''
  result.value = ''

  try {
    await createProducto(payload)
    result.value = 'Producto creado correctamente.'
    formVersion.value += 1
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Error desconocido creando producto.'
  } finally {
    isSaving.value = false
  }
}

onMounted(loadCategorias)
</script>

<template>
  <main class="page">
    <header class="panel page-header">
      <div>
        <p class="eyebrow">Sección</p>
        <h2>Crear producto</h2>
      </div>

      <div class="header-actions">
        <Button
          label="Volver al listado"
          icon="pi pi-arrow-left"
          severity="secondary"
          outlined
          @click="goToList"
        />
      </div>
    </header>

    <Message v-if="error" severity="error" :closable="false">{{ error }}</Message>
    <Message v-if="result" severity="success" :closable="false">{{ result }}</Message>

    <section class="panel form-panel">
      <ProductoForm
        :key="formVersion"
        :categorias="categorias"
        submit-label="Crear producto"
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
  max-width: 820px;
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
