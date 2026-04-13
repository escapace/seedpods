import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import { createCookie, SEEDPODS_SYMBOL_COOKIE } from './create-cookie'
import { createJar } from './create-jar'
import { type SeedpodsCookieState, SeedpodsCookieStateType } from './types'
import { deriveKey } from './utilities/derive-key'
import { useCookies } from './use-cookies'

const currentSessionKey = await deriveKey('current-session-secret', {
  iterations: 1,
  salt: 'session',
})
const previousSessionKey = await deriveKey('previous-session-secret', {
  iterations: 1,
  salt: 'session',
})
const recentViewsKey = await deriveKey('recent-views-secret', {
  iterations: 1,
  salt: 'recent-views',
})

const sessionCookie = createCookie<'session', 'aes-gcm', { userId: string }>({
  httpOnly: true,
  key: 'session',
  keys: [currentSessionKey, previousSessionKey],
  maxAge: 60 * 60 * 24 * 7,
  path: '/',
  prefix: '__Host-',
  sameSite: 'Lax',
  secure: true,
  type: 'aes-gcm',
})

const legacySessionCookie = createCookie<'session', 'aes-gcm', { userId: string }>({
  httpOnly: true,
  key: 'session',
  keys: [previousSessionKey],
  maxAge: 60 * 60 * 24 * 7,
  path: '/',
  prefix: '__Host-',
  sameSite: 'Lax',
  secure: true,
  type: 'aes-gcm',
})

const recentViewsCookie = createCookie<'recentViews', 'hmac', string[]>({
  key: 'recentViews',
  keys: [recentViewsKey],
  maxAge: 60 * 60 * 24 * 30,
  name: 'recent-views',
  path: '/',
  sameSite: 'Lax',
  secure: true,
  type: 'hmac',
})

const authCookies = createJar().put(sessionCookie)
const uiCookies = createJar().put(recentViewsCookie)
const appCookies = createJar().combine(authCookies).combine(uiCookies)

const getSetCookieValues = (headers: Headers): string[] =>
  (headers as { getSetCookie?: () => string[] } & Headers).getSetCookie?.() ?? []

const applySetCookieValues = (cookies: Map<string, string>, setCookieValues: string[]) => {
  for (const setCookieValue of setCookieValues) {
    const [nameValue] = setCookieValue.split(';', 1)
    const separatorIndex = nameValue.indexOf('=')
    const name = nameValue.slice(0, separatorIndex)
    const value = nameValue.slice(separatorIndex + 1)

    if (value === '') {
      cookies.delete(name)
    } else {
      cookies.set(name, value)
    }
  }
}

const toCookieHeader = (cookies: Map<string, string>): string | undefined => {
  const entries = [...cookies.entries()]

  if (entries.length === 0) {
    return undefined
  }

  return entries.map(([name, value]) => `${name}=${value}`).join('; ')
}

const toHeaders = (headers: Record<string, string | string[] | undefined>) => {
  const value = new Headers()

  for (const [name, headerValue] of Object.entries(headers)) {
    if (Array.isArray(headerValue)) {
      for (const entry of headerValue) {
        value.append(name, entry)
      }
    } else if (typeof headerValue === 'string') {
      value.set(name, headerValue)
    }
  }

  return value
}

const handleRequest = async (request: Request) => {
  const cookies = await useCookies(request.headers.get('cookie') ?? undefined, appCookies, {
    recentViews(previous = [], next = []) {
      return [...previous, ...next].slice(-10)
    },
  })

  const signOut = new URL(request.url).pathname === '/logout'

  if (signOut) {
    cookies.del('session')
  } else if (cookies.get('session') === undefined) {
    cookies.set('session', { userId: '123' })
  }

  cookies.set('recentViews', ['/docs/getting-started'])

  const responseHeaders = new Headers({ 'content-type': 'application/json' })
  for (const value of await cookies.values()) {
    responseHeaders.append('Set-Cookie', value)
  }

  return new Response(
    JSON.stringify({
      recentViews: cookies.get('recentViews') ?? null,
      session: cookies.get('session') ?? null,
    }),
    { headers: responseHeaders },
  )
}

describe('README usage example', () => {
  let baseUrl = ''
  const server = createServer((incoming, outgoing) => {
    void (async () => {
      const request = new Request(
        new URL(incoming.url ?? '/', `http://${incoming.headers.host}`).toString(),
        {
          headers: toHeaders(incoming.headers),
          method: incoming.method,
        },
      )
      const response = await handleRequest(request)

      outgoing.statusCode = response.status

      for (const [name, value] of response.headers) {
        if (name !== 'set-cookie') {
          outgoing.setHeader(name, value)
        }
      }

      const setCookieValues = getSetCookieValues(response.headers)
      if (setCookieValues.length > 0) {
        outgoing.setHeader('set-cookie', setCookieValues)
      }

      outgoing.end(Buffer.from(await response.arrayBuffer()))
    })()
  })

  beforeAll(async () => {
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    const address = server.address() as AddressInfo
    baseUrl = `http://127.0.0.1:${address.port}`
  })

  afterAll(async () => {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error === undefined ? resolve() : reject(error))),
    )
  })

  it('handles the request and response flow over HTTP', async () => {
    const clientCookies = new Map<string, string>()
    const legacySessionState: SeedpodsCookieState = {
      type: SeedpodsCookieStateType.Set,
      value: { userId: '123' },
    }
    const legacySessionValue =
      await legacySessionCookie[SEEDPODS_SYMBOL_COOKIE].toString(legacySessionState)

    applySetCookieValues(clientCookies, [legacySessionValue!])

    let response = await fetch(baseUrl, {
      headers: { cookie: toCookieHeader(clientCookies)! },
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      recentViews: ['/docs/getting-started'],
      session: { userId: '123' },
    })

    let setCookieValues = getSetCookieValues(response.headers)

    expect(setCookieValues).toHaveLength(2)
    expect(setCookieValues.some((value) => value.startsWith('__Host-session='))).toBe(true)
    expect(setCookieValues.some((value) => value.startsWith('recent-views='))).toBe(true)

    applySetCookieValues(clientCookies, setCookieValues)

    response = await fetch(baseUrl, {
      headers: { cookie: toCookieHeader(clientCookies)! },
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      recentViews: ['/docs/getting-started', '/docs/getting-started'],
      session: { userId: '123' },
    })

    setCookieValues = getSetCookieValues(response.headers)

    expect(setCookieValues).toHaveLength(1)
    expect(setCookieValues[0].startsWith('recent-views=')).toBe(true)

    applySetCookieValues(clientCookies, setCookieValues)

    response = await fetch(`${baseUrl}/logout`, {
      headers: { cookie: toCookieHeader(clientCookies)! },
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      recentViews: ['/docs/getting-started', '/docs/getting-started', '/docs/getting-started'],
      session: null,
    })

    setCookieValues = getSetCookieValues(response.headers)

    expect(setCookieValues).toHaveLength(2)
    expect(setCookieValues.some((value) => value.startsWith('recent-views='))).toBe(true)

    const expiredSessionValue = setCookieValues.find((value) => value.startsWith('__Host-session='))

    expect(expiredSessionValue).toBeDefined()
    expect(expiredSessionValue).toContain('Expires=Thu, 01 Jan 1970 00:00:00 GMT')
    expect(expiredSessionValue).toContain('Max-Age=0')
    expect(expiredSessionValue).toContain('HttpOnly')
    expect(expiredSessionValue).toContain('Path=/')
    expect(expiredSessionValue).toContain('SameSite=Lax')
    expect(expiredSessionValue).toContain('Secure')
  })
})
