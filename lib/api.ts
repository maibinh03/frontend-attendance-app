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

    // Log request details
    const requestBody = options.body ? (typeof options.body === 'string' ? JSON.parse(options.body) : options.body) : undefined
    console.log('🚀 [API Request]', {
      method: options.method || 'GET',
      url,
      headers,
      body: requestBody,
      timestamp: new Date().toISOString()
    })

    try {
      const response = await fetch(url, { ...options, headers })
      
      // Log response headers
      const responseHeaders: Record<string, string> = {}
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value
      })

      if (authUtils.handleAuthError(response)) {
        console.log('❌ [API Response - Auth Error]', {
          method: options.method || 'GET',
          url,
          status: response.status,
          statusText: response.statusText,
          headers: responseHeaders,
          timestamp: new Date().toISOString()
        })
        throw {
          message: 'Unauthorized',
          status: 401
        } as ApiError
      }

      if (!response.ok) {
        let errorData: { message?: string } = {}
        let errorBody: unknown = null
        try {
          const contentType = response.headers.get('content-type')
          if (contentType && contentType.includes('application/json')) {
            errorBody = await response.json()
            errorData = errorBody as { message?: string }
          } else {
            const text = await response.text()
            errorBody = text || null
          }
        } catch {
          // Ignore JSON parsing errors for error responses
        }
        
        console.log('❌ [API Response - Error]', {
          method: options.method || 'GET',
          url,
          status: response.status,
          statusText: response.statusText,
          headers: responseHeaders,
          body: errorBody,
          timestamp: new Date().toISOString()
        })
        
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
        console.log('📥 [API Response]', {
          method: options.method || 'GET',
          url,
          status: response.status,
          statusText: response.statusText,
          headers: responseHeaders,
          body: null,
          timestamp: new Date().toISOString()
        })
        return undefined as T
      }

      // Read response body once
      let responseBody: unknown = null
      let parsedData: T | undefined = undefined

      // Only parse JSON if content-type indicates JSON
      if (contentType && contentType.includes('application/json')) {
        try {
          responseBody = await response.json()
          parsedData = responseBody as T
        } catch (parseError) {
          // If JSON parsing fails, return undefined
          responseBody = '[JSON parse error]'
          parsedData = undefined as T
        }
      } else {
        // For non-JSON responses, try to parse as text
        const text = await response.text()
        if (!text) {
          responseBody = null
          parsedData = undefined as T
        } else {
          // Try to parse as JSON, fallback to text
          try {
            responseBody = JSON.parse(text)
            parsedData = responseBody as T
          } catch {
            responseBody = text
            parsedData = text as T
          }
        }
      }

      // Log successful response
      console.log('📥 [API Response]', {
        method: options.method || 'GET',
        url,
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
        body: responseBody,
        timestamp: new Date().toISOString()
      })

      return parsedData as T
    } catch (error) {
      // Log network/other errors
      console.error('❌ [API Error]', {
        method: options.method || 'GET',
        url,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      })
      
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

