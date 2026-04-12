export const SEEDPODS_ERROR_TYPES = [
  'CookieOptionMissing',
  'CookieOptionTypeInvalid',
  'CookieOptionUnknown',
  'CookieOptionValueInvalid',
  'CookieOptionsExpectedObject',
  'CookiePrefixConfigurationInvalid',
] as const

export type SeedpodsErrorType = (typeof SEEDPODS_ERROR_TYPES)[number]

export interface SeedpodsErrorMetadata {
  CookieOptionMissing: { option: string }
  CookieOptionsExpectedObject: { actual: unknown }
  CookieOptionTypeInvalid: { actual: unknown; expected: string; option: string }
  CookieOptionUnknown: { option: string }
  CookieOptionValueInvalid: { option: string; reason: string }
  CookiePrefixConfigurationInvalid: { prefix: '__Host-' | '__Secure-'; reason: string }
}

export type SeedpodsErrorCause<T extends SeedpodsErrorType = SeedpodsErrorType> =
  T extends SeedpodsErrorType ? { type: T } & SeedpodsErrorMetadata[T] : never

function describeValue(value: unknown): string {
  if (value === null) {
    return 'null'
  }

  if (Array.isArray(value)) {
    return 'an array'
  }

  if (Buffer.isBuffer(value)) {
    return 'a Buffer'
  }

  switch (typeof value) {
    case 'bigint':
    case 'boolean':
    case 'number':
      return JSON.stringify(value)
    case 'function':
      return 'a function'
    case 'object':
      return 'an object'
    case 'string':
      return JSON.stringify(value)
    case 'symbol':
      return value.toString()
    case 'undefined':
      return 'undefined'
  }

  return 'an unknown value'
}

function formatCause(cause: SeedpodsErrorCause): string {
  switch (cause.type) {
    case 'CookieOptionMissing':
      return `Cookie option "${cause.option}" is required.`
    case 'CookieOptionsExpectedObject':
      return `Cookie options must be a plain object. Received ${describeValue(cause.actual)}.`
    case 'CookieOptionTypeInvalid':
      return `Cookie option "${cause.option}" must be ${cause.expected}. Received ${describeValue(cause.actual)}.`
    case 'CookieOptionUnknown':
      return `Unknown cookie option "${cause.option}".`
    case 'CookieOptionValueInvalid':
      return `Cookie option "${cause.option}" ${cause.reason}.`
    case 'CookiePrefixConfigurationInvalid':
      return `Cookies with the "${cause.prefix}" prefix ${cause.reason}.`
  }
}

function formatMessage(causes: readonly SeedpodsErrorCause[]): string {
  if (causes.length === 0) {
    return 'Invalid seedpods input.'
  }

  return `Invalid seedpods input. ${causes.map((cause) => formatCause(cause)).join(' ')}`
}

export class SeedpodsError<T extends SeedpodsErrorType = SeedpodsErrorType> extends Error {
  readonly causes: readonly SeedpodsErrorCause[]
  readonly name = 'SeedpodsError' as const

  constructor(causes: ReadonlyArray<SeedpodsErrorCause<T>>) {
    super(formatMessage(causes))
    this.causes = causes
    Object.setPrototypeOf(this, SeedpodsError.prototype)
  }
}

export function isSeedpodsError(value: unknown): value is SeedpodsError {
  return value instanceof SeedpodsError
}

export function isSeedpodsErrorOfType<T extends SeedpodsErrorType>(
  error: SeedpodsError,
  type: T,
): error is SeedpodsError<T> {
  return getSeedpodsErrorCausesOfType(error, type).length > 0
}

export function getSeedpodsErrorCausesOfType<T extends SeedpodsErrorType>(
  error: SeedpodsError,
  type: T,
): Array<SeedpodsErrorCause<T>> {
  return error.causes.filter((cause): cause is SeedpodsErrorCause<T> => cause.type === type)
}
