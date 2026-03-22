<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'

import Button from 'primevue/button'
import Checkbox from 'primevue/checkbox'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import Select from 'primevue/select'
import Tag from 'primevue/tag'

import {
  createTelegramSetting,
  deleteTelegramSetting,
  discoverTelegramChats,
  fetchTelegramBotSetting,
  fetchTelegramSettings,
  fetchTelegramUserOptions,
  updateTelegramBotSetting,
  updateTelegramConfigUsers,
} from '@/services/strapi'
import type {
  ConfiguracionTelegramSetting,
  TelegramBotSetting,
  TelegramDiscoveredChat,
  TelegramUserOption,
} from '@/types/producto'

const configuraciones = ref<ConfiguracionTelegramSetting[]>([])
const discoveredChats = ref<TelegramDiscoveredChat[]>([])
const users = ref<TelegramUserOption[]>([])
const botInfo = ref<TelegramBotSetting | null>(null)
const loading = ref(false)
const loadingDiscovery = ref(false)
const savingBot = ref(false)
const savingChat = ref(false)
const savingAccess = ref(false)
const addingDetectedChatId = ref<string | null>(null)
const deletingId = ref<number | null>(null)
const error = ref('')
const result = ref('')
const search = ref('')
const botToken = ref('')
const nombre = ref('')
const chatId = ref('')
const selectedAccessConfigId = ref<number | null>(null)
const selectedAccessUserIds = ref<number[]>([])

const filteredConfiguraciones = computed(() => {
  const term = search.value.trim().toLowerCase()
  if (!term) {
    return configuraciones.value
  }

  return configuraciones.value.filter((configuracion) => {
    const text =
      `${configuracion.id} ${configuracion.nombre} ${configuracion.chat_id} ${configuracion.bot_source}`.toLowerCase()
    return text.includes(term)
  })
})

const hasDiscoveryResults = computed(() => discoveredChats.value.length > 0)
const selectedAccessConfig = computed(
  () => configuraciones.value.find((item) => item.id === selectedAccessConfigId.value) ?? null,
)

const botStatusLabel = computed(() => {
  if (!botInfo.value?.is_configured) {
    return 'Sin configurar'
  }

  if (botInfo.value.source === 'legacy-shared') {
    return 'Heredado'
  }

  return 'Configurado'
})

const botStatusSeverity = computed(() => {
  if (!botInfo.value?.is_configured) {
    return 'warn'
  }

  return botInfo.value.source === 'legacy-shared' ? 'info' : 'success'
})

const botHelperText = computed(() => {
  if (!botInfo.value?.is_configured) {
    return 'Aún no hay un bot global configurado. Los chats nuevos no podrán publicar hasta guardarlo.'
  }

  if (botInfo.value.source === 'legacy-shared') {
    return `Se detectó un token heredado compartido (${botInfo.value.token_hint}). Puedes guardarlo aquí para dejarlo fijo como bot global.`
  }

  return `Bot global activo: ${botInfo.value.token_hint}. Todos los chats nuevos usarán este token por defecto.`
})

const chatBotSourceLabel = (source: ConfiguracionTelegramSetting['bot_source']): string => {
  if (source === 'default') {
    return 'Por defecto'
  }

  if (source === 'legacy-default') {
    return 'Heredado común'
  }

  if (source === 'legacy') {
    return 'Legado propio'
  }

  return 'Sin bot'
}

const chatBotSourceSeverity = (source: ConfiguracionTelegramSetting['bot_source']) => {
  if (source === 'default') {
    return 'success'
  }

  if (source === 'legacy-default') {
    return 'info'
  }

  if (source === 'legacy') {
    return 'warn'
  }

  return 'danger'
}

const discoveredTypeLabel = (type: TelegramDiscoveredChat['type']): string => {
  if (type === 'supergroup') {
    return 'Supergrupo'
  }

  if (type === 'group') {
    return 'Grupo'
  }

  if (type === 'channel') {
    return 'Canal'
  }

  if (type === 'private') {
    return 'Privado'
  }

  return 'Otro'
}

const formatAssignedUsers = (usersToFormat: TelegramUserOption[]): string => {
  return usersToFormat.map((user) => user.username || user.email).join(', ') || 'Sin usuarios'
}

const syncDiscoveredChats = () => {
  const configuredChatIds = new Set(configuraciones.value.map((item) => item.chat_id))
  discoveredChats.value = discoveredChats.value.map((chat) => ({
    ...chat,
    already_configured: configuredChatIds.has(chat.chat_id),
  }))
}

const syncSelectedAccessConfig = () => {
  if (!configuraciones.value.length) {
    selectedAccessConfigId.value = null
    selectedAccessUserIds.value = []
    return
  }

  if (
    selectedAccessConfigId.value !== null &&
    configuraciones.value.some((item) => item.id === selectedAccessConfigId.value)
  ) {
    return
  }

  selectedAccessConfigId.value = configuraciones.value[0]?.id ?? null
}

const formatDate = (value: string | null): string => {
  if (!value) {
    return 'Sin registro'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return 'Sin registro'
  }

  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

const resetChatForm = () => {
  nombre.value = ''
  chatId.value = ''
}

const loadAjustes = async () => {
  loading.value = true
  error.value = ''

  try {
    const [bot, chats, userOptions] = await Promise.all([
      fetchTelegramBotSetting(),
      fetchTelegramSettings(),
      fetchTelegramUserOptions(),
    ])
    botInfo.value = bot
    configuraciones.value = chats
    users.value = userOptions
    syncSelectedAccessConfig()
    syncDiscoveredChats()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Error desconocido cargando ajustes de Telegram.'
  } finally {
    loading.value = false
  }
}

const handleDiscoverChats = async () => {
  loadingDiscovery.value = true
  error.value = ''
  result.value = ''

  try {
    discoveredChats.value = await discoverTelegramChats()
    syncDiscoveredChats()
    result.value = discoveredChats.value.length
      ? 'Chats detectados correctamente desde Telegram.'
      : 'No se detectaron chats. Envía un mensaje al grupo/canal y vuelve a intentar.'
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Error desconocido detectando chats.'
  } finally {
    loadingDiscovery.value = false
  }
}

const handleSaveBot = async () => {
  if (!botToken.value.trim()) {
    error.value = 'Debes ingresar un bot_token válido.'
    return
  }

  savingBot.value = true
  error.value = ''
  result.value = ''

  try {
    botInfo.value = await updateTelegramBotSetting(botToken.value)
    botToken.value = ''
    result.value = 'Bot global de Telegram actualizado correctamente.'
    await loadAjustes()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Error desconocido guardando el bot global.'
  } finally {
    savingBot.value = false
  }
}

const handleAddDetectedChat = async (chat: TelegramDiscoveredChat) => {
  addingDetectedChatId.value = chat.chat_id
  error.value = ''
  result.value = ''

  try {
    const suggestedName = chat.title || (chat.username ? `@${chat.username}` : '')
    const created = await createTelegramSetting({
      nombre: suggestedName,
      chat_id: chat.chat_id,
    })
    result.value = `Chat ${created.chat_id} agregado desde detección automática.`
    await loadAjustes()
    syncDiscoveredChats()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Error desconocido agregando chat detectado.'
  } finally {
    addingDetectedChatId.value = null
  }
}

const handleCreateChat = async () => {
  if (!chatId.value.trim()) {
    error.value = 'Debes ingresar un chat_id válido.'
    return
  }

  savingChat.value = true
  error.value = ''
  result.value = ''

  try {
    const created = await createTelegramSetting({
      nombre: nombre.value,
      chat_id: chatId.value,
    })
    result.value = `Chat ${created.chat_id} agregado correctamente.`
    resetChatForm()
    await loadAjustes()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Error desconocido creando chat.'
  } finally {
    savingChat.value = false
  }
}

const handleDelete = async (configuracion: ConfiguracionTelegramSetting) => {
  const label = configuracion.nombre || configuracion.chat_id
  const confirmed = window.confirm(`¿Eliminar el chat "${label}"? Esta acción no se puede deshacer.`)

  if (!confirmed) {
    return
  }

  deletingId.value = configuracion.id
  error.value = ''
  result.value = ''

  try {
    await deleteTelegramSetting(configuracion.id)
    result.value = `Chat ${configuracion.chat_id} eliminado correctamente.`
    await loadAjustes()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Error desconocido eliminando chat.'
  } finally {
    deletingId.value = null
  }
}

const handleSaveAccess = async () => {
  if (!selectedAccessConfig.value) {
    error.value = 'Selecciona un chat para guardar permisos.'
    return
  }

  savingAccess.value = true
  error.value = ''
  result.value = ''

  try {
    const updated = await updateTelegramConfigUsers(
      selectedAccessConfig.value.id,
      selectedAccessUserIds.value,
    )
    configuraciones.value = configuraciones.value.map((configuracion) =>
      configuracion.id === selectedAccessConfig.value?.id
        ? {
            ...configuracion,
            access_mode: updated.access_mode,
            assigned_users: updated.assigned_users,
          }
        : configuracion,
    )
    result.value =
      updated.access_mode === 'restricted'
        ? 'Permisos de chat actualizados correctamente.'
        : 'El chat quedó visible solo para administradores hasta asignarlo a usuarios.'
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Error desconocido guardando permisos del chat.'
  } finally {
    savingAccess.value = false
  }
}

watch(
  [selectedAccessConfigId, configuraciones],
  () => {
    const assignedUsers = selectedAccessConfig.value?.assigned_users ?? []
    selectedAccessUserIds.value = assignedUsers.map((user) => user.id)
  },
  { immediate: true },
)

onMounted(loadAjustes)
</script>

<template>
  <main class="page">
    <header class="page-header panel">
      <div>
        <p class="eyebrow">Ajustes</p>
        <h2>Telegram</h2>
        <p class="subtitle">Configura un bot global y administra los chats disponibles para publicar.</p>
      </div>

      <div class="header-actions">
        <Button
          icon="pi pi-refresh"
          label="Recargar"
          :loading="loading"
          severity="secondary"
          @click="loadAjustes"
        />
      </div>
    </header>

    <section class="settings-grid">
      <article class="panel bot-panel">
        <div class="section-head">
          <div>
            <h3>Bot por defecto</h3>
            <p>Este token se usará para todos los chats nuevos al momento de publicar.</p>
          </div>
          <Tag :severity="botStatusSeverity" :value="botStatusLabel" />
        </div>

        <p class="helper-text">{{ botHelperText }}</p>

        <label class="field">
          <span>Bot token</span>
          <InputText
            v-model="botToken"
            type="password"
            autocomplete="new-password"
            placeholder="123456789:AA..."
          />
        </label>

        <div class="form-actions">
          <Button
            :label="savingBot ? 'Guardando…' : 'Guardar bot global'"
            icon="pi pi-save"
            :loading="savingBot"
            @click="handleSaveBot"
          />
        </div>
      </article>

      <article class="panel chat-panel">
        <div class="section-head">
          <div>
            <h3>Agregar chat</h3>
            <p>Solo defines el chat. El bot por defecto se aplica automáticamente.</p>
          </div>
        </div>

        <div class="form-grid">
          <label class="field">
            <span>Nombre visible</span>
            <InputText
              v-model="nombre"
              type="text"
              placeholder="Canal VIP, Grupo pruebas, Canal principal..."
            />
          </label>

          <label class="field">
            <span>Chat ID o @canal</span>
            <InputText v-model="chatId" type="text" placeholder="-1001234567890 o @mi_canal" />
          </label>
        </div>

        <div class="form-actions">
          <Button
            :label="savingChat ? 'Guardando…' : 'Guardar chat'"
            icon="pi pi-plus"
            :loading="savingChat"
            @click="handleCreateChat"
          />
        </div>
      </article>
    </section>

    <section class="panel notes-panel">
      <h3>Notas</h3>
      <ul class="notes-list">
        <li>El `chat_id` puede ser numérico (`-100...`) o un alias como `@mi_canal`.</li>
        <li>Los chats antiguos con `bot_token` propio siguen funcionando como fallback legado.</li>
        <li>Si no configuras el bot global, los chats nuevos quedarán guardados pero no publicarán hasta definirlo.</li>
      </ul>
    </section>

    <section class="panel discovery-panel">
      <div class="section-head">
        <div>
          <h3>Detectar chats del bot</h3>
          <p>Consulta `getUpdates` de Telegram para encontrar grupos, canales o chats donde ya agregaste el bot.</p>
        </div>
        <Button
          :label="loadingDiscovery ? 'Detectando…' : 'Detectar chats'"
          icon="pi pi-search"
          :loading="loadingDiscovery"
          severity="secondary"
          @click="handleDiscoverChats"
        />
      </div>

      <p class="helper-text">
        Si no aparece nada, envía un mensaje al grupo o publica algo en el canal después de agregar el bot y vuelve a intentar.
      </p>

      <DataTable
        v-if="hasDiscoveryResults"
        :value="discoveredChats"
        data-key="chat_id"
        class="configs-table"
        table-style="min-width: 52rem"
      >
        <Column field="label" header="Chat" />

        <Column header="Tipo" style="width: 8rem">
          <template #body="{ data }">
            <Tag severity="info" :value="discoveredTypeLabel(data.type)" />
          </template>
        </Column>

        <Column field="chat_id" header="Chat ID" />

        <Column header="Estado" style="width: 10rem">
          <template #body="{ data }">
            <Tag
              :severity="data.already_configured ? 'success' : 'warn'"
              :value="data.already_configured ? 'Ya agregado' : 'Disponible'"
            />
          </template>
        </Column>

        <Column header="Acción" style="width: 11rem">
          <template #body="{ data }">
            <Button
              size="small"
              icon="pi pi-plus"
              :label="data.already_configured ? 'Agregado' : 'Agregar'"
              :disabled="data.already_configured"
              :loading="addingDetectedChatId === data.chat_id"
              @click="handleAddDetectedChat(data)"
            />
          </template>
        </Column>
      </DataTable>

      <p v-else class="table-empty">Todavía no hay chats detectados.</p>
    </section>

    <section class="panel access-panel">
      <div class="section-head">
        <div>
          <h3>Permisos por usuario</h3>
          <p>
            Elige qué usuarios pueden publicar en un chat. Si no seleccionas ninguno, el chat queda
            visible solo para administradores.
          </p>
        </div>
      </div>

      <div class="access-toolbar">
        <label class="field">
          <span>Chat</span>
          <Select
            v-model="selectedAccessConfigId"
            :options="configuraciones"
            option-label="nombre"
            option-value="id"
            placeholder="Selecciona un chat"
            :disabled="!configuraciones.length"
          >
            <template #option="{ option }">
              <span>{{ option.nombre || `Config #${option.id}` }} · {{ option.chat_id }}</span>
            </template>
            <template #value="{ value }">
              <span v-if="value && selectedAccessConfig">
                {{ selectedAccessConfig.nombre || `Config #${selectedAccessConfig.id}` }} ·
                {{ selectedAccessConfig.chat_id }}
              </span>
              <span v-else>Selecciona un chat</span>
            </template>
          </Select>
        </label>
      </div>

      <p v-if="selectedAccessConfig" class="helper-text">
        Estado actual:
        <strong>{{
          selectedAccessConfig.access_mode === 'restricted' ? 'restringido' : 'solo admins'
        }}</strong>
      </p>

      <div v-if="users.length" class="access-users">
        <label v-for="user in users" :key="user.id" class="user-checkbox">
          <Checkbox v-model="selectedAccessUserIds" :input-id="`user-${user.id}`" :value="user.id" />
          <span>
            <strong>{{ user.username || user.email }}</strong>
            <small>{{ user.email }}</small>
          </span>
        </label>
      </div>

      <p v-else class="table-empty">No hay usuarios del frontend disponibles para asignar.</p>

      <div class="form-actions">
        <Button
          :label="savingAccess ? 'Guardando…' : 'Guardar permisos'"
          icon="pi pi-shield"
          :loading="savingAccess"
          :disabled="!selectedAccessConfig"
          @click="handleSaveAccess"
        />
      </div>
    </section>

    <section class="panel toolbar">
      <span class="search-box">
        <i class="pi pi-search" />
        <InputText v-model="search" placeholder="Buscar por ID, nombre, chat o fuente del bot" />
      </span>
    </section>

    <Message v-if="error" severity="error" :closable="false">{{ error }}</Message>
    <Message v-if="result" severity="success" :closable="false">{{ result }}</Message>

    <DataTable
      :value="filteredConfiguraciones"
      data-key="id"
      paginator
      :rows="8"
      :rows-per-page-options="[8, 16, 32]"
      :loading="loading"
      class="configs-table"
      table-style="min-width: 58rem"
      current-page-report-template="{first}-{last} de {totalRecords}"
      paginator-template="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
    >
      <template #empty>
        <p class="table-empty">No hay chats configurados todavía.</p>
      </template>

      <Column field="id" header="ID" sortable style="width: 6rem" />

      <Column header="Nombre" sortable>
        <template #body="{ data }">
          <strong>{{ data.nombre || `Config #${data.id}` }}</strong>
        </template>
      </Column>

      <Column field="chat_id" header="Chat" sortable />

      <Column header="Bot">
        <template #body="{ data }">
          <Tag :severity="chatBotSourceSeverity(data.bot_source)" :value="chatBotSourceLabel(data.bot_source)" />
        </template>
      </Column>

      <Column header="Estado">
        <template #body="{ data }">
          <Tag
            :severity="data.is_publishable ? 'success' : 'warn'"
            :value="data.is_publishable ? 'Publicable' : 'Pendiente'"
          />
        </template>
      </Column>

      <Column header="Usuarios">
        <template #body="{ data }">
          <span v-if="data.access_mode === 'admin_only'" class="muted">Solo admins</span>
          <span v-else class="muted">
            {{ formatAssignedUsers(data.assigned_users) }}
          </span>
        </template>
      </Column>

      <Column header="Actualizado">
        <template #body="{ data }">
          <span class="muted">{{ formatDate(data.updatedAt || data.createdAt) }}</span>
        </template>
      </Column>

      <Column header="Acciones" style="width: 11rem">
        <template #body="{ data }">
          <Button
            size="small"
            icon="pi pi-trash"
            label="Eliminar"
            severity="danger"
            outlined
            :loading="deletingId === data.id"
            @click="handleDelete(data)"
          />
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

h2,
h3 {
  margin: 0.25rem 0 0;
}

.subtitle,
.section-head p,
.muted,
.helper-text {
  margin: 0.3rem 0 0;
  color: var(--text-soft);
}

.header-actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.settings-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.9rem;
}

.bot-panel,
.chat-panel,
.discovery-panel,
.access-panel,
.notes-panel,
.toolbar {
  display: grid;
  gap: 0.75rem;
}

.section-head {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  align-items: flex-start;
}

.form-grid {
  display: grid;
  gap: 0.7rem;
}

.field {
  display: grid;
  gap: 0.35rem;
}

.field span {
  font-size: 0.9rem;
  color: var(--text-soft);
}

.form-actions {
  display: flex;
  justify-content: flex-start;
}

.access-toolbar {
  display: grid;
  gap: 0.75rem;
}

.access-users {
  display: grid;
  gap: 0.55rem;
}

.user-checkbox {
  display: flex;
  align-items: flex-start;
  gap: 0.55rem;
  padding: 0.7rem 0.75rem;
  border: 1px solid color-mix(in srgb, var(--p-content-border-color), transparent 18%);
  border-radius: 12px;
}

.user-checkbox span {
  display: grid;
  gap: 0.12rem;
}

.user-checkbox small {
  color: var(--text-soft);
}

.notes-list {
  margin: 0;
  padding-left: 1rem;
  display: grid;
  gap: 0.45rem;
  color: var(--text-soft);
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

.configs-table :deep(.p-datatable-table-container) {
  border-radius: 12px;
  overflow: hidden;
}

.configs-table :deep(.p-datatable-thead > tr > th) {
  background: color-mix(in srgb, var(--p-content-background), #000 16%);
  border-color: var(--p-content-border-color);
}

.configs-table :deep(.p-datatable-tbody > tr > td) {
  border-color: color-mix(in srgb, var(--p-content-border-color), transparent 25%);
}

.table-empty {
  margin: 0;
  color: var(--text-soft);
}

@media (max-width: 880px) {
  .settings-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .page {
    gap: 0.65rem;
  }

  .panel {
    padding: 0.7rem;
  }

  .header-actions,
  .form-actions {
    width: 100%;
  }

  .header-actions :deep(.p-button),
  .form-actions :deep(.p-button) {
    flex: 1;
    justify-content: center;
  }

  .section-head {
    flex-direction: column;
  }
}
</style>
