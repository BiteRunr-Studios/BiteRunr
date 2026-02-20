import { createServerFn } from '@tanstack/react-start'

export const loginAction = createServerFn({ method: 'POST' })
  .inputValidator((data: { username: string; password: string }) => data)
  .handler(async ({ data }) => {
    const { username, password } = data
    const expectedPassword = process.env.ADMIN_PASSWORD

    if (!expectedPassword) {
      console.error('ADMIN_PASSWORD environment variable is not set')
      return { success: false, token: null }
    }

    if (username === 'admin' && password === expectedPassword) {
      // Create a token by hashing the credentials so the client can store
      // something verifiable without exposing the raw password
      const encoded = new TextEncoder().encode(`admin:${password}`)
      const buffer = await crypto.subtle.digest('SHA-256', encoded)
      const token = Array.from(new Uint8Array(buffer))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')

      return { success: true, token }
    }

    return { success: false, token: null }
  })

export const verifyTokenAction = createServerFn({ method: 'POST' })
  .inputValidator((data: { token: string }) => data)
  .handler(async ({ data }) => {
    const expectedPassword = process.env.ADMIN_PASSWORD
    if (!expectedPassword) return { valid: false }

    const encoded = new TextEncoder().encode(`admin:${expectedPassword}`)
    const buffer = await crypto.subtle.digest('SHA-256', encoded)
    const expectedToken = Array.from(new Uint8Array(buffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')

    return { valid: data.token === expectedToken }
  })
