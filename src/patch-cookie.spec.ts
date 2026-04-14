import { assert, describe, expectTypeOf, it } from 'vitest'
import { createCookie, SEEDPODS_SYMBOL_COOKIE } from './create-cookie'
import { to as toAesGcm } from './cookie-type/aes-gcm'
import { to as toHmac } from './cookie-type/hmac'
import { createJar } from './create-jar'
import {
  patchCookie as exportedPatchCookie,
  type SeedpodsCookieRuntimeDraft as ExportedSeedpodsCookieRuntimeDraft,
  type SeedpodsCookieRuntimeOptions as ExportedSeedpodsCookieRuntimeOptions,
} from './index'
import { patchCookie } from './patch-cookie'
import type {
  SeedpodsConfiguredKey,
  SeedpodsCookie,
  SeedpodsCookieRuntimeDraft,
  SeedpodsCookieRuntimeOptions,
  SeedpodsCookieType,
} from './types'
import { deriveKey } from './utilities/derive-key'
import { encode } from './utilities/encode'
import { fingerprintPolicy } from './utilities/fingerprint-policy'
import { useCookies } from './use-cookies'

const oldKey = await deriveKey('patch-cookie-old', { iterations: 1 })
const nextKey = await deriveKey('patch-cookie-next', { iterations: 1 })
const siblingNextKey = await deriveKey('patch-cookie-sibling-next', { iterations: 1 })
const oldConfiguredKey = { id: 'old', value: oldKey } as const satisfies SeedpodsConfiguredKey
const nextConfiguredKey = { id: 'next', value: nextKey } as const satisfies SeedpodsConfiguredKey
const siblingNextConfiguredKey = {
  id: 'sibling-next',
  value: siblingNextKey,
} as const satisfies SeedpodsConfiguredKey

const readSnapshot = <T extends string, U extends SeedpodsCookieType, V>(
  cookie: SeedpodsCookie<T, U, V>,
) => cookie[SEEDPODS_SYMBOL_COOKIE].readSnapshot()

const encodeWithCurrentPolicy = async <T extends string, U extends SeedpodsCookieType, V>(
  value: unknown,
  cookie: SeedpodsCookie<T, U, V>,
) => {
  const snapshot = readSnapshot(cookie)

  return encode(value, snapshot.options, await fingerprintPolicy(snapshot.policyCanonical))
}

describe('patchCookie', () => {
  it('is exported through the public index surface', () => {
    assert.equal(exportedPatchCookie, patchCookie)
    assert.isFunction(exportedPatchCookie)
  })

  it('exports the public runtime patch types through the index surface', () => {
    expectTypeOf<ExportedSeedpodsCookieRuntimeOptions>().toEqualTypeOf<SeedpodsCookieRuntimeOptions>()
    expectTypeOf<ExportedSeedpodsCookieRuntimeDraft>().toEqualTypeOf<SeedpodsCookieRuntimeDraft>()
  })

  it('publishes to all jars that share one cookie object while earlier useCookies snapshots stay stable', async () => {
    const sessionCookie = createCookie<'session', 'hmac', string>({
      key: 'session',
      keys: [oldConfiguredKey],
      sameSite: 'Lax',
      type: 'hmac',
    })
    const jarA = createJar().put(sessionCookie)
    const jarB = createJar().put(sessionCookie)
    const header = `session=${(await toHmac(
      (await encodeWithCurrentPolicy('value', sessionCookie))!,
      [oldConfiguredKey],
    ))!}`

    const before = await useCookies(header, jarA)

    patchCookie(sessionCookie, (draft) => {
      draft.keys = [nextConfiguredKey, oldConfiguredKey]
    })

    const after = await useCookies(header, jarB)

    assert.equal(before.get('session'), 'value')
    assert.deepEqual(await before.values(), [])

    assert.equal(after.get('session'), 'value')

    const values = await after.values()

    assert.lengthOf(values, 1)
    assert.match(values[0], /^session=/)
  })

  it('does not share publications across separate cookie objects', async () => {
    const one = createCookie<'session', 'hmac', string>({
      key: 'session',
      keys: [oldConfiguredKey],
      sameSite: 'Lax',
      type: 'hmac',
    })
    const two = createCookie<'session', 'hmac', string>({
      key: 'session',
      keys: [oldConfiguredKey],
      sameSite: 'Lax',
      type: 'hmac',
    })
    const header = `session=${(await toHmac((await encodeWithCurrentPolicy('value', one))!, [oldConfiguredKey]))!}`

    patchCookie(one, (draft) => {
      draft.keys = [nextConfiguredKey, oldConfiguredKey]
    })

    const oneCookies = await useCookies(header, createJar().put(one))
    const twoCookies = await useCookies(header, createJar().put(two))

    assert.equal(oneCookies.get('session'), 'value')
    assert.lengthOf(await oneCookies.values(), 1)

    assert.equal(twoCookies.get('session'), 'value')
    assert.deepEqual(await twoCookies.values(), [])
  })

  it('publishes a fresh snapshot even for a no-op patch', () => {
    const sessionCookie = createCookie<'session', 'hmac', string>({
      key: 'session',
      keys: [oldConfiguredKey],
      sameSite: 'Lax',
      type: 'hmac',
    })
    const before = readSnapshot(sessionCookie)

    patchCookie(sessionCookie, (draft) => {
      draft.sameSite = 'Lax'
    })

    const after = readSnapshot(sessionCookie)

    assert.notStrictEqual(after, before)
    assert.deepEqual(after.options, before.options)
    assert.equal(after.policyCanonical, before.policyCanonical)
  })

  it('rewrites later requests when rewrite-safe policy fields are patched', async () => {
    const sessionCookie = createCookie<'session', 'hmac', string>({
      key: 'session',
      keys: [oldConfiguredKey],
      sameSite: 'Lax',
      type: 'hmac',
    })
    const header = `session=${(await toHmac(
      (await encodeWithCurrentPolicy('value', sessionCookie))!,
      [oldConfiguredKey],
    ))!}`

    patchCookie(sessionCookie, (draft) => {
      draft.sameSite = 'Strict'
    })

    const cookies = await useCookies(header, createJar().put(sessionCookie))
    const values = await cookies.values()

    assert.equal(cookies.get('session'), 'value')
    assert.lengthOf(values, 1)
    assert.include(values[0], 'SameSite=Strict')
    assert.notInclude(values[0], 'SameSite=Lax')
  })

  it('keeps an earlier request snapshot when refresh runs after a later publication', async () => {
    const sessionCookie = createCookie<'session', 'hmac', string>({
      key: 'session',
      keys: [oldConfiguredKey],
      sameSite: 'Lax',
      type: 'hmac',
    })
    const header = `session=${(await toHmac(
      (await encodeWithCurrentPolicy('value', sessionCookie))!,
      [oldConfiguredKey],
    ))!}`
    const cookies = await useCookies(header, createJar().put(sessionCookie))

    patchCookie(sessionCookie, (draft) => {
      draft.sameSite = 'Strict'
    })

    cookies.refresh('session')

    const values = await cookies.values()

    assert.lengthOf(values, 1)
    assert.include(values[0], 'SameSite=Lax')
    assert.notInclude(values[0], 'SameSite=Strict')
  })

  it('keeps the earlier snapshot when validation fails for sameSite during patching', async () => {
    const sessionCookie = createCookie<'session', 'hmac', string>({
      key: 'session',
      keys: [oldConfiguredKey],
      sameSite: 'Lax',
      type: 'hmac',
    })
    const header = `session=${(await toHmac(
      (await encodeWithCurrentPolicy('value', sessionCookie))!,
      [oldConfiguredKey],
    ))!}`
    const before = readSnapshot(sessionCookie)

    assert.throws(() => {
      patchCookie(sessionCookie, (draft) => {
        draft.sameSite = 'None'
      })
    }, /secure/i)

    assert.strictEqual(readSnapshot(sessionCookie), before)

    const cookies = await useCookies(header, createJar().put(sessionCookie))

    assert.equal(cookies.get('session'), 'value')
    assert.deepEqual(await cookies.values(), [])
  })

  it('keeps the earlier snapshot when validation fails for partitioned during patching', async () => {
    const sessionCookie = createCookie<'session', 'hmac', string>({
      key: 'session',
      keys: [oldConfiguredKey],
      sameSite: 'Lax',
      type: 'hmac',
    })
    const header = `session=${(await toHmac(
      (await encodeWithCurrentPolicy('value', sessionCookie))!,
      [oldConfiguredKey],
    ))!}`
    const before = readSnapshot(sessionCookie)

    assert.throws(() => {
      patchCookie(sessionCookie, (draft) => {
        draft.partitioned = true
      })
    }, /secure/i)

    assert.strictEqual(readSnapshot(sessionCookie), before)

    const cookies = await useCookies(header, createJar().put(sessionCookie))

    assert.equal(cookies.get('session'), 'value')
    assert.deepEqual(await cookies.values(), [])
  })

  it('keeps the earlier snapshot when validation fails for duplicate key ids during patching', () => {
    const sessionCookie = createCookie<'session', 'hmac', string>({
      key: 'session',
      keys: [oldConfiguredKey],
      type: 'hmac',
    })
    const before = readSnapshot(sessionCookie)

    assert.throws(() => {
      patchCookie(sessionCookie, (draft) => {
        draft.keys = [
          { id: 'dup', value: oldKey },
          { id: 'dup', value: nextKey },
        ]
      })
    }, /unique/i)

    assert.strictEqual(readSnapshot(sessionCookie), before)
  })

  it('keeps the earlier snapshot when validation fails for aes-gcm key length during patching', () => {
    const sessionCookie = createCookie<'session', 'aes-gcm', string>({
      key: 'session',
      keys: [{ id: 'old', value: oldKey }],
      type: 'aes-gcm',
    })
    const before = readSnapshot(sessionCookie)

    assert.throws(() => {
      patchCookie(sessionCookie, (draft) => {
        draft.keys = [{ id: 'short', value: new Uint8Array(16).fill(1) }]
      })
    }, /32 bytes/i)

    assert.strictEqual(readSnapshot(sessionCookie), before)
  })

  it('fails validation when keys are deleted through the draft', () => {
    const sessionCookie = createCookie<'session', 'hmac', string>({
      key: 'session',
      keys: [oldConfiguredKey],
      type: 'hmac',
    })

    assert.throws(() => {
      patchCookie(sessionCookie, (draft) => {
        delete (draft as { keys?: SeedpodsCookieRuntimeDraft['keys'] }).keys
      })
    }, /keys/i)
  })

  it('clones a caller-owned keys array so later array mutation does not change the published snapshot', async () => {
    const sessionCookie = createCookie<'session', 'hmac', string>({
      key: 'session',
      keys: [oldConfiguredKey],
      type: 'hmac',
    })
    const callerOwnedKeys = [{ id: 'next', value: new Uint8Array(nextKey) }]
    const preservedKeyBytes = new Uint8Array(callerOwnedKeys[0].value)

    patchCookie(sessionCookie, (draft) => {
      draft.keys = callerOwnedKeys
    })

    callerOwnedKeys.splice(0, callerOwnedKeys.length, { id: 'old', value: new Uint8Array(oldKey) })

    const header = `session=${(await toHmac(
      (await encodeWithCurrentPolicy('value', sessionCookie))!,
      [{ id: 'next', value: preservedKeyBytes }],
    ))!}`
    const cookies = await useCookies(header, createJar().put(sessionCookie))

    assert.equal(cookies.get('session'), 'value')
  })

  it('clones committed key material so later caller mutation does not change the published snapshot', async () => {
    const sessionCookie = createCookie<'session', 'hmac', string>({
      key: 'session',
      keys: [oldConfiguredKey],
      type: 'hmac',
    })
    const callerOwnedKeyBytes = new Uint8Array(nextKey)
    const preservedKeyBytes = new Uint8Array(callerOwnedKeyBytes)

    patchCookie(sessionCookie, (draft) => {
      draft.keys = [{ id: 'next', value: callerOwnedKeyBytes }]
    })

    callerOwnedKeyBytes.fill(0)

    const header = `session=${(await toHmac(
      (await encodeWithCurrentPolicy('value', sessionCookie))!,
      [{ id: 'next', value: preservedKeyBytes }],
    ))!}`
    const cookies = await useCookies(header, createJar().put(sessionCookie))

    assert.equal(cookies.get('session'), 'value')
  })

  it('lets one patch set a new current key without affecting another cookie object', async () => {
    const one = createCookie<'one', 'hmac', string>({
      key: 'one',
      keys: [oldConfiguredKey],
      type: 'hmac',
    })
    const two = createCookie<'two', 'hmac', string>({
      key: 'two',
      keys: [oldConfiguredKey],
      type: 'hmac',
    })

    patchCookie(one, (draft) => {
      draft.keys = [nextConfiguredKey, oldConfiguredKey]
    })

    patchCookie(two, (draft) => {
      draft.keys = [siblingNextConfiguredKey, oldConfiguredKey]
    })

    const oneHeader = `one=${(await toHmac((await encodeWithCurrentPolicy('one', one))!, [nextConfiguredKey]))!}`
    const twoHeader = `two=${(await toHmac((await encodeWithCurrentPolicy('two', two))!, [siblingNextConfiguredKey]))!}`
    const cookies = await useCookies(`${oneHeader}; ${twoHeader}`, createJar().put(one).put(two))

    assert.equal(cookies.get('one'), 'one')
    assert.equal(cookies.get('two'), 'two')
  })

  it('keeps the earlier snapshot when validation fails during aes-gcm request handling after a bad patch attempt', async () => {
    const sessionCookie = createCookie<'session', 'aes-gcm', string>({
      key: 'session',
      keys: [{ id: 'old', value: oldKey }],
      type: 'aes-gcm',
    })
    const header = `session=${(await toAesGcm(
      (await encodeWithCurrentPolicy('value', sessionCookie))!,
      [{ id: 'old', value: oldKey }],
    ))!}`

    assert.throws(() => {
      patchCookie(sessionCookie, (draft) => {
        draft.keys = [{ id: 'short', value: new Uint8Array(16).fill(1) }]
      })
    }, /32 bytes/i)

    const cookies = await useCookies(header, createJar().put(sessionCookie))

    assert.equal(cookies.get('session'), 'value')
    assert.deepEqual(await cookies.values(), [])
  })

  it('keeps __Host- cookie names stable across no-op and policy patches', async () => {
    const sessionCookie = createCookie<'session', 'hmac', string>({
      key: 'session',
      keys: [oldConfiguredKey],
      path: '/',
      prefix: '__Host-',
      sameSite: 'Lax',
      secure: true,
      type: 'hmac',
    })

    assert.equal(readSnapshot(sessionCookie).options.name, '__Host-session')

    patchCookie(sessionCookie, (draft) => {
      draft.sameSite = 'Lax'
    })

    assert.equal(readSnapshot(sessionCookie).options.name, '__Host-session')

    const header = `__Host-session=${(await toHmac(
      (await encodeWithCurrentPolicy('value', sessionCookie))!,
      [oldConfiguredKey],
    ))!}`

    patchCookie(sessionCookie, (draft) => {
      draft.sameSite = 'Strict'
    })

    const cookies = await useCookies(header, createJar().put(sessionCookie))
    const values = await cookies.values()

    assert.equal(cookies.get('session'), 'value')
    assert.equal(readSnapshot(sessionCookie).options.name, '__Host-session')
    assert.lengthOf(values, 1)
    assert.match(values[0], /^__Host-session=/)
    assert.notMatch(values[0], /^__Host-__Host-session=/)
    assert.include(values[0], 'SameSite=Strict')
  })

  it('keeps __Secure- cookies with explicit names stable across patch publication and rewrite', async () => {
    const sessionCookie = createCookie<'session', 'aes-gcm', string>({
      key: 'session',
      keys: [{ id: 'old', value: oldKey }],
      name: 'sid',
      prefix: '__Secure-',
      sameSite: 'Lax',
      secure: true,
      type: 'aes-gcm',
    })

    assert.equal(readSnapshot(sessionCookie).options.name, '__Secure-sid')

    const header = `__Secure-sid=${(await toAesGcm(
      (await encodeWithCurrentPolicy('value', sessionCookie))!,
      [{ id: 'old', value: oldKey }],
    ))!}`

    patchCookie(sessionCookie, (draft) => {
      draft.keys = [
        { id: 'next', value: nextKey },
        { id: 'old', value: oldKey },
      ]
      draft.maxAge = 60
    })

    const cookies = await useCookies(header, createJar().put(sessionCookie))
    const values = await cookies.values()

    assert.equal(cookies.get('session'), 'value')
    assert.equal(readSnapshot(sessionCookie).options.name, '__Secure-sid')
    assert.lengthOf(values, 1)
    assert.match(values[0], /^__Secure-sid=/)
    assert.notMatch(values[0], /^__Secure-__Secure-sid=/)
    assert.include(values[0], 'Max-Age=60')
  })
})
