import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import { createCookie, SEEDPODS_SYMBOL_COOKIE } from './create-cookie'
import { createJar } from './create-jar'
import { patchCookie } from './patch-cookie'
import { type SeedpodsCookieState, SeedpodsCookieStateType } from './types'
import { deriveKey } from './utilities/derive-key'
import { encodeKid } from './utilities/encode-kid'
import { useCookies } from './use-cookies'

const currentSessionKey = await deriveKey('current-session-secret', {
  iterations: 1,
  salt: 'session',
})
const previousSessionKey = await deriveKey('previous-session-secret', {
  iterations: 1,
  salt: 'session',
})
const rotatedSessionKey = await deriveKey('rotated-session-secret', {
  iterations: 1,
  salt: 'session',
})
const recentViewsKey = await deriveKey('recent-views-secret', {
  iterations: 1,
  salt: 'recent-views',
})
const currentSessionConfiguredKey = { id: 'current-session', value: currentSessionKey } as const
const previousSessionConfiguredKey = {
  id: 'previous-session',
  value: previousSessionKey,
} as const
const rotatedSessionConfiguredKey = { id: 'rotated-session', value: rotatedSessionKey } as const
const recentViewsConfiguredKey = { id: 'recent-views', value: recentViewsKey } as const

const sessionCookie = createCookie<'session', 'aes-gcm', { userId: string }>({
  httpOnly: true,
  key: 'session',
  keys: [currentSessionConfiguredKey, previousSessionConfiguredKey],
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
  keys: [previousSessionConfiguredKey],
  maxAge: 60 * 60 * 24 * 7,
  path: '/',
  prefix: '__Host-',
  sameSite: 'Lax',
  secure: true,
  type: 'aes-gcm',
})

const recentViewsCookie = createCookie<'recentViews', 'hmac', string[]>({
  key: 'recentViews',
  keys: [recentViewsConfiguredKey],
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
const edgeAppCookies: typeof appCookies = createJar().put(recentViewsCookie).put(sessionCookie)

const createDeferred = () => {
  let resolve!: () => void
  const promise = new Promise<void>((nextResolve) => {
    resolve = nextResolve
  })

  return { promise, resolve }
}

let heldRequest:
  | {
      captured: ReturnType<typeof createDeferred>
      release: ReturnType<typeof createDeferred>
    }
  | undefined

const restoreSessionRuntime = () => {
  patchCookie(sessionCookie, (draft) => {
    draft.httpOnly = true
    draft.keys = [currentSessionConfiguredKey, previousSessionConfiguredKey]
    draft.maxAge = 60 * 60 * 24 * 7
    draft.partitioned = undefined
    draft.sameSite = 'Lax'
    draft.secure = true
  })
}

const restoreRecentViewsRuntime = () => {
  patchCookie(recentViewsCookie, (draft) => {
    draft.httpOnly = undefined
    draft.keys = [recentViewsConfiguredKey]
    draft.maxAge = 60 * 60 * 24 * 30
    draft.partitioned = undefined
    draft.sameSite = 'Lax'
    draft.secure = true
  })
}

const restoreRuntime = () => {
  restoreSessionRuntime()
  restoreRecentViewsRuntime()
}

const getSetCookieValues = (headers: Headers): string[] =>
  (headers as { getSetCookie?: () => string[] } & Headers).getSetCookie?.() ?? []

const findSetCookieValue = (headers: Headers, name: string): string | undefined =>
  getSetCookieValues(headers).find((value) => value.startsWith(`${name}=`))

const readSetCookieCookieValue = (headers: Headers, name: string): string | undefined => {
  const setCookieValue = findSetCookieValue(headers, name)

  if (setCookieValue === undefined) {
    return
  }

  const [nameValue] = setCookieValue.split(';', 1)

  return nameValue.slice(name.length + 1)
}

const readProtectedCookieKid = (cookieValue: string | undefined): string | undefined =>
  cookieValue?.split('.', 1)[0]

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
  const pathname = new URL(request.url).pathname
  const jar = pathname.startsWith('/edge') ? edgeAppCookies : appCookies
  const cookies = await useCookies(request.headers.get('cookie') ?? undefined, jar, {
    recentViews(previous = [], next = []) {
      return [...previous, ...next].slice(-10)
    },
  })

  if (pathname === '/hold' && heldRequest !== undefined) {
    heldRequest.captured.resolve()
    await heldRequest.release.promise
  }

  const signOut = pathname === '/logout'

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

      outgoing.end(new Uint8Array(await response.arrayBuffer()))
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
    restoreRuntime()

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

  it('rotates session keys end-to-end after patchCookie publication', async () => {
    restoreRuntime()

    const clientCookies = new Map<string, string>()
    const legacySessionState: SeedpodsCookieState = {
      type: SeedpodsCookieStateType.Set,
      value: { userId: '123' },
    }
    const legacySessionValue =
      await legacySessionCookie[SEEDPODS_SYMBOL_COOKIE].toString(legacySessionState)

    applySetCookieValues(clientCookies, [legacySessionValue!])

    try {
      patchCookie(sessionCookie, (draft) => {
        draft.keys = [
          rotatedSessionConfiguredKey,
          currentSessionConfiguredKey,
          previousSessionConfiguredKey,
        ]
      })

      let response = await fetch(baseUrl, {
        headers: { cookie: toCookieHeader(clientCookies)! },
      })

      expect(response.status).toBe(200)
      expect(await response.json()).toEqual({
        recentViews: ['/docs/getting-started'],
        session: { userId: '123' },
      })

      let setCookieValues = getSetCookieValues(response.headers)
      const rotatedSessionSetCookieValue = findSetCookieValue(response.headers, '__Host-session')
      const rotatedSessionCookieValue = readSetCookieCookieValue(response.headers, '__Host-session')

      expect(rotatedSessionSetCookieValue).toBeDefined()
      expect(rotatedSessionSetCookieValue).toMatch(/^__Host-session=/)
      expect(rotatedSessionSetCookieValue).toContain('HttpOnly')
      expect(rotatedSessionSetCookieValue).toContain('Path=/')
      expect(rotatedSessionSetCookieValue).toContain('SameSite=Lax')
      expect(rotatedSessionSetCookieValue).toContain('Secure')
      expect(readProtectedCookieKid(rotatedSessionCookieValue)).toBe(
        encodeKid(rotatedSessionConfiguredKey.id),
      )
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
      expect(findSetCookieValue(response.headers, '__Host-session')).toBeUndefined()
    } finally {
      restoreRuntime()
    }
  })

  it('keeps in-flight request snapshots stable while later requests in other jars see a patched runtime', async () => {
    restoreRuntime()

    const clientCookies = new Map<string, string>()
    const initialResponse = await fetch(baseUrl)

    expect(initialResponse.status).toBe(200)
    expect(await initialResponse.json()).toEqual({
      recentViews: ['/docs/getting-started'],
      session: { userId: '123' },
    })

    applySetCookieValues(clientCookies, getSetCookieValues(initialResponse.headers))

    heldRequest = {
      captured: createDeferred(),
      release: createDeferred(),
    }

    try {
      const heldResponsePromise = fetch(`${baseUrl}/hold`, {
        headers: { cookie: toCookieHeader(clientCookies)! },
      })

      await heldRequest.captured.promise

      patchCookie(recentViewsCookie, (draft) => {
        draft.maxAge = 60 * 60 * 24 * 60
        draft.sameSite = 'Strict'
      })

      const edgeResponse = await fetch(`${baseUrl}/edge`, {
        headers: { cookie: toCookieHeader(clientCookies)! },
      })

      heldRequest.release.resolve()

      const heldResponse = await heldResponsePromise

      expect(heldResponse.status).toBe(200)
      expect(await heldResponse.json()).toEqual({
        recentViews: ['/docs/getting-started', '/docs/getting-started'],
        session: { userId: '123' },
      })

      expect(edgeResponse.status).toBe(200)
      expect(await edgeResponse.json()).toEqual({
        recentViews: ['/docs/getting-started', '/docs/getting-started'],
        session: { userId: '123' },
      })

      const heldRecentViewsValue = findSetCookieValue(heldResponse.headers, 'recent-views')
      const edgeRecentViewsValue = findSetCookieValue(edgeResponse.headers, 'recent-views')

      expect(heldRecentViewsValue).toBeDefined()
      expect(heldRecentViewsValue).toContain('Max-Age=2592000')
      expect(heldRecentViewsValue).toContain('SameSite=Lax')
      expect(heldRecentViewsValue).not.toContain('SameSite=Strict')

      expect(edgeRecentViewsValue).toBeDefined()
      expect(edgeRecentViewsValue).toContain('Max-Age=5184000')
      expect(edgeRecentViewsValue).toContain('SameSite=Strict')
      expect(edgeRecentViewsValue).not.toContain('SameSite=Lax')

      applySetCookieValues(clientCookies, getSetCookieValues(edgeResponse.headers))

      const followUpResponse = await fetch(baseUrl, {
        headers: { cookie: toCookieHeader(clientCookies)! },
      })

      expect(followUpResponse.status).toBe(200)
      expect(await followUpResponse.json()).toEqual({
        recentViews: ['/docs/getting-started', '/docs/getting-started', '/docs/getting-started'],
        session: { userId: '123' },
      })

      const followUpRecentViewsValue = findSetCookieValue(followUpResponse.headers, 'recent-views')

      expect(followUpRecentViewsValue).toBeDefined()
      expect(followUpRecentViewsValue).toContain('Max-Age=5184000')
      expect(followUpRecentViewsValue).toContain('SameSite=Strict')
    } finally {
      heldRequest?.release.resolve()
      heldRequest = undefined
      restoreRuntime()
    }
  })

  it('keeps an in-flight session request on its old key snapshot while later requests rotate to the new primary key', async () => {
    restoreRuntime()

    const clientCookies = new Map<string, string>()
    const legacySessionState: SeedpodsCookieState = {
      type: SeedpodsCookieStateType.Set,
      value: { userId: '123' },
    }
    const legacySessionValue =
      await legacySessionCookie[SEEDPODS_SYMBOL_COOKIE].toString(legacySessionState)

    applySetCookieValues(clientCookies, [legacySessionValue!])

    heldRequest = {
      captured: createDeferred(),
      release: createDeferred(),
    }

    try {
      const heldResponsePromise = fetch(`${baseUrl}/hold`, {
        headers: { cookie: toCookieHeader(clientCookies)! },
      })

      await heldRequest.captured.promise

      patchCookie(sessionCookie, (draft) => {
        draft.keys = [
          rotatedSessionConfiguredKey,
          currentSessionConfiguredKey,
          previousSessionConfiguredKey,
        ]
      })

      const edgeResponse = await fetch(`${baseUrl}/edge`, {
        headers: { cookie: toCookieHeader(clientCookies)! },
      })

      heldRequest.release.resolve()

      const heldResponse = await heldResponsePromise

      expect(heldResponse.status).toBe(200)
      expect(await heldResponse.json()).toEqual({
        recentViews: ['/docs/getting-started'],
        session: { userId: '123' },
      })

      expect(edgeResponse.status).toBe(200)
      expect(await edgeResponse.json()).toEqual({
        recentViews: ['/docs/getting-started'],
        session: { userId: '123' },
      })

      const heldSessionCookieValue = readSetCookieCookieValue(
        heldResponse.headers,
        '__Host-session',
      )
      const edgeSessionCookieValue = readSetCookieCookieValue(
        edgeResponse.headers,
        '__Host-session',
      )

      expect(readProtectedCookieKid(heldSessionCookieValue)).toBe(
        encodeKid(currentSessionConfiguredKey.id),
      )
      expect(readProtectedCookieKid(edgeSessionCookieValue)).toBe(
        encodeKid(rotatedSessionConfiguredKey.id),
      )

      applySetCookieValues(clientCookies, getSetCookieValues(edgeResponse.headers))

      const followUpResponse = await fetch(baseUrl, {
        headers: { cookie: toCookieHeader(clientCookies)! },
      })

      expect(followUpResponse.status).toBe(200)
      expect(await followUpResponse.json()).toEqual({
        recentViews: ['/docs/getting-started', '/docs/getting-started'],
        session: { userId: '123' },
      })
      expect(findSetCookieValue(followUpResponse.headers, '__Host-session')).toBeUndefined()
    } finally {
      heldRequest?.release.resolve()
      heldRequest = undefined
      restoreRuntime()
    }
  })
})
