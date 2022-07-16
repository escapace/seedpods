import { assert } from 'chai'
import { validateCookieValue } from './validate-cookie-value'

const ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'

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
      '1f\u0091Wa'
    ]

    assert.isEmpty(tokens.filter((value) => validateCookieValue(value)))
  })
})
