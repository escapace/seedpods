import { describe, expectTypeOf, it } from 'vitest'
import { createCookie } from './create-cookie'
import { createJar } from './create-jar'
import { useCookies } from './use-cookies'
import type { SeedpodsCookie, SeedpodsCookies } from './types'

const aesKey = new Uint8Array(32).fill(1)
const hmacKey = new Uint8Array(32).fill(2)
const aesConfiguredKey = { id: 'aes-key', value: aesKey } as const
const hmacConfiguredKey = { id: 'hmac-key', value: hmacKey } as const

const session: SeedpodsCookie<'session', 'hmac', number> = createCookie({
  key: 'session',
  keys: [hmacConfiguredKey],
  type: 'hmac',
})

const profile: SeedpodsCookie<'profile', 'aes-gcm', { name: string }> = createCookie({
  key: 'profile',
  keys: [aesConfiguredKey],
  type: 'aes-gcm',
})

const flags: SeedpodsCookie<'flags', 'hmac', string[]> = createCookie({
  key: 'flags',
  keys: [hmacConfiguredKey],
  type: 'hmac',
})

const childSeedpodsJar = createJar().put(session)
const combinedSeedpodsJar = createJar().put(profile).combine(childSeedpodsJar).put(flags)
const runTypeErrorBranches = process.env.SEEDPODS_RUN_TYPE_ERROR_BRANCHES === '1'

const emptySeedpodsJar = createJar()

describe('createJar type level', () => {
  it('propagates cookie keys and values through useCookies', async () => {
    const cookies = await useCookies('', combinedSeedpodsJar)
    const cookiesFromParsedHeader = await useCookies(
      new Map<string, string[]>(),
      combinedSeedpodsJar,
    )

    expectTypeOf(cookies).toEqualTypeOf<SeedpodsCookies<typeof combinedSeedpodsJar>>()
    expectTypeOf(cookiesFromParsedHeader).toEqualTypeOf<
      SeedpodsCookies<typeof combinedSeedpodsJar>
    >()
    expectTypeOf(cookies.get('session')).toEqualTypeOf<number | undefined>()
    expectTypeOf(cookies.get('profile')).toEqualTypeOf<{ name: string } | undefined>()
    expectTypeOf(cookies.get('flags')).toEqualTypeOf<string[] | undefined>()

    cookies.set('session', 1)
    cookies.set('profile', { name: 'escape' })
    cookies.set('flags', ['a', 'b'])
    cookies.refresh('session')
    cookies.refresh('profile')
    cookies.refresh('flags')
    cookies.del('session')
    cookies.del('profile')
    cookies.del('flags')

    if (runTypeErrorBranches) {
      // @ts-expect-error end-to-end key restriction
      cookies.get('missing')

      // @ts-expect-error end-to-end key restriction
      cookies.set('missing', 1)

      // @ts-expect-error end-to-end key restriction
      cookies.del('missing')

      // @ts-expect-error end-to-end key restriction
      cookies.refresh('missing')

      // @ts-expect-error end-to-end value restriction
      cookies.set('session', 'wrong')

      // @ts-expect-error end-to-end value restriction
      cookies.set('session', { value: 1 })

      // @ts-expect-error end-to-end value restriction
      cookies.set('profile', 1)

      // @ts-expect-error end-to-end value restriction
      cookies.set('profile', { wrong: true })

      // @ts-expect-error end-to-end value restriction
      cookies.set('flags', 'wrong')

      // @ts-expect-error end-to-end value restriction
      cookies.set('flags', [1, 2, 3])
    }
  })

  it('preserves keys introduced through combine', async () => {
    const cookies = await useCookies('', createJar().put(profile).combine(childSeedpodsJar))

    expectTypeOf(cookies.get('profile')).toEqualTypeOf<{ name: string } | undefined>()
    expectTypeOf(cookies.get('session')).toEqualTypeOf<number | undefined>()

    cookies.set('profile', { name: 'combined' })
    cookies.set('session', 2)
    cookies.refresh('profile')
    cookies.refresh('session')

    if (runTypeErrorBranches) {
      // @ts-expect-error combined jar key restriction
      cookies.get('flags')

      // @ts-expect-error combined jar key restriction
      cookies.set('flags', ['x'])

      // @ts-expect-error combined jar key restriction
      cookies.del('flags')

      // @ts-expect-error combined jar key restriction
      cookies.refresh('flags')
    }
  })

  it('rejects invalid jar and reducer inputs at the API boundary', async () => {
    expectTypeOf(emptySeedpodsJar).toMatchTypeOf<ReturnType<typeof createJar>>()

    if (runTypeErrorBranches) {
      // @ts-expect-error createJar put requires a cookie
      emptySeedpodsJar.put({})

      // @ts-expect-error createJar combine requires a jar
      emptySeedpodsJar.combine({})

      await useCookies('', combinedSeedpodsJar, {
        // @ts-expect-error reducer key must exist in the jar
        missing(previous?: number, next?: number): number {
          return (previous ?? 0) + (next ?? 0)
        },
      })

      await useCookies('', combinedSeedpodsJar, {
        // @ts-expect-error reducer input types must match the cookie value
        session(previous?: string, next?: string): number {
          return Number(previous ?? next ?? '0')
        },
      })

      await useCookies('', combinedSeedpodsJar, {
        // @ts-expect-error reducer return type must match the cookie value
        flags(previous?: string[], next?: string[]): number {
          return (previous ?? next ?? []).length
        },
      })
    }
  })
})
