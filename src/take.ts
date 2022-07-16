import { first, isEqual, last, map } from 'lodash-es'
import { IncomingHttpHeaders as HTTPIncomingHttpHeaders } from 'node:http'
import { IncomingHttpHeaders as HTTP2IncomingHttpHeaders } from 'node:http2'
import { CookieState, SYMBOL_COOKIE, TypeCookieState } from './cookie'
import { JAR, SYMBOL_JAR, Value } from './jar'

import { JSONType } from './types'
import { parseCookieHeader } from './utilities/parse-cookie-header'
import { CookieReducer } from './utilities/parse-cookie-options'

type CookieHeader =
  | HTTPIncomingHttpHeaders['cookie']
  | HTTP2IncomingHttpHeaders['cookie']

interface Take<T extends JAR> {
  get: <U extends keyof T[typeof SYMBOL_JAR]['state']['cookies']>(
    key: U
  ) => undefined | Value<T[typeof SYMBOL_JAR], U>
  set: <U extends keyof T[typeof SYMBOL_JAR]['state']['cookies']>(
    key: U,
    value: Value<T[typeof SYMBOL_JAR], U> | undefined
  ) => void
  del: (key: keyof T[typeof SYMBOL_JAR]['state']['cookies']) => void
  toStrings: () => string[]
}

const cookieValue = (state: CookieState): JSONType | undefined =>
  state.type === TypeCookieState.Set ||
  state.type === TypeCookieState.SetWithNonPrimaryKey
    ? state.value
    : undefined

export const take = <T extends JAR>(
  cookieHeader: CookieHeader,
  jar: T
): Take<T> => {
  // isJar(jar)

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

    const reducer = cookies[key][SYMBOL_COOKIE].options
      .reducer as CookieReducer<JSONType>

    const nextValue = reducer(previousValue, value)

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

  return asd as Take<T>
}
