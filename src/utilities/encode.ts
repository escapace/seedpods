import { canonicalize } from '@escapace/canonicalize'
import type { CookieOptionsParsed, CookieType, CookieValueInput } from './parse-cookie-options'

export const encode = (
  // eslint-disable-next-line typescript/no-explicit-any
  value: any,
  options: CookieOptionsParsed<string, CookieType, unknown>,
): Buffer | undefined => {
  if (value === undefined) {
    return
  }

  const payload: CookieValueInput = {
    options: {
      key: options.key,
      // path: options.path,
      // domain: options.domain,
      // secure: options.secure,
      // httpOnly: options.httpOnly,
      // sameSite: options.sameSite,
      maxAge: options.maxAge,
    },
    value,
  }

  return Buffer.from(canonicalize(payload))
}
