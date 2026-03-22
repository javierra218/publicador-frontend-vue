import {
  getStrapiAuthHeaders,
  parseStrapiErrorResponse,
  strapiBaseUrl,
} from '@/lib/strapi-http'
import type { AuthRole, AuthUser } from '@/utils/auth-storage'

type AnyRecord = Record<string, unknown>

const ensureNumber = (value: unknown): number =>
  typeof value === 'number' ? value : Number(value ?? 0)
const ensureString = (value: unknown): string => (typeof value === 'string' ? value : '')
const ensureBoolean = (value: unknown): boolean => value === true

const mapRole = (value: unknown): AuthRole | null => {
  if (!value || typeof value !== 'object') {
    return null
  }

  const role = value as AnyRecord

  return {
    id: ensureNumber(role.id),
    name: ensureString(role.name),
    type: ensureString(role.type),
  }
}

const mapUser = (value: unknown): AuthUser => {
  const user = value && typeof value === 'object' ? (value as AnyRecord) : {}

  return {
    id: ensureNumber(user.id),
    username: ensureString(user.username),
    email: ensureString(user.email),
    confirmed: ensureBoolean(user.confirmed),
    blocked: ensureBoolean(user.blocked),
    role: mapRole(user.role),
  }
}

export const loginWithStrapi = async (
  identifier: string,
  password: string,
): Promise<{ jwt: string; user: AuthUser }> => {
  const response = await fetch(`${strapiBaseUrl}/api/auth/local`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      identifier: identifier.trim(),
      password,
    }),
  })

  if (!response.ok) {
    const detail = await parseStrapiErrorResponse(response)
    throw new Error(`No se pudo iniciar sesión: ${detail}`)
  }

  const payload = (await response.json()) as {
    jwt?: unknown
    user?: unknown
  }
  const jwt = ensureString(payload.jwt)
  const responseUser = mapUser(payload.user)

  if (!jwt || responseUser.id <= 0) {
    throw new Error('La respuesta de autenticación de Strapi es inválida.')
  }

  const user = await fetchCurrentStrapiUser(jwt)

  return {
    jwt,
    user,
  }
}

export const fetchCurrentStrapiUser = async (jwtOverride?: string): Promise<AuthUser> => {
  const response = await fetch(`${strapiBaseUrl}/api/frontend-session`, {
    headers: {
      ...(jwtOverride
        ? {
            Authorization: `Bearer ${jwtOverride}`,
          }
        : getStrapiAuthHeaders()),
    },
  })

  if (!response.ok) {
    const detail = await parseStrapiErrorResponse(response)
    throw new Error(`No se pudo restaurar la sesión: ${detail}`)
  }

  const payload = (await response.json()) as { data?: unknown }
  const user = mapUser(payload.data)

  if (user.id <= 0) {
    throw new Error('La respuesta de sesión es inválida.')
  }

  return user
}
