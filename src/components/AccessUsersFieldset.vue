<script setup lang="ts">
import { computed } from 'vue'

import Checkbox from 'primevue/checkbox'

import type { FrontendUserOption } from '@/types/producto'

const props = withDefaults(
  defineProps<{
    modelValue: number[]
    users: FrontendUserOption[]
    title?: string
    hint?: string
    emptyState?: string
    disabled?: boolean
  }>(),
  {
    title: 'Acceso por usuario',
    hint: 'Si no seleccionas usuarios, quedará visible solo para administradores del frontend.',
    emptyState: 'No hay usuarios disponibles para asignar.',
    disabled: false,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: number[]]
}>()

const selectedUserIds = computed<number[]>({
  get: () => props.modelValue,
  set: (value) => {
    emit(
      'update:modelValue',
      [...new Set(value)].filter((id) => Number.isInteger(id) && id > 0),
    )
  },
})

const formatUserLabel = (user: FrontendUserOption): string => {
  if (user.username && user.email) {
    return `${user.username} · ${user.email}`
  }

  return user.username || user.email || `Usuario #${user.id}`
}
</script>

<template>
  <section class="access-panel">
    <div class="access-head">
      <div>
        <h4>{{ title }}</h4>
        <p>{{ hint }}</p>
      </div>
      <small>{{ selectedUserIds.length }} seleccionado(s)</small>
    </div>

    <p v-if="!users.length" class="empty-state">{{ emptyState }}</p>

    <div v-else class="access-grid">
      <label v-for="user in users" :key="user.id" class="access-option">
        <Checkbox v-model="selectedUserIds" :value="user.id" :binary="false" :disabled="disabled" />
        <span>{{ formatUserLabel(user) }}</span>
      </label>
    </div>
  </section>
</template>

<style scoped>
.access-panel {
  display: grid;
  gap: 0.8rem;
  padding: 0.9rem 1rem;
  border: 1px solid color-mix(in srgb, var(--p-primary-color) 18%, transparent);
  border-radius: 14px;
  background:
    linear-gradient(180deg, rgb(255 255 255 / 2%), rgb(255 255 255 / 0%)),
    color-mix(in srgb, var(--p-content-background) 94%, var(--p-primary-color) 6%);
}

.access-head {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
}

.access-head h4 {
  margin: 0;
  font-size: 0.98rem;
}

.access-head p,
.access-head small,
.empty-state {
  margin: 0.2rem 0 0;
  color: var(--text-soft);
}

.access-grid {
  display: grid;
  gap: 0.55rem;
}

.access-option {
  display: flex;
  gap: 0.65rem;
  align-items: flex-start;
  color: var(--text-soft);
  padding: 0.6rem 0.72rem;
  border-radius: 12px;
  background: rgb(255 255 255 / 2%);
}

.access-option span {
  line-height: 1.35;
}

@media (max-width: 700px) {
  .access-panel {
    padding: 0.8rem;
  }

  .access-head {
    gap: 0.6rem;
    flex-direction: column;
  }
}
</style>
