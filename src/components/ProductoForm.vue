<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import Button from 'primevue/button'
import Checkbox from 'primevue/checkbox'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import Select from 'primevue/select'
import Textarea from 'primevue/textarea'

import type { Categoria, ProductoArchivo, ProductoUpsertInput } from '@/types/producto'

type ProductoFormValues = {
  nombre: string
  descripcion: string
  precio: string
  categoriaId: number | null
}

const props = withDefaults(
  defineProps<{
    initialValues?: ProductoFormValues
    submitLabel?: string
    submitting?: boolean
    showClearOptions?: boolean
    secondaryLabel?: string
    categorias?: Categoria[]
    currentPreviewUrl?: string | null
    currentPreviewMime?: string | null
    currentPreviewName?: string | null
    currentArchivos?: ProductoArchivo[]
  }>(),
  {
    initialValues: () => ({
      nombre: '',
      descripcion: '',
      precio: '',
      categoriaId: null,
    }),
    submitLabel: 'Guardar',
    submitting: false,
    showClearOptions: false,
    secondaryLabel: '',
    categorias: () => [],
    currentPreviewUrl: null,
    currentPreviewMime: null,
    currentPreviewName: null,
    currentArchivos: () => [],
  },
)

const emit = defineEmits<{
  submit: [payload: ProductoUpsertInput]
  secondary: []
}>()

const previewInputRef = ref<HTMLInputElement | null>(null)
const archivosInputRef = ref<HTMLInputElement | null>(null)
const localError = ref('')

const form = reactive<ProductoUpsertInput>({
  nombre: '',
  descripcion: '',
  precio: '',
  categoriaId: null,
  existingArchivosIds: [],
  previewFile: null,
  archivosFiles: [],
  clearPreview: false,
  clearArchivos: false,
})

const formatBytes = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 B'
  }

  const units = ['B', 'KB', 'MB', 'GB']
  let size = bytes
  let unitIndex = 0

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex += 1
  }

  return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`
}

const isPriceValid = (value: string): boolean => {
  if (!value.trim()) {
    return true
  }

  const parsed = Number.parseFloat(value.replace(/\s+/g, '').replace(',', '.'))
  return Number.isFinite(parsed) && parsed >= 0
}

const priceInvalid = computed(() => !isPriceValid(form.precio))
const categoriaOptions = computed(() => [
  { id: null, nombre: 'Sin categoría' },
  ...props.categorias,
])

const previewSummary = computed(() => {
  if (!form.previewFile) {
    return 'Sin archivo seleccionado'
  }

  return `${form.previewFile.name} (${formatBytes(form.previewFile.size)})`
})

const archivosSummary = computed(() => {
  if (!form.archivosFiles.length) {
    return 'Sin adjuntos'
  }

  const totalSize = form.archivosFiles.reduce((acc, file) => acc + file.size, 0)
  return `${form.archivosFiles.length} archivo(s) · ${formatBytes(totalSize)}`
})

const visibleCurrentPreviewUrl = computed(() =>
  form.clearPreview ? null : (props.currentPreviewUrl ?? null),
)
const visibleCurrentPreviewMime = computed(() =>
  form.clearPreview ? null : (props.currentPreviewMime ?? null),
)
const currentPreviewLabel = computed(() => props.currentPreviewName || 'Preview actual')
const currentPreviewIsImage = computed(() =>
  Boolean(visibleCurrentPreviewMime.value?.startsWith('image/')),
)
const currentPreviewIsVideo = computed(() =>
  Boolean(visibleCurrentPreviewMime.value?.startsWith('video/')),
)
const currentArchivosCatalog = computed(() => props.currentArchivos.filter((archivo) => archivo.id > 0))
const visibleCurrentArchivos = computed(() =>
  currentArchivosCatalog.value.filter((archivo) => form.existingArchivosIds.includes(archivo.id)),
)
const removedCurrentArchivosCount = computed(
  () => currentArchivosCatalog.value.length - visibleCurrentArchivos.value.length,
)
const canRestoreCurrentArchivos = computed(
  () =>
    currentArchivosCatalog.value.length > 0 &&
    visibleCurrentArchivos.value.length !== currentArchivosCatalog.value.length,
)
const hasCurrentMedia = computed(
  () => Boolean(visibleCurrentPreviewUrl.value) || currentArchivosCatalog.value.length > 0,
)

const applyInitialValues = () => {
  form.nombre = props.initialValues.nombre
  form.descripcion = props.initialValues.descripcion
  form.precio = props.initialValues.precio
  form.categoriaId = props.initialValues.categoriaId
  form.existingArchivosIds = props.currentArchivos.map((archivo) => archivo.id)
  form.previewFile = null
  form.archivosFiles = []
  form.clearPreview = false
  form.clearArchivos = false
  localError.value = ''

  if (previewInputRef.value) {
    previewInputRef.value.value = ''
  }

  if (archivosInputRef.value) {
    archivosInputRef.value.value = ''
  }
}

watch(() => props.initialValues, applyInitialValues, { immediate: true, deep: true })
watch(
  () => [props.currentPreviewUrl, props.currentPreviewMime, props.currentPreviewName],
  applyInitialValues,
)
watch(() => props.currentArchivos, applyInitialValues, { deep: true })

const onPreviewFileChange = (event: Event) => {
  const input = event.target as HTMLInputElement
  form.previewFile = input.files?.[0] ?? null
}

const onArchivosChange = (event: Event) => {
  const input = event.target as HTMLInputElement
  form.archivosFiles = input.files ? Array.from(input.files) : []
}

const clearPreviewSelection = () => {
  form.previewFile = null
  if (previewInputRef.value) {
    previewInputRef.value.value = ''
  }
}

const clearArchivosSelection = () => {
  form.archivosFiles = []
  if (archivosInputRef.value) {
    archivosInputRef.value.value = ''
  }
}

const removeCurrentArchivo = (archivoId: number) => {
  form.clearArchivos = false
  form.existingArchivosIds = form.existingArchivosIds.filter((id) => id !== archivoId)
}

const restoreCurrentArchivos = () => {
  form.clearArchivos = false
  form.existingArchivosIds = currentArchivosCatalog.value.map((archivo) => archivo.id)
}

const handleClearArchivosToggle = (checked: boolean) => {
  form.clearArchivos = checked

  if (checked) {
    form.existingArchivosIds = []
    return
  }

  restoreCurrentArchivos()
}

const handleSubmit = () => {
  const trimmedName = form.nombre.trim()

  if (trimmedName.length < 3) {
    localError.value = 'El nombre debe tener al menos 3 caracteres.'
    return
  }

  if (!isPriceValid(form.precio)) {
    localError.value = 'El precio debe ser un número válido mayor o igual a 0.'
    return
  }

  localError.value = ''

  emit('submit', {
    nombre: trimmedName,
    descripcion: form.descripcion,
    precio: form.precio,
    categoriaId: form.categoriaId,
    existingArchivosIds: [...form.existingArchivosIds],
    previewFile: form.previewFile,
    archivosFiles: [...form.archivosFiles],
    clearPreview: form.clearPreview,
    clearArchivos: form.clearArchivos,
  })
}

const handleSecondary = () => {
  emit('secondary')
}
</script>

<template>
  <form class="product-form" @submit.prevent="handleSubmit">
    <Message v-if="localError" severity="error" :closable="false">{{ localError }}</Message>

    <section class="fields-grid">
      <label class="field">
        <span>Nombre</span>
        <InputText
          v-model="form.nombre"
          type="text"
          placeholder="Nombre del producto"
          required
          minlength="3"
          fluid
        />
      </label>

      <label class="field">
        <span>Descripción</span>
        <Textarea v-model="form.descripcion" rows="4" placeholder="Descripción" auto-resize fluid />
      </label>

      <label class="field">
        <span>Precio</span>
        <InputText
          v-model="form.precio"
          type="text"
          inputmode="decimal"
          placeholder="120000"
          :invalid="priceInvalid"
          fluid
        />
        <small class="hint">Admite punto o coma decimal. Deja vacío si no aplica.</small>
      </label>

      <label class="field">
        <span>Categoría</span>
        <Select
          v-model="form.categoriaId"
          :options="categoriaOptions"
          option-label="nombre"
          option-value="id"
          fluid
        />
      </label>
    </section>

    <section v-if="hasCurrentMedia" class="current-media">
      <article v-if="visibleCurrentPreviewUrl" class="current-card">
        <div class="current-card-head">
          <span>Preview actual</span>
          <a :href="visibleCurrentPreviewUrl" target="_blank" rel="noreferrer">Abrir</a>
        </div>
        <img
          v-if="currentPreviewIsImage"
          :src="visibleCurrentPreviewUrl"
          :alt="currentPreviewLabel"
        />
        <video v-else-if="currentPreviewIsVideo" controls preload="metadata">
          <source :src="visibleCurrentPreviewUrl" :type="visibleCurrentPreviewMime ?? undefined" />
        </video>
        <div v-else class="current-preview-fallback">
          <i class="pi pi-paperclip" />
          <span>{{ currentPreviewLabel }}</span>
        </div>
      </article>

      <article v-if="currentArchivosCatalog.length" class="current-card">
        <div class="current-card-head">
          <span>Adjuntos actuales</span>
          <div class="current-card-tools">
            <small>
              {{ visibleCurrentArchivos.length }} de {{ currentArchivosCatalog.length }} archivo(s)
            </small>
            <Button
              v-if="canRestoreCurrentArchivos"
              type="button"
              size="small"
              severity="secondary"
              text
              label="Restaurar"
              :disabled="submitting"
              @click="restoreCurrentArchivos"
            />
          </div>
        </div>
        <ul v-if="visibleCurrentArchivos.length" class="current-files">
          <li v-for="archivo in visibleCurrentArchivos" :key="archivo.id" class="current-file-row">
            <a :href="archivo.url" target="_blank" rel="noreferrer">
              {{ archivo.name || `Archivo #${archivo.id}` }}
            </a>
            <Button
              type="button"
              size="small"
              severity="secondary"
              text
              label="Quitar"
              :disabled="submitting"
              @click="removeCurrentArchivo(archivo.id)"
            />
          </li>
        </ul>
        <p v-else class="current-files-empty">No quedarán adjuntos actuales al guardar.</p>
        <small v-if="removedCurrentArchivosCount > 0" class="hint">
          Quitaste {{ removedCurrentArchivosCount }} archivo(s) de la versión actual.
        </small>
      </article>
    </section>

    <section class="upload-grid">
      <label class="upload-field">
        <span>Preview imagen</span>
        <input
          ref="previewInputRef"
          type="file"
          accept="image/*,video/*"
          @change="onPreviewFileChange"
        />
        <div class="file-meta">
          <small>{{ previewSummary }}</small>
          <Button
            v-if="form.previewFile"
            type="button"
            size="small"
            severity="secondary"
            text
            label="Limpiar"
            @click="clearPreviewSelection"
          />
        </div>
      </label>

      <label class="upload-field">
        <span>Archivos adjuntos</span>
        <input ref="archivosInputRef" type="file" multiple @change="onArchivosChange" />
        <div class="file-meta">
          <small>{{ archivosSummary }}</small>
          <Button
            v-if="form.archivosFiles.length"
            type="button"
            size="small"
            severity="secondary"
            text
            label="Limpiar"
            @click="clearArchivosSelection"
          />
        </div>
        <small v-if="showClearOptions" class="hint">
          Los nuevos adjuntos se agregan a los actuales. Marca "Limpiar archivos actuales" si
          quieres reemplazarlos.
        </small>
      </label>
    </section>

    <section v-if="showClearOptions" class="toggle-grid">
      <div class="toggle-item">
        <Checkbox v-model="form.clearPreview" input-id="clear-preview" binary />
        <label for="clear-preview">Quitar preview actual</label>
      </div>

      <div class="toggle-item">
        <Checkbox
          input-id="clear-archivos"
          binary
          :model-value="form.clearArchivos"
          @update:model-value="(value) => handleClearArchivosToggle(Boolean(value))"
        />
        <label for="clear-archivos">Limpiar archivos actuales</label>
      </div>
    </section>

    <div class="actions">
      <Button type="submit" :label="submitLabel" :loading="submitting" />
      <Button
        v-if="secondaryLabel"
        type="button"
        severity="secondary"
        outlined
        :label="secondaryLabel"
        @click="handleSecondary"
      />
    </div>
  </form>
</template>

<style scoped>
.product-form {
  display: grid;
  gap: 0.7rem;
}

.fields-grid,
.upload-grid {
  display: grid;
  gap: 0.65rem;
}

.field,
.upload-field {
  display: grid;
  gap: 0.32rem;
  color: var(--text-soft);
  font-size: 0.9rem;
}

.field > span,
.upload-field > span {
  font-weight: 500;
}

.current-media {
  display: grid;
  gap: 0.65rem;
}

.current-card {
  display: grid;
  gap: 0.45rem;
  border: 1px solid var(--p-content-border-color);
  border-radius: 14px;
  background: color-mix(in srgb, var(--p-content-background), #000 10%);
  padding: 0.75rem;
}

.current-card img {
  width: min(220px, 100%);
  border-radius: 12px;
  border: 1px solid var(--p-content-border-color);
  object-fit: cover;
}

.current-card video {
  width: min(280px, 100%);
  border-radius: 12px;
  border: 1px solid var(--p-content-border-color);
  background: #000;
}

.current-card-head {
  display: flex;
  justify-content: space-between;
  gap: 0.6rem;
  align-items: center;
  color: var(--text-soft);
}

.current-card-tools {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.current-card-head span {
  font-weight: 600;
  color: var(--text-main);
}

.current-card-head a {
  color: var(--p-primary-color);
  font-size: 0.84rem;
}

.current-files {
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.35rem;
  list-style: none;
}

.current-file-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.55rem;
  border: 1px solid color-mix(in srgb, var(--p-content-border-color), transparent 20%);
  border-radius: 10px;
  padding: 0.5rem 0.6rem;
  background: color-mix(in srgb, var(--p-content-background), #000 5%);
}

.current-files a {
  color: var(--p-primary-color);
  word-break: break-word;
}

.current-files-empty {
  margin: 0;
  border: 1px dashed var(--p-content-border-color);
  border-radius: 10px;
  padding: 0.7rem;
  color: var(--text-soft);
}

.current-preview-fallback {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 88px;
  padding: 0.9rem;
  border: 1px dashed var(--p-content-border-color);
  border-radius: 12px;
  color: var(--text-soft);
}

.hint {
  font-size: 0.78rem;
  color: var(--text-soft);
}

.field select {
  width: 100%;
  border: 1px solid var(--p-content-border-color);
  border-radius: 10px;
  background: rgb(12 12 12 / 88%);
  color: var(--text-soft);
  padding: 0.55rem 0.68rem;
  font: inherit;
}

.field select:focus {
  outline: none;
  border-color: rgb(230 162 93 / 78%);
  box-shadow: 0 0 0 2px rgb(230 162 93 / 16%);
}

.upload-field input[type='file'] {
  width: 100%;
  border: 1px solid var(--p-content-border-color);
  border-radius: 10px;
  background: rgb(12 12 12 / 88%);
  color: var(--text-soft);
  padding: 0.45rem 0.55rem;
  font: inherit;
}

.file-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.4rem;
}

.file-meta small {
  color: var(--text-soft);
}

.toggle-grid {
  display: grid;
  gap: 0.45rem;
}

.toggle-item {
  display: flex;
  align-items: center;
  gap: 0.48rem;
  color: var(--text-soft);
  font-size: 0.88rem;
}

.actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

@media (max-width: 700px) {
  .product-form {
    gap: 0.62rem;
  }

  .fields-grid,
  .upload-grid,
  .current-media {
    gap: 0.55rem;
  }

  .hint {
    font-size: 0.74rem;
  }

  .file-meta {
    gap: 0.28rem;
  }

  .file-meta small {
    font-size: 0.74rem;
  }

  .current-card-head,
  .current-card-tools,
  .current-file-row {
    align-items: flex-start;
    flex-direction: column;
  }

  .actions {
    gap: 0.42rem;
  }

  .actions :deep(.p-button) {
    flex: 1;
    min-width: 0;
  }
}
</style>
