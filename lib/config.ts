const envBaseUrl = process.env.NEXT_PUBLIC_API_URL
if (!envBaseUrl) {
    throw new Error('NEXT_PUBLIC_API_URL is not defined')
}
export const BASE_URL: string = envBaseUrl
console.log('BASE_URL:', BASE_URL)