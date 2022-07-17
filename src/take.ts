import { first, isEqual, isFunction, last, map } from 'lodash-es'
import { IncomingHttpHeaders as HTTPIncomingHttpHeaders } from 'node:http'
import { IncomingHttpHeaders as HTTP2IncomingHttpHeaders } from 'node:http2'
import { CookieState, SYMBOL_COOKIE, TypeCookieState } from './cookie'
import { JAR, Keys, SYMBOL_JAR, Value } from './jar'

import { JSONType } from './types'
import { parseCookieHeader } from './utilities/parse-cookie-header'

type CookieHeader =
  | HTTPIncomingHttpHeaders['cookie']
  | HTTP2IncomingHttpHeaders['cookie']

export type Reducer<T extends JSONType> = (
  prev?: T | undefined,
  next?: T | undefined
) => T | undefined

type Reducers<T extends JAR> = {
  [P in Keys<T>]?: Reducer<Value<T, P>> | undefined
}

interface Take<T extends JAR> {
  [Symbol.iterator]: () => IterableIterator<[Keys<T>, string]>
  get: <U extends Keys<T>>(key: U) => undefined | Value<T, U>
  set: <U extends Keys<T>>(key: U, value: Value<T, U> | undefined) => void
  del: (key: Keys<T>) => void
  entries: () => IterableIterator<[Keys<T>, string]>
  values: () => IterableIterator<string>
}

const cookieValue = (state: CookieState): JSONType | undefined =>
  state.type === TypeCookieState.Set ||
  state.type === TypeCookieState.SetWithNonPrimaryKey
    ? state.value
    : undefined

export const take = <T extends JAR>(
  cookieHeader: CookieHeader,
  jar: T,
  reducers: Reducers<T> = {}
): Take<T> => {
  const cookies = jar[SYMBOL_JAR].state.cookies
  const parsedCookieHeader = parseCookieHeader(cookieHeader)

  const state: Map<string, [CookieState, ...CookieState[]]> = new Map(
    map(cookies, (cookie, key) => [
      key,
      [
        cookie[SYMBOL_COOKIE].fromString(
          parsedCookieHeader.get(cookie[SYMBOL_COOKIE].name)
        )
      ]
    ])
  )

  const get = (key: string) => {
    const cookieStates = state.get(key)

    if (cookieStates === undefined) {
      throw new Error('Wrong cookie key.')
    }

    const lastCookieState = last(cookieStates) as CookieState

    if (
      lastCookieState.type === TypeCookieState.Set ||
      lastCookieState.type === TypeCookieState.SetWithNonPrimaryKey
    ) {
      return lastCookieState.value
    }

    return undefined
  }

  const del = (key: string) => {
    const cookieStates = state.get(key)

    if (cookieStates === undefined) {
      throw new Error('Wrong cookie key.')
    }

    const firstCookieState = first(cookieStates) as CookieState
    const lastCookieState = last(cookieStates) as CookieState

    const type: Exclude<
      TypeCookieState,
      TypeCookieState.Set | TypeCookieState.SetWithNonPrimaryKey
    > =
      firstCookieState.type === TypeCookieState.Indecipherable
        ? TypeCookieState.Indecipherable
        : firstCookieState.type === TypeCookieState.Unset
        ? TypeCookieState.Unset
        : TypeCookieState.Expired

    if (lastCookieState.type !== type) {
      state.set(key, [...cookieStates, { type }])
    }
  }

  const set = (key: string, value: Value<T, string> | undefined): void => {
    const cookieStates = state.get(key)

    if (cookieStates === undefined) {
      throw new Error('Wrong cookie key.')
    }

    const lastCookieState = last(cookieStates) as CookieState
    const lastCookieValue = cookieValue(lastCookieState) as Value<T, string>

    const reducer = reducers[key]

    const nextValue = isFunction(reducer)
      ? reducer(lastCookieValue, value)
      : value

    if (nextValue === undefined) {
      return del(key)
    }

    state.set(key, [
      ...cookieStates,
      { type: TypeCookieState.Set, value: nextValue }
    ])
  }

  function* entries() {
    for (const [key, cookieStates] of state) {
      const cookie = cookies[key][SYMBOL_COOKIE]

      const firstCookieState = first(cookieStates) as CookieState
      const firstCookieValue = cookieValue(firstCookieState)

      const lastCookieState = last(cookieStates) as CookieState
      const lastCookieValue = cookieValue(lastCookieState)

      if (
        firstCookieState.type === TypeCookieState.Set &&
        lastCookieState.type === TypeCookieState.Set
      ) {
        if (!isEqual(firstCookieValue, lastCookieValue)) {
          const value = cookie.toString(lastCookieState)

          if (value !== undefined) {
            yield [key, value] as const
          }
        }
      } else {
        const value = cookie.toString(lastCookieState)

        if (value !== undefined) {
          yield [key, value] as const
        }
      }
    }
  }

  function* values() {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for (const [_, value] of entries()) {
      yield value
    }
  }

  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return {
    get,
    set,
    del,
    entries,
    [Symbol.iterator]: entries,
    values
  } as Take<T>
}
