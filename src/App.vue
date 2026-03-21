<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import Drawer from 'primevue/drawer'

import { useAuthStore } from '@/stores/auth'
import { AUTH_EXPIRED_EVENT } from '@/utils/auth-storage'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const mobileNavOpen = ref(false)
const showShell = computed(() => auth.isAuthenticated && route.name !== 'login')
const userLabel = computed(() => auth.user?.email || auth.user?.username || 'Sesión activa')

const navItems = [
  { name: 'home', label: 'Home', icon: 'pi pi-home' },
  { name: 'productos-list', label: 'Listado', icon: 'pi pi-list' },
  { name: 'productos-create', label: 'Crear', icon: 'pi pi-plus' },
  { name: 'categorias-list', label: 'Categorías', icon: 'pi pi-tags' },
  { name: 'ajustes-telegram', label: 'Ajustes', icon: 'pi pi-cog' },
] as const

const isActive = (name: string) => {
  const currentRouteName = String(route.name ?? '')
  if (name === 'productos-list') {
    return currentRouteName === 'productos-list' || currentRouteName === 'productos-edit'
  }
  if (name === 'categorias-list') {
    return (
      currentRouteName === 'categorias-list' ||
      currentRouteName === 'categorias-edit' ||
      currentRouteName === 'categorias-create'
    )
  }

  return currentRouteName === name
}

const goTo = async (name: string) => {
  if (!isActive(name)) {
    await router.push({ name })
  }

  mobileNavOpen.value = false
}

const handleLogout = async () => {
  auth.logout()
  mobileNavOpen.value = false
  await router.replace({ name: 'login' })
}

const handleAuthExpired = async () => {
  auth.logout()
  mobileNavOpen.value = false

  if (route.name !== 'login') {
    await router.replace({
      name: 'login',
      query: {
        reason: 'expired',
      },
    })
  }
}

onMounted(() => {
  window.addEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired)
})

onBeforeUnmount(() => {
  window.removeEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired)
})
</script>

<template>
  <div v-if="showShell" class="app-shell">
    <header class="topbar panel">
      <div class="brand">
        <p class="brand-eyebrow">Publicador</p>
        <h1>CMS Frontend</h1>
      </div>

      <nav class="desktop-nav" aria-label="Navegación principal">
        <Button
          v-for="item in navItems"
          :key="`desktop-${item.name}`"
          :label="item.label"
          :icon="item.icon"
          :severity="isActive(item.name) ? undefined : 'secondary'"
          :outlined="!isActive(item.name)"
          size="small"
          @click="goTo(item.name)"
        />
      </nav>

      <div class="topbar-actions">
        <div class="session-chip">
          <i class="pi pi-user" />
          <span>{{ userLabel }}</span>
        </div>

        <Button
          class="logout-btn desktop-logout"
          icon="pi pi-sign-out"
          label="Salir"
          severity="secondary"
          outlined
          size="small"
          @click="handleLogout"
        />

        <Button
          class="mobile-nav-btn"
          icon="pi pi-bars"
          rounded
          text
          aria-label="Abrir navegación"
          @click="mobileNavOpen = true"
        />
      </div>
    </header>

    <aside class="sidebar panel" aria-label="Navegación lateral">
      <nav class="sidebar-nav">
        <Button
          v-for="item in navItems"
          :key="`sidebar-${item.name}`"
          :label="item.label"
          :icon="item.icon"
          :severity="isActive(item.name) ? undefined : 'secondary'"
          :outlined="!isActive(item.name)"
          fluid
          @click="goTo(item.name)"
        />
      </nav>
    </aside>

    <Drawer
      v-model:visible="mobileNavOpen"
      position="left"
      header="Navegación"
      class="mobile-drawer"
    >
      <nav class="drawer-nav">
        <Button
          v-for="item in navItems"
          :key="`mobile-${item.name}`"
          :label="item.label"
          :icon="item.icon"
          :severity="isActive(item.name) ? undefined : 'secondary'"
          :outlined="!isActive(item.name)"
          fluid
          @click="goTo(item.name)"
        />
        <Button
          icon="pi pi-sign-out"
          label="Cerrar sesión"
          severity="secondary"
          outlined
          fluid
          @click="handleLogout"
        />
      </nav>
    </Drawer>

    <main class="main-content">
      <RouterView />
    </main>
  </div>

  <RouterView v-else />
</template>

<style scoped>
.app-shell {
  min-height: calc(100dvh - 1.8rem);
  display: grid;
  grid-template-columns: 228px minmax(0, 1fr);
  grid-template-rows: auto 1fr;
  grid-template-areas:
    'topbar topbar'
    'sidebar main';
  gap: 0.8rem;
}

.panel {
  border: 1px solid var(--p-content-border-color);
  border-radius: 16px;
  background: var(--p-content-background);
  box-shadow: 0 16px 32px rgb(0 0 0 / 28%);
}

.topbar {
  grid-area: topbar;
  position: sticky;
  top: 0.35rem;
  z-index: 30;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.65rem;
  padding: 0.65rem;
  backdrop-filter: blur(5px);
}

.brand-eyebrow {
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-size: 0.72rem;
  color: var(--p-primary-color);
}

.brand h1 {
  margin: 0.15rem 0 0;
  font-size: 1.04rem;
}

.desktop-nav {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.topbar-actions {
  display: flex;
  align-items: center;
  gap: 0.55rem;
}

.session-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.42rem;
  max-width: 280px;
  padding: 0.45rem 0.65rem;
  border: 1px solid color-mix(in srgb, var(--p-content-border-color), transparent 12%);
  border-radius: 999px;
  color: var(--text-soft);
  font-size: 0.84rem;
  background: color-mix(in srgb, var(--p-content-background), #000 8%);
}

.session-chip span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mobile-nav-btn {
  display: none;
}

.sidebar {
  grid-area: sidebar;
  padding: 0.8rem;
  height: max-content;
}

.sidebar-nav,
.drawer-nav {
  display: grid;
  gap: 0.45rem;
}

.main-content {
  grid-area: main;
  min-width: 0;
}

:global(.mobile-drawer .p-drawer-header) {
  border-bottom: 1px solid var(--p-content-border-color);
}

@media (max-width: 920px) {
  .app-shell {
    min-height: auto;
    grid-template-columns: 1fr;
    grid-template-areas:
      'topbar'
      'main';
    gap: 0.65rem;
  }

  .sidebar,
  .desktop-nav {
    display: none;
  }

  .desktop-logout,
  .session-chip {
    display: none;
  }

  .topbar {
    padding: 0.5rem 0.55rem;
  }

  .brand h1 {
    font-size: 0.94rem;
  }

  .mobile-nav-btn {
    display: inline-flex;
  }
}
</style>
