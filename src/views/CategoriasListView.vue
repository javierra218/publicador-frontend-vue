<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'

import { deleteCategoria, fetchCategorias } from '@/services/strapi'
import type { Categoria } from '@/types/producto'

const router = useRouter()
const categorias = ref<Categoria[]>([])
const loading = ref(false)
const deletingDocumentId = ref<string | null>(null)
const error = ref('')
const result = ref('')
const search = ref('')

const filteredCategorias = computed(() => {
  const term = search.value.trim().toLowerCase()
  if (!term) {
    return categorias.value
  }

  return categorias.value.filter((categoria) => {
    const text = `${categoria.id} ${categoria.nombre} ${categoria.slug}`.toLowerCase()
    return text.includes(term)
  })
})

const loadCategorias = async () => {
  loading.value = true
  error.value = ''

  try {
    categorias.value = await fetchCategorias()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Error desconocido cargando categorías.'
  } finally {
    loading.value = false
  }
}

const goToCreate = () => {
  router.push({ name: 'categorias-create' })
}

const goToEdit = (documentId: string) => {
  router.push({ name: 'categorias-edit', params: { documentId } })
}

const handleDelete = async (categoria: Categoria) => {
  const confirmed = window.confirm(
    `¿Eliminar la categoría "${categoria.nombre}"? Esta acción no se puede deshacer.`,
  )
  if (!confirmed) {
    return
  }

  deletingDocumentId.value = categoria.documentId
  error.value = ''
  result.value = ''

  try {
    await deleteCategoria(categoria.documentId)
    result.value = `Categoría "${categoria.nombre}" eliminada correctamente.`
    await loadCategorias()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Error desconocido eliminando categoría.'
  } finally {
    deletingDocumentId.value = null
  }
}

onMounted(loadCategorias)
</script>

<template>
  <main class="page">
    <header class="page-header panel">
      <div>
        <p class="eyebrow">Sección</p>
        <h2>Listado de categorías</h2>
        <p class="subtitle">Gestiona categorías para clasificar productos.</p>
      </div>

      <div class="header-actions">
        <Button label="Nueva categoría" icon="pi pi-plus" @click="goToCreate" />
        <Button
          icon="pi pi-refresh"
          label="Recargar"
          :loading="loading"
          severity="secondary"
          @click="loadCategorias"
        />
      </div>
    </header>

    <section class="panel toolbar">
      <span class="search-box">
        <i class="pi pi-search" />
        <InputText v-model="search" placeholder="Buscar por ID, nombre o slug" />
      </span>
    </section>

    <Message v-if="error" severity="error" :closable="false">{{ error }}</Message>
    <Message v-if="result" severity="success" :closable="false">{{ result }}</Message>

    <DataTable
      :value="filteredCategorias"
      data-key="id"
      paginator
      :rows="10"
      :rows-per-page-options="[10, 20, 50]"
      :loading="loading"
      class="categorias-table"
      table-style="min-width: 40rem"
      current-page-report-template="{first}-{last} de {totalRecords}"
      paginator-template="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
    >
      <template #empty>
        <p class="table-empty">No hay categorías para mostrar.</p>
      </template>

      <Column field="id" header="ID" sortable style="width: 6rem" />
      <Column field="nombre" header="Nombre" sortable />
      <Column field="slug" header="Slug" sortable />

      <Column header="Acciones" style="width: 16rem">
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

.categorias-table :deep(.p-datatable-table-container) {
  border-radius: 12px;
  overflow: hidden;
}

.categorias-table :deep(.p-datatable-thead > tr > th) {
  background: color-mix(in srgb, var(--p-content-background), #000 16%);
  border-color: var(--p-content-border-color);
}

.categorias-table :deep(.p-datatable-tbody > tr > td) {
  border-color: color-mix(in srgb, var(--p-content-border-color), transparent 25%);
}

.row-actions {
  display: flex;
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
  .row-actions {
    width: 100%;
  }

  .header-actions :deep(.p-button),
  .row-actions :deep(.p-button) {
    flex: 1;
    min-width: 0;
    justify-content: center;
  }
}
</style>
