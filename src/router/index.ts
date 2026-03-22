import { createRouter, createWebHistory } from 'vue-router'

import { pinia } from '@/pinia'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior() {
    return { top: 0 }
  },
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: {
        public: true,
        title: 'Iniciar sesión',
      },
    },
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/HomeView.vue'),
      meta: {
        requiresAuth: true,
        title: 'Dashboard',
      },
    },
    {
      path: '/productos',
      name: 'productos-list',
      component: () => import('@/views/ProductosListView.vue'),
      meta: {
        requiresAuth: true,
        title: 'Productos',
      },
    },
    {
      path: '/productos/nuevo',
      name: 'productos-create',
      component: () => import('@/views/ProductoCreateView.vue'),
      meta: {
        requiresAuth: true,
        title: 'Crear producto',
      },
    },
    {
      path: '/productos/:documentId/editar',
      name: 'productos-edit',
      component: () => import('@/views/ProductoEditView.vue'),
      props: true,
      meta: {
        requiresAuth: true,
        title: 'Editar producto',
      },
    },
    {
      path: '/categorias',
      name: 'categorias-list',
      component: () => import('@/views/CategoriasListView.vue'),
      meta: {
        requiresAuth: true,
        title: 'Categorías',
      },
    },
    {
      path: '/categorias/nueva',
      name: 'categorias-create',
      component: () => import('@/views/CategoriaCreateView.vue'),
      meta: {
        requiresAuth: true,
        title: 'Crear categoría',
      },
    },
    {
      path: '/categorias/:documentId/editar',
      name: 'categorias-edit',
      component: () => import('@/views/CategoriaEditView.vue'),
      props: true,
      meta: {
        requiresAuth: true,
        title: 'Editar categoría',
      },
    },
    {
      path: '/ajustes',
      name: 'ajustes-telegram',
      component: () => import('@/views/AjustesTelegramView.vue'),
      meta: {
        requiresAuth: true,
        requiresFrontendAdmin: true,
        title: 'Ajustes de Telegram',
      },
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/views/NotFoundView.vue'),
      meta: {
        public: true,
        title: 'Página no encontrada',
      },
    },
  ],
})

router.beforeEach(async (to) => {
  const authStore = useAuthStore(pinia)

  if (to.meta.public) {
    authStore.hydrate()

    if (to.name === 'login' && authStore.jwt) {
      const hasSession = await authStore.ensureSession()
      if (!hasSession) {
        return true
      }

      return { name: 'home' }
    }

    return true
  }

  const hasSession = await authStore.ensureSession()
  if (hasSession) {
    if (to.meta.requiresFrontendAdmin && !authStore.isFrontendAdmin) {
      return { name: 'home' }
    }

    return true
  }

  return {
    name: 'login',
    query: {
      redirect: to.fullPath,
    },
  }
})

router.afterEach((to) => {
  if (typeof document === 'undefined') {
    return
  }

  const title = typeof to.meta.title === 'string' ? to.meta.title : 'Publicador CMS'
  document.title = `${title} | Publicador CMS`
})

export default router
