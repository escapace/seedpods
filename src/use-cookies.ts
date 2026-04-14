import { deepEqual } from 'fast-equals'
import {
  SEEDPODS_COOKIE_STATE_PRIORITY_ORDER,
  SEEDPODS_SYMBOL_COOKIE,
  SEEDPODS_SYMBOL_JAR,
} from './constants'
import { SeedpodsError } from './error'
import type {
  SeedpodsCookie,
  SeedpodsCookieHeader,
  SeedpodsCookiePublishedSnapshot,
  SeedpodsCookies,
  SeedpodsCookiesReducers,
  SeedpodsCookieState,
  SeedpodsCookieType,
  SeedpodsJarCookieValue,
  SeedpodsJarInterface,
  SeedpodsJarKeys,
} from './types'
import { SeedpodsCookieStateType } from './types'
import { parseCookieHeader } from './utilities/parse-cookie-header'

type CookieStateHistory = [SeedpodsCookieState, ...SeedpodsCookieState[]]

interface RequestCookieContext {
  snapshot: SeedpodsCookiePublishedSnapshot
  states: CookieStateHistory
}

type CookieStateDeletion = Extract<
  SeedpodsCookieState,
  | { type: SeedpodsCookieStateType.Expired }
  | { type: SeedpodsCookieStateType.Indecipherable }
  | { type: SeedpodsCookieStateType.Unset }
>

const getCookieStatePriority = (state: SeedpodsCookieState): number =>
  SEEDPODS_COOKIE_STATE_PRIORITY_ORDER.indexOf(state.type)

const isCookieStateSet = (
  state: SeedpodsCookieState,
): state is Extract<
  SeedpodsCookieState,
  { type: SeedpodsCookieStateType.Set | SeedpodsCookieStateType.SetButNeedsUpdate }
> =>
  state.type === SeedpodsCookieStateType.Set ||
  state.type === SeedpodsCookieStateType.SetButNeedsUpdate

const getCookieStateValue = (state: SeedpodsCookieState): unknown =>
  isCookieStateSet(state) ? state.value : undefined

const getLastCookieState = (states: CookieStateHistory): SeedpodsCookieState =>
  states[states.length - 1]

const appendCookieState = (
  states: CookieStateHistory,
  nextState: SeedpodsCookieState,
): CookieStateHistory => [...states, nextState]

const getInitialCookieState = (states: SeedpodsCookieState[]): SeedpodsCookieState =>
  states.reduce((best, current) =>
    getCookieStatePriority(current) < getCookieStatePriority(best) ? current : best,
  )

const getDeletionCookieState = (initialState: SeedpodsCookieState): CookieStateDeletion => {
  switch (initialState.type) {
    case SeedpodsCookieStateType.Indecipherable:
      return { type: SeedpodsCookieStateType.Indecipherable }
    case SeedpodsCookieStateType.Unset:
      return { type: SeedpodsCookieStateType.Unset }
    default:
      return { type: SeedpodsCookieStateType.Expired }
  }
}

const shouldEmitCookieState = (
  initialState: SeedpodsCookieState,
  nextState: SeedpodsCookieState,
): boolean =>
  initialState.type !== SeedpodsCookieStateType.Set ||
  nextState.type !== SeedpodsCookieStateType.Set ||
  !deepEqual(getCookieStateValue(initialState), getCookieStateValue(nextState))

const getCookieContext = (
  state: Map<string, RequestCookieContext>,
  key: string,
): RequestCookieContext => {
  const cookieContext = state.get(key)

  if (cookieContext !== undefined) {
    return cookieContext
  }

  throw new SeedpodsError([
    {
      key,
      type: 'UnknownCookieKey',
    },
  ])
}

/**
 * Creates a cookie interface from a `Cookie` header value and a cookie jar.
 *
 * @remarks
 * The returned interface reads configured cookie values through `get`, records changes through `set`, `del`, and `refresh`, and produces changed `Set-Cookie` header values through `entries` and `values`. If the header contains the same cookie name more than once, the function keeps the best decodable value for each configured cookie.
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

  const cookieEntries = Object.entries(cookies) as Array<
    [string, SeedpodsCookie<string, SeedpodsCookieType, unknown>]
  >

  const state = new Map<string, RequestCookieContext>(
    await Promise.all(
      cookieEntries.map(async ([key, cookie]): Promise<[string, RequestCookieContext]> => {
        const snapshot = cookie[SEEDPODS_SYMBOL_COOKIE].readSnapshot()
        const parsedCookies = parsedCookieHeader.get(snapshot.options.name)
        const candidateValues =
          parsedCookies === undefined || parsedCookies.length === 0 ? [undefined] : parsedCookies

        const cookieStates = await Promise.all(
          candidateValues.map(
            async (parsedCookie) =>
              await cookie[SEEDPODS_SYMBOL_COOKIE].fromStringWithSnapshot(snapshot, parsedCookie),
          ),
        )

        return [key, { snapshot, states: [getInitialCookieState(cookieStates)] }]
      }),
    ),
  )

  const get = <SeedpodsKey extends SeedpodsJarKeys<SeedpodsJar>>(
    key: SeedpodsKey,
  ): SeedpodsJarCookieValue<SeedpodsJar, SeedpodsKey> | undefined => {
    const cookieContext = getCookieContext(state, key)
    const lastCookieState = getLastCookieState(cookieContext.states)

    if (isCookieStateSet(lastCookieState)) {
      return lastCookieState.value as SeedpodsJarCookieValue<SeedpodsJar, SeedpodsKey>
    }

    return
  }

  const del = (key: SeedpodsJarKeys<SeedpodsJar>) => {
    const cookieContext = getCookieContext(state, key)
    const firstCookieState = cookieContext.states[0]
    const lastCookieState = getLastCookieState(cookieContext.states)
    const nextState = getDeletionCookieState(firstCookieState)

    if (lastCookieState.type !== nextState.type) {
      state.set(key, {
        ...cookieContext,
        states: appendCookieState(cookieContext.states, nextState),
      })
    }
  }

  const set = <SeedpodsKey extends SeedpodsJarKeys<SeedpodsJar>>(
    key: SeedpodsKey,
    value: SeedpodsJarCookieValue<SeedpodsJar, SeedpodsKey> | undefined,
  ): void => {
    const cookieContext = getCookieContext(state, key)
    const lastCookieState = getLastCookieState(cookieContext.states)
    const lastCookieValue = getCookieStateValue(lastCookieState) as SeedpodsJarCookieValue<
      SeedpodsJar,
      SeedpodsKey
    >

    const reducer = reducers[key]
    const nextValue = typeof reducer === 'function' ? reducer(lastCookieValue, value) : value

    if (nextValue === undefined) {
      return del(key)
    }

    state.set(key, {
      ...cookieContext,
      states: appendCookieState(cookieContext.states, {
        type: SeedpodsCookieStateType.Set,
        value: nextValue,
      }),
    })
  }

  const refresh = (key: SeedpodsJarKeys<SeedpodsJar>) => {
    const cookieContext = getCookieContext(state, key)
    const lastCookieState = getLastCookieState(cookieContext.states)

    if (!isCookieStateSet(lastCookieState)) {
      return
    }

    if (lastCookieState.type === SeedpodsCookieStateType.SetButNeedsUpdate) {
      return
    }

    state.set(key, {
      ...cookieContext,
      states: appendCookieState(cookieContext.states, {
        type: SeedpodsCookieStateType.SetButNeedsUpdate,
        value: lastCookieState.value,
      }),
    })
  }

  const entries = async (): Promise<Array<[SeedpodsJarKeys<SeedpodsJar>, string]>> => {
    const promises: Array<Promise<[SeedpodsJarKeys<SeedpodsJar>, string] | undefined>> = []

    for (const [key, cookieContext] of state) {
      const firstCookieState = cookieContext.states[0]
      const lastCookieState = getLastCookieState(cookieContext.states)

      if (shouldEmitCookieState(firstCookieState, lastCookieState)) {
        promises.push(
          (cookies[key] as SeedpodsCookie<string, SeedpodsCookieType, unknown>)[
            SEEDPODS_SYMBOL_COOKIE
          ].toStringWithSnapshot(cookieContext.snapshot, lastCookieState).then(
            (value): [SeedpodsJarKeys<SeedpodsJar>, string] | undefined =>
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

  return {
    del,
    entries,
    get,
    refresh,
    set,
    values,
  }
}
