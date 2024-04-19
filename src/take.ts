import { type CookieState, SYMBOL_COOKIE, TypeCookieState } from './cookie'
import { type JAR, type Keys, SYMBOL_JAR, type Value } from './jar'
import { isEqual } from './utilities/is-equal'

import { parseCookieHeader } from './utilities/parse-cookie-header'

const CookieStatePriority = [
  TypeCookieState.Set,
  TypeCookieState.SetButNeedsUpdate,
  TypeCookieState.Unset,
  TypeCookieState.Expired,
  TypeCookieState.Indecipherable
]

type CookieHeader = string | undefined

export type Reducer<T> = (
  previous?: T | undefined,
  next?: T | undefined
) => T | undefined

type Reducers<T extends JAR> = {
  [P in Keys<T>]?: Reducer<Value<T, P>> | undefined
}

interface Take<T extends JAR> {
  del: (key: Keys<T>) => void
  entries: () => Promise<Array<[Keys<T>, string]>>
  get: <U extends Keys<T>>(key: U) => undefined | Value<T, U>
  set: <U extends Keys<T>>(key: U, value: undefined | Value<T, U>) => void
  values: () => Promise<string[]>
}

const cookieValue = (state: CookieState): unknown =>
  state.type === TypeCookieState.Set ||
  state.type === TypeCookieState.SetButNeedsUpdate
    ? state.value
    : undefined

export const take = async <T extends JAR>(
  cookieHeader: CookieHeader | undefined,
  jar: T,
  reducers: Reducers<T> = {}
): Promise<Take<T>> => {
  const cookies = jar[SYMBOL_JAR].state.cookies
  const parsedCookieHeader = parseCookieHeader(cookieHeader)

  const state = new Map<string, [CookieState, ...CookieState[]]>(
    await Promise.all(
      Object.entries(cookies).map(
        async ([key, cookie]): Promise<
          [string, [CookieState, ...CookieState[]]]
        > => {
          // there can be multiple cookies in the header
          const name = cookie[SYMBOL_COOKIE].options.name
          const parsedCookies: Array<string | undefined> =
            parsedCookieHeader.get(name) ?? []

          if (parsedCookies.length === 0) {
            parsedCookies.push(undefined)
          }

          const states: CookieState[] = await Promise.all(
            parsedCookies.map(
              async (parsedCookie) =>
                await cookie[SYMBOL_COOKIE].fromString(parsedCookie)
            )
          )

          const currentState = states.sort(
            (a, b) =>
              CookieStatePriority.indexOf(a.type) -
              CookieStatePriority.indexOf(b.type)
          )[0]

          return [key, [currentState]]
        }
      )
    )
  )

  const get = (key: string) => {
    const cookieStates = state.get(key)

    if (cookieStates === undefined) {
      throw new Error('Wrong cookie key.')
    }

    const lastCookieState = cookieStates[cookieStates.length - 1]

    if (
      lastCookieState.type === TypeCookieState.Set ||
      lastCookieState.type === TypeCookieState.SetButNeedsUpdate
    ) {
      return lastCookieState.value
    }

    return
  }

  const del = (key: string) => {
    const cookieStates = state.get(key)

    if (cookieStates === undefined) {
      throw new Error('Wrong cookie key.')
    }

    const firstCookieState = cookieStates[0]
    const lastCookieState = cookieStates[cookieStates.length - 1]

    const type: Exclude<
      TypeCookieState,
      TypeCookieState.Set | TypeCookieState.SetButNeedsUpdate
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

  const set = (key: string, value: undefined | Value<T, string>): void => {
    const cookieStates = state.get(key)

    if (cookieStates === undefined) {
      throw new Error('Wrong cookie key.')
    }

    const lastCookieState = cookieStates[cookieStates.length - 1]
    const lastCookieValue = cookieValue(lastCookieState) as Value<T, string>

    const reducer = reducers[key]

    const nextValue =
      typeof reducer === 'function' ? reducer(lastCookieValue, value) : value

    if (nextValue === undefined) {
      return del(key)
    }

    state.set(key, [
      ...cookieStates,
      { type: TypeCookieState.Set, value: nextValue }
    ])
  }

  const entries = async (): Promise<Array<[string, string]>> => {
    const promises: Array<Promise<[string, string] | undefined>> = []

    for (const [key, cookieStates] of state) {
      const cookie = cookies[key][SYMBOL_COOKIE]

      const firstCookieState = cookieStates[0]
      const firstCookieValue = cookieValue(firstCookieState)

      const lastCookieState = cookieStates[cookieStates.length - 1]
      const lastCookieValue = cookieValue(lastCookieState)

      const firstCookieIsSet = firstCookieState.type === TypeCookieState.Set
      const lastCookieIsSet = lastCookieState.type === TypeCookieState.Set

      if (
        !(
          firstCookieIsSet &&
          lastCookieIsSet &&
          isEqual(firstCookieValue, lastCookieValue)
        )
      ) {
        promises.push(
          cookie
            .toString(lastCookieState)
            .then((value): [string, string] | undefined =>
              value === undefined ? undefined : [key, value]
            )
        )
      }
    }

    return (await Promise.all(promises)).filter(
      (value): value is [string, string] => value !== undefined
    )
  }

  const values = async (): Promise<string[]> =>
    (await entries()).map(([_, value]) => value)

  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return {
    del,
    entries,
    get,
    set,
    values
  } as Take<T>
}
