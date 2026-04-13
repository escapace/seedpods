import { assert, describe, it } from 'vitest'
import { isSeedpodsError } from './error'
import { createCookie, SEEDPODS_SYMBOL_COOKIE } from './create-cookie'
import { to as toAesGcm } from './cookie-type/aes-gcm'
import { to as toHmac } from './cookie-type/hmac'
import { assertJar, createJar, SEEDPODS_SYMBOL_JAR } from './create-jar'
import { useCookies } from './use-cookies'
import { type SeedpodsCookieState, SeedpodsCookieStateType } from './types'
import { deriveKey } from './utilities/derive-key'
import { encode } from './utilities/encode'
import { policyFingerprint } from './utilities/policy-fingerprint'

const keyA = await deriveKey('key-a', { iterations: 1 })
const keyB = await deriveKey('key-b', { iterations: 1 })
const keyC = await deriveKey('key-c', { iterations: 1 })
const keyD = await deriveKey('key-d', { iterations: 1 })
const configuredKeyA = { id: 'key-a', value: keyA } as const
const configuredKeyB = { id: 'key-b', value: keyB } as const
const configuredKeyC = { id: 'key-c', value: keyC } as const
const configuredKeyD = { id: 'key-d', value: keyD } as const

const vixen = createCookie({
  key: 'vixen',
  keys: [configuredKeyA, configuredKeyC],
  maxAge: 86_400,
  name: 'vixen',
  prefix: '__Secure-',
  secure: true,
  type: 'aes-gcm',
})

const vixenTwo = createCookie({
  key: 'vixenTwo',
  keys: [configuredKeyB],
  maxAge: 86_400,
  name: 'vixen',
  path: '/two',
  prefix: '__Secure-',
  sameSite: 'Strict',
  secure: true,
  type: 'aes-gcm',
})

const vixenThree = createCookie({
  domain: 'example.com',
  key: 'vixenThree',
  keys: [configuredKeyC],
  maxAge: 86_400,
  name: 'vixen',
  prefix: '__Secure-',
  secure: true,
  type: 'aes-gcm',
})

const tycho = createCookie<'tycho', 'aes-gcm', string[]>({
  domain: 'example.com',
  key: 'tycho',
  keys: [configuredKeyB, configuredKeyA],
  path: '/tycho',
  type: 'aes-gcm',
})

const dazzle = createCookie<'dazzle', 'hmac', number>({
  httpOnly: true,
  key: 'dazzle',
  keys: [configuredKeyC, configuredKeyB],
  sameSite: 'Lax',
  type: 'hmac',
})

const ball = createCookie({
  key: 'ball',
  keys: [configuredKeyD],
  path: '/',
  prefix: '__Host-',
  secure: true,
  type: 'hmac',
})

const crumb = createCookie<'crumb', 'hmac', string>({
  key: 'crumb',
  keys: [configuredKeyA],
  partitioned: true,
  sameSite: 'None',
  secure: true,
  type: 'hmac',
})

const childSeedpodsJar = createJar().put(dazzle).put(ball)
const seedpodsJar = createJar().put(vixen).put(tycho).combine(childSeedpodsJar)
const malformedHmacCookieValues = [
  'a.b',
  'abc.def',
  'AQ.b.c',
  'Zm8.YQ.zz',
  'hello.world.signature',
  'AA.BB.CC',
]
const encodeWithPolicy = async (value: unknown, options: Parameters<typeof encode>[1]) =>
  encode(value, options, await policyFingerprint(options))

describe('createCookie', () => {
  it('treats undecodable payloads as indecipherable', async () => {
    const cookieValue = await toHmac(Buffer.from('not-json'), [configuredKeyC, configuredKeyB])

    const state = await dazzle[SEEDPODS_SYMBOL_COOKIE].fromString(cookieValue)

    assert.deepEqual(state, { type: SeedpodsCookieStateType.Indecipherable })
  })

  it('treats malformed hmac inputs as indecipherable without throwing', async () => {
    for (const value of malformedHmacCookieValues) {
      const state = await dazzle[SEEDPODS_SYMBOL_COOKIE].fromString(value)

      assert.deepEqual(state, { type: SeedpodsCookieStateType.Indecipherable })
    }
  })

  it('returns undefined when asked to serialize an undefined set value', async () => {
    const state: SeedpodsCookieState = {
      type: SeedpodsCookieStateType.Set,
      value: undefined,
    }

    const cookieValue = await vixen[SEEDPODS_SYMBOL_COOKIE].toString(state)

    assert.equal(cookieValue, undefined)
  })

  it('serializes cookies without attributes when none are configured', async () => {
    const plain = createCookie<'plain', 'hmac', string>({
      key: 'plain',
      keys: [configuredKeyA],
      type: 'hmac',
    })

    const state: SeedpodsCookieState = {
      type: SeedpodsCookieStateType.Set,
      value: 'value',
    }

    const cookieValue = await plain[SEEDPODS_SYMBOL_COOKIE].toString(state)

    assert.match(cookieValue!, /^plain=/)
    assert.notInclude(cookieValue!, '; ')
  })

  it('serializes expired cookies with Max-Age=0', async () => {
    const state: SeedpodsCookieState = {
      type: SeedpodsCookieStateType.Expired,
    }

    assert.equal(
      await vixen[SEEDPODS_SYMBOL_COOKIE].toString(state),
      '__Secure-vixen=; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0; Secure',
    )
  })

  it('serializes partitioned cookies as a flag attribute on set and expire', async () => {
    const setState: SeedpodsCookieState = {
      type: SeedpodsCookieStateType.Set,
      value: 'value',
    }

    const expiredState: SeedpodsCookieState = {
      type: SeedpodsCookieStateType.Expired,
    }

    const setCookieValue = await crumb[SEEDPODS_SYMBOL_COOKIE].toString(setState)
    const expiredCookieValue = await crumb[SEEDPODS_SYMBOL_COOKIE].toString(expiredState)

    assert.include(setCookieValue!, 'SameSite=None')
    assert.include(setCookieValue!, 'Secure')
    assert.include(setCookieValue!, 'Partitioned')
    assert.notInclude(setCookieValue!, 'Partitioned=')
    assert.equal(
      expiredCookieValue,
      'crumb=; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0; SameSite=None; Secure; Partitioned',
    )
  })
})

describe('createJar', () => {
  it('creates jars with the expected runtime shape', () => {
    assert.isFunction(createJar)
    assert.hasAllKeys(createJar(), ['put', 'combine'])

    assert.hasAllKeys(seedpodsJar, ['put', 'combine', SEEDPODS_SYMBOL_JAR])

    assert.deepStrictEqual(seedpodsJar[SEEDPODS_SYMBOL_JAR], {
      state: {
        cookies: {
          ball,
          dazzle,
          tycho,
          vixen,
        },
      },
    })
  })

  it('fails', () => {
    assert.throw(
      // @ts-expect-error test
      () => createJar().put(vixen).put(tycho).put(dazzle).put({}),
      /expected a cookie/i,
    )
  })

  it('rejects values that are not jars', () => {
    try {
      assertJar(undefined)
      assert.fail('Expected assertJar to throw.')
    } catch (error) {
      assert.ok(isSeedpodsError(error))
      assert.include(error.message, 'Expected a cookie jar.')
      assert.deepEqual(error.causes, [{ actual: undefined, type: 'JarExpected' }])
    }
  })
})

describe('useCookies', () => {
  it('returns the expected interface', async () => {
    assert.isFunction(useCookies)
    assert.hasAllKeys(await useCookies('', seedpodsJar), [
      'del',
      'entries',
      'get',
      'refresh',
      'set',
      'values',
    ])
  })

  it('does not throw on malformed hmac cookie values and expires them', async () => {
    for (const value of malformedHmacCookieValues) {
      const cookies = await useCookies(`dazzle=${value}`, childSeedpodsJar)

      assert.equal(cookies.get('dazzle'), undefined)
      assert.deepEqual(await cookies.values(), [
        'dazzle=; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Max-Age=0; SameSite=Lax',
      ])
    }
  })

  it('prefers valid hmac cookies when duplicates include malformed values', async () => {
    const validValue = await toHmac(
      (await encodeWithPolicy(100, dazzle[SEEDPODS_SYMBOL_COOKIE].options))!,
      dazzle[SEEDPODS_SYMBOL_COOKIE].options.keys,
    )

    for (const cookieHeader of [
      `dazzle=abc.def; dazzle=${validValue!}`,
      `dazzle=${validValue!}; dazzle=abc.def`,
    ]) {
      const cookies = await useCookies(cookieHeader, childSeedpodsJar)

      assert.equal(cookies.get('dazzle'), 100)
      assert.deepEqual(await cookies.values(), [])
    }
  })

  it('expires cookies whose key identifier is unknown', async () => {
    const validValue = await toHmac(
      (await encodeWithPolicy(100, dazzle[SEEDPODS_SYMBOL_COOKIE].options))!,
      dazzle[SEEDPODS_SYMBOL_COOKIE].options.keys,
    )
    const [, payload, signature] = validValue!.split('.')
    const unknownIdentifier = Buffer.from('missing-key').toString('base64url')
    const cookies = await useCookies(
      `dazzle=${unknownIdentifier}.${payload}.${signature}`,
      childSeedpodsJar,
    )

    assert.equal(cookies.get('dazzle'), undefined)
    assert.deepEqual(await cookies.values(), [
      'dazzle=; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Max-Age=0; SameSite=Lax',
    ])
  })

  it('expires cookies whose key identifier points to the wrong configured key', async () => {
    const validValue = await toHmac(
      (await encodeWithPolicy(100, dazzle[SEEDPODS_SYMBOL_COOKIE].options))!,
      [configuredKeyC],
    )
    const [, payload, signature] = validValue!.split('.')
    const wrongIdentifier = Buffer.from(configuredKeyB.id).toString('base64url')
    const cookies = await useCookies(
      `dazzle=${wrongIdentifier}.${payload}.${signature}`,
      childSeedpodsJar,
    )

    assert.equal(cookies.get('dazzle'), undefined)
    assert.deepEqual(await cookies.values(), [
      'dazzle=; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Max-Age=0; SameSite=Lax',
    ])
  })

  it('refreshes an unchanged cookie when asked explicitly', async () => {
    const header = `dazzle=${(await toHmac(
      (await encodeWithPolicy(100, dazzle[SEEDPODS_SYMBOL_COOKIE].options))!,
      dazzle[SEEDPODS_SYMBOL_COOKIE].options.keys,
    ))!}`

    const cookies = await useCookies(header, childSeedpodsJar)

    assert.equal(cookies.get('dazzle'), 100)
    assert.deepEqual(await cookies.values(), [])

    cookies.refresh('dazzle')
    cookies.refresh('dazzle')

    const values = await cookies.values()

    assert.lengthOf(values, 1)
    assert.match(values[0], /^dazzle=/)
    assert.include(values[0], 'HttpOnly')
    assert.include(values[0], 'SameSite=Lax')
  })

  it('lets refresh force a rewrite after set receives the same logical value', async () => {
    const header = `dazzle=${(await toHmac(
      (await encodeWithPolicy(100, dazzle[SEEDPODS_SYMBOL_COOKIE].options))!,
      dazzle[SEEDPODS_SYMBOL_COOKIE].options.keys,
    ))!}`

    const cookies = await useCookies(header, childSeedpodsJar)

    cookies.set('dazzle', 100)
    assert.deepEqual(await cookies.values(), [])

    cookies.refresh('dazzle')

    const values = await cookies.values()

    assert.lengthOf(values, 1)
    assert.match(values[0], /^dazzle=/)
  })

  it('treats refresh as a no-op when no current value exists', async () => {
    const cookies = await useCookies('', childSeedpodsJar)

    cookies.refresh('dazzle')

    assert.equal(cookies.get('dazzle'), undefined)
    assert.deepEqual(await cookies.values(), [])
  })

  it('rewrites cookies when the embedded transport policy changes', async () => {
    const previous = createCookie<'dazzle', 'hmac', number>({
      httpOnly: true,
      key: 'dazzle',
      keys: [configuredKeyC, configuredKeyB],
      sameSite: 'Lax',
      type: 'hmac',
    })

    const current = createCookie<'dazzle', 'hmac', number>({
      httpOnly: true,
      key: 'dazzle',
      keys: [configuredKeyC, configuredKeyB],
      sameSite: 'Strict',
      type: 'hmac',
    })

    const header = `dazzle=${(await toHmac(
      (await encodeWithPolicy(100, previous[SEEDPODS_SYMBOL_COOKIE].options))!,
      previous[SEEDPODS_SYMBOL_COOKIE].options.keys,
    ))!}`

    const cookies = await useCookies(header, createJar().put(current))

    assert.equal(cookies.get('dazzle'), 100)

    const values = await cookies.values()

    assert.lengthOf(values, 1)
    assert.include(values[0], 'SameSite=Strict')
    assert.notInclude(values[0], 'SameSite=Lax')
  })

  it('rewrites cookies when the partitioned flag changes', async () => {
    const previous = createCookie<'crumb', 'hmac', string>({
      key: 'crumb',
      keys: [configuredKeyA],
      sameSite: 'None',
      secure: true,
      type: 'hmac',
    })

    const current = createCookie<'crumb', 'hmac', string>({
      key: 'crumb',
      keys: [configuredKeyA],
      partitioned: true,
      sameSite: 'None',
      secure: true,
      type: 'hmac',
    })

    const header = `crumb=${(await toHmac(
      (await encodeWithPolicy('value', previous[SEEDPODS_SYMBOL_COOKIE].options))!,
      previous[SEEDPODS_SYMBOL_COOKIE].options.keys,
    ))!}`

    const cookies = await useCookies(header, createJar().put(current))

    assert.equal(cookies.get('crumb'), 'value')

    const values = await cookies.values()

    assert.lengthOf(values, 1)
    assert.include(values[0], 'Partitioned')
  })

  it('rewrites cookies when the partitioned flag is removed', async () => {
    const previous = createCookie<'crumb', 'hmac', string>({
      key: 'crumb',
      keys: [configuredKeyA],
      partitioned: true,
      sameSite: 'None',
      secure: true,
      type: 'hmac',
    })

    const current = createCookie<'crumb', 'hmac', string>({
      key: 'crumb',
      keys: [configuredKeyA],
      sameSite: 'None',
      secure: true,
      type: 'hmac',
    })

    const header = `crumb=${(await toHmac(
      (await encodeWithPolicy('value', previous[SEEDPODS_SYMBOL_COOKIE].options))!,
      previous[SEEDPODS_SYMBOL_COOKIE].options.keys,
    ))!}`

    const cookies = await useCookies(header, createJar().put(current))

    assert.equal(cookies.get('crumb'), 'value')

    const values = await cookies.values()

    assert.lengthOf(values, 1)
    assert.notInclude(values[0], 'Partitioned')
  })

  it('reads, merges, writes, and deletes cookie values', async () => {
    const cookieHeader = `__Secure-vixen=${(await toAesGcm(
      (await encodeWithPolicy(
        { author: 'escape', change: 'triangle' },
        vixen[SEEDPODS_SYMBOL_COOKIE].options,
      ))!,
      [configuredKeyC],
    ))!}; tycho=${(await toAesGcm(
      (await encodeWithPolicy(
        ['threw', 'satellites', 'class'],
        tycho[SEEDPODS_SYMBOL_COOKIE].options,
      ))!,
      [configuredKeyB, configuredKeyA],
    ))!}; __Host-ball=${Buffer.from('ride problem cause market').toString('base64url')}; abc=qwe`

    const t = await useCookies(cookieHeader, seedpodsJar, {
      tycho(previous?: string[], next?: string[]): string[] {
        return [...(previous ?? []), ...(next ?? [])]
      },
    })

    assert.equal((await t.values()).length, 2)

    assert.ok((await t.values()).some((value) => value.startsWith('__Secure-vixen=')))

    assert.ok(
      (await t.values()).some(
        (value) =>
          value ===
          '__Host-ball=; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0; Path=/; Secure',
      ),
    )

    assert.deepEqual(t.get('vixen'), { author: 'escape', change: 'triangle' })
    assert.deepEqual(t.get('tycho'), ['threw', 'satellites', 'class'])
    assert.deepEqual(t.get('dazzle'), undefined)
    assert.deepEqual(t.get('ball'), undefined)

    t.set('vixen', { author: 'escape', change: 'triangle', sweet: 'silent' })
    t.set('tycho', ['every'])
    t.set('tycho', ['plain'])
    t.set('dazzle', 100)

    assert.equal((await t.values()).length, 4)
    assert.ok((await t.values()).some((value) => value.startsWith('__Secure-vixen=')))
    assert.ok((await t.values()).some((value) => value.startsWith('tycho=')))
    assert.ok((await t.values()).some((value) => value.startsWith('dazzle=')))

    assert.ok(
      (await t.values()).some((value) =>
        value.startsWith(
          '__Host-ball=; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0; Path=/; Secure',
        ),
      ),
    )

    assert.deepEqual(t.get('vixen'), {
      author: 'escape',
      change: 'triangle',
      sweet: 'silent',
    })

    assert.deepEqual(t.get('tycho'), ['threw', 'satellites', 'class', 'every', 'plain'])

    assert.deepEqual(t.get('dazzle'), 100)
    assert.deepEqual(t.get('ball'), undefined)

    t.set('vixen', undefined)
    t.del('tycho')
    t.del('dazzle')
    t.del('ball')

    assert.equal((await t.values()).length, 3)
    assert.ok(
      (await t.values()).some((value) =>
        value.startsWith('__Secure-vixen=; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0'),
      ),
    )

    assert.ok(
      (await t.values()).some((value) =>
        value.startsWith(
          'tycho=; Domain=example.com; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0; Path=/tycho',
        ),
      ),
    )
    assert.ok(
      (await t.values()).some((value) =>
        value.startsWith(
          '__Host-ball=; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0; Path=/; Secure',
        ),
      ),
    )

    assert.hasAllKeys(Object.fromEntries(await t.entries()), ['vixen', 'tycho', 'ball'])

    try {
      // @ts-expect-error type
      t.del('abc')
      assert.fail('Expected del to throw.')
    } catch (error) {
      assert.ok(isSeedpodsError(error))
      assert.include(error.message, 'Unknown cookie key "abc".')
      assert.deepEqual(error.causes, [{ key: 'abc', type: 'UnknownCookieKey' }])
    }

    try {
      // @ts-expect-error type
      t.set('abc', 'hello')
      assert.fail('Expected set to throw.')
    } catch (error) {
      assert.ok(isSeedpodsError(error))
      assert.include(error.message, 'Unknown cookie key "abc".')
      assert.deepEqual(error.causes, [{ key: 'abc', type: 'UnknownCookieKey' }])
    }

    try {
      // @ts-expect-error type
      t.refresh('abc')
      assert.fail('Expected refresh to throw.')
    } catch (error) {
      assert.ok(isSeedpodsError(error))
      assert.include(error.message, 'Unknown cookie key "abc".')
      assert.deepEqual(error.causes, [{ key: 'abc', type: 'UnknownCookieKey' }])
    }

    try {
      // @ts-expect-error type
      t.get('abc')
      assert.fail('Expected get to throw.')
    } catch (error) {
      assert.ok(isSeedpodsError(error))
      assert.include(error.message, 'Unknown cookie key "abc".')
      assert.deepEqual(error.causes, [{ key: 'abc', type: 'UnknownCookieKey' }])
    }
  })

  it('rejects duplicate cookie keys', () => {
    try {
      createJar()
        .put(vixen)
        .put(
          createCookie({
            key: 'vixen',
            keys: [configuredKeyA, configuredKeyC],
            prefix: '__Secure-',
            secure: true,
            type: 'aes-gcm',
          }),
        )

      assert.fail('Expected duplicate cookie key to throw.')
    } catch (error) {
      assert.ok(isSeedpodsError(error))
      assert.include(error.message, 'Cookie key "vixen" already exists in the jar.')
      assert.deepEqual(error.causes, [{ key: 'vixen', type: 'CookieKeyAlreadyExists' }])
    }
  })

  it('keeps state intact when a reducer throws', async () => {
    const tychoHeader = `tycho=${(await toAesGcm(
      (await encodeWithPolicy(
        ['threw', 'satellites', 'class'],
        tycho[SEEDPODS_SYMBOL_COOKIE].options,
      ))!,
      [configuredKeyB, configuredKeyA],
    ))!}`
    let reducerShouldThrow = true

    const cookies = await useCookies(tychoHeader, seedpodsJar, {
      tycho(previous = [], next = []) {
        if (reducerShouldThrow) {
          reducerShouldThrow = false
          throw new Error('Reducer failed.')
        }

        return [...previous, ...next]
      },
    })

    assert.deepEqual(cookies.get('tycho'), ['threw', 'satellites', 'class'])
    assert.throws(() => cookies.set('tycho', ['later']), /Reducer failed\./)
    assert.deepEqual(cookies.get('tycho'), ['threw', 'satellites', 'class'])
    assert.deepEqual(await cookies.values(), [])

    cookies.set('tycho', ['later'])

    assert.deepEqual(cookies.get('tycho'), ['threw', 'satellites', 'class', 'later'])

    const values = await cookies.values()

    assert.equal(values.length, 1)
    assert.ok(values[0].startsWith('tycho='))
  })

  it('handles cookies that share a name', async () => {
    const seedpodsJarWithSharedCookieName = createJar().put(vixen).put(vixenTwo).put(vixenThree)

    const cookieHeader = [
      `__Secure-vixen=${(await toAesGcm(
        (await encodeWithPolicy({ key: 'vixen' }, vixen[SEEDPODS_SYMBOL_COOKIE].options))!,
        [configuredKeyC],
      ))!}`,
      'qweqweqwe=123',
      `__Secure-vixen=${(await toAesGcm(
        (await encodeWithPolicy({ key: 'vixenTwo' }, vixenTwo[SEEDPODS_SYMBOL_COOKIE].options))!,
        [configuredKeyB],
      ))!}`,
      `__Secure-vixen=${(await toAesGcm(
        (await encodeWithPolicy(
          { key: 'vixenThree' },
          vixenThree[SEEDPODS_SYMBOL_COOKIE].options,
        ))!,
        [configuredKeyC],
      ))!}`,
    ].join('; ')

    const t = await useCookies(cookieHeader, seedpodsJarWithSharedCookieName)

    const values = await t.values()

    assert.equal(values.length, 1)
    assert.ok(values[0].endsWith('; Max-Age=86400; Secure'))

    assert.deepEqual(await t.get('vixen'), { key: 'vixen' })
    assert.deepEqual(await t.get('vixenTwo'), { key: 'vixenTwo' })
    assert.deepEqual(await t.get('vixenThree'), {
      key: 'vixenThree',
    })
  })

  it('still tries each shared-name cookie definition independently', async () => {
    const one = createCookie<'one', 'aes-gcm', { key: string }>({
      key: 'one',
      keys: [configuredKeyA],
      name: 'shared',
      type: 'aes-gcm',
    })
    const two = createCookie<'two', 'aes-gcm', { key: string }>({
      key: 'two',
      keys: [configuredKeyB],
      name: 'shared',
      type: 'aes-gcm',
    })
    const three = createCookie<'three', 'aes-gcm', { key: string }>({
      key: 'three',
      keys: [configuredKeyC],
      name: 'shared',
      type: 'aes-gcm',
    })

    const countedCookies = [one, two, three].map((cookie) => {
      let calls = 0
      const metadata = cookie[SEEDPODS_SYMBOL_COOKIE] as {
        fromString: (value: string | undefined) => Promise<SeedpodsCookieState>
      }
      const originalFromString = metadata.fromString

      metadata.fromString = async (value) => {
        calls += 1
        return await originalFromString(value)
      }

      return {
        cookie,
        calls: () => calls,
      }
    })

    const header = `shared=${(await toAesGcm(
      (await encodeWithPolicy({ key: 'two' }, two[SEEDPODS_SYMBOL_COOKIE].options))!,
      [configuredKeyB],
    ))!}`

    const cookies = await useCookies(
      header,
      createJar()
        .put(countedCookies[0].cookie)
        .put(countedCookies[1].cookie)
        .put(countedCookies[2].cookie),
    )

    assert.deepEqual(cookies.get('one'), undefined)
    assert.deepEqual(cookies.get('two'), { key: 'two' })
    assert.deepEqual(cookies.get('three'), undefined)
    assert.deepEqual(
      countedCookies.map((entry) => entry.calls()),
      [1, 1, 1],
    )
  })
})
