<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import Message from 'primevue/message'

import CategoriaForm from '@/components/CategoriaForm.vue'
import { fetchCategoriaByDocumentId, updateCategoria } from '@/services/strapi'
import type { Categoria, CategoriaUpsertInput } from '@/types/producto'

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const isSaving = ref(false)
const error = ref('')
const result = ref('')
const categoria = ref<Categoria | null>(null)

const documentId = computed(() => String(route.params.documentId ?? ''))
const initialValues = computed(() => ({
  nombre: categoria.value?.nombre ?? '',
  slug: categoria.value?.slug ?? '',
}))

const loadCategoria = async () => {
  loading.value = true
  error.value = ''

  try {
    categoria.value = await fetchCategoriaByDocumentId(documentId.value)
    if (!categoria.value) {
      error.value = 'Categoría no encontrada para el documentId indicado.'
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Error desconocido cargando categoría.'
  } finally {
    loading.value = false
  }
}

const handleSubmit = async (payload: CategoriaUpsertInput) => {
  isSaving.value = true
  error.value = ''
  result.value = ''

  try {
    await updateCategoria(documentId.value, payload)
    result.value = 'Categoría actualizada correctamente.'
    await loadCategoria()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Error desconocido actualizando categoría.'
  } finally {
    isSaving.value = false
  }
}

const goBackToList = () => {
  router.push({ name: 'categorias-list' })
}

watch(documentId, loadCategoria, { immediate: true })
</script>

<template>
  <main class="page">
    <header class="panel page-header">
      <div>
        <p class="eyebrow">Sección</p>
        <h2>Editar categoría</h2>
        <p class="subtitle" v-if="categoria">{{ categoria.nombre }} · ID {{ categoria.id }}</p>
      </div>

      <Button
        label="Volver al listado"
        icon="pi pi-arrow-left"
        severity="secondary"
        outlined
        @click="goBackToList"
      />
    </header>

    <section v-if="loading" class="panel state">Cargando categoría…</section>
    <Message v-else-if="error" severity="error" :closable="false">{{ error }}</Message>
    <Message v-if="result" severity="success" :closable="false">{{ result }}</Message>

    <section v-if="!loading && categoria" class="panel form-panel">
      <CategoriaForm
        :initial-values="initialValues"
        submit-label="Guardar cambios"
        :submitting="isSaving"
        secondary-label="Cancelar"
        @submit="handleSubmit"
        @secondary="goBackToList"
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

.subtitle {
  margin: 0.45rem 0 0;
  color: var(--text-soft);
}

.form-panel {
  padding: 1rem;
  max-width: 680px;
}

.state {
  padding: 1rem;
  color: var(--text-soft);
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

  .form-panel,
  .state {
    padding: 0.75rem;
  }
}
</style>
