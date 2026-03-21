import {
  AUTH_EXPIRED_EVENT,
  clearStoredAuthSession,
  readStoredAuthToken,
} from '@/utils/auth-storage'

export const strapiBaseUrl =
  (import.meta.env.VITE_STRAPI_URL as string | undefined)?.replace(/\/$/, '') ||
  'http://localhost:1337'

type ErrorShape = {
  error?: {
    message?: string
    details?: {
      errors?: Array<{ message?: string }>
    }
  }
}

const isBrowser = (): boolean => typeof window !== 'undefined'

export const getStrapiAuthHeaders = (): Record<string, string> => {
  const jwt = readStoredAuthToken()

  if (!jwt) {
    return {}
  }

  return {
    Authorization: `Bearer ${jwt}`,
  }
}

export const handleStrapiAuthFailure = (response: Response): void => {
  const hasStoredToken = Boolean(readStoredAuthToken())
  if (!hasStoredToken) {
    return
  }

  const isCurrentUserEndpoint = /\/api\/users\/me(?:\?|$)/.test(response.url)
  const shouldExpireSession =
    response.status === 401 || (response.status === 403 && isCurrentUserEndpoint)

  if (!shouldExpireSession) {
    return
  }

  clearStoredAuthSession()

  if (isBrowser()) {
    window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT))
  }
}

export const parseStrapiErrorResponse = async (response: Response): Promise<string> => {
  handleStrapiAuthFailure(response)

  try {
    const payload = (await response.json()) as ErrorShape
    const message = payload.error?.message || payload.error?.details?.errors?.[0]?.message
    if (message) {
      return message
    }
  } catch {
    // noop
  }

  return `HTTP ${response.status}`
}
