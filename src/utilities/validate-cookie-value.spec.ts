import { assert, describe, it } from 'vitest'
import { validateCookieValue } from './validate-cookie-value'

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'

describe('validate-cookie-value', () => {
  it('.', () => {
    assert.ok(validateCookieValue(ALPHABET))
    assert.ok(validateCookieValue(`${ALPHABET}.${ALPHABET}`))

    const tokens = [
      '1f\tWa',
      '\t',
      '1f Wa',
      '1f;Wa',
      '"1fWa',
      '1f\\Wa',
      '1f"Wa',
      '"',
      '1fWa\u0005',
      '1f\u0091Wa',
      // U+0080 is the first non-ASCII code point; must be rejected per RFC 6265
      '1f\u0080Wa',
    ]

    assert.isEmpty(tokens.filter((value) => validateCookieValue(value)))
  })
})
