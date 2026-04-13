import {
  SEEDPODS_COOKIE_OPTION_KEY_SET,
  SEEDPODS_COOKIE_PREFIXES,
  SEEDPODS_COOKIE_SAME_SITE_VALUES,
  SEEDPODS_COOKIE_TOKEN_REGEXP,
  SEEDPODS_COOKIE_TYPES,
} from '../constants'
import { SeedpodsError } from '../error'
import type {
  SeedpodsConfiguredKey,
  SeedpodsCookieOptionsForType,
  SeedpodsCookiePrefix,
  SeedpodsCookieSameSite,
  SeedpodsCookieType,
  SeedpodsCookieValue,
  SeedpodsErrorCause,
  SeedpodsParsedCookieOptions,
  SeedpodsParsedCookieOptionsForType,
} from '../types'
import { validateCookieDomain as validateNormalizedCookieDomain } from './normalize-cookie-domain'
import { validateCookiePath as validateNormalizedCookiePath } from './normalize-cookie-path'

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

  if (!SEEDPODS_COOKIE_TOKEN_REGEXP.test(value)) {
    causes.push({
      option,
      reason: 'contains characters that are not valid in an HTTP token',
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

  const result = validateNormalizedCookieDomain(value)

  if (!result.ok) {
    causes.push(...result.causes)
    return
  }

  return result.value
}

function validateCookieBoolean(
  option: 'httpOnly' | 'partitioned' | 'secure',
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

  const result = validateNormalizedCookiePath(value)

  if (!result.ok) {
    causes.push(...result.causes)
    return
  }

  return result.value
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
  return validateCookieLiteral(
    'prefix',
    value,
    SEEDPODS_COOKIE_PREFIXES,
    '"__Secure-" or "__Host-"',
    causes,
  )
}

function validateCookieSameSite(
  value: unknown,
  causes: SeedpodsErrorCause[],
): SeedpodsCookieSameSite | undefined {
  return validateCookieLiteral(
    'sameSite',
    value,
    SEEDPODS_COOKIE_SAME_SITE_VALUES,
    '"Strict", "Lax", or "None"',
    causes,
  )
}

function inferCookiePrefixFromName(value: string): SeedpodsCookiePrefix | undefined {
  const normalized = value.toLowerCase()

  if (normalized.startsWith('__host-')) {
    return '__Host-'
  }

  if (normalized.startsWith('__secure-')) {
    return '__Secure-'
  }

  return
}

function validatePrefixedCookieName(
  value: string,
  options: Pick<SeedpodsParsedCookieOptions, 'domain' | 'path' | 'secure'>,
  causes: SeedpodsErrorCause[],
): void {
  const prefix = inferCookiePrefixFromName(value)

  if (prefix === undefined) {
    return
  }

  if (options.secure !== true) {
    causes.push({
      prefix,
      reason: 'must set "secure" to true',
      type: 'CookiePrefixConfigurationInvalid',
    })
  }

  if (prefix === '__Host-') {
    if (options.domain !== undefined) {
      causes.push({
        prefix,
        reason: 'must not set "domain"',
        type: 'CookiePrefixConfigurationInvalid',
      })
    }

    if (options.path !== '/') {
      causes.push({
        prefix,
        reason: 'must set "path" to "/"',
        type: 'CookiePrefixConfigurationInvalid',
      })
    }
  }
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

  return validateCookieLiteral('type', value, SEEDPODS_COOKIE_TYPES, '"aes-gcm" or "hmac"', causes)
}

function validateCookieKeys(
  value: unknown,
  cookieType: SeedpodsCookieType | undefined,
  causes: SeedpodsErrorCause[],
): SeedpodsConfiguredKey[] | undefined {
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
      expected: 'an array of { id, value } objects',
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

  const result: SeedpodsConfiguredKey[] = []
  const ids = new Set<string>()

  for (const [index, entry] of value.entries()) {
    const option = `keys[${index}]`

    if (!isRecord(entry)) {
      causes.push({
        actual: entry,
        expected: 'an object with "id" and "value"',
        option,
        type: 'CookieOptionTypeInvalid',
      })
      continue
    }

    const idOption = `${option}.id`
    const valueOption = `${option}.value`

    if (typeof entry.id !== 'string') {
      causes.push({
        actual: entry.id,
        expected: 'a string',
        option: idOption,
        type: 'CookieOptionTypeInvalid',
      })
      continue
    }

    if (entry.id.length === 0) {
      causes.push({
        option: idOption,
        reason: 'must not be empty',
        type: 'CookieOptionValueInvalid',
      })
      continue
    }

    if (ids.has(entry.id)) {
      causes.push({
        option: idOption,
        reason: 'must be unique within one cookie definition',
        type: 'CookieOptionValueInvalid',
      })
      continue
    }

    if (!Buffer.isBuffer(entry.value)) {
      causes.push({
        actual: entry.value,
        expected: 'a Buffer',
        option: valueOption,
        type: 'CookieOptionTypeInvalid',
      })
      continue
    }

    if (cookieType === 'aes-gcm' && entry.value.byteLength !== 32) {
      causes.push({
        option: valueOption,
        reason: 'must be exactly 32 bytes (256 bits)',
        type: 'CookieOptionValueInvalid',
      })
      continue
    }

    ids.add(entry.id)
    result.push({ id: entry.id, value: entry.value })
  }

  return result
}

function parseCookieValueOptions(value: unknown): SeedpodsCookieValue['options'] | undefined {
  if (!isRecord(value)) {
    return
  }

  if (
    typeof value.key !== 'string' ||
    value.key.length === 0 ||
    !SEEDPODS_COOKIE_TOKEN_REGEXP.test(value.key)
  ) {
    return
  }

  if (typeof value.policy !== 'string' || value.policy.length === 0) {
    return
  }

  return {
    key: value.key,
    policy: value.policy,
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
    if (!SEEDPODS_COOKIE_OPTION_KEY_SET.has(option)) {
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
  const cookiePartitioned = validateCookieBoolean('partitioned', value.partitioned, causes)
  const cookiePath = validateCookiePath(value.path, causes)
  const cookiePrefix = validateCookiePrefix(value.prefix, causes)
  const cookieSameSite = validateCookieSameSite(value.sameSite, causes)
  const cookieSecure = validateCookieBoolean('secure', value.secure, causes)

  if (cookiePartitioned === true && cookieSecure !== true) {
    causes.push({
      option: 'partitioned',
      reason: 'must not be true unless "secure" is true',
      type: 'CookieOptionValueInvalid',
    })
  }

  if (cookieSameSite === 'None' && cookieSecure !== true) {
    causes.push({
      option: 'sameSite',
      reason: 'must not be "None" unless "secure" is true',
      type: 'CookieOptionValueInvalid',
    })
  }

  const effectiveCookieName =
    cookieKey === undefined
      ? undefined
      : cookiePrefix === undefined
        ? (cookieName ?? cookieKey)
        : `${cookiePrefix}${cookieName ?? cookieKey}`

  if (effectiveCookieName !== undefined) {
    validatePrefixedCookieName(
      effectiveCookieName,
      {
        domain: cookieDomain,
        path: cookiePath,
        secure: cookieSecure,
      },
      causes,
    )
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
    name: effectiveCookieName!,
    ...(cookiePartitioned === true ? { partitioned: true } : {}),
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
