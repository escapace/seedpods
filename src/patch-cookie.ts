import { createPatch } from '@escapace/reconcile'
import { assertCookie } from './create-cookie'
import { SEEDPODS_SYMBOL_COOKIE } from './constants'
import type {
  SeedpodsCookie,
  SeedpodsCookieRuntimeDraft,
  SeedpodsCookieRuntimeOptions,
  SeedpodsCookieType,
} from './types'
import { parseCookieOptions } from './utilities/parse-cookie-options'
import { canonicalizePolicy } from './utilities/canonicalize-policy'

const readCookieRuntimeOptions = (
  runtime: SeedpodsCookieRuntimeOptions,
): SeedpodsCookieRuntimeOptions => ({
  ...(runtime.httpOnly === undefined ? {} : { httpOnly: runtime.httpOnly }),
  keys: runtime.keys,
  ...(runtime.maxAge === undefined ? {} : { maxAge: runtime.maxAge }),
  ...(runtime.partitioned === undefined ? {} : { partitioned: runtime.partitioned }),
  ...(runtime.sameSite === undefined ? {} : { sameSite: runtime.sameSite }),
  ...(runtime.secure === undefined ? {} : { secure: runtime.secure }),
})

/**
 * Updates the hot-patchable runtime fields of an existing cookie definition.
 *
 * @remarks
 * This function can rotate configured keys and update `maxAge`, `httpOnly`, `sameSite`, `secure`, and `partitioned` without recreating the cookie definition. It does not change cookie identity or browser scope fields such as `key`, `type`, `name`, `prefix`, `domain`, or `path`.
 *
 * The update is committed before the function returns. Later requests observe the new runtime immediately. Existing {@link useCookies} instances keep the request-local configuration they captured when they were created.
 *
 * Scope follows the cookie object returned by {@link createCookie}. When the same cookie object is reused across multiple jars, one call updates all jars that reference it. When validation fails, the function throws and leaves the previous runtime unchanged.
 *
 * @typeParam T - Application key used to address the cookie through the cookie interface.
 * @typeParam U - Cookie protection mode.
 * @typeParam V - Application value stored in the cookie.
 * @param cookie - Cookie definition created by {@link createCookie}.
 * @param recipe - Callback that mutates the runtime draft before the next configuration is validated and committed.
 * @throws {@link SeedpodsError} When `cookie` was not created by this package or when the patched runtime options are invalid.
 */
export const patchCookie = <T extends string, U extends SeedpodsCookieType, V>(
  cookie: SeedpodsCookie<T, U, V>,
  recipe: (draft: SeedpodsCookieRuntimeDraft) => void,
): void => {
  assertCookie(cookie)

  const assertedCookie = cookie as SeedpodsCookie<string, SeedpodsCookieType, unknown>
  const currentSnapshot = assertedCookie[SEEDPODS_SYMBOL_COOKIE].readSnapshot()
  const currentRuntime = readCookieRuntimeOptions(currentSnapshot.options)
  const nextRuntime = createPatch(currentRuntime, (draft) => {
    recipe(draft)
    return draft
  })
  const nextOptionsInput: Parameters<typeof parseCookieOptions>[0] = {
    ...assertedCookie[SEEDPODS_SYMBOL_COOKIE].staticInputOptions,
    ...nextRuntime,
  }
  const nextOptions = parseCookieOptions(nextOptionsInput)

  assertedCookie[SEEDPODS_SYMBOL_COOKIE].publishSnapshot({
    options: nextOptions,
    policyCanonical: canonicalizePolicy(nextOptions),
  })
}
