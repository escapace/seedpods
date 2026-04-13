import { canonicalize } from '@escapace/canonicalize'
import type { SeedpodsCookieValue, SeedpodsParsedCookieOptions } from '../types'

export const encode = (
  // eslint-disable-next-line typescript/no-explicit-any
  value: any,
  options: SeedpodsParsedCookieOptions,
): Buffer | undefined => {
  if (value === undefined) {
    return
  }

  const payload: SeedpodsCookieValue = {
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

  return Buffer.from(canonicalize(payload)!)
}
