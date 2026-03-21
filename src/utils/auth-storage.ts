export type AuthRole = {
  id: number
  name: string
  type: string
}

export type AuthUser = {
  id: number
  username: string
  email: string
  confirmed: boolean
  blocked: boolean
  role: AuthRole | null
}

export const AUTH_EXPIRED_EVENT = 'publicador:auth-expired'

const AUTH_TOKEN_KEY = 'publicador.auth.jwt'
const AUTH_USER_KEY = 'publicador.auth.user'
const JWT_EXPIRY_SKEW_SECONDS = 30

const isBrowser = (): boolean => typeof window !== 'undefined'

const decodeJwtPayload = (token: string): Record<string, unknown> | null => {
  if (!isBrowser()) {
    return null
  }

  const [, payload = ''] = token.split('.')
  if (!payload) {
    return null
  }

  try {
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=')
    const decoded = window.atob(padded)
    return JSON.parse(decoded) as Record<string, unknown>
  } catch {
    return null
  }
}

const isJwtExpired = (token: string): boolean => {
  const payload = decodeJwtPayload(token)
  const exp = typeof payload?.exp === 'number' ? payload.exp : Number(payload?.exp ?? 0)

  if (!Number.isFinite(exp) || exp <= 0) {
    return false
  }

  const now = Math.floor(Date.now() / 1000)
  return exp <= now + JWT_EXPIRY_SKEW_SECONDS
}

export const readStoredAuthToken = (): string => {
  if (!isBrowser()) {
    return ''
  }

  const token = window.localStorage.getItem(AUTH_TOKEN_KEY) ?? ''
  if (!token) {
    return ''
  }

  if (isJwtExpired(token)) {
    clearStoredAuthSession()
    return ''
  }

  return token
}

export const readStoredAuthUser = (): AuthUser | null => {
  if (!isBrowser()) {
    return null
  }

  const raw = window.localStorage.getItem(AUTH_USER_KEY)
  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw) as AuthUser
  } catch {
    window.localStorage.removeItem(AUTH_USER_KEY)
    return null
  }
}

export const writeStoredAuthSession = (jwt: string, user: AuthUser | null): void => {
  if (!isBrowser()) {
    return
  }

  window.localStorage.setItem(AUTH_TOKEN_KEY, jwt)

  if (user) {
    window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user))
    return
  }

  window.localStorage.removeItem(AUTH_USER_KEY)
}

export const clearStoredAuthSession = (): void => {
  if (!isBrowser()) {
    return
  }

  window.localStorage.removeItem(AUTH_TOKEN_KEY)
  window.localStorage.removeItem(AUTH_USER_KEY)
}
