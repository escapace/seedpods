import { canonicalize } from '@escapace/canonicalize'
import type { SeedpodsParsedCookieOptions } from '../types'

type SeedpodsCookiePolicyOptions = Pick<
  SeedpodsParsedCookieOptions,
  'httpOnly' | 'maxAge' | 'sameSite' | 'secure'
>

export const policyFingerprint = async (options: SeedpodsCookiePolicyOptions): Promise<string> => {
  const normalized = {
    ...(options.httpOnly === true ? { httpOnly: true } : {}),
    ...(options.maxAge === undefined ? {} : { maxAge: options.maxAge }),
    ...(options.sameSite === undefined ? {} : { sameSite: options.sameSite }),
    ...(options.secure === true ? { secure: true } : {}),
  }

  const digest = Buffer.from(
    await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonicalize(normalized))),
  )

  return digest.toString('base64url')
}
