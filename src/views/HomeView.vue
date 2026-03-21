<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'

import { fetchProductos } from '@/services/strapi'
import type { Producto } from '@/types/producto'

const router = useRouter()
const productos = ref<Producto[]>([])
const loading = ref(false)
const error = ref('')
const quickSearch = ref('')

const stats = computed(() => {
  const total = productos.value.length
  const withPreview = productos.value.filter((item) => Boolean(item.previewImagenUrl)).length
  const withArchivos = productos.value.filter((item) => item.archivos.length > 0).length
  const withoutPrice = productos.value.filter((item) => !item.precio.trim()).length

  return {
    total,
    withPreview,
    withArchivos,
    withoutPrice,
  }
})

const latestProductos = computed(() => {
  const term = quickSearch.value.trim().toLowerCase()
  const list = !term
    ? productos.value
    : productos.value.filter((producto) => {
        const text = `${producto.id} ${producto.nombre} ${producto.descripcion}`.toLowerCase()
        return text.includes(term)
      })

  return list.slice(0, 8)
})

const goToList = () => {
  router.push({ name: 'productos-list' })
}

const goToCreate = () => {
  router.push({ name: 'productos-create' })
}

const goToCategorias = () => {
  router.push({ name: 'categorias-list' })
}

const goToCategoriaCreate = () => {
  router.push({ name: 'categorias-create' })
}

const goToAjustes = () => {
  router.push({ name: 'ajustes-telegram' })
}

const goToEdit = (documentId: string) => {
  router.push({ name: 'productos-edit', params: { documentId } })
}

const loadProductos = async () => {
  loading.value = true
  error.value = ''

  try {
    productos.value = await fetchProductos()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Error desconocido cargando productos.'
  } finally {
    loading.value = false
  }
}

onMounted(loadProductos)
</script>

<template>
  <main class="home-page">
    <section class="hero panel">
      <div>
        <p class="eyebrow">Inicio</p>
        <h2>Panel CMS</h2>
        <p class="subtitle">
          Dashboard rápido para monitorear el estado del catálogo y saltar al flujo que necesites.
        </p>
      </div>

      <div class="hero-actions">
        <Button label="Ir al listado" icon="pi pi-list" @click="goToList" />
        <Button
          label="Crear producto"
          icon="pi pi-plus"
          severity="secondary"
          outlined
          @click="goToCreate"
        />
        <Button
          label="Categorías"
          icon="pi pi-tags"
          severity="secondary"
          outlined
          @click="goToCategorias"
        />
        <Button
          label="Nueva categoría"
          icon="pi pi-tag"
          severity="secondary"
          outlined
          @click="goToCategoriaCreate"
        />
        <Button
          label="Ajustes Telegram"
          icon="pi pi-cog"
          severity="secondary"
          outlined
          @click="goToAjustes"
        />
        <Button
          :label="loading ? 'Cargando…' : 'Actualizar'"
          icon="pi pi-refresh"
          severity="secondary"
          text
          :loading="loading"
          @click="loadProductos"
        />
      </div>
    </section>

    <section class="stats-grid">
      <article class="panel stat">
        <p>Total productos</p>
        <strong>{{ stats.total }}</strong>
      </article>

      <article class="panel stat">
        <p>Con preview</p>
        <strong>{{ stats.withPreview }}</strong>
      </article>

      <article class="panel stat">
        <p>Con archivos</p>
        <strong>{{ stats.withArchivos }}</strong>
      </article>

      <article class="panel stat">
        <p>Sin precio</p>
        <strong>{{ stats.withoutPrice }}</strong>
      </article>
    </section>

    <section class="panel latest">
      <div class="section-head">
        <h3>Acceso rápido a edición</h3>
        <span class="search-wrap">
          <i class="pi pi-search" />
          <InputText
            v-model="quickSearch"
            type="text"
            placeholder="Filtrar por ID, nombre o descripción"
            fluid
          />
        </span>
      </div>

      <Message v-if="error" severity="error" :closable="false">{{ error }}</Message>

      <ul v-else-if="latestProductos.length" class="latest-list">
        <li v-for="producto in latestProductos" :key="producto.id">
          <div>
            <strong>{{ producto.nombre }}</strong>
            <small
              >ID {{ producto.id }} ·
              {{ producto.precio ? `$ ${producto.precio}` : 'Sin precio' }}</small
            >
          </div>

          <Button
            size="small"
            icon="pi pi-pencil"
            label="Editar"
            severity="secondary"
            outlined
            @click="goToEdit(producto.documentId)"
          />
        </li>
      </ul>

      <p v-else class="empty">No hay productos para esa búsqueda.</p>
    </section>
  </main>
</template>

<style scoped>
.home-page {
  display: grid;
  gap: 0.9rem;
}

.panel {
  border: 1px solid var(--p-content-border-color);
  border-radius: 16px;
  background: var(--p-content-background);
  box-shadow: 0 18px 36px rgb(0 0 0 / 28%);
  padding: 0.9rem;
}

.hero {
  display: flex;
  justify-content: space-between;
  gap: 0.8rem;
  flex-wrap: wrap;
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
  margin: 0.25rem 0 0;
}

.subtitle {
  color: var(--text-soft);
  margin: 0.3rem 0 0;
  max-width: 60ch;
}

.hero-actions {
  display: flex;
  gap: 0.45rem;
  align-items: center;
  flex-wrap: wrap;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.65rem;
}

.stat p {
  margin: 0;
  color: var(--text-soft);
  font-size: 0.84rem;
}

.stat strong {
  margin-top: 0.2rem;
  display: block;
  font-size: 1.28rem;
}

.latest {
  display: grid;
  gap: 0.75rem;
}

.section-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.7rem;
  flex-wrap: wrap;
}

.section-head h3 {
  margin: 0;
}

.search-wrap {
  min-width: 240px;
  max-width: 420px;
  width: 100%;
  display: grid;
  grid-template-columns: 20px minmax(0, 1fr);
  align-items: center;
  gap: 0.45rem;
}

.search-wrap i {
  color: var(--p-primary-color);
}

.latest-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.55rem;
}

.latest-list li {
  border: 1px solid var(--p-content-border-color);
  background: color-mix(in srgb, var(--p-content-background), #000 10%);
  border-radius: 10px;
  padding: 0.55rem 0.65rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.7rem;
}

.latest-list strong {
  display: block;
}

.latest-list small {
  color: var(--text-soft);
}

.empty {
  margin: 0;
  border: 1px dashed var(--p-content-border-color);
  border-radius: 12px;
  background: color-mix(in srgb, var(--p-content-background), #000 14%);
  color: var(--text-soft);
  text-align: center;
  padding: 0.95rem;
}

@media (max-width: 980px) {
  .stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .home-page {
    gap: 0.65rem;
  }

  .panel {
    padding: 0.75rem;
  }

  .hero {
    gap: 0.65rem;
  }

  .hero-actions {
    width: 100%;
  }

  .hero-actions :deep(.p-button) {
    flex: 1;
    min-width: 0;
    justify-content: center;
  }

  .stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.55rem;
  }

  .search-wrap {
    min-width: 100%;
  }

  .latest {
    gap: 0.65rem;
  }

  .latest-list li {
    padding: 0.5rem 0.55rem;
  }
}
</style>
