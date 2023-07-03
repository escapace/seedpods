import { isPlainObject } from 'lodash-es'
import { from as fromAesGcm, to as toAesGcm } from './cookie-type/aes-gcm'
import { from as fromHmac, to as toHmac } from './cookie-type/hmac'
import { decode } from './utilities/decode'
import { encode } from './utilities/encode'
import {
  CookieOptions,
  CookieOptionsParsed,
  CookieType,
  CookieValue,
  parseCookieOptions
} from './utilities/parse-cookie-options'
import { toIMF } from './utilities/to-imf'

const DATE_ZERO = toIMF(new Date(0))

export const SYMBOL_COOKIE = Symbol.for('SEEDPODS_COOKIE')

export enum TypeCookieState {
  Expired,
  Indecipherable,
  Set,
  SetButNeedsUpdate,
  Unset
}

export interface CookieStateSet {
  type: TypeCookieState.Set
  value: unknown
}

export interface CookieStateUnset {
  type: TypeCookieState.Unset
}

export interface CookieStateSetWithNonPrimaryKey {
  type: TypeCookieState.SetButNeedsUpdate
  value: unknown
}

export interface CookieStateIndecipherable {
  type: TypeCookieState.Indecipherable
}

export interface CookieStateExpired {
  type: TypeCookieState.Expired
}

export type CookieState =
  | CookieStateSet
  | CookieStateUnset
  | CookieStateSetWithNonPrimaryKey
  | CookieStateIndecipherable
  | CookieStateExpired

export interface Cookie<
  KEY extends string = any,
  TYPE extends CookieType = any,
  VALUE = any
> {
  readonly [SYMBOL_COOKIE]: {
    fromString: (value: string | undefined) => Promise<CookieState>
    toString: (value: CookieState) => Promise<string | undefined>
    readonly options: CookieOptionsParsed<KEY, TYPE, VALUE>
  }
}

export type Key<T> = T extends Cookie<infer KEY> ? KEY : never

const attributes = (
  cookie: CookieOptionsParsed<string, CookieType, unknown>,
  expire = false
) => {
  const array: string[] = []

  if (cookie.domain !== undefined) {
    array.push(`Domain=${cookie.domain}`)
  }

  if (expire) {
    array.push(`Expires=${DATE_ZERO}`)
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

export const cookie = <KEY extends string, TYPE extends CookieType, VALUE>(
  options: CookieOptions<KEY, TYPE, VALUE>
): Cookie<KEY, TYPE, VALUE> => {
  const cookie = parseCookieOptions(options)

  const to = options.type === 'hmac' ? toHmac : toAesGcm
  const from = options.type === 'hmac' ? fromHmac : fromAesGcm

  return {
    [SYMBOL_COOKIE]: {
      async fromString(cookieValue: string | undefined): Promise<CookieState> {
        if (cookieValue === undefined) {
          return { type: TypeCookieState.Unset }
        }

        const result = await from(cookieValue, cookie.keys)

        const indecipherable = { type: TypeCookieState.Indecipherable as const }

        if (result === undefined) {
          return indecipherable
        }

        const value: CookieValue | undefined = decode(result.value)

        if (value === undefined) {
          return indecipherable
        }

        // This happens when we are processing cookies with the same name, yet
        // we can still decode them. We handle it as if we couldn't decode it.
        if (value.options.key !== cookie.key) {
          return indecipherable
        }

        return {
          type: result.rotate
            ? TypeCookieState.SetButNeedsUpdate
            : TypeCookieState.Set,
          value: value.value
        }
      },
      async toString(state: CookieState) {
        if (
          state.type === TypeCookieState.Expired ||
          state.type === TypeCookieState.Indecipherable
        ) {
          return `${cookie.name}=${attributes(cookie, true)}`
        }

        if (
          state.type === TypeCookieState.Set ||
          state.type === TypeCookieState.SetButNeedsUpdate
        ) {
          const value = encode(state.value, cookie)

          if (value === undefined) {
            return undefined
          }

          const cookieValue = await to(value, options.keys)

          return cookieValue === undefined
            ? undefined
            : `${cookie.name}=${cookieValue}${attributes(cookie)}`
        }

        return undefined
      },
      options: cookie
    }
  }
}

export function isCookie(
  cookie: unknown
): asserts cookie is Cookie<string, CookieType, unknown> {
  if (
    !(
      isPlainObject(cookie) &&
      isPlainObject((cookie as Record<string | symbol, unknown>)[SYMBOL_COOKIE])
    )
  ) {
    throw new Error('Not a cookie.')
  }
}
