<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import Message from 'primevue/message'

import ProductoForm from '@/components/ProductoForm.vue'
import { fetchCategorias, fetchProductoByDocumentId, updateProducto } from '@/services/strapi'
import type { Categoria, Producto, ProductoUpsertInput } from '@/types/producto'

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const isSaving = ref(false)
const error = ref('')
const result = ref('')
const producto = ref<Producto | null>(null)
const categorias = ref<Categoria[]>([])

const documentId = computed(() => String(route.params.documentId ?? ''))
const initialValues = computed(() => ({
  nombre: producto.value?.nombre ?? '',
  descripcion: producto.value?.descripcion ?? '',
  precio: producto.value?.precio ?? '',
  categoriaId: producto.value?.categoria?.id ?? null,
}))

const loadProductoAndCategorias = async () => {
  loading.value = true
  error.value = ''

  try {
    const [loadedProducto, loadedCategorias] = await Promise.all([
      fetchProductoByDocumentId(documentId.value),
      fetchCategorias(),
    ])

    producto.value = loadedProducto
    categorias.value = loadedCategorias

    if (!producto.value) {
      error.value = 'Producto no encontrado para el documentId indicado.'
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Error desconocido cargando producto.'
  } finally {
    loading.value = false
  }
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
    await updateProducto(documentId.value, payload)
    result.value = 'Producto actualizado correctamente.'
    await loadProductoAndCategorias()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Error desconocido actualizando producto.'
  } finally {
    isSaving.value = false
  }
}

const goBackToList = () => {
  router.push({ name: 'productos-list' })
}

watch(documentId, loadProductoAndCategorias, { immediate: true })
</script>

<template>
  <main class="page">
    <header class="panel page-header">
      <div>
        <p class="eyebrow">Sección</p>
        <h2>Editar producto</h2>
        <p class="subtitle" v-if="producto">{{ producto.nombre }} · ID {{ producto.id }}</p>
      </div>

      <Button
        label="Volver al listado"
        icon="pi pi-arrow-left"
        severity="secondary"
        outlined
        @click="goBackToList"
      />
    </header>

    <section v-if="loading" class="panel state">Cargando producto…</section>
    <Message v-else-if="error" severity="error" :closable="false">{{ error }}</Message>
    <Message v-if="result" severity="success" :closable="false">{{ result }}</Message>

    <section v-if="!loading && producto" class="panel form-panel">
      <ProductoForm
        :initial-values="initialValues"
        :categorias="categorias"
        :current-preview-url="producto.previewImagenUrl"
        :current-preview-mime="producto.previewImagenMime"
        :current-preview-name="producto.previewImagenName"
        :current-archivos="producto.archivos"
        submit-label="Guardar cambios"
        :submitting="isSaving"
        :show-clear-options="true"
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
  max-width: 820px;
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
