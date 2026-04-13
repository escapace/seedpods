import { SEEDPODS_SYMBOL_COOKIE, SEEDPODS_SYMBOL_JAR } from './constants'
import type {
  SeedpodsCookie,
  SeedpodsJar,
  SeedpodsJarAction,
  SeedpodsJarBuilder,
  SeedpodsJarCombineAction,
  SeedpodsJarCookieAction,
  SeedpodsJarEmptyState,
  SeedpodsJarInterface,
  SeedpodsJarState,
  SeedpodsJarStateAfterAction,
} from './types'
import { SeedpodsJarActionType } from './types'
export { SEEDPODS_SYMBOL_JAR } from './constants'
import { SeedpodsError } from './error'
import { assertCookie } from './create-cookie'

const applyJarAction = (state: SeedpodsJarState, action: SeedpodsJarAction): SeedpodsJarState => {
  switch (action.type) {
    case SeedpodsJarActionType.Combine: {
      const childJar: unknown = action.payload

      assertJar(childJar)

      return {
        cookies: {
          ...state.cookies,
          ...childJar[SEEDPODS_SYMBOL_JAR].state.cookies,
        },
      }
    }
    case SeedpodsJarActionType.Cookie: {
      const cookie: unknown = action.payload

      assertCookie(cookie)

      const key = cookie[SEEDPODS_SYMBOL_COOKIE].options.key

      if (Object.keys(state.cookies).includes(key)) {
        throw new Error(`Cookie with key '${key}' already exists.`)
      }

      return {
        cookies: {
          ...state.cookies,
          [key]: cookie,
        },
      }
    }
  }
}

const buildPut =
  <State extends SeedpodsJarState>(state: State) =>
  <CookieType extends SeedpodsCookie>(cookie: CookieType) => {
    const nextState = applyJarAction(state, {
      payload: cookie,
      type: SeedpodsJarActionType.Cookie,
    }) as SeedpodsJarStateAfterAction<State, SeedpodsJarCookieAction<CookieType>>
    const nextJar: SeedpodsJarBuilder<
      SeedpodsJar<SeedpodsJarStateAfterAction<State, SeedpodsJarCookieAction<CookieType>>>,
      'combine' | 'put' | typeof SEEDPODS_SYMBOL_JAR
    > = buildJar(nextState)

    return nextJar
  }

const buildCombine =
  <State extends SeedpodsJarState>(state: State) =>
  <ChildJar extends SeedpodsJar<SeedpodsJarState>>(jar: ChildJar) => {
    const nextState = applyJarAction(state, {
      payload: jar,
      type: SeedpodsJarActionType.Combine,
    }) as SeedpodsJarStateAfterAction<State, SeedpodsJarCombineAction<ChildJar>>
    const nextJar: SeedpodsJarBuilder<
      SeedpodsJar<SeedpodsJarStateAfterAction<State, SeedpodsJarCombineAction<ChildJar>>>,
      'combine' | 'put' | typeof SEEDPODS_SYMBOL_JAR
    > = buildJar(nextState)

    return nextJar
  }

const buildJar = <State extends SeedpodsJarState>(state: State): SeedpodsJar<State> => ({
  combine: buildCombine(state),
  put: buildPut(state),
  [SEEDPODS_SYMBOL_JAR]: { state },
})

/**
 * Creates an empty cookie jar.
 *
 * @remarks
 * Use `put` to add cookie definitions and `combine` to merge another jar. In TypeScript, each call returns a new jar type that keeps the available cookie keys aligned with the configured definitions.
 *
 * @returns An empty cookie jar with `put` and `combine` operations.
 */
export const createJar = (): SeedpodsJarBuilder<
  SeedpodsJar<SeedpodsJarEmptyState>,
  'combine' | 'put'
> => {
  const seedpodsJar: SeedpodsJarBuilder<SeedpodsJar<SeedpodsJarEmptyState>, 'combine' | 'put'> = {
    combine: buildCombine({ cookies: {} }),
    put: buildPut({ cookies: {} }),
  }

  return seedpodsJar
}

/**
 * Asserts that a value was created by {@link createJar}.
 *
 * @param value - Value to validate.
 * @throws {@link SeedpodsError} When the value is not a cookie jar created by this package.
 */
export function assertJar(value: unknown): asserts value is SeedpodsJarInterface {
  if (
    typeof value !== 'object' ||
    typeof (value as Record<string | symbol, unknown>)[SEEDPODS_SYMBOL_JAR] !== 'object'
  ) {
    throw new SeedpodsError([
      {
        actual: value,
        type: 'JarExpected',
      },
    ])
  }
}
