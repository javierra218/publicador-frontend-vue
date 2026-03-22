<script setup lang="ts">
import { reactive, watch } from 'vue'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'

import AccessUsersFieldset from '@/components/AccessUsersFieldset.vue'
import type { CategoriaUpsertInput, FrontendUserOption } from '@/types/producto'

type CategoriaFormValues = {
  nombre: string
  slug: string
  assignedUserIds: number[]
}

const props = withDefaults(
  defineProps<{
    initialValues?: CategoriaFormValues
    submitLabel?: string
    submitting?: boolean
    secondaryLabel?: string
    showAccessControls?: boolean
    userOptions?: FrontendUserOption[]
  }>(),
  {
    initialValues: () => ({
      nombre: '',
      slug: '',
      assignedUserIds: [],
    }),
    submitLabel: 'Guardar',
    submitting: false,
    secondaryLabel: '',
    showAccessControls: false,
    userOptions: () => [],
  },
)

const emit = defineEmits<{
  submit: [payload: CategoriaUpsertInput]
  secondary: []
}>()

const form = reactive<CategoriaUpsertInput>({
  nombre: '',
  slug: '',
  assignedUserIds: [],
})

const localError = reactive({
  message: '',
})

const applyInitialValues = () => {
  form.nombre = props.initialValues.nombre
  form.slug = props.initialValues.slug
  form.assignedUserIds = [...props.initialValues.assignedUserIds]
  localError.message = ''
}

watch(() => props.initialValues, applyInitialValues, { immediate: true, deep: true })

const handleSubmit = () => {
  const nombre = form.nombre.trim()
  const slug = form.slug.trim()

  if (nombre.length < 2) {
    localError.message = 'El nombre debe tener al menos 2 caracteres.'
    return
  }

  localError.message = ''
  emit('submit', {
    nombre,
    slug,
    assignedUserIds: [...form.assignedUserIds],
  })
}
</script>

<template>
  <form class="categoria-form" @submit.prevent="handleSubmit">
    <Message v-if="localError.message" severity="error" :closable="false">{{
      localError.message
    }}</Message>

    <label class="field">
      <span>Nombre</span>
      <InputText v-model="form.nombre" placeholder="Ej: Tecnología" required minlength="2" fluid />
    </label>

    <label class="field">
      <span>Slug</span>
      <InputText
        v-model="form.slug"
        placeholder="Ej: tecnologia (opcional, se genera automáticamente)"
        fluid
      />
      <small class="hint">Si lo dejas vacío, se genera a partir del nombre.</small>
    </label>

    <AccessUsersFieldset
      v-if="showAccessControls"
      v-model="form.assignedUserIds"
      :users="userOptions"
      :disabled="submitting"
      title="Usuarios con acceso"
      hint="Si no seleccionas usuarios, esta categoría quedará visible solo para administradores del frontend."
    />

    <div class="actions">
      <Button type="submit" :label="submitLabel" :loading="submitting" />
      <Button
        v-if="secondaryLabel"
        type="button"
        severity="secondary"
        outlined
        :label="secondaryLabel"
        @click="$emit('secondary')"
      />
    </div>
  </form>
</template>

<style scoped>
.categoria-form {
  display: grid;
  gap: 0.7rem;
}

.field {
  display: grid;
  gap: 0.32rem;
  color: var(--text-soft);
  font-size: 0.9rem;
}

.field > span {
  font-weight: 500;
}

.hint {
  font-size: 0.78rem;
  color: var(--text-soft);
}

.actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

@media (max-width: 700px) {
  .categoria-form {
    gap: 0.62rem;
  }

  .hint {
    font-size: 0.74rem;
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
