export const BASE_URL = process.env.NEXT_PUBLIC_API_URL
console.log('BASE_URL:', BASE_URL)
if (!BASE_URL) {
    throw new Error('BASE_URL is not defined')
}