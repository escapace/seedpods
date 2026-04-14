import { SEEDPODS_COOKIE_EXPIRES_AT_UNIX_EPOCH, SEEDPODS_SYMBOL_COOKIE } from './constants'
import { from as fromAesGcm, to as toAesGcm } from './cookie-type/aes-gcm'
import { from as fromHmac, to as toHmac } from './cookie-type/hmac'
import { SeedpodsError } from './error'
import {
  SeedpodsCookieStateType,
  type SeedpodsCookie,
  type SeedpodsCookieOptionsForType,
  type SeedpodsCookiePublishedSnapshot,
  type SeedpodsCookieRuntimeOptions,
  type SeedpodsCookieState,
  type SeedpodsCookieStaticInputOptions,
  type SeedpodsCookieType,
  type SeedpodsCookieValue,
  type SeedpodsParsedCookieOptions,
} from './types'
import { decode } from './utilities/decode'
import { encode } from './utilities/encode'
import { parseCookieOptions } from './utilities/parse-cookie-options'
import { canonicalizePolicy } from './utilities/canonicalize-policy'
import { fingerprintPolicy } from './utilities/fingerprint-policy'
export { SEEDPODS_SYMBOL_COOKIE } from './constants'

const cloneConfiguredKeys = (keys: SeedpodsCookieRuntimeOptions['keys']) =>
  Object.freeze(
    keys.map((entry) =>
      Object.freeze({
        id: entry.id,
        value: new Uint8Array(entry.value),
      }),
    ),
  )

const freezeStaticInputOptions = <T extends string, U extends SeedpodsCookieType>(
  options: SeedpodsCookieOptionsForType<T, U>,
): SeedpodsCookieStaticInputOptions<T, U> =>
  Object.freeze({
    ...(options.domain === undefined ? {} : { domain: options.domain }),
    key: options.key,
    ...(options.name === undefined ? {} : { name: options.name }),
    ...(options.path === undefined ? {} : { path: options.path }),
    ...(options.prefix === undefined ? {} : { prefix: options.prefix }),
    type: options.type,
  }) as SeedpodsCookieStaticInputOptions<T, U>

const commitPublishedSnapshot = <T extends string, U extends SeedpodsCookieType>(
  options: SeedpodsParsedCookieOptions,
): SeedpodsCookiePublishedSnapshot<T, U> => {
  const committedOptions = Object.freeze({
    ...options,
    keys: cloneConfiguredKeys(options.keys),
  }) as SeedpodsCookiePublishedSnapshot<T, U>['options']

  return Object.freeze({
    options: committedOptions,
    policyCanonical: canonicalizePolicy(committedOptions),
  })
}

const attributes = (cookie: SeedpodsParsedCookieOptions, expire = false) => {
  const array: string[] = []

  if (cookie.domain !== undefined) {
    array.push(`Domain=${cookie.domain}`)
  }

  if (expire) {
    array.push(`Expires=${SEEDPODS_COOKIE_EXPIRES_AT_UNIX_EPOCH}`)
  }

  if (cookie.httpOnly === true) {
    array.push('HttpOnly')
  }

  if (expire) {
    array.push('Max-Age=0')
  } else if (cookie.maxAge !== undefined) {
    array.push(`Max-Age=${cookie.maxAge}`)
  }

  if (cookie.path !== undefined) {
    array.push(`Path=${cookie.path}`)
  }

  if (cookie.sameSite !== undefined) {
    array.push(`SameSite=${cookie.sameSite}`)
  }

  if (cookie.secure === true) {
    array.push('Secure')
  }

  if (cookie.partitioned === true) {
    array.push('Partitioned')
  }

  return array.length === 0 ? '' : `; ${array.join('; ')}`
}

/**
 * Creates a cookie definition for one application value.
 *
 * @remarks
 * Use this function to declare how a cookie is named, protected, and serialized. The returned definition can be added to a jar created by {@link createJar} and later used by {@link useCookies} to read incoming cookies and produce `Set-Cookie` header values.
 *
 * @typeParam T - Key used to read, write, and delete this cookie through the cookie interface.
 * @typeParam U - Cookie protection mode.
 * @typeParam V - Application value stored in the cookie.
 * @param options - Cookie configuration, including the logical cookie key, configured cryptographic keys, and transport attributes.
 * @returns A cookie definition that can be added to a jar.
 * @throws When the cookie options are invalid.
 */
export const createCookie = <T extends string, U extends SeedpodsCookieType, V>(
  options: SeedpodsCookieOptionsForType<T, U>,
): SeedpodsCookie<T, U, V> => {
  const parsedCookie = parseCookieOptions(options)
  const staticInputOptions = freezeStaticInputOptions(options)
  const to = parsedCookie.type === 'hmac' ? toHmac : toAesGcm
  const from = parsedCookie.type === 'hmac' ? fromHmac : fromAesGcm
  const runtimeCell: { current: SeedpodsCookiePublishedSnapshot<T, U> } = {
    current: commitPublishedSnapshot<T, U>(parsedCookie),
  }
  const policyFingerprintCache = new WeakMap<
    SeedpodsCookiePublishedSnapshot<T, U>,
    Promise<string>
  >()

  const getPolicyFingerprint = async (
    snapshot: SeedpodsCookiePublishedSnapshot<T, U>,
  ): Promise<string> => {
    const cached = policyFingerprintCache.get(snapshot)

    if (cached !== undefined) {
      return await cached
    }

    const next = fingerprintPolicy(snapshot.policyCanonical)
    policyFingerprintCache.set(snapshot, next)
    return await next
  }

  const fromStringWithSnapshot = async (
    snapshot: SeedpodsCookiePublishedSnapshot<T, U>,
    cookieValue: string | undefined,
  ): Promise<SeedpodsCookieState> => {
    if (cookieValue === undefined) {
      return { type: SeedpodsCookieStateType.Unset }
    }

    const result = await from(cookieValue, snapshot.options.keys)
    const indecipherable = { type: SeedpodsCookieStateType.Indecipherable as const }

    if (result === undefined) {
      return indecipherable
    }

    const value: SeedpodsCookieValue | undefined = decode(result.value)

    if (value === undefined) {
      return indecipherable
    }

    if (value.options.key !== snapshot.options.key) {
      return indecipherable
    }

    const needsPolicyUpdate = value.options.policy !== (await getPolicyFingerprint(snapshot))

    return {
      type:
        result.rotate || needsPolicyUpdate
          ? SeedpodsCookieStateType.SetButNeedsUpdate
          : SeedpodsCookieStateType.Set,
      value: value.value,
    }
  }

  const toStringWithSnapshot = async (
    snapshot: SeedpodsCookiePublishedSnapshot<T, U>,
    state: SeedpodsCookieState,
  ): Promise<string | undefined> => {
    if (
      state.type === SeedpodsCookieStateType.Expired ||
      state.type === SeedpodsCookieStateType.Indecipherable
    ) {
      return `${snapshot.options.name}=${attributes(snapshot.options, true)}`
    }

    if (
      state.type === SeedpodsCookieStateType.Set ||
      state.type === SeedpodsCookieStateType.SetButNeedsUpdate
    ) {
      const value = encode(state.value, snapshot.options, await getPolicyFingerprint(snapshot))

      if (value === undefined) {
        return
      }

      const cookieValue = await to(value, snapshot.options.keys)

      return cookieValue === undefined
        ? undefined
        : `${snapshot.options.name}=${cookieValue}${attributes(snapshot.options)}`
    }

    return
  }

  const readSnapshot = () => runtimeCell.current

  return {
    [SEEDPODS_SYMBOL_COOKIE]: {
      fromStringWithSnapshot,
      key: parsedCookie.key,
      readSnapshot,
      staticInputOptions,
      toStringWithSnapshot,
      async fromString(cookieValue: string | undefined) {
        return await fromStringWithSnapshot(readSnapshot(), cookieValue)
      },
      publishSnapshot(snapshot: SeedpodsCookiePublishedSnapshot<T, U>) {
        runtimeCell.current = commitPublishedSnapshot(snapshot.options)
      },
      async toString(state: SeedpodsCookieState) {
        return await toStringWithSnapshot(readSnapshot(), state)
      },
    },
  }
}

/**
 * Asserts that a value was created by {@link createCookie}.
 *
 * @param cookie - Value to validate.
 * @throws {@link SeedpodsError} When the value is not a cookie definition created by this package.
 */
export function assertCookie(
  cookie: unknown,
): asserts cookie is SeedpodsCookie<string, SeedpodsCookieType, unknown> {
  if (
    typeof cookie !== 'object' ||
    typeof (cookie as Record<string | symbol, unknown>)[SEEDPODS_SYMBOL_COOKIE] !== 'object'
  ) {
    throw new SeedpodsError([
      {
        actual: cookie,
        type: 'CookieExpected',
      },
    ])
  }
}
