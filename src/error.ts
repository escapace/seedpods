import type { SeedpodsErrorCause, SeedpodsErrorType } from './types'

function formatCause(cause: SeedpodsErrorCause): string {
  switch (cause.type) {
    case 'CookieExpected':
      return 'Expected a cookie.'
    case 'CookieOptionMissing':
      return `Cookie option "${cause.option}" is required.`
    case 'CookieOptionsExpectedObject':
      return 'Cookie options must be a plain object.'
    case 'CookieOptionTypeInvalid':
      return `Cookie option "${cause.option}" must be ${cause.expected}.`
    case 'CookieOptionUnknown':
      return `Unknown cookie option "${cause.option}".`
    case 'CookieOptionValueInvalid':
      return `Cookie option "${cause.option}" ${cause.reason}.`
    case 'CookiePrefixConfigurationInvalid':
      return `Cookies with the "${cause.prefix}" prefix ${cause.reason}.`
    case 'JarExpected':
      return 'Expected a cookie jar.'
  }
}

function formatMessage(causes: readonly SeedpodsErrorCause[]): string {
  if (causes.length === 0) {
    return 'Invalid seedpods input.'
  }

  return `Invalid seedpods input. ${causes.map((cause) => formatCause(cause)).join(' ')}`
}

/**
 * Error thrown for invalid cookie definitions, invalid cookie values, invalid jar values, and other rejected inputs.
 *
 * @remarks
 * The `causes` property stores machine-readable error details. Validation may report more than one cause in a single error.
 *
 * @typeParam T - Error cause type carried by the instance.
 */
export class SeedpodsError<T extends SeedpodsErrorType = SeedpodsErrorType> extends Error {
  readonly causes: readonly SeedpodsErrorCause[]
  readonly name = 'SeedpodsError' as const

  constructor(causes: ReadonlyArray<SeedpodsErrorCause<T>>) {
    super(formatMessage(causes))
    this.causes = causes
    Object.setPrototypeOf(this, SeedpodsError.prototype)
  }
}

/**
 * Checks whether a value is a {@link SeedpodsError}.
 *
 * @param value - Value to test.
 * @returns `true` when the value is a `SeedpodsError`; otherwise, `false`.
 */
export function isSeedpodsError(value: unknown): value is SeedpodsError {
  return value instanceof SeedpodsError
}

/**
 * Checks whether a {@link SeedpodsError} contains at least one cause of the given type.
 *
 * @typeParam T - Error cause type to match.
 * @param error - Error instance to inspect.
 * @param type - Error cause type to match.
 * @returns `true` when the error contains at least one matching cause; otherwise, `false`.
 */
export function isSeedpodsErrorOfType<T extends SeedpodsErrorType>(
  error: SeedpodsError,
  type: T,
): error is SeedpodsError<T> {
  return getSeedpodsErrorCausesByType(error, type).length > 0
}

/**
 * Returns the causes from a {@link SeedpodsError} that match the given type.
 *
 * @typeParam T - Error cause type to match.
 * @param error - Error instance to inspect.
 * @param type - Error cause type to match.
 * @returns All matching causes in their original order.
 */
export function getSeedpodsErrorCausesByType<T extends SeedpodsErrorType>(
  error: SeedpodsError,
  type: T,
): Array<SeedpodsErrorCause<T>> {
  return error.causes.filter((cause): cause is SeedpodsErrorCause<T> => cause.type === type)
}
