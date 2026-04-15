import { canonicalize } from '@escapace/canonicalize'
import type { SeedpodsParsedCookieOptions } from '../types'

type SeedpodsCookiePolicyOptions = Pick<
  SeedpodsParsedCookieOptions,
  'httpOnly' | 'maxAge' | 'partitioned' | 'sameSite' | 'secure'
>

export const canonicalizePolicy = (options: SeedpodsCookiePolicyOptions): string => {
  const normalized = {
    ...(options.httpOnly === true ? { httpOnly: true } : {}),
    ...(options.maxAge === undefined ? {} : { maxAge: options.maxAge }),
    ...(options.partitioned === true ? { partitioned: true } : {}),
    ...(options.sameSite === undefined ? {} : { sameSite: options.sameSite }),
    ...(options.secure === true ? { secure: true } : {}),
  }

  const canonical = canonicalize(normalized)

  if (canonical === undefined) {
    throw new TypeError('canonicalize returned undefined for a known-serializable policy object')
  }

  return canonical
}
