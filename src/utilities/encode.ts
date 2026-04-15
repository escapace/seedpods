import { canonicalize } from '@escapace/canonicalize'
import type { SeedpodsCookieValue, SeedpodsParsedCookieOptions } from '../types'
import { utf8ToBytes } from './bytes'

export const encode = (
  // eslint-disable-next-line typescript/no-explicit-any
  value: any,
  options: SeedpodsParsedCookieOptions,
  policy: string,
): Uint8Array | undefined => {
  if (value === undefined) {
    return
  }

  const payload: SeedpodsCookieValue = {
    options: {
      key: options.key,
      policy,
      // path: options.path,
      // domain: options.domain,
      // secure: options.secure,
      // httpOnly: options.httpOnly,
      // sameSite: options.sameSite,
    },
    value,
  }

  // canonicalize returns undefined only for non-serializable top-level values (e.g. bare
  // functions or Symbols). payload is always a plain SeedpodsCookieValue object, so this
  // branch is unreachable through normal usage; the guard keeps the code safe if the
  // upstream library's behavior ever changes.
  const canonical = canonicalize(payload)

  if (canonical === undefined) {
    return
  }

  return utf8ToBytes(canonical)
}
