import { SeedpodsError, type SeedpodsErrorCause } from '../error'

const COOKIE_TOKEN_REGEXP = /^(?=[\x20-\x7E]*$)[^\s"(),:;<=>?@[\\\]{}]+$/
const COOKIE_OPTION_KEYS = [
  'domain',
  'httpOnly',
  'key',
  'keys',
  'maxAge',
  'name',
  'path',
  'prefix',
  'sameSite',
  'secure',
  'type',
] as const
const COOKIE_OPTION_KEY_SET = new Set<string>(COOKIE_OPTION_KEYS)
const COOKIE_PREFIXES = ['__Secure-', '__Host-'] as const
const COOKIE_SAME_SITE_VALUES = ['Strict', 'Lax', 'None'] as const
const COOKIE_TYPES = ['aes-gcm', 'hmac'] as const

export type SeedpodsCookiePrefix = (typeof COOKIE_PREFIXES)[number]
export type SeedpodsCookieSameSite = (typeof COOKIE_SAME_SITE_VALUES)[number]
export type SeedpodsCookieType = (typeof COOKIE_TYPES)[number]

interface SeedpodsCookieValueOptions {
  key: string
  maxAge?: number
}

export interface SeedpodsCookieValue {
  options: SeedpodsCookieValueOptions
  value: unknown
}

export interface SeedpodsCookieOptionsBase<SeedpodsCookieKey extends string = string> {
  key: SeedpodsCookieKey
  domain?: string
  httpOnly?: boolean
  maxAge?: number
  name?: string
  path?: string
  prefix?: SeedpodsCookiePrefix
  sameSite?: SeedpodsCookieSameSite
  secure?: boolean
}

export interface SeedpodsEncryptedCookieOptions<
  SeedpodsCookieKey extends string = string,
> extends SeedpodsCookieOptionsBase<SeedpodsCookieKey> {
  keys: Buffer[]
  type: 'aes-gcm'
}

export interface SeedpodsSignedCookieOptions<
  SeedpodsCookieKey extends string = string,
> extends SeedpodsCookieOptionsBase<SeedpodsCookieKey> {
  keys: Buffer[]
  type: 'hmac'
}

export type SeedpodsCookieOptions<SeedpodsCookieKey extends string = string> =
  | SeedpodsEncryptedCookieOptions<SeedpodsCookieKey>
  | SeedpodsSignedCookieOptions<SeedpodsCookieKey>

interface SeedpodsParsedCookieOptionsBase<SeedpodsCookieKey extends string = string> extends Omit<
  SeedpodsCookieOptionsBase<SeedpodsCookieKey>,
  'name'
> {
  name: string
}

export interface SeedpodsParsedEncryptedCookieOptions<
  SeedpodsCookieKey extends string = string,
> extends SeedpodsParsedCookieOptionsBase<SeedpodsCookieKey> {
  keys: Buffer[]
  type: 'aes-gcm'
}

export interface SeedpodsParsedSignedCookieOptions<
  SeedpodsCookieKey extends string = string,
> extends SeedpodsParsedCookieOptionsBase<SeedpodsCookieKey> {
  keys: Buffer[]
  type: 'hmac'
}

export type SeedpodsParsedCookieOptions<SeedpodsCookieKey extends string = string> =
  | SeedpodsParsedEncryptedCookieOptions<SeedpodsCookieKey>
  | SeedpodsParsedSignedCookieOptions<SeedpodsCookieKey>

export type SeedpodsCookieOptionsForType<
  SeedpodsCookieKey extends string = string,
  SeedpodsCookieKind extends SeedpodsCookieType = SeedpodsCookieType,
> = Extract<SeedpodsCookieOptions<SeedpodsCookieKey>, { type: SeedpodsCookieKind }>

export type SeedpodsParsedCookieOptionsForType<
  SeedpodsCookieKey extends string = string,
  SeedpodsCookieKind extends SeedpodsCookieType = SeedpodsCookieType,
> = Extract<SeedpodsParsedCookieOptions<SeedpodsCookieKey>, { type: SeedpodsCookieKind }>

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function validateCookieToken(
  option: 'key' | 'name',
  value: unknown,
  causes: SeedpodsErrorCause[],
): string | undefined {
  if (typeof value !== 'string') {
    causes.push({
      actual: value,
      expected: 'a string',
      option,
      type: 'CookieOptionTypeInvalid',
    })
    return
  }

  if (value.length === 0) {
    causes.push({
      option,
      reason: 'must not be empty',
      type: 'CookieOptionValueInvalid',
    })
    return
  }

  if (!COOKIE_TOKEN_REGEXP.test(value)) {
    causes.push({
      option,
      reason: 'contains characters that are not valid in a cookie token',
      type: 'CookieOptionValueInvalid',
    })
    return
  }

  if (option === 'name' && COOKIE_PREFIXES.some((prefix) => value.startsWith(prefix))) {
    causes.push({
      option,
      reason: 'must not start with the reserved "__Secure-" or "__Host-" prefixes',
      type: 'CookieOptionValueInvalid',
    })
    return
  }

  return value
}

function validateCookieDomain(value: unknown, causes: SeedpodsErrorCause[]): string | undefined {
  if (value === undefined) {
    return
  }

  if (typeof value !== 'string') {
    causes.push({
      actual: value,
      expected: 'a string',
      option: 'domain',
      type: 'CookieOptionTypeInvalid',
    })
    return
  }

  if (value.length === 0) {
    causes.push({
      option: 'domain',
      reason: 'must not be empty',
      type: 'CookieOptionValueInvalid',
    })
    return
  }

  const firstCharacter = value.charAt(0)
  const lastCharacter = value.charAt(value.length - 1)

  if (firstCharacter === '-' || lastCharacter === '.' || lastCharacter === '-') {
    causes.push({
      option: 'domain',
      reason: 'must not start with "-" or end with "." or "-"',
      type: 'CookieOptionValueInvalid',
    })
    return
  }

  return value
}

function validateCookieBoolean(
  option: 'httpOnly' | 'secure',
  value: unknown,
  causes: SeedpodsErrorCause[],
): boolean | undefined {
  if (value === undefined) {
    return
  }

  if (typeof value !== 'boolean') {
    causes.push({
      actual: value,
      expected: 'a boolean',
      option,
      type: 'CookieOptionTypeInvalid',
    })
    return
  }

  return value
}

function validateCookieMaxAge(value: unknown, causes: SeedpodsErrorCause[]): number | undefined {
  if (value === undefined) {
    return
  }

  if (typeof value !== 'number' || Number.isNaN(value)) {
    causes.push({
      actual: value,
      expected: 'a finite number',
      option: 'maxAge',
      type: 'CookieOptionTypeInvalid',
    })
    return
  }

  if (!Number.isInteger(value)) {
    causes.push({
      option: 'maxAge',
      reason: 'must be an integer',
      type: 'CookieOptionValueInvalid',
    })
    return
  }

  if (value < 0) {
    causes.push({
      option: 'maxAge',
      reason: 'must be greater than or equal to 0',
      type: 'CookieOptionValueInvalid',
    })
    return
  }

  return value
}

function validateCookiePath(value: unknown, causes: SeedpodsErrorCause[]): string | undefined {
  if (value === undefined) {
    return
  }

  if (typeof value !== 'string') {
    causes.push({
      actual: value,
      expected: 'a string',
      option: 'path',
      type: 'CookieOptionTypeInvalid',
    })
    return
  }

  if (value.length === 0) {
    causes.push({
      option: 'path',
      reason: 'must not be empty',
      type: 'CookieOptionValueInvalid',
    })
    return
  }

  for (let index = 0; index < value.length; index++) {
    const code = value.charCodeAt(index)

    if (code < 0x20 || code > 0x7e || value.charAt(index) === ';') {
      causes.push({
        option: 'path',
        reason: 'contains characters outside the visible ASCII range or the ";" separator',
        type: 'CookieOptionValueInvalid',
      })
      return
    }
  }

  return value
}

function validateCookieLiteral<Value extends string>(
  option: string,
  value: unknown,
  allowedValues: readonly Value[],
  expectedDescription: string,
  causes: SeedpodsErrorCause[],
): Value | undefined {
  if (value === undefined) {
    return
  }

  if (typeof value !== 'string') {
    causes.push({
      actual: value,
      expected: expectedDescription,
      option,
      type: 'CookieOptionTypeInvalid',
    })
    return
  }

  if (!allowedValues.includes(value as Value)) {
    causes.push({
      option,
      reason: `must be ${expectedDescription}`,
      type: 'CookieOptionValueInvalid',
    })
    return
  }

  return value as Value
}

function validateCookiePrefix(
  value: unknown,
  causes: SeedpodsErrorCause[],
): SeedpodsCookiePrefix | undefined {
  return validateCookieLiteral('prefix', value, COOKIE_PREFIXES, '"__Secure-" or "__Host-"', causes)
}

function validateCookieSameSite(
  value: unknown,
  causes: SeedpodsErrorCause[],
): SeedpodsCookieSameSite | undefined {
  return validateCookieLiteral(
    'sameSite',
    value,
    COOKIE_SAME_SITE_VALUES,
    '"Strict", "Lax", or "None"',
    causes,
  )
}

function validateCookieType(
  value: unknown,
  causes: SeedpodsErrorCause[],
): SeedpodsCookieType | undefined {
  if (value === undefined) {
    causes.push({
      option: 'type',
      type: 'CookieOptionMissing',
    })
    return
  }

  return validateCookieLiteral('type', value, COOKIE_TYPES, '"aes-gcm" or "hmac"', causes)
}

function validateCookieKeys(
  value: unknown,
  cookieType: SeedpodsCookieType | undefined,
  causes: SeedpodsErrorCause[],
): Buffer[] | undefined {
  if (value === undefined) {
    causes.push({
      option: 'keys',
      type: 'CookieOptionMissing',
    })
    return
  }

  if (!Array.isArray(value)) {
    causes.push({
      actual: value,
      expected: 'an array of Buffer values',
      option: 'keys',
      type: 'CookieOptionTypeInvalid',
    })
    return
  }

  if (value.length === 0) {
    causes.push({
      option: 'keys',
      reason: 'must contain at least one key',
      type: 'CookieOptionValueInvalid',
    })
  }

  if (value.length > 5) {
    causes.push({
      option: 'keys',
      reason: 'must contain at most 5 keys',
      type: 'CookieOptionValueInvalid',
    })
  }

  for (const [index, entry] of value.entries()) {
    const option = `keys[${index}]`

    if (!Buffer.isBuffer(entry)) {
      causes.push({
        actual: entry,
        expected: 'a Buffer',
        option,
        type: 'CookieOptionTypeInvalid',
      })
      continue
    }

    if (cookieType === 'aes-gcm' && entry.byteLength !== 32) {
      causes.push({
        option,
        reason: 'must be exactly 32 bytes (256 bits)',
        type: 'CookieOptionValueInvalid',
      })
    }
  }

  return value.filter((entry): entry is Buffer => Buffer.isBuffer(entry))
}

function parseCookieValueOptions(value: unknown): SeedpodsCookieValue['options'] | undefined {
  if (!isRecord(value)) {
    return
  }

  if (
    typeof value.key !== 'string' ||
    value.key.length === 0 ||
    !COOKIE_TOKEN_REGEXP.test(value.key)
  ) {
    return
  }

  if (value.maxAge !== undefined) {
    if (typeof value.maxAge !== 'number' || Number.isNaN(value.maxAge)) {
      return
    }

    if (!Number.isInteger(value.maxAge) || value.maxAge < 0) {
      return
    }
  }

  return {
    ...(value.maxAge === undefined ? {} : { maxAge: value.maxAge }),
    key: value.key,
  }
}

export function parseCookieValue(value: unknown): SeedpodsCookieValue | undefined {
  if (!isRecord(value) || !Object.hasOwn(value, 'value')) {
    return
  }

  const options = parseCookieValueOptions(value.options)

  if (options === undefined) {
    return
  }

  return {
    options,
    value: value.value,
  }
}

export const parseCookieOptions = <
  SeedpodsCookieKey extends string,
  SeedpodsCookieKind extends SeedpodsCookieType,
>(
  value: SeedpodsCookieOptionsForType<SeedpodsCookieKey, SeedpodsCookieKind>,
): SeedpodsParsedCookieOptionsForType<SeedpodsCookieKey, SeedpodsCookieKind> => {
  const causes: SeedpodsErrorCause[] = []

  if (!isRecord(value)) {
    throw new SeedpodsError([
      {
        actual: value,
        type: 'CookieOptionsExpectedObject',
      },
    ])
  }

  for (const option of Object.keys(value)) {
    if (!COOKIE_OPTION_KEY_SET.has(option)) {
      causes.push({
        option,
        type: 'CookieOptionUnknown',
      })
    }
  }

  const cookieType = validateCookieType(value.type, causes)
  const cookieKey =
    value.key === undefined
      ? (causes.push({ option: 'key', type: 'CookieOptionMissing' }), undefined)
      : validateCookieToken('key', value.key, causes)
  const cookieName =
    value.name === undefined ? undefined : validateCookieToken('name', value.name, causes)
  const cookieDomain = validateCookieDomain(value.domain, causes)
  const cookieHttpOnly = validateCookieBoolean('httpOnly', value.httpOnly, causes)
  const cookieKeys = validateCookieKeys(value.keys, cookieType, causes)
  const cookieMaxAge = validateCookieMaxAge(value.maxAge, causes)
  const cookiePath = validateCookiePath(value.path, causes)
  const cookiePrefix = validateCookiePrefix(value.prefix, causes)
  const cookieSameSite = validateCookieSameSite(value.sameSite, causes)
  const cookieSecure = validateCookieBoolean('secure', value.secure, causes)

  if (cookiePrefix === '__Secure-' && cookieSecure !== true) {
    causes.push({
      prefix: cookiePrefix,
      reason: 'must set "secure" to true',
      type: 'CookiePrefixConfigurationInvalid',
    })
  }

  if (cookiePrefix === '__Host-') {
    if (cookieSecure !== true) {
      causes.push({
        prefix: cookiePrefix,
        reason: 'must set "secure" to true',
        type: 'CookiePrefixConfigurationInvalid',
      })
    }

    if (cookieDomain !== undefined) {
      causes.push({
        prefix: cookiePrefix,
        reason: 'must not set "domain"',
        type: 'CookiePrefixConfigurationInvalid',
      })
    }

    if (cookiePath !== '/') {
      causes.push({
        prefix: cookiePrefix,
        reason: 'must set "path" to "/"',
        type: 'CookiePrefixConfigurationInvalid',
      })
    }
  }

  if (
    causes.length > 0 ||
    cookieKey === undefined ||
    cookieKeys === undefined ||
    cookieType === undefined
  ) {
    throw new SeedpodsError(causes)
  }

  const parsedCookieOptions: SeedpodsParsedCookieOptions<SeedpodsCookieKey> = {
    ...(cookieDomain === undefined ? {} : { domain: cookieDomain }),
    ...(cookieHttpOnly === undefined ? {} : { httpOnly: cookieHttpOnly }),
    key: cookieKey as SeedpodsCookieKey,
    keys: cookieKeys,
    ...(cookieMaxAge === undefined ? {} : { maxAge: cookieMaxAge }),
    name:
      cookiePrefix === undefined
        ? (cookieName ?? cookieKey)
        : `${cookiePrefix}${cookieName ?? cookieKey}`,
    ...(cookiePath === undefined ? {} : { path: cookiePath }),
    ...(cookiePrefix === undefined ? {} : { prefix: cookiePrefix }),
    ...(cookieSameSite === undefined ? {} : { sameSite: cookieSameSite }),
    ...(cookieSecure === undefined ? {} : { secure: cookieSecure }),
    type: cookieType,
  }

  return parsedCookieOptions as SeedpodsParsedCookieOptionsForType<
    SeedpodsCookieKey,
    SeedpodsCookieKind
  >
}
