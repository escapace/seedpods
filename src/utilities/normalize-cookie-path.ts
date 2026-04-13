import type { SeedpodsErrorCause } from '../types'

type CookiePathValidationResult =
  | { causes: Array<SeedpodsErrorCause<'CookieOptionValueInvalid'>>; ok: false }
  | { ok: true; value: string }

function createPathErrorCause(reason: string): SeedpodsErrorCause<'CookieOptionValueInvalid'> {
  return {
    option: 'path',
    reason,
    type: 'CookieOptionValueInvalid',
  }
}

function invalidPath(reason: string): CookiePathValidationResult {
  return { causes: [createPathErrorCause(reason)], ok: false }
}

export function validateCookiePath(path: string): CookiePathValidationResult {
  if (path.length === 0) {
    return invalidPath('must not be empty')
  }

  if (!path.startsWith('/')) {
    return invalidPath('must start with "/"')
  }

  for (let index = 0; index < path.length; index++) {
    const code = path.charCodeAt(index)

    if (code < 0x20 || code > 0x7e || path.charAt(index) === ';') {
      return invalidPath('contains characters outside RFC6265bis path-value')
    }
  }

  return { ok: true, value: path }
}
