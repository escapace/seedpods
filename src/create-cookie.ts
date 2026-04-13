import { SEEDPODS_COOKIE_EXPIRES_AT_UNIX_EPOCH, SEEDPODS_SYMBOL_COOKIE } from './constants'
import { SeedpodsError } from './error'
import {
  type SeedpodsCookie,
  type SeedpodsCookieOptionsForType,
  type SeedpodsCookieState,
  SeedpodsCookieStateType,
  type SeedpodsCookieType,
  type SeedpodsCookieValue,
  type SeedpodsParsedCookieOptions,
} from './types'
export { SEEDPODS_SYMBOL_COOKIE } from './constants'
import { from as fromAesGcm, to as toAesGcm } from './cookie-type/aes-gcm'
import { from as fromHmac, to as toHmac } from './cookie-type/hmac'
import { decode } from './utilities/decode'
import { encode } from './utilities/encode'
import { parseCookieOptions } from './utilities/parse-cookie-options'

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

  if (cookie.maxAge !== undefined) {
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
 * @param options - Cookie configuration, including the key, key material, and transport attributes.
 * @returns A cookie definition that can be added to a jar.
 * @throws When the cookie options are invalid.
 */
export const createCookie = <T extends string, U extends SeedpodsCookieType, V>(
  options: SeedpodsCookieOptionsForType<T, U>,
): SeedpodsCookie<T, U, V> => {
  const parsedCookie = parseCookieOptions(options)

  const to = options.type === 'hmac' ? toHmac : toAesGcm
  const from = options.type === 'hmac' ? fromHmac : fromAesGcm

  return {
    [SEEDPODS_SYMBOL_COOKIE]: {
      options: parsedCookie,
      async fromString(cookieValue: string | undefined): Promise<SeedpodsCookieState> {
        if (cookieValue === undefined) {
          return { type: SeedpodsCookieStateType.Unset }
        }

        const result = await from(cookieValue, parsedCookie.keys)

        const indecipherable = { type: SeedpodsCookieStateType.Indecipherable as const }

        if (result === undefined) {
          return indecipherable
        }

        const value: SeedpodsCookieValue | undefined = decode(result.value)

        if (value === undefined) {
          return indecipherable
        }

        // This happens when we are processing cookies with the same name, yet
        // we can still decode them. We handle it as if we couldn't decode it.
        if (value.options.key !== parsedCookie.key) {
          return indecipherable
        }

        return {
          type: result.rotate
            ? SeedpodsCookieStateType.SetButNeedsUpdate
            : SeedpodsCookieStateType.Set,
          value: value.value,
        }
      },
      async toString(state: SeedpodsCookieState) {
        if (
          state.type === SeedpodsCookieStateType.Expired ||
          state.type === SeedpodsCookieStateType.Indecipherable
        ) {
          return `${parsedCookie.name}=${attributes(parsedCookie, true)}`
        }

        if (
          state.type === SeedpodsCookieStateType.Set ||
          state.type === SeedpodsCookieStateType.SetButNeedsUpdate
        ) {
          const value = encode(state.value, parsedCookie)

          if (value === undefined) {
            return
          }

          const cookieValue = await to(value, options.keys)

          // Defensive branch: the current encoder produces a non-empty buffer for any defined
          // cookie value, so the codec should normally return a string here. Keep this guard in
          // place in case a future codec rejects the payload and returns `undefined` instead.
          return cookieValue === undefined
            ? undefined
            : `${parsedCookie.name}=${cookieValue}${attributes(parsedCookie)}`
        }

        return
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
