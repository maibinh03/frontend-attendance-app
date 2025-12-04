import { authUtils } from './auth'
import { BASE_URL } from './config'

export interface ApiError {
  message: string
  status?: number
}

class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...authUtils.getAuthHeader(),
      ...options.headers
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers
      })

      // Handle auth errors
      if (authUtils.handleAuthError(response)) {
        throw new Error('Unauthorized')
      }

      if (!response.ok) {
        let errorData: { message?: string } = {}
        try {
          errorData = await response.json()
        } catch {
          // If response is not JSON, use default error message
        }
        throw {
          message: errorData.message ?? `HTTP error! status: ${response.status}`,
          status: response.status
        } as ApiError
      }

      return await response.json()
    } catch (error) {
      if (error && typeof error === 'object' && 'message' in error) {
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

export const apiClient = new ApiClient(BASE_URL)

