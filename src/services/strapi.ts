import type {
  Categoria,
  CategoriaUpsertInput,
  ConfiguracionTelegramCreateInput,
  ConfiguracionTelegramOption,
  ConfiguracionTelegramSetting,
  Producto,
  ProductoUpsertInput,
  PublicarMasivoResponse,
  PublicarResponse,
  TelegramBotSetting,
  TelegramDiscoveredChat,
  TelegramUserOption,
} from '@/types/producto'
import {
  getStrapiAuthHeaders,
  parseStrapiErrorResponse,
  strapiBaseUrl as BASE_URL,
} from '@/lib/strapi-http'

type MediaShape = {
  id?: number
  url?: string
  mime?: string | null
  name?: string | null
  data?: unknown
  attributes?: unknown
}

type AnyRecord = Record<string, unknown>

const ensureString = (value: unknown): string => (typeof value === 'string' ? value : '')
const ensureNumber = (value: unknown): number =>
  typeof value === 'number' ? value : Number(value ?? 0)
const slugify = (value: string): string =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const unwrapEntity = (entity: unknown): AnyRecord => {
  if (!entity || typeof entity !== 'object') return {}

  const candidate = entity as AnyRecord
  if (candidate.attributes && typeof candidate.attributes === 'object') {
    return {
      id: candidate.id,
      ...(candidate.attributes as AnyRecord),
    }
  }

  return candidate
}

const unwrapSingleRelation = (value: unknown): AnyRecord | null => {
  if (!value || typeof value !== 'object') {
    return null
  }

  const root = value as AnyRecord
  if (root.data !== undefined) {
    if (!root.data) {
      return null
    }

    const nested = unwrapEntity(root.data)
    return Object.keys(nested).length ? nested : null
  }

  const direct = unwrapEntity(value)
  return Object.keys(direct).length ? direct : null
}

const unwrapMedia = (value: unknown): MediaShape | null => {
  if (!value || typeof value !== 'object') return null

  const root = value as AnyRecord

  if (root.data !== undefined) {
    if (!root.data) return null
    return unwrapMedia(root.data)
  }

  if (root.attributes && typeof root.attributes === 'object') {
    return {
      id: ensureNumber(root.id),
      ...(root.attributes as MediaShape),
      url: ensureString((root.attributes as AnyRecord).url),
      mime: ((root.attributes as AnyRecord).mime as string | null | undefined) ?? null,
      name: ((root.attributes as AnyRecord).name as string | null | undefined) ?? null,
    }
  }

  return {
    ...(root as MediaShape),
    id: ensureNumber(root.id),
    url: ensureString(root.url),
    mime: (root.mime as string | null | undefined) ?? null,
    name: (root.name as string | null | undefined) ?? null,
  }
}

const unwrapMediaArray = (value: unknown): MediaShape[] => {
  if (!value || typeof value !== 'object') return []

  const root = value as AnyRecord

  if (Array.isArray(root.data)) {
    return root.data.map(unwrapMedia).filter((media): media is MediaShape => Boolean(media))
  }

  if (Array.isArray(value)) {
    return value.map(unwrapMedia).filter((media): media is MediaShape => Boolean(media))
  }

  const single = unwrapMedia(value)
  return single ? [single] : []
}

const resolveMediaUrl = (rawUrl: string): string => {
  if (!rawUrl) return ''
  if (/^https?:\/\//i.test(rawUrl)) return rawUrl
  return `${BASE_URL}${rawUrl.startsWith('/') ? '' : '/'}${rawUrl}`
}

const mapProducto = (entity: unknown): Producto => {
  const raw = unwrapEntity(entity)
  const rawPreview = unwrapMedia(raw.preview_imagen)
  const rawArchivos = unwrapMediaArray(raw.archivos)
  const rawCategoria = unwrapSingleRelation(raw.categoria)

  return {
    id: ensureNumber(raw.id),
    documentId: ensureString(raw.documentId),
    nombre: ensureString(raw.nombre) || '(Sin nombre)',
    descripcion: ensureString(raw.descripcion),
    precio: raw.precio !== undefined && raw.precio !== null ? String(raw.precio) : '',
    categoria:
      rawCategoria && ensureNumber(rawCategoria.id) > 0
        ? {
            id: ensureNumber(rawCategoria.id),
            documentId: ensureString(rawCategoria.documentId),
            nombre: ensureString(rawCategoria.nombre),
            slug: ensureString(rawCategoria.slug),
          }
        : null,
    previewImagenId: rawPreview?.id ? ensureNumber(rawPreview.id) : null,
    previewImagenUrl: rawPreview?.url ? resolveMediaUrl(rawPreview.url) : null,
    previewImagenMime: rawPreview?.mime ?? null,
    previewImagenName: rawPreview?.name ?? null,
    archivos: rawArchivos
      .filter((file) => Boolean(file.url))
      .map((file) => ({
        id: ensureNumber(file.id),
        url: resolveMediaUrl(file.url ?? ''),
        mime: file.mime ?? null,
        name: file.name ?? null,
      }))
      .filter((file) => file.id > 0),
  }
}

const mapCategoria = (entity: unknown): Categoria => {
  const raw = unwrapEntity(entity)

  return {
    id: ensureNumber(raw.id),
    documentId: ensureString(raw.documentId),
    nombre: ensureString(raw.nombre) || '(Sin nombre)',
    slug: ensureString(raw.slug),
  }
}

const mapConfiguracionTelegramOption = (entity: unknown): ConfiguracionTelegramOption => {
  const raw = unwrapEntity(entity)

  return {
    id: ensureNumber(raw.id),
    nombre: ensureString(raw.nombre),
    chat_id: ensureString(raw.chat_id),
    label: ensureString(raw.label) || `Config #${ensureNumber(raw.id)} · ${ensureString(raw.chat_id)}`,
  }
}

const mapConfiguracionTelegramSetting = (entity: unknown): ConfiguracionTelegramSetting => {
  const raw = unwrapEntity(entity)

  return {
    id: ensureNumber(raw.id),
    nombre: ensureString(raw.nombre),
    chat_id: ensureString(raw.chat_id),
    bot_source:
      raw.bot_source === 'default' ||
      raw.bot_source === 'legacy-default' ||
      raw.bot_source === 'legacy' ||
      raw.bot_source === 'missing'
        ? raw.bot_source
        : 'missing',
    is_publishable: Boolean(raw.is_publishable),
    access_mode:
      raw.access_mode === 'restricted' || raw.access_mode === 'admin_only'
        ? raw.access_mode
        : 'admin_only',
    assigned_users: Array.isArray(raw.assigned_users)
      ? raw.assigned_users.map((item) => mapTelegramUserOption(item)).filter((item) => item.id > 0)
      : [],
    createdAt: ensureString(raw.createdAt) || null,
    updatedAt: ensureString(raw.updatedAt) || null,
  }
}

const mapTelegramUserOption = (entity: unknown): TelegramUserOption => {
  const raw = unwrapEntity(entity)

  return {
    id: ensureNumber(raw.id),
    username: ensureString(raw.username),
    email: ensureString(raw.email),
  }
}

const mapTelegramBotSetting = (entity: unknown): TelegramBotSetting => {
  const raw = unwrapEntity(entity)

  return {
    is_configured: Boolean(raw.is_configured),
    token_hint: ensureString(raw.token_hint),
    source:
      raw.source === 'stored' || raw.source === 'legacy-shared' || raw.source === 'missing'
        ? raw.source
        : 'missing',
  }
}

const mapTelegramDiscoveredChat = (entity: unknown): TelegramDiscoveredChat => {
  const raw = unwrapEntity(entity)

  return {
    chat_id: ensureString(raw.chat_id),
    type:
      raw.type === 'private' ||
      raw.type === 'group' ||
      raw.type === 'supergroup' ||
      raw.type === 'channel' ||
      raw.type === 'unknown'
        ? raw.type
        : 'unknown',
    title: ensureString(raw.title),
    username: ensureString(raw.username),
    label: ensureString(raw.label),
    already_configured: Boolean(raw.already_configured),
  }
}

const uploadMedia = async (files: File[]): Promise<number[]> => {
  if (!files.length) {
    return []
  }

  const form = new FormData()
  files.forEach((file) => {
    form.append('files', file)
  })

  const response = await fetch(`${BASE_URL}/api/upload`, {
    method: 'POST',
    headers: {
      ...getStrapiAuthHeaders(),
    },
    body: form,
  })

  if (!response.ok) {
    const detail = await parseStrapiErrorResponse(response)
    throw new Error(`No se pudo subir archivo(s): ${detail}`)
  }

  const payload = (await response.json()) as Array<{ id?: number }>
  const ids = payload.map((item) => ensureNumber(item.id)).filter((id) => id > 0)

  if (!ids.length) {
    throw new Error('La subida no devolvió IDs de archivos.')
  }

  return ids
}

const toProductoData = async (input: ProductoUpsertInput, mode: 'create' | 'edit') => {
  const categoriaId = Number(input.categoriaId)

  const data: Record<string, unknown> = {
    nombre: input.nombre.trim(),
    descripcion: input.descripcion.trim(),
    precio: input.precio.trim() === '' ? null : input.precio.trim(),
    categoria: Number.isInteger(categoriaId) && categoriaId > 0 ? categoriaId : null,
  }

  if (input.previewFile) {
    const [uploadedPreviewId] = await uploadMedia([input.previewFile])
    data.preview_imagen = uploadedPreviewId
  } else if (mode === 'edit' && input.clearPreview) {
    data.preview_imagen = null
  }

  if (input.archivosFiles.length) {
    const uploadedArchivosIds = await uploadMedia(input.archivosFiles)
    data.archivos =
      mode === 'edit' && !input.clearArchivos
        ? [...new Set([...input.existingArchivosIds, ...uploadedArchivosIds])]
        : uploadedArchivosIds
  } else if (mode === 'edit') {
    data.archivos = input.clearArchivos ? [] : [...new Set(input.existingArchivosIds)]
  }

  return data
}

export const fetchProductos = async (): Promise<Producto[]> => {
  const params = new URLSearchParams()
  params.append('populate[0]', 'preview_imagen')
  params.append('populate[1]', 'archivos')
  params.append('populate[2]', 'categoria')
  params.append('sort[0]', 'id:desc')
  params.append('pagination[pageSize]', '100')

  const response = await fetch(`${BASE_URL}/api/productos?${params.toString()}`, {
    headers: {
      ...getStrapiAuthHeaders(),
    },
  })

  if (!response.ok) {
    const detail = await parseStrapiErrorResponse(response)
    throw new Error(`No se pudo cargar productos: ${detail}`)
  }

  const json = (await response.json()) as { data?: unknown[] }
  const data = Array.isArray(json.data) ? json.data : []

  return data.map(mapProducto).filter((item) => item.id > 0)
}

export const fetchCategorias = async (): Promise<Categoria[]> => {
  const params = new URLSearchParams()
  params.append('sort[0]', 'nombre:asc')
  params.append('pagination[pageSize]', '200')

  const response = await fetch(`${BASE_URL}/api/categorias?${params.toString()}`, {
    headers: {
      ...getStrapiAuthHeaders(),
    },
  })

  if (!response.ok) {
    const detail = await parseStrapiErrorResponse(response)
    throw new Error(`No se pudo cargar categorías: ${detail}`)
  }

  const json = (await response.json()) as { data?: unknown[] }
  const data = Array.isArray(json.data) ? json.data : []

  return data
    .map(mapCategoria)
    .filter((item) => item.id > 0)
}

export const fetchConfiguracionesTelegram = async (): Promise<ConfiguracionTelegramOption[]> => {
  const response = await fetch(`${BASE_URL}/api/telegram-config-options`, {
    headers: {
      ...getStrapiAuthHeaders(),
    },
  })

  if (!response.ok) {
    const detail = await parseStrapiErrorResponse(response)
    throw new Error(`No se pudo cargar configuraciones de Telegram: ${detail}`)
  }

  const json = (await response.json()) as { data?: unknown[] }
  const data = Array.isArray(json.data) ? json.data : []

  return data
    .map(mapConfiguracionTelegramOption)
    .filter((item) => item.id > 0 && item.chat_id.length > 0)
}

export const fetchTelegramSettings = async (): Promise<ConfiguracionTelegramSetting[]> => {
  const response = await fetch(`${BASE_URL}/api/telegram-configs`, {
    headers: {
      ...getStrapiAuthHeaders(),
    },
  })

  if (!response.ok) {
    const detail = await parseStrapiErrorResponse(response)
    throw new Error(`No se pudo cargar ajustes de Telegram: ${detail}`)
  }

  const json = (await response.json()) as { data?: unknown[] }
  const data = Array.isArray(json.data) ? json.data : []

  return data.map(mapConfiguracionTelegramSetting).filter((item) => item.id > 0)
}

export const fetchTelegramBotSetting = async (): Promise<TelegramBotSetting> => {
  const response = await fetch(`${BASE_URL}/api/telegram-bot-settings`, {
    headers: {
      ...getStrapiAuthHeaders(),
    },
  })

  if (!response.ok) {
    const detail = await parseStrapiErrorResponse(response)
    throw new Error(`No se pudo cargar el bot de Telegram: ${detail}`)
  }

  const json = (await response.json()) as { data?: unknown }
  return mapTelegramBotSetting(json.data)
}

export const updateTelegramBotSetting = async (botToken: string): Promise<TelegramBotSetting> => {
  const response = await fetch(`${BASE_URL}/api/telegram-bot-settings`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getStrapiAuthHeaders(),
    },
    body: JSON.stringify({
      bot_token: botToken.trim(),
    }),
  })

  if (!response.ok) {
    const detail = await parseStrapiErrorResponse(response)
    throw new Error(`No se pudo guardar el bot de Telegram: ${detail}`)
  }

  const json = (await response.json()) as { data?: unknown }
  return mapTelegramBotSetting(json.data)
}

export const discoverTelegramChats = async (): Promise<TelegramDiscoveredChat[]> => {
  const response = await fetch(`${BASE_URL}/api/telegram-chat-discovery`, {
    headers: {
      ...getStrapiAuthHeaders(),
    },
  })

  if (!response.ok) {
    const detail = await parseStrapiErrorResponse(response)
    throw new Error(`No se pudieron detectar chats de Telegram: ${detail}`)
  }

  const json = (await response.json()) as { data?: unknown[] }
  const data = Array.isArray(json.data) ? json.data : []

  return data
    .map(mapTelegramDiscoveredChat)
    .filter((item) => item.chat_id.length > 0)
}

export const fetchTelegramUserOptions = async (): Promise<TelegramUserOption[]> => {
  const response = await fetch(`${BASE_URL}/api/telegram-user-options`, {
    headers: {
      ...getStrapiAuthHeaders(),
    },
  })

  if (!response.ok) {
    const detail = await parseStrapiErrorResponse(response)
    throw new Error(`No se pudieron cargar los usuarios: ${detail}`)
  }

  const json = (await response.json()) as { data?: unknown[] }
  const data = Array.isArray(json.data) ? json.data : []

  return data.map(mapTelegramUserOption).filter((item) => item.id > 0)
}

export const createTelegramSetting = async (
  input: ConfiguracionTelegramCreateInput,
): Promise<ConfiguracionTelegramSetting> => {
  const response = await fetch(`${BASE_URL}/api/telegram-configs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getStrapiAuthHeaders(),
    },
    body: JSON.stringify({
      nombre: input.nombre.trim(),
      chat_id: input.chat_id.trim(),
    }),
  })

  if (!response.ok) {
    const detail = await parseStrapiErrorResponse(response)
    throw new Error(`No se pudo crear la configuración de Telegram: ${detail}`)
  }

  const json = (await response.json()) as { data?: unknown }
  return mapConfiguracionTelegramSetting(json.data)
}

export const updateTelegramConfigUsers = async (
  configId: number,
  userIds: number[],
): Promise<Pick<ConfiguracionTelegramSetting, 'id' | 'access_mode' | 'assigned_users'>> => {
  const response = await fetch(`${BASE_URL}/api/telegram-configs/${configId}/users`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getStrapiAuthHeaders(),
    },
    body: JSON.stringify({
      userIds,
    }),
  })

  if (!response.ok) {
    const detail = await parseStrapiErrorResponse(response)
    throw new Error(`No se pudieron guardar los permisos del chat: ${detail}`)
  }

  const json = (await response.json()) as { data?: unknown }
  const raw = unwrapEntity(json.data)

  return {
    id: ensureNumber(raw.id),
    access_mode:
      raw.access_mode === 'restricted' || raw.access_mode === 'admin_only'
        ? raw.access_mode
        : 'admin_only',
    assigned_users: Array.isArray(raw.assigned_users)
      ? raw.assigned_users.map((item) => mapTelegramUserOption(item)).filter((item) => item.id > 0)
      : [],
  }
}

export const deleteTelegramSetting = async (id: number): Promise<void> => {
  const response = await fetch(`${BASE_URL}/api/telegram-configs/${id}`, {
    method: 'DELETE',
    headers: {
      ...getStrapiAuthHeaders(),
    },
  })

  if (!response.ok) {
    const detail = await parseStrapiErrorResponse(response)
    throw new Error(`No se pudo eliminar la configuración de Telegram: ${detail}`)
  }
}

export const fetchCategoriaByDocumentId = async (documentId: string): Promise<Categoria | null> => {
  const normalizedId = documentId.trim()
  if (!normalizedId) {
    return null
  }

  const params = new URLSearchParams()
  params.append('filters[documentId][$eq]', normalizedId)
  params.append('pagination[pageSize]', '1')

  const response = await fetch(`${BASE_URL}/api/categorias?${params.toString()}`, {
    headers: {
      ...getStrapiAuthHeaders(),
    },
  })

  if (!response.ok) {
    const detail = await parseStrapiErrorResponse(response)
    throw new Error(`No se pudo cargar la categoría: ${detail}`)
  }

  const json = (await response.json()) as { data?: unknown[] }
  const data = Array.isArray(json.data) ? json.data : []
  const first = data[0]
  if (!first) {
    return null
  }

  const mapped = mapCategoria(first)
  return mapped.id > 0 ? mapped : null
}

const toCategoriaData = (input: CategoriaUpsertInput): Record<string, unknown> => {
  const nombre = input.nombre.trim()
  const providedSlug = input.slug.trim()

  return {
    nombre,
    slug: providedSlug || slugify(nombre),
  }
}

export const createCategoria = async (input: CategoriaUpsertInput): Promise<void> => {
  const response = await fetch(`${BASE_URL}/api/categorias`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getStrapiAuthHeaders(),
    },
    body: JSON.stringify({ data: toCategoriaData(input) }),
  })

  if (!response.ok) {
    const detail = await parseStrapiErrorResponse(response)
    throw new Error(`No se pudo crear la categoría: ${detail}`)
  }
}

export const updateCategoria = async (
  documentId: string,
  input: CategoriaUpsertInput,
): Promise<void> => {
  const response = await fetch(`${BASE_URL}/api/categorias/${encodeURIComponent(documentId)}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getStrapiAuthHeaders(),
    },
    body: JSON.stringify({ data: toCategoriaData(input) }),
  })

  if (!response.ok) {
    const detail = await parseStrapiErrorResponse(response)
    throw new Error(`No se pudo actualizar la categoría: ${detail}`)
  }
}

export const deleteCategoria = async (documentId: string): Promise<void> => {
  const response = await fetch(`${BASE_URL}/api/categorias/${encodeURIComponent(documentId)}`, {
    method: 'DELETE',
    headers: {
      ...getStrapiAuthHeaders(),
    },
  })

  if (!response.ok) {
    const detail = await parseStrapiErrorResponse(response)
    throw new Error(`No se pudo eliminar la categoría: ${detail}`)
  }
}

export const fetchProductoByDocumentId = async (documentId: string): Promise<Producto | null> => {
  const normalizedId = documentId.trim()
  if (!normalizedId) {
    return null
  }

  const params = new URLSearchParams()
  params.append('populate[0]', 'preview_imagen')
  params.append('populate[1]', 'archivos')
  params.append('populate[2]', 'categoria')
  params.append('filters[documentId][$eq]', normalizedId)
  params.append('pagination[pageSize]', '1')

  const response = await fetch(`${BASE_URL}/api/productos?${params.toString()}`, {
    headers: {
      ...getStrapiAuthHeaders(),
    },
  })

  if (!response.ok) {
    const detail = await parseStrapiErrorResponse(response)
    throw new Error(`No se pudo cargar el producto: ${detail}`)
  }

  const json = (await response.json()) as { data?: unknown[] }
  const data = Array.isArray(json.data) ? json.data : []
  const first = data[0]
  if (!first) {
    return null
  }

  const mapped = mapProducto(first)
  return mapped.id > 0 ? mapped : null
}

export const createProducto = async (input: ProductoUpsertInput): Promise<void> => {
  const data = await toProductoData(input, 'create')

  const response = await fetch(`${BASE_URL}/api/productos`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getStrapiAuthHeaders(),
    },
    body: JSON.stringify({ data }),
  })

  if (!response.ok) {
    const detail = await parseStrapiErrorResponse(response)
    throw new Error(`No se pudo crear el producto: ${detail}`)
  }
}

export const updateProducto = async (
  documentId: string,
  input: ProductoUpsertInput,
): Promise<void> => {
  const data = await toProductoData(input, 'edit')

  const response = await fetch(`${BASE_URL}/api/productos/${encodeURIComponent(documentId)}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getStrapiAuthHeaders(),
    },
    body: JSON.stringify({ data }),
  })

  if (!response.ok) {
    const detail = await parseStrapiErrorResponse(response)
    throw new Error(`No se pudo actualizar el producto: ${detail}`)
  }
}

export const deleteProducto = async (documentId: string): Promise<void> => {
  const response = await fetch(`${BASE_URL}/api/productos/${encodeURIComponent(documentId)}`, {
    method: 'DELETE',
    headers: {
      ...getStrapiAuthHeaders(),
    },
  })

  if (!response.ok) {
    const detail = await parseStrapiErrorResponse(response)
    throw new Error(`No se pudo eliminar el producto: ${detail}`)
  }
}

export const publicarProducto = async (
  id: number,
  configuracionTelegramId?: number,
): Promise<PublicarResponse> => {
  const response = await fetch(`${BASE_URL}/api/publicar/${id}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getStrapiAuthHeaders(),
    },
    body: JSON.stringify(
      configuracionTelegramId ? { configuracionTelegramId } : {},
    ),
  })

  const payload = (await response.json()) as {
    ok?: boolean
    code?: string
    error?: string
    message_id?: number | null
    metodo_usado?: 'sendMediaGroup' | 'sendVideo' | 'sendPhoto' | 'sendMessage'
    configuracion_telegram_id?: number
    chat_id?: string
  }

  if (!response.ok || !payload.ok) {
    const detail = payload.error || payload.code || `HTTP ${response.status}`
    throw new Error(`No se pudo publicar: ${detail}`)
  }

  return {
    ok: true,
    message_id: payload.message_id ?? null,
    metodo_usado: payload.metodo_usado ?? 'sendMessage',
    configuracion_telegram_id: ensureNumber(payload.configuracion_telegram_id),
    chat_id: ensureString(payload.chat_id),
  }
}

export const publicarProductosMasivo = async (
  ids: number[],
  configuracionTelegramId?: number,
): Promise<PublicarMasivoResponse> => {
  const normalizedIds = [...new Set(ids)].filter((id) => Number.isInteger(id) && id > 0)

  if (!normalizedIds.length) {
    throw new Error('No hay IDs válidos para publicar en masa.')
  }

  const response = await fetch(`${BASE_URL}/api/publicar-masivo`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getStrapiAuthHeaders(),
    },
    body: JSON.stringify({
      ids: normalizedIds,
      ...(configuracionTelegramId ? { configuracionTelegramId } : {}),
    }),
  })

  const payload = (await response.json()) as
    | PublicarMasivoResponse
    | { ok?: boolean; error?: string; code?: string }

  if (!response.ok) {
    const detail =
      'error' in payload && typeof payload.error === 'string'
        ? payload.error
        : 'code' in payload && typeof payload.code === 'string'
          ? payload.code
          : `HTTP ${response.status}`
    throw new Error(`No se pudo publicar en masa: ${detail}`)
  }

  if (!('total' in payload) || !Array.isArray(payload.detalles)) {
    throw new Error('La respuesta de publicación masiva es inválida.')
  }

  return payload
}

export const strapiBaseUrl = BASE_URL
