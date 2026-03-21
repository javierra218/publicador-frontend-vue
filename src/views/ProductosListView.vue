<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import Button from 'primevue/button'
import Checkbox from 'primevue/checkbox'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import Select from 'primevue/select'
import Tag from 'primevue/tag'

import {
  deleteProducto,
  fetchConfiguracionesTelegram,
  fetchProductos,
  publicarProducto,
  publicarProductosMasivo,
} from '@/services/strapi'
import type { ConfiguracionTelegramOption, Producto } from '@/types/producto'

const router = useRouter()
const productos = ref<Producto[]>([])
const loading = ref(false)
const loadingTelegramConfigs = ref(false)
const loadingPublishId = ref<number | null>(null)
const deletingDocumentId = ref<string | null>(null)
const loadingBulk = ref(false)
const error = ref('')
const result = ref('')
const search = ref('')
const selectedIds = ref<number[]>([])
const configuracionesTelegram = ref<ConfiguracionTelegramOption[]>([])
const selectedConfiguracionTelegramId = ref<number | null>(null)

const filteredProductos = computed(() => {
  const term = search.value.trim().toLowerCase()
  if (!term) {
    return productos.value
  }

  return productos.value.filter((producto) => {
    const text =
      `${producto.id} ${producto.nombre} ${producto.descripcion} ${producto.categoria?.nombre ?? ''}`.toLowerCase()
    return text.includes(term)
  })
})

const selectedCount = computed(() => selectedIds.value.length)
const selectedConfiguracionTelegram = computed(() =>
  configuracionesTelegram.value.find((item) => item.id === selectedConfiguracionTelegramId.value) ?? null,
)
const canPublish = computed(
  () =>
    !loadingTelegramConfigs.value &&
    selectedConfiguracionTelegramId.value !== null &&
    configuracionesTelegram.value.length > 0,
)
const isImagePreview = (producto: Producto): boolean =>
  Boolean(producto.previewImagenUrl && producto.previewImagenMime?.startsWith('image/'))
const isVideoPreview = (producto: Producto): boolean =>
  Boolean(producto.previewImagenUrl && producto.previewImagenMime?.startsWith('video/'))
const allFilteredSelected = computed(() => {
  if (!filteredProductos.value.length) {
    return false
  }

  const selectedSet = new Set(selectedIds.value)
  return filteredProductos.value.every((producto) => selectedSet.has(producto.id))
})

const loadProductos = async () => {
  loading.value = true

  try {
    productos.value = await fetchProductos()
    return null
  } catch (err) {
    return err instanceof Error ? err.message : 'Error desconocido cargando productos.'
  } finally {
    loading.value = false
  }
}

const syncSelectedConfiguracionTelegram = () => {
  if (!configuracionesTelegram.value.length) {
    selectedConfiguracionTelegramId.value = null
    return
  }

  if (
    selectedConfiguracionTelegramId.value !== null &&
    configuracionesTelegram.value.some((item) => item.id === selectedConfiguracionTelegramId.value)
  ) {
    return
  }

  selectedConfiguracionTelegramId.value = configuracionesTelegram.value[0]?.id ?? null
}

const loadConfiguracionesTelegram = async () => {
  loadingTelegramConfigs.value = true

  try {
    configuracionesTelegram.value = await fetchConfiguracionesTelegram()
    syncSelectedConfiguracionTelegram()
    return null
  } catch (err) {
    configuracionesTelegram.value = []
    selectedConfiguracionTelegramId.value = null
    return err instanceof Error ? err.message : 'Error desconocido cargando chats de Telegram.'
  } finally {
    loadingTelegramConfigs.value = false
  }
}

const loadPageData = async () => {
  error.value = ''
  const [productosError, telegramError] = await Promise.all([
    loadProductos(),
    loadConfiguracionesTelegram(),
  ])
  const messages = [productosError, telegramError].filter(
    (message): message is string => Boolean(message),
  )
  error.value = messages.join(' ')
}

const isSelected = (id: number): boolean => selectedIds.value.includes(id)

const setSelected = (id: number, shouldSelect: boolean) => {
  if (shouldSelect && !isSelected(id)) {
    selectedIds.value = [...selectedIds.value, id]
    return
  }

  if (!shouldSelect && isSelected(id)) {
    selectedIds.value = selectedIds.value.filter((item) => item !== id)
  }
}

const clearSelected = () => {
  selectedIds.value = []
}

const toggleSelectAllFiltered = () => {
  if (allFilteredSelected.value) {
    const filteredSet = new Set(filteredProductos.value.map((producto) => producto.id))
    selectedIds.value = selectedIds.value.filter((id) => !filteredSet.has(id))
    return
  }

  const filteredIds = filteredProductos.value.map((producto) => producto.id)
  selectedIds.value = [...new Set([...selectedIds.value, ...filteredIds])]
}

const handlePublicar = async (producto: Producto) => {
  if (!selectedConfiguracionTelegramId.value) {
    error.value = 'Selecciona un chat de Telegram antes de publicar.'
    return
  }

  loadingPublishId.value = producto.id
  error.value = ''
  result.value = ''

  try {
    const response = await publicarProducto(producto.id, selectedConfiguracionTelegramId.value)
    const metodoLabel =
      response.metodo_usado === 'sendMediaGroup' ? 'album' : response.metodo_usado
    result.value = `Producto ${producto.id} publicado en ${response.chat_id} por ${metodoLabel}. message_id=${response.message_id ?? 'n/a'}`
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Error desconocido publicando producto.'
  } finally {
    loadingPublishId.value = null
  }
}

const handleDelete = async (producto: Producto) => {
  const confirmed = window.confirm(
    `¿Eliminar el producto "${producto.nombre}"? Esta acción no se puede deshacer.`,
  )

  if (!confirmed) {
    return
  }

  deletingDocumentId.value = producto.documentId
  error.value = ''
  result.value = ''

  try {
    await deleteProducto(producto.documentId)
    result.value = `Producto "${producto.nombre}" eliminado correctamente.`
    selectedIds.value = selectedIds.value.filter((id) => id !== producto.id)
    const productosError = await loadProductos()
    if (productosError) {
      error.value = productosError
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Error desconocido eliminando producto.'
  } finally {
    deletingDocumentId.value = null
  }
}

const handlePublicarMasivo = async () => {
  if (!selectedIds.value.length) {
    error.value = 'Selecciona al menos un producto para publicación en masa.'
    return
  }

  if (!selectedConfiguracionTelegramId.value) {
    error.value = 'Selecciona un chat de Telegram antes de publicar.'
    return
  }

  loadingBulk.value = true
  error.value = ''
  result.value = ''

  try {
    const response = await publicarProductosMasivo(
      selectedIds.value,
      selectedConfiguracionTelegramId.value,
    )
    const failed = response.detalles.filter((item) => !item.ok).slice(0, 3)
    const failedSummary = failed.length
      ? ` Fallos: ${failed.map((item) => `#${item.id}`).join(', ')}.`
      : ''

    result.value = `Publicación masiva completada en ${response.chat_id}. Éxitos: ${response.exitos}/${response.total}. Fallos: ${response.fallos}.${failedSummary}`
    selectedIds.value = []
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Error desconocido en publicación masiva.'
  } finally {
    loadingBulk.value = false
  }
}

const goToCreate = () => {
  router.push({ name: 'productos-create' })
}

const goToCategorias = () => {
  router.push({ name: 'categorias-list' })
}

const goToAjustes = () => {
  router.push({ name: 'ajustes-telegram' })
}

const goToEdit = (documentId: string) => {
  router.push({ name: 'productos-edit', params: { documentId } })
}

onMounted(loadPageData)
</script>

<template>
  <main class="page">
    <header class="page-header panel">
      <div>
        <p class="eyebrow">Sección</p>
        <h2>Listado de productos</h2>
        <p class="subtitle">PrimeVue DataTable + acciones de publicación.</p>
      </div>

      <div class="header-actions">
        <Button label="Nuevo producto" icon="pi pi-plus" @click="goToCreate" />
        <Button
          label="Categorías"
          icon="pi pi-tags"
          severity="secondary"
          outlined
          @click="goToCategorias"
        />
        <Button
          icon="pi pi-refresh"
          label="Recargar"
          :loading="loading || loadingTelegramConfigs"
          severity="secondary"
          @click="loadPageData"
        />
      </div>
    </header>

    <section class="panel toolbar">
      <div class="toolbar-top">
        <span class="search-box">
          <i class="pi pi-search" />
          <InputText v-model="search" placeholder="Buscar por ID, nombre o descripción" />
        </span>

        <label class="telegram-target">
          <span>Chat de Telegram</span>
          <Select
            v-model="selectedConfiguracionTelegramId"
            :options="configuracionesTelegram"
            option-label="label"
            option-value="id"
            placeholder="Selecciona un chat"
            :loading="loadingTelegramConfigs"
            :disabled="loadingTelegramConfigs || !configuracionesTelegram.length"
          />
        </label>
      </div>

      <div class="toolbar-actions">
        <Button
          :label="allFilteredSelected ? 'Quitar visibles' : 'Seleccionar visibles'"
          severity="secondary"
          text
          @click="toggleSelectAllFiltered"
        />
        <Button
          label="Limpiar"
          severity="secondary"
          text
          :disabled="!selectedCount"
          @click="clearSelected"
        />
        <Button
          :label="loadingBulk ? 'Publicando…' : `Publicar (${selectedCount})`"
          icon="pi pi-send"
          :loading="loadingBulk"
          :disabled="!selectedCount || !canPublish"
          @click="handlePublicarMasivo"
        />
      </div>

      <p v-if="selectedConfiguracionTelegram" class="toolbar-note">
        Las publicaciones se enviarán a {{ selectedConfiguracionTelegram.chat_id }}.
      </p>
      <div v-else-if="!loadingTelegramConfigs" class="toolbar-empty-state">
        <p class="toolbar-note warning">No hay configuraciones de Telegram válidas disponibles.</p>
        <Button
          label="Ir a ajustes"
          icon="pi pi-cog"
          severity="secondary"
          text
          @click="goToAjustes"
        />
      </div>
    </section>

    <Message v-if="error" severity="error" :closable="false">{{ error }}</Message>
    <Message v-if="result" severity="success" :closable="false">{{ result }}</Message>

    <DataTable
      :value="filteredProductos"
      data-key="id"
      paginator
      :rows="8"
      :rows-per-page-options="[8, 16, 32]"
      :loading="loading"
      class="products-table"
      table-style="min-width: 64rem"
      current-page-report-template="{first}-{last} de {totalRecords}"
      paginator-template="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
    >
      <template #empty>
        <p class="table-empty">No hay productos para mostrar.</p>
      </template>

      <Column header="Sel" style="width: 4rem">
        <template #body="{ data }">
          <Checkbox
            :binary="true"
            :model-value="isSelected(data.id)"
            @update:model-value="(value) => setSelected(data.id, Boolean(value))"
          />
        </template>
      </Column>

      <Column field="id" header="ID" sortable style="width: 5rem" />

      <Column field="nombre" header="Producto" sortable>
        <template #body="{ data }">
          <div class="product-cell">
            <strong>{{ data.nombre }}</strong>
            <small>{{ data.descripcion || 'Sin descripción' }}</small>
          </div>
        </template>
      </Column>

      <Column header="Precio" sortable style="width: 8rem">
        <template #body="{ data }">
          <span class="price">{{ data.precio ? `$ ${data.precio}` : 'Sin precio' }}</span>
        </template>
      </Column>

      <Column header="Categoría" sortable style="width: 12rem">
        <template #body="{ data }">
          <Tag severity="warn" :value="data.categoria?.nombre || 'Sin categoría'" />
        </template>
      </Column>

      <Column header="Media" style="width: 14rem">
        <template #body="{ data }">
          <div class="media-cell">
            <img
              v-if="isImagePreview(data)"
              :src="data.previewImagenUrl"
              :alt="`Preview de ${data.nombre}`"
            />
            <video v-else-if="isVideoPreview(data)" muted preload="metadata">
              <source :src="data.previewImagenUrl ?? undefined" :type="data.previewImagenMime ?? undefined" />
            </video>
            <span v-else class="no-image">Sin preview</span>
            <small>{{ data.archivos.length }} archivo(s)</small>
          </div>
        </template>
      </Column>

      <Column header="Acciones" style="width: 22rem">
        <template #body="{ data }">
          <div class="row-actions">
            <Button
              size="small"
              icon="pi pi-pencil"
              label="Editar"
              severity="secondary"
              outlined
              @click="goToEdit(data.documentId)"
            />
            <Button
              size="small"
              icon="pi pi-send"
              :label="loadingPublishId === data.id ? 'Publicando…' : 'Publicar'"
              :loading="loadingPublishId === data.id"
              :disabled="!canPublish"
              @click="handlePublicar(data)"
            />
            <Button
              size="small"
              icon="pi pi-trash"
              label="Eliminar"
              severity="danger"
              outlined
              :loading="deletingDocumentId === data.documentId"
              @click="handleDelete(data)"
            />
          </div>
        </template>
      </Column>
    </DataTable>
  </main>
</template>

<style scoped>
.page {
  display: grid;
  gap: 0.9rem;
}

.panel {
  border: 1px solid var(--p-content-border-color);
  border-radius: 14px;
  background: var(--p-content-background);
  padding: 0.9rem;
}

.page-header {
  display: flex;
  justify-content: space-between;
  gap: 0.8rem;
  flex-wrap: wrap;
}

.eyebrow {
  margin: 0;
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--p-primary-color);
}

h2 {
  margin: 0.25rem 0 0;
}

.subtitle {
  margin: 0.3rem 0 0;
  color: var(--text-soft);
}

.header-actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.toolbar {
  display: grid;
  gap: 0.7rem;
}

.toolbar-top {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(240px, 320px);
  gap: 0.7rem;
  align-items: end;
}

.search-box {
  display: grid;
  grid-template-columns: 22px 1fr;
  align-items: center;
  gap: 0.5rem;
}

.search-box i {
  color: var(--p-primary-color);
  font-size: 0.9rem;
}

.toolbar-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.telegram-target {
  display: grid;
  gap: 0.35rem;
}

.telegram-target span,
.toolbar-note {
  color: var(--text-soft);
  font-size: 0.9rem;
}

.toolbar-note {
  margin: 0;
}

.toolbar-note.warning {
  color: var(--p-yellow-300, #f6c453);
}

.toolbar-empty-state {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-wrap: wrap;
}

.products-table :deep(.p-datatable-table-container) {
  border-radius: 12px;
  overflow: hidden;
}

.products-table :deep(.p-datatable-table) {
  background: transparent;
}

.products-table :deep(.p-datatable-thead > tr > th) {
  background: color-mix(in srgb, var(--p-content-background), #000 16%);
  border-color: var(--p-content-border-color);
}

.products-table :deep(.p-datatable-tbody > tr > td) {
  border-color: color-mix(in srgb, var(--p-content-border-color), transparent 25%);
}

.product-cell {
  display: grid;
  gap: 0.2rem;
}

.product-cell small {
  color: var(--text-soft);
}

.price {
  font-weight: 600;
  color: var(--p-primary-color);
}

.media-cell {
  display: grid;
  gap: 0.25rem;
}

.media-cell img,
.media-cell video,
.no-image {
  width: 96px;
  height: 68px;
  border-radius: 8px;
  object-fit: cover;
  border: 1px solid var(--p-content-border-color);
}

.media-cell video {
  background: #000;
}

.no-image {
  display: grid;
  place-items: center;
  font-size: 0.78rem;
  color: var(--text-soft);
  background: color-mix(in srgb, var(--p-content-background), #000 10%);
}

.media-cell small {
  color: var(--text-soft);
}

.row-actions {
  display: flex;
  align-items: center;
  gap: 0.45rem;
}

.table-empty {
  margin: 0;
  color: var(--text-soft);
}

@media (max-width: 760px) {
  .page {
    gap: 0.65rem;
  }

  .panel {
    padding: 0.7rem;
  }

  .header-actions,
  .toolbar-actions,
  .row-actions {
    width: 100%;
  }

  .toolbar-top {
    grid-template-columns: 1fr;
  }

  .header-actions :deep(.p-button),
  .toolbar-actions :deep(.p-button),
  .row-actions :deep(.p-button) {
    flex: 1;
    justify-content: center;
    text-align: center;
  }
}
</style>
