import fc from 'fast-check'
import { assert, describe, it } from 'vitest'
import { SeedpodsError, getSeedpodsErrorCausesByType } from '../error'
import { validateCookiePath } from './normalize-cookie-path'

function normalizeCookiePath(value: string): string {
  const result = validateCookiePath(value)

  if (!result.ok) {
    throw new SeedpodsError(result.causes)
  }

  return result.value
}

function expectSeedpodsError(value: string): SeedpodsError {
  try {
    normalizeCookiePath(value)
    assert.fail('Expected normalizeCookiePath to throw.')
  } catch (error) {
    assert.instanceOf(error, SeedpodsError)
    return error
  }
}

function assertInvalidPath(value: string, reason: string): void {
  const error = expectSeedpodsError(value)
  const causes = getSeedpodsErrorCausesByType(error, 'CookieOptionValueInvalid')

  assert.isTrue(
    causes.some((cause) => cause.option === 'path' && cause.reason.includes(reason)),
    `Expected path ${JSON.stringify(value)} to fail with reason containing ${JSON.stringify(reason)}. Received ${JSON.stringify(causes)}.`,
  )
}

const pathCharacterArbitrary = fc.constantFrom(
  ...Array.from({ length: 0x7f - 0x20 }, (_, index) => String.fromCharCode(index + 0x20)).filter(
    (character) => character !== ';',
  ),
)

const validPathArbitrary = fc
  .array(pathCharacterArbitrary, { maxLength: 32, minLength: 0 })
  .map((characters) => `/${characters.join('')}`)

describe('normalize-cookie-path', () => {
  it('accepts and preserves valid cookie paths exactly', () => {
    assert.equal(normalizeCookiePath('/'), '/')
    assert.equal(normalizeCookiePath('/app'), '/app')
    assert.equal(normalizeCookiePath('/a/../b'), '/a/../b')
    assert.equal(normalizeCookiePath('/%2F'), '/%2F')
    assert.equal(normalizeCookiePath('/a b'), '/a b')
  })

  it('rejects empty, relative, and invalid paths', () => {
    assertInvalidPath('', 'must not be empty')
    assertInvalidPath('app', 'must start with "/"')
    assertInvalidPath('/a;b', 'RFC6265bis path-value')
    assertInvalidPath('/ab', 'RFC6265bis path-value')
  })

  it('accepts generated valid paths and preserves them byte-for-byte', () => {
    fc.assert(
      fc.property(validPathArbitrary, (path) => {
        assert.equal(normalizeCookiePath(path), path)
      }),
    )
  })

  it('rejects generated relative paths', () => {
    fc.assert(
      fc.property(
        fc.string({ maxLength: 32, minLength: 1 }).filter((value) => !value.startsWith('/')),
        (path) => {
          assertInvalidPath(path, 'must start with "/"')
        },
      ),
    )
  })

  it('rejects generated paths containing semicolons', () => {
    fc.assert(
      fc.property(validPathArbitrary, (path) => {
        assertInvalidPath(`${path};`, 'RFC6265bis path-value')
      }),
    )
  })

  it('rejects generated paths containing control characters', () => {
    const controlCharacterArbitrary = fc
      .integer({ max: 0x1f, min: 0 })
      .map((value) => String.fromCharCode(value))

    fc.assert(
      fc.property(validPathArbitrary, controlCharacterArbitrary, (path, character) => {
        assertInvalidPath(`${path}${character}`, 'RFC6265bis path-value')
      }),
    )
  })
})
