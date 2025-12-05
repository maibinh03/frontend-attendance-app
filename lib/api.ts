import { authUtils } from './auth'
import { BASE_URL } from './config'

export interface ApiError {
  message: string
  status?: number
}

class ApiClient {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${BASE_URL}${endpoint}`

    // Merge headers properly
    const defaultHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...authUtils.getAuthHeader()
    }

    // Handle different header types
    let headers: HeadersInit = defaultHeaders
    if (options.headers) {
      if (options.headers instanceof Headers) {
        // Convert Headers object to plain object
        const headersObj: Record<string, string> = { ...defaultHeaders }
        options.headers.forEach((value, key) => {
          headersObj[key] = value
        })
        headers = headersObj
      } else if (Array.isArray(options.headers)) {
        // Handle array of [key, value] pairs
        headers = { ...defaultHeaders, ...Object.fromEntries(options.headers) }
      } else {
        // Plain object
        headers = { ...defaultHeaders, ...options.headers }
      }
    }

    try {
      const response = await fetch(url, { ...options, headers })

      if (authUtils.handleAuthError(response)) {
        throw {
          message: 'Unauthorized',
          status: 401
        } as ApiError
      }

      if (!response.ok) {
        let errorData: { message?: string } = {}
        try {
          const contentType = response.headers.get('content-type')
          if (contentType && contentType.includes('application/json')) {
            errorData = await response.json()
          }
        } catch {
          // Ignore JSON parsing errors for error responses
        }
        throw {
          message: errorData.message ?? `HTTP error! status: ${response.status}`,
          status: response.status
        } as ApiError
      }

      // Check if response has content before parsing JSON
      const contentType = response.headers.get('content-type')
      const contentLength = response.headers.get('content-length')

      // Handle empty responses (e.g., 204 No Content)
      if (contentLength === '0' || response.status === 204) {
        return undefined as T
      }

      // Only parse JSON if content-type indicates JSON
      if (contentType && contentType.includes('application/json')) {
        try {
          return await response.json()
        } catch (parseError) {
          // If JSON parsing fails, return undefined
          return undefined as T
        }
      }

      // For non-JSON responses, try to parse as text
      const text = await response.text()
      if (!text) {
        return undefined as T
      }

      // Try to parse as JSON, fallback to text
      try {
        return JSON.parse(text) as T
      } catch {
        return text as T
      }
    } catch (error) {
      if (error && typeof error === 'object' && 'message' in error && 'status' in error) {
        throw error
      }
      throw {
        message: error instanceof Error ? error.message : 'Network error occurred',
        status: undefined
      } as ApiError
    }
  }

  async get<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' })
  }

  async post<T>(endpoint: string, data?: unknown, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined
    })
  }

  async put<T>(endpoint: string, data?: unknown, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined
    })
  }

  async delete<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' })
  }
}

export const apiClient = new ApiClient()

