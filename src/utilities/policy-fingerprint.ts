import { canonicalize } from '@escapace/canonicalize'
import type { SeedpodsParsedCookieOptions } from '../types'
import { bytesToBase64Url, utf8ToBytes } from './bytes'

type SeedpodsCookiePolicyOptions = Pick<
  SeedpodsParsedCookieOptions,
  'httpOnly' | 'maxAge' | 'partitioned' | 'sameSite' | 'secure'
>

export const policyFingerprint = async (options: SeedpodsCookiePolicyOptions): Promise<string> => {
  const normalized = {
    ...(options.httpOnly === true ? { httpOnly: true } : {}),
    ...(options.maxAge === undefined ? {} : { maxAge: options.maxAge }),
    ...(options.partitioned === true ? { partitioned: true } : {}),
    ...(options.sameSite === undefined ? {} : { sameSite: options.sameSite }),
    ...(options.secure === true ? { secure: true } : {}),
  }

  const digest = new Uint8Array(
    await crypto.subtle.digest('SHA-256', utf8ToBytes(canonicalize(normalized)!)),
  )

  return bytesToBase64Url(digest)
}
