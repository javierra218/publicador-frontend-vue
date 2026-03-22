export type ProductoArchivo = {
  id: number
  url: string
  mime: string | null
  name: string | null
}

export type Categoria = {
  id: number
  documentId: string
  nombre: string
  slug: string
}

export type ConfiguracionTelegramOption = {
  id: number
  nombre: string
  chat_id: string
  label: string
}

export type TelegramUserOption = {
  id: number
  username: string
  email: string
}

export type ConfiguracionTelegramSetting = {
  id: number
  nombre: string
  chat_id: string
  bot_source: 'default' | 'legacy-default' | 'legacy' | 'missing'
  is_publishable: boolean
  access_mode: 'admin_only' | 'restricted'
  assigned_users: TelegramUserOption[]
  createdAt: string | null
  updatedAt: string | null
}

export type ConfiguracionTelegramCreateInput = {
  nombre: string
  chat_id: string
}

export type TelegramBotSetting = {
  is_configured: boolean
  token_hint: string
  source: 'stored' | 'legacy-shared' | 'missing'
}

export type TelegramDiscoveredChat = {
  chat_id: string
  type: 'private' | 'group' | 'supergroup' | 'channel' | 'unknown'
  title: string
  username: string
  label: string
  already_configured: boolean
}

export type Producto = {
  id: number
  documentId: string
  nombre: string
  descripcion: string
  precio: string
  categoria: Categoria | null
  previewImagenId: number | null
  previewImagenUrl: string | null
  previewImagenMime: string | null
  previewImagenName: string | null
  archivos: ProductoArchivo[]
}

export type PublicarResponse = {
  ok: boolean
  message_id: number | null
  metodo_usado: 'sendMediaGroup' | 'sendVideo' | 'sendPhoto' | 'sendMessage'
  configuracion_telegram_id: number
  chat_id: string
}

export type PublicarMasivoDetalle =
  | {
      id: number
      ok: true
      message_id: number | null
      metodo_usado: 'sendMediaGroup' | 'sendVideo' | 'sendPhoto' | 'sendMessage'
      configuracion_telegram_id: number
      chat_id: string
    }
  | {
      id: number
      ok: false
      code: string
      error: string
    }

export type PublicarMasivoResponse = {
  ok: boolean
  total: number
  exitos: number
  fallos: number
  configuracion_telegram_id: number
  chat_id: string
  detalles: PublicarMasivoDetalle[]
}

export type CategoriaUpsertInput = {
  nombre: string
  slug: string
}

export type ProductoUpsertInput = {
  nombre: string
  descripcion: string
  precio: string
  categoriaId: number | null
  existingArchivosIds: number[]
  previewFile: File | null
  archivosFiles: File[]
  clearPreview: boolean
  clearArchivos: boolean
}
