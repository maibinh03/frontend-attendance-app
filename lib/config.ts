const envBaseUrl = process.env.NEXT_PUBLIC_API_URL?.trim()

// Use explicit API URL if provided; otherwise fall back to browser origin (dev) or localhost.
const runtimeBaseUrl =
    typeof window !== 'undefined' && window.location?.origin ? window.location.origin : undefined

export const BASE_URL: string = envBaseUrl || runtimeBaseUrl || 'http://localhost:3000'
console.log('BASE_URL:', BASE_URL)