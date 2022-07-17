import { first, isEqual, isFunction, last, map } from 'lodash-es'
import { IncomingHttpHeaders as HTTPIncomingHttpHeaders } from 'node:http'
import { IncomingHttpHeaders as HTTP2IncomingHttpHeaders } from 'node:http2'
import { CookieState, SYMBOL_COOKIE, TypeCookieState } from './cookie'
import { JAR, SYMBOL_JAR } from './jar'

import { JSONType } from './types'
import { parseCookieHeader } from './utilities/parse-cookie-header'

type CookieHeader =
  | HTTPIncomingHttpHeaders['cookie']
  | HTTP2IncomingHttpHeaders['cookie']

// export type Reducer= <T extends JSONType = JSONType>(
//   prev?: T,
//   next?: T
// ) => T | undefined

type Names<T extends JAR> = keyof T[typeof SYMBOL_JAR]['state']['cookies']
type Reducers<T extends JAR> = Partial<Record<Names<T>, Function | undefined>>

type Value<
  Jar extends JAR,
  Name extends Names<Jar>,
  C extends Reducers<Jar>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
> = C[Name] extends (...args: any) => infer R ? R : JSONType

interface Take<T extends JAR, R extends Reducers<T>> {
  get: <U extends Names<T>>(key: U) => undefined | Value<T, U, R>
  set: <U extends Names<T>>(key: U, value: Value<T, U, R> | undefined) => void
  del: (key: Names<T>) => void
  toStrings: () => string[]
}

const cookieValue = (state: CookieState): JSONType | undefined =>
  state.type === TypeCookieState.Set ||
  state.type === TypeCookieState.SetWithNonPrimaryKey
    ? state.value
    : undefined

export const take = <
  T extends JAR,
  U extends {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [P in Names<T>]?: (prev?: any, next?: any) => JSONType | undefined
  }
>(
  cookieHeader: CookieHeader,
  jar: T,
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  reducers: U = {} as U
): Take<T, U> => {
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

  const set = (key: string, value: JSONType | undefined): void => {
    const cookieStates = state.get(key)

    if (cookieStates === undefined) {
      throw new Error('Wrong cookie key.')
    }

    const lastCookieState = last(cookieStates) as CookieState
    const previousValue = cookieValue(lastCookieState)

    const reducer = reducers[key]

    const nextValue = isFunction(reducer)
      ? reducer(previousValue, value)
      : value

    if (nextValue === undefined) {
      return del(key)
    }

    state.set(key, [
      ...cookieStates,
      { type: TypeCookieState.Set, value: nextValue }
    ])
  }

  const toStrings = () => {
    // const cookieStates = state.get(key)
    // const firstValue = cookieValue(first(cookieStates) as CookieState)
    // const lastValue = cookieValue(last(cookieStates) as CookieState)
    //
    // if (!isEqual(firstValue, nextValue)) {
    //   state.set(key, [
    //     ...cookieStates,
    //     { type: TypeCookieState.Set, value: nextValue }
    //   ])
    // }

    const strings: string[] = []

    state.forEach((cookieStates, key) => {
      const cookie = cookies[key][SYMBOL_COOKIE]
      const lastCookieState = last(cookieStates) as CookieState
      const lastCookieValue = cookieValue(lastCookieState)

      if (lastCookieState.type === TypeCookieState.Set) {
        const firstCookieValue = cookieValue(first(cookieStates) as CookieState)

        if (!isEqual(firstCookieValue, lastCookieValue)) {
          const value = cookie.toString(lastCookieState)

          if (value !== undefined) {
            strings.push(value)
          }
        }
      } else {
        const value = cookie.toString(lastCookieState)

        if (value !== undefined) {
          strings.push(value)
        }
      }
    })

    return strings
  }

  const asd = { get, set, del, toStrings }

  return asd as Take<T, U>
}
