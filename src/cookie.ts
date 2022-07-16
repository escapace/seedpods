/* eslint-disable @typescript-eslint/no-explicit-any */

import { isPlainObject } from 'lodash-es'
import { from as fromHmac, to as toHmac } from './cookie-type/hmac'
import {
  from as fromSecretbox,
  to as toSecretbox
} from './cookie-type/secretbox'
import { JSONType } from './types'
import { decode } from './utilities/decode'
import { encode } from './utilities/encode'
import {
  CookieOptions,
  CookieOptionsParsed,
  CookieType,
  parseCookieOptions
} from './utilities/parse-cookie-options'
import { toIMF } from './utilities/to-imf'

const DATE_ZERO = toIMF(new Date(0))

export const SYMBOL_COOKIE = Symbol.for('SEEDPODS_COOKIE')

export enum TypeCookieState {
  Unset,
  Set,
  SetWithNonPrimaryKey,
  Indecipherable,
  Expired
}

export interface CookieStateSet {
  type: TypeCookieState.Set
  value: JSONType
}

export interface CookieStateUnset {
  type: TypeCookieState.Unset
}

export interface CookieStateSetWithNonPrimaryKey {
  type: TypeCookieState.SetWithNonPrimaryKey
  value: JSONType
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
  VALUE extends JSONType = any
> {
  readonly [SYMBOL_COOKIE]: {
    name: string
    fromString: (value: string | undefined) => CookieState
    toString: (value: CookieState) => string | undefined
    readonly options: CookieOptionsParsed<KEY, TYPE, VALUE>
  }
}

export const cookie = <
  KEY extends string,
  TYPE extends CookieType,
  VALUE extends JSONType = JSONType
>(
  options: CookieOptions<KEY, TYPE, VALUE>
): Cookie<KEY, TYPE, VALUE> => {
  const cookie = parseCookieOptions(options)
  const suffixArray: string[] = []
  const expireSuffixArray: string[] = []

  const name =
    cookie.prefix === undefined ? cookie.key : `${cookie.prefix}${cookie.key}`

  if (cookie.secure === true) {
    suffixArray.push('Secure')
  }

  if (cookie.httpOnly === true) {
    suffixArray.push('HttpOnly')
  }

  if (cookie.maxAge !== undefined) {
    suffixArray.push(`Max-Age=${cookie.maxAge}`)
  }

  if (cookie.domain !== undefined) {
    const value = `Domain=${cookie.domain}`

    suffixArray.push(value)
    expireSuffixArray.push(value)
  }

  if (cookie.sameSite !== undefined) {
    suffixArray.push(`SameSite=${cookie.sameSite}`)
  }

  if (cookie.path !== undefined) {
    const value = `Path=${cookie.path}`

    suffixArray.push(value)
    expireSuffixArray.push(value)
  }

  if (cookie.expires?.imf !== undefined) {
    suffixArray.push(`Expires=${cookie.expires.imf}`)
  }

  expireSuffixArray.push(`Expires=${DATE_ZERO}`)

  const suffix = suffixArray.length === 0 ? '' : `; ${suffixArray.join('; ')}`
  const outDeleteString =
    expireSuffixArray.length === 0 ? '' : `; ${expireSuffixArray.join('; ')}`

  const to = options.type === 'hmac' ? toHmac : toSecretbox
  const from = options.type === 'hmac' ? fromHmac : fromSecretbox

  return {
    [SYMBOL_COOKIE]: {
      name,
      fromString(cookieValue: string | undefined): CookieState {
        if (cookieValue === undefined) {
          return { type: TypeCookieState.Unset }
        }

        const result = from(cookieValue, options.keys)

        const indecipherable = { type: TypeCookieState.Indecipherable as const }

        if (result === undefined) {
          return indecipherable
        }

        const value = decode(result.value)

        if (value === undefined) {
          return indecipherable
        }

        return {
          type: result.rotate
            ? TypeCookieState.SetWithNonPrimaryKey
            : TypeCookieState.Set,
          value
        }
      },
      toString(state: CookieState) {
        if (
          state.type === TypeCookieState.Expired ||
          state.type === TypeCookieState.Indecipherable
        ) {
          return `${name}=${outDeleteString}`
        }

        if (
          state.type === TypeCookieState.Set ||
          state.type === TypeCookieState.SetWithNonPrimaryKey
        ) {
          const value = encode(state.value)

          if (value === undefined) {
            return undefined
          }

          const cookieValue = to(value, options.keys)

          return cookieValue === undefined // || !validateCookieValue(value)
            ? undefined
            : `${name}=${cookieValue}${suffix}`
        }

        return undefined
      },
      options: cookie
    }
  }
}

export function isCookie(
  cookie: unknown
): asserts cookie is Cookie<string, CookieType, JSONType> {
  if (
    !(
      isPlainObject(cookie) &&
      isPlainObject((cookie as Record<string | symbol, unknown>)[SYMBOL_COOKIE])
    )
  ) {
    throw new Error('Not a cookie.')
  }
}
