import { deepEqual } from 'fast-equals'
import {
  SEEDPODS_COOKIE_STATE_PRIORITY_ORDER,
  SEEDPODS_SYMBOL_COOKIE,
  SEEDPODS_SYMBOL_JAR,
} from './constants'
import type {
  SeedpodsCookieHeader,
  SeedpodsCookies,
  SeedpodsCookiesReducers,
  SeedpodsCookieState,
  SeedpodsJarCookieValue,
  SeedpodsJarInterface,
  SeedpodsJarKeys,
} from './types'
import { SeedpodsCookieStateType } from './types'
import { parseCookieHeader } from './utilities/parse-cookie-header'

const getCookieStateValue = (state: SeedpodsCookieState): unknown =>
  state.type === SeedpodsCookieStateType.Set ||
  state.type === SeedpodsCookieStateType.SetButNeedsUpdate
    ? state.value
    : undefined

/**
 * Creates a cookie interface from a `Cookie` header value and a cookie jar.
 *
 * @remarks
 * The returned interface reads configured cookie values through `get`, records changes through `set` and `del`, and produces changed `Set-Cookie` header values through `entries` and `values`. If the header contains the same cookie name more than once, the function keeps the best decodable value for each configured cookie.
 *
 * @typeParam SeedpodsJar - Jar type that defines the available cookie keys and value types.
 * @param cookieHeader - Incoming `Cookie` header value. When omitted, the interface starts with no received cookies.
 * @param jar - Cookie definitions created with {@link createJar}.
 * @param reducers - Optional reducers that combine the current cookie value with a later value passed to `set`.
 * @returns A cookie interface for reading values, recording changes, and generating changed `Set-Cookie` header values.
 */
export const useCookies = async <SeedpodsJar extends SeedpodsJarInterface>(
  cookieHeader: SeedpodsCookieHeader | undefined,
  jar: SeedpodsJar,
  reducers: SeedpodsCookiesReducers<SeedpodsJar> = {},
): Promise<SeedpodsCookies<SeedpodsJar>> => {
  const cookies = jar[SEEDPODS_SYMBOL_JAR].state.cookies
  const parsedCookieHeader = parseCookieHeader(cookieHeader)

  const state = new Map<string, [SeedpodsCookieState, ...SeedpodsCookieState[]]>(
    await Promise.all(
      Object.entries(cookies).map(
        async ([key, cookie]): Promise<
          [string, [SeedpodsCookieState, ...SeedpodsCookieState[]]]
        > => {
          const name = cookie[SEEDPODS_SYMBOL_COOKIE].options.name
          const parsedCookies: Array<string | undefined> = parsedCookieHeader.get(name) ?? []

          if (parsedCookies.length === 0) {
            parsedCookies.push(undefined)
          }

          const states: SeedpodsCookieState[] = await Promise.all(
            parsedCookies.map(
              async (parsedCookie) => await cookie[SEEDPODS_SYMBOL_COOKIE].fromString(parsedCookie),
            ),
          )

          const currentState = states.sort(
            (a, b) =>
              SEEDPODS_COOKIE_STATE_PRIORITY_ORDER.indexOf(a.type) -
              SEEDPODS_COOKIE_STATE_PRIORITY_ORDER.indexOf(b.type),
          )[0]

          return [key, [currentState]]
        },
      ),
    ),
  )

  const get = <SeedpodsKey extends SeedpodsJarKeys<SeedpodsJar>>(
    key: SeedpodsKey,
  ): SeedpodsJarCookieValue<SeedpodsJar, SeedpodsKey> | undefined => {
    const cookieStates = state.get(key)

    if (cookieStates === undefined) {
      throw new Error('Wrong cookie key.')
    }

    const lastCookieState = cookieStates[cookieStates.length - 1]

    if (
      lastCookieState.type === SeedpodsCookieStateType.Set ||
      lastCookieState.type === SeedpodsCookieStateType.SetButNeedsUpdate
    ) {
      return lastCookieState.value as SeedpodsJarCookieValue<SeedpodsJar, SeedpodsKey>
    }

    return
  }

  const del = (key: SeedpodsJarKeys<SeedpodsJar>) => {
    const cookieStates = state.get(key)

    if (cookieStates === undefined) {
      throw new Error('Wrong cookie key.')
    }

    const firstCookieState = cookieStates[0]
    const lastCookieState = cookieStates[cookieStates.length - 1]

    const type: Exclude<
      SeedpodsCookieStateType,
      SeedpodsCookieStateType.Set | SeedpodsCookieStateType.SetButNeedsUpdate
    > =
      firstCookieState.type === SeedpodsCookieStateType.Indecipherable
        ? SeedpodsCookieStateType.Indecipherable
        : firstCookieState.type === SeedpodsCookieStateType.Unset
          ? SeedpodsCookieStateType.Unset
          : SeedpodsCookieStateType.Expired

    if (lastCookieState.type !== type) {
      state.set(key, [...cookieStates, { type }])
    }
  }

  const set = <SeedpodsKey extends SeedpodsJarKeys<SeedpodsJar>>(
    key: SeedpodsKey,
    value: SeedpodsJarCookieValue<SeedpodsJar, SeedpodsKey> | undefined,
  ): void => {
    const cookieStates = state.get(key)

    if (cookieStates === undefined) {
      throw new Error('Wrong cookie key.')
    }

    const lastCookieState = cookieStates[cookieStates.length - 1]
    const lastCookieValue = getCookieStateValue(lastCookieState) as SeedpodsJarCookieValue<
      SeedpodsJar,
      SeedpodsKey
    >

    const reducer = reducers[key]

    const nextValue = typeof reducer === 'function' ? reducer(lastCookieValue, value) : value

    if (nextValue === undefined) {
      return del(key)
    }

    state.set(key, [...cookieStates, { type: SeedpodsCookieStateType.Set, value: nextValue }])
  }

  const entries = async (): Promise<Array<[SeedpodsJarKeys<SeedpodsJar>, string]>> => {
    const promises: Array<Promise<[SeedpodsJarKeys<SeedpodsJar>, string] | undefined>> = []

    for (const [key, cookieStates] of state) {
      const cookie = cookies[key][SEEDPODS_SYMBOL_COOKIE]

      const firstCookieState = cookieStates[0]
      const firstCookieValue = getCookieStateValue(firstCookieState)

      const lastCookieState = cookieStates[cookieStates.length - 1]
      const lastCookieValue = getCookieStateValue(lastCookieState)

      const firstCookieIsSet = firstCookieState.type === SeedpodsCookieStateType.Set
      const lastCookieIsSet = lastCookieState.type === SeedpodsCookieStateType.Set

      if (!firstCookieIsSet || !lastCookieIsSet || !deepEqual(firstCookieValue, lastCookieValue)) {
        promises.push(
          cookie
            .toString(lastCookieState)
            .then((value): [SeedpodsJarKeys<SeedpodsJar>, string] | undefined =>
              value === undefined ? undefined : [key as SeedpodsJarKeys<SeedpodsJar>, value],
            ),
        )
      }
    }

    return (await Promise.all(promises)).filter(
      (value): value is [SeedpodsJarKeys<SeedpodsJar>, string] => value !== undefined,
    )
  }

  const values = async (): Promise<string[]> => (await entries()).map(([_, value]) => value)

  const seedpodsCookies: SeedpodsCookies<SeedpodsJar> = {
    del,
    entries,
    get,
    set,
    values,
  }

  return seedpodsCookies
}
