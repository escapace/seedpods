import { assert, describe, it } from 'vitest'
import { SeedpodsError, getSeedpodsErrorCausesByType } from '../error'
import type { SeedpodsErrorCause } from '../types'
import { parseCookieOptions, parseCookieValue } from './parse-cookie-options'
import { policyFingerprint } from './policy-fingerprint'

const aesKey = Buffer.alloc(32, 1)
const hmacKey = Buffer.from('hmac-key')

function expectSeedpodsError(value: unknown): SeedpodsError {
  try {
    parseCookieOptions(value as never)
    assert.fail('Expected parseCookieOptions to throw.')
  } catch (error) {
    assert.instanceOf(error, SeedpodsError)
    return error
  }
}

function findCause<T extends SeedpodsErrorCause['type']>(
  error: SeedpodsError,
  type: T,
  predicate: (cause: SeedpodsErrorCause<T>) => boolean,
): SeedpodsErrorCause<T> | undefined {
  return getSeedpodsErrorCausesByType(error, type).find((cause) => predicate(cause))
}

function assertHasCause<T extends SeedpodsErrorCause['type']>(
  error: SeedpodsError,
  type: T,
  predicate: (cause: SeedpodsErrorCause<T>) => boolean,
): void {
  assert.isDefined(findCause(error, type, predicate))
}

describe('parse-cookie-options', () => {
  it('parses minimal hmac options and defaults the cookie name to the key', () => {
    assert.deepEqual(
      parseCookieOptions({
        key: 'session',
        keys: [hmacKey],
        type: 'hmac',
      }),
      {
        key: 'session',
        keys: [hmacKey],
        name: 'session',
        type: 'hmac',
      },
    )
  })

  it('prefixes the derived cookie name and preserves optional attributes', () => {
    assert.deepEqual(
      parseCookieOptions({
        domain: 'example.com',
        httpOnly: true,
        key: 'session',
        keys: [aesKey],
        maxAge: 3600,
        name: 'custom',
        path: '/app',
        prefix: '__Secure-',
        sameSite: 'Strict',
        secure: true,
        type: 'aes-gcm',
      }),
      {
        domain: 'example.com',
        httpOnly: true,
        key: 'session',
        keys: [aesKey],
        maxAge: 3600,
        name: '__Secure-custom',
        path: '/app',
        prefix: '__Secure-',
        sameSite: 'Strict',
        secure: true,
        type: 'aes-gcm',
      },
    )
  })

  it('derives a host-prefixed name from the key when name is omitted', () => {
    assert.equal(
      parseCookieOptions({
        key: 'session',
        keys: [hmacKey],
        path: '/',
        prefix: '__Host-',
        secure: true,
        type: 'hmac',
      }).name,
      '__Host-session',
    )
  })

  it('accepts hmac keys of any byte length but requires 32-byte aes-gcm keys', () => {
    assert.deepEqual(
      parseCookieOptions({
        key: 'hmac',
        keys: [Buffer.alloc(1)],
        type: 'hmac',
      }).keys,
      [Buffer.alloc(1)],
    )

    const error = expectSeedpodsError({
      key: 'aes',
      keys: [Buffer.alloc(31)],
      type: 'aes-gcm',
    })

    assertHasCause(
      error,
      'CookieOptionValueInvalid',
      (cause) => cause.option === 'keys[0]' && cause.reason.includes('32 bytes'),
    )
  })

  it('rejects unknown keys and reports them in the error message', () => {
    const error = expectSeedpodsError({
      extra: true,
      key: 'session',
      keys: [hmacKey],
      type: 'hmac',
    })

    assertHasCause(error, 'CookieOptionUnknown', (cause) => cause.option === 'extra')
    assert.include(error.message, 'Unknown cookie option "extra".')
  })

  it('requires the top-level value to be a plain object', () => {
    const error = expectSeedpodsError(undefined)

    assert.deepEqual(error.causes, [{ actual: undefined, type: 'CookieOptionsExpectedObject' }])
  })

  it('reports missing required fields together', () => {
    const error = expectSeedpodsError({})

    assertHasCause(error, 'CookieOptionMissing', (cause) => cause.option === 'key')
    assertHasCause(error, 'CookieOptionMissing', (cause) => cause.option === 'keys')
    assertHasCause(error, 'CookieOptionMissing', (cause) => cause.option === 'type')
  })

  it('requires cookie key and name values to be non-empty strings with valid HTTP token characters', () => {
    const token = "!#$%&'*+-.^_`|~AZaz09"

    assert.equal(
      parseCookieOptions({
        key: token,
        keys: [hmacKey],
        name: token,
        type: 'hmac',
      }).name,
      token,
    )

    const invalidKeyError = expectSeedpodsError({
      key: 'bad/key',
      keys: [hmacKey],
      type: 'hmac',
    })

    assertHasCause(
      invalidKeyError,
      'CookieOptionValueInvalid',
      (cause) => cause.option === 'key' && cause.reason.includes('HTTP token'),
    )

    const invalidNameError = expectSeedpodsError({
      key: 'session',
      keys: [hmacKey],
      name: 'bad/name',
      type: 'hmac',
    })

    assertHasCause(
      invalidNameError,
      'CookieOptionValueInvalid',
      (cause) => cause.option === 'name' && cause.reason.includes('HTTP token'),
    )
  })

  it('validates and normalizes domain and path constraints', () => {
    assert.equal(
      parseCookieOptions({
        domain: '.Example.COM',
        key: 'session',
        keys: [hmacKey],
        path: '/app',
        type: 'hmac',
      }).domain,
      'example.com',
    )

    const invalidDomainError = expectSeedpodsError({
      domain: '-example.com',
      key: 'session',
      keys: [hmacKey],
      type: 'hmac',
    })

    assertHasCause(
      invalidDomainError,
      'CookieOptionValueInvalid',
      (cause) => cause.option === 'domain' && cause.reason.includes('NR-LDH'),
    )

    const ipDomainError = expectSeedpodsError({
      domain: '127.0.0.1',
      key: 'session',
      keys: [hmacKey],
      type: 'hmac',
    })

    assertHasCause(
      ipDomainError,
      'CookieOptionValueInvalid',
      (cause) => cause.option === 'domain' && cause.reason.includes('IP literal'),
    )

    const invalidPathError = expectSeedpodsError({
      key: 'session',
      keys: [hmacKey],
      path: '/app;admin',
      type: 'hmac',
    })

    assertHasCause(
      invalidPathError,
      'CookieOptionValueInvalid',
      (cause) => cause.option === 'path' && cause.reason.includes('path-value'),
    )

    const relativePathError = expectSeedpodsError({
      key: 'session',
      keys: [hmacKey],
      path: 'app',
      type: 'hmac',
    })

    assertHasCause(
      relativePathError,
      'CookieOptionValueInvalid',
      (cause) => cause.option === 'path' && cause.reason.includes('start with "/"'),
    )
  })

  it('validates primitive option types and allowed values', () => {
    const error = expectSeedpodsError({
      httpOnly: 'true',
      key: 'session',
      keys: [hmacKey],
      maxAge: 1.5,
      sameSite: 'Later',
      secure: 1,
      type: 'hmac',
    })

    assertHasCause(error, 'CookieOptionTypeInvalid', (cause) => cause.option === 'httpOnly')
    assertHasCause(error, 'CookieOptionValueInvalid', (cause) => cause.option === 'maxAge')
    assertHasCause(error, 'CookieOptionValueInvalid', (cause) => cause.option === 'sameSite')
    assertHasCause(error, 'CookieOptionTypeInvalid', (cause) => cause.option === 'secure')
  })

  it('validates the keys array shape', () => {
    const emptyError = expectSeedpodsError({
      key: 'session',
      keys: [],
      type: 'hmac',
    })

    assertHasCause(emptyError, 'CookieOptionValueInvalid', (cause) => cause.option === 'keys')

    const tooManyError = expectSeedpodsError({
      key: 'session',
      keys: [hmacKey, hmacKey, hmacKey, hmacKey, hmacKey, hmacKey],
      type: 'hmac',
    })

    assertHasCause(tooManyError, 'CookieOptionValueInvalid', (cause) => cause.option === 'keys')

    const invalidEntryError = expectSeedpodsError({
      key: 'session',
      keys: [hmacKey, 'not-a-buffer'],
      type: 'hmac',
    })

    assertHasCause(
      invalidEntryError,
      'CookieOptionTypeInvalid',
      (cause) => cause.option === 'keys[1]' && cause.expected === 'a Buffer',
    )
  })

  it('requires secure when sameSite is None', () => {
    const missingSecureError = expectSeedpodsError({
      key: 'session',
      keys: [hmacKey],
      sameSite: 'None',
      type: 'hmac',
    })

    assertHasCause(
      missingSecureError,
      'CookieOptionValueInvalid',
      (cause) => cause.option === 'sameSite' && cause.reason.includes('secure'),
    )

    const falseSecureError = expectSeedpodsError({
      key: 'session',
      keys: [hmacKey],
      sameSite: 'None',
      secure: false,
      type: 'hmac',
    })

    assertHasCause(
      falseSecureError,
      'CookieOptionValueInvalid',
      (cause) => cause.option === 'sameSite' && cause.reason.includes('secure'),
    )

    assert.equal(
      parseCookieOptions({
        key: 'session',
        keys: [hmacKey],
        sameSite: 'None',
        secure: true,
        type: 'hmac',
      }).sameSite,
      'None',
    )
  })

  it('enforces secure-prefix invariants', () => {
    const secureError = expectSeedpodsError({
      key: 'session',
      keys: [hmacKey],
      prefix: '__Secure-',
      type: 'hmac',
    })

    assertHasCause(
      secureError,
      'CookiePrefixConfigurationInvalid',
      (cause) => cause.prefix === '__Secure-' && cause.reason.includes('secure'),
    )
  })

  it('enforces host-prefix invariants', () => {
    const error = expectSeedpodsError({
      domain: 'example.com',
      key: 'session',
      keys: [hmacKey],
      path: '/app',
      prefix: '__Host-',
      type: 'hmac',
    })

    assertHasCause(
      error,
      'CookiePrefixConfigurationInvalid',
      (cause) => cause.prefix === '__Host-' && cause.reason.includes('secure'),
    )
    assertHasCause(
      error,
      'CookiePrefixConfigurationInvalid',
      (cause) => cause.prefix === '__Host-' && cause.reason.includes('domain'),
    )
    assertHasCause(
      error,
      'CookiePrefixConfigurationInvalid',
      (cause) => cause.prefix === '__Host-' && cause.reason.includes('path'),
    )
  })

  it('enforces reserved-prefix invariants from the final cookie name case-insensitively', () => {
    const secureError = expectSeedpodsError({
      key: 'session',
      keys: [hmacKey],
      name: '__SeCuRe-session',
      type: 'hmac',
    })

    assertHasCause(
      secureError,
      'CookiePrefixConfigurationInvalid',
      (cause) => cause.prefix === '__Secure-' && cause.reason.includes('secure'),
    )

    const hostNameError = expectSeedpodsError({
      key: 'session',
      keys: [hmacKey],
      name: '__hOsT-session',
      secure: true,
      type: 'hmac',
    })

    assertHasCause(
      hostNameError,
      'CookiePrefixConfigurationInvalid',
      (cause) => cause.prefix === '__Host-' && cause.reason.includes('path'),
    )

    const hostKeyError = expectSeedpodsError({
      key: '__HoSt-session',
      keys: [hmacKey],
      secure: true,
      type: 'hmac',
    })

    assertHasCause(
      hostKeyError,
      'CookiePrefixConfigurationInvalid',
      (cause) => cause.prefix === '__Host-' && cause.reason.includes('path'),
    )
  })

  it('accepts manually prefixed cookie names when their invariants are satisfied', () => {
    assert.equal(
      parseCookieOptions({
        key: 'session',
        keys: [hmacKey],
        name: '__SeCuRe-session',
        secure: true,
        type: 'hmac',
      }).name,
      '__SeCuRe-session',
    )

    assert.equal(
      parseCookieOptions({
        key: 'session',
        keys: [hmacKey],
        name: '__hOsT-session',
        path: '/',
        secure: true,
        type: 'hmac',
      }).name,
      '__hOsT-session',
    )

    assert.equal(
      parseCookieOptions({
        key: '__HoSt-session',
        keys: [hmacKey],
        path: '/',
        secure: true,
        type: 'hmac',
      }).name,
      '__HoSt-session',
    )
  })

  it('rejects missing and incorrectly typed scalar option values', () => {
    const keyTypeError = expectSeedpodsError({
      key: 1,
      keys: [hmacKey],
      type: 'hmac',
    })

    assertHasCause(
      keyTypeError,
      'CookieOptionTypeInvalid',
      (cause) => cause.option === 'key' && cause.expected === 'a string',
    )

    const emptyKeyError = expectSeedpodsError({
      key: '',
      keys: [hmacKey],
      type: 'hmac',
    })

    assertHasCause(
      emptyKeyError,
      'CookieOptionValueInvalid',
      (cause) => cause.option === 'key' && cause.reason.includes('must not be empty'),
    )

    const domainTypeError = expectSeedpodsError({
      domain: 1,
      key: 'session',
      keys: [hmacKey],
      type: 'hmac',
    })

    assertHasCause(
      domainTypeError,
      'CookieOptionTypeInvalid',
      (cause) => cause.option === 'domain' && cause.expected === 'a string',
    )

    const domainEmptyError = expectSeedpodsError({
      domain: '',
      key: 'session',
      keys: [hmacKey],
      type: 'hmac',
    })

    assertHasCause(
      domainEmptyError,
      'CookieOptionValueInvalid',
      (cause) => cause.option === 'domain' && cause.reason.includes('must not be empty'),
    )

    const pathTypeError = expectSeedpodsError({
      key: 'session',
      keys: [hmacKey],
      path: 1,
      type: 'hmac',
    })

    assertHasCause(
      pathTypeError,
      'CookieOptionTypeInvalid',
      (cause) => cause.option === 'path' && cause.expected === 'a string',
    )

    const pathEmptyError = expectSeedpodsError({
      key: 'session',
      keys: [hmacKey],
      path: '',
      type: 'hmac',
    })

    assertHasCause(
      pathEmptyError,
      'CookieOptionValueInvalid',
      (cause) => cause.option === 'path' && cause.reason.includes('must not be empty'),
    )

    const maxAgeTypeError = expectSeedpodsError({
      key: 'session',
      keys: [hmacKey],
      maxAge: Number.NaN,
      type: 'hmac',
    })

    assertHasCause(
      maxAgeTypeError,
      'CookieOptionTypeInvalid',
      (cause) => cause.option === 'maxAge' && cause.expected === 'a finite number',
    )

    const maxAgeNegativeError = expectSeedpodsError({
      key: 'session',
      keys: [hmacKey],
      maxAge: -1,
      type: 'hmac',
    })

    assertHasCause(
      maxAgeNegativeError,
      'CookieOptionValueInvalid',
      (cause) => cause.option === 'maxAge' && cause.reason.includes('greater than or equal to 0'),
    )
  })

  it('rejects non-string literal options and non-array key collections', () => {
    const prefixTypeError = expectSeedpodsError({
      key: 'session',
      keys: [hmacKey],
      prefix: true,
      type: 'hmac',
    })

    assertHasCause(prefixTypeError, 'CookieOptionTypeInvalid', (cause) => cause.option === 'prefix')

    const sameSiteTypeError = expectSeedpodsError({
      key: 'session',
      keys: [hmacKey],
      sameSite: true,
      type: 'hmac',
    })

    assertHasCause(
      sameSiteTypeError,
      'CookieOptionTypeInvalid',
      (cause) => cause.option === 'sameSite',
    )

    const typeTypeError = expectSeedpodsError({
      key: 'session',
      keys: [hmacKey],
      type: true,
    })

    assertHasCause(typeTypeError, 'CookieOptionTypeInvalid', (cause) => cause.option === 'type')

    const keysTypeError = expectSeedpodsError({
      key: 'session',
      keys: hmacKey,
      type: 'hmac',
    })

    assertHasCause(
      keysTypeError,
      'CookieOptionTypeInvalid',
      (cause) => cause.option === 'keys' && cause.expected === 'an array of Buffer values',
    )
  })

  it('parses cookie payloads and rejects invalid payload shapes', () => {
    assert.deepEqual(
      parseCookieValue({
        options: {
          key: 'session',
          policy: 'policy-fingerprint',
        },
        value: { ok: true },
      }),
      {
        options: {
          key: 'session',
          policy: 'policy-fingerprint',
        },
        value: { ok: true },
      },
    )

    assert.isUndefined(parseCookieValue(undefined))
    assert.isUndefined(parseCookieValue({ options: { key: 'session' } }))
    assert.isUndefined(parseCookieValue({ options: null, value: true }))
    assert.isUndefined(parseCookieValue({ options: { key: '' }, value: true }))
    assert.isUndefined(parseCookieValue({ options: { key: 'bad key' }, value: true }))
    assert.isUndefined(parseCookieValue({ options: { key: 'bad/key', policy: 'p' }, value: true }))
    assert.isUndefined(parseCookieValue({ options: { key: 'session', maxAge: 60 }, value: true }))
    assert.isUndefined(parseCookieValue({ options: { key: 'session', policy: '' }, value: true }))
    assert.isUndefined(parseCookieValue({ options: { key: 'session', policy: 1 }, value: true }))
  })

  it('treats omitted and false boolean transport flags as the same policy', async () => {
    const omitted = parseCookieOptions({
      key: 'session',
      keys: [hmacKey],
      maxAge: 60,
      type: 'hmac',
    })

    const explicitFalse = parseCookieOptions({
      httpOnly: false,
      key: 'session',
      keys: [hmacKey],
      maxAge: 60,
      secure: false,
      type: 'hmac',
    })

    assert.equal(await policyFingerprint(omitted), await policyFingerprint(explicitFalse))
  })

  it('changes the policy fingerprint when rewrite-safe transport attributes change', async () => {
    const base = parseCookieOptions({
      key: 'session',
      keys: [hmacKey],
      type: 'hmac',
    })

    const secure = parseCookieOptions({
      key: 'session',
      keys: [hmacKey],
      secure: true,
      type: 'hmac',
    })

    const httpOnly = parseCookieOptions({
      httpOnly: true,
      key: 'session',
      keys: [hmacKey],
      type: 'hmac',
    })

    const sameSite = parseCookieOptions({
      key: 'session',
      keys: [hmacKey],
      sameSite: 'Lax',
      type: 'hmac',
    })

    const maxAge = parseCookieOptions({
      key: 'session',
      keys: [hmacKey],
      maxAge: 60,
      type: 'hmac',
    })

    assert.notEqual(await policyFingerprint(base), await policyFingerprint(secure))
    assert.notEqual(await policyFingerprint(base), await policyFingerprint(httpOnly))
    assert.notEqual(await policyFingerprint(base), await policyFingerprint(sameSite))
    assert.notEqual(await policyFingerprint(base), await policyFingerprint(maxAge))
  })

  it('does not include cookie identity and scope fields in the policy fingerprint', async () => {
    const base = parseCookieOptions({
      key: 'session',
      keys: [hmacKey],
      sameSite: 'Lax',
      type: 'hmac',
    })

    const renamed = parseCookieOptions({
      key: 'session',
      keys: [hmacKey],
      name: 'other',
      sameSite: 'Lax',
      type: 'hmac',
    })

    const scoped = parseCookieOptions({
      domain: 'example.com',
      key: 'session',
      keys: [hmacKey],
      path: '/app',
      sameSite: 'Lax',
      type: 'hmac',
    })

    assert.equal(await policyFingerprint(base), await policyFingerprint(renamed))
    assert.equal(await policyFingerprint(base), await policyFingerprint(scoped))
  })

  it('aggregates multiple validation causes in one error', () => {
    const error = expectSeedpodsError({
      extra: true,
      key: 'bad key',
      keys: ['not-a-buffer'],
      sameSite: 'Later',
      type: 'hmac',
    })

    assert.isAtLeast(error.causes.length, 4)
    assert.include(error.message, 'Invalid seedpods input.')
    assert.include(error.message, 'Unknown cookie option "extra".')
    assert.include(error.message, 'Cookie option "key"')
    assert.include(error.message, 'Cookie option "keys[0]"')
    assert.include(error.message, 'Cookie option "sameSite"')
  })
})
