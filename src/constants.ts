import { SeedpodsCookieStateType } from './types'

export const SEEDPODS_COOKIE_EXPIRES_AT_UNIX_EPOCH = 'Thu, 01 Jan 1970 00:00:00 GMT'

export const SEEDPODS_COOKIE_OPTION_KEY_SET = new Set<string>([
  'domain',
  'httpOnly',
  'key',
  'keys',
  'maxAge',
  'name',
  'partitioned',
  'path',
  'prefix',
  'sameSite',
  'secure',
  'type',
])

export const SEEDPODS_COOKIE_PREFIXES = ['__Secure-', '__Host-'] as const
export const SEEDPODS_COOKIE_SAME_SITE_VALUES = ['Strict', 'Lax', 'None'] as const
export const SEEDPODS_COOKIE_TOKEN_REGEXP = /^[!#$%&'*+\-.^`|~\w]+$/
export const SEEDPODS_COOKIE_TYPES = ['aes-gcm', 'hmac'] as const
export const SEEDPODS_ERROR_TYPES = [
  'CookieExpected',
  'CookieOptionMissing',
  'CookieOptionTypeInvalid',
  'CookieOptionUnknown',
  'CookieOptionValueInvalid',
  'CookieOptionsExpectedObject',
  'CookiePrefixConfigurationInvalid',
  'JarExpected',
] as const

export const SEEDPODS_COOKIE_STATE_PRIORITY_ORDER = [
  SeedpodsCookieStateType.Set,
  SeedpodsCookieStateType.SetButNeedsUpdate,
  SeedpodsCookieStateType.Unset,
  SeedpodsCookieStateType.Expired,
  SeedpodsCookieStateType.Indecipherable,
] as const satisfies readonly SeedpodsCookieStateType[]

export const SEEDPODS_SYMBOL_COOKIE = Symbol.for('seedpods/cookie')
export const SEEDPODS_SYMBOL_JAR = Symbol.for('seedpods/jar')
