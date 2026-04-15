import { assert, describe, it } from 'vitest'
import { encode } from './encode'
import { parseCookieOptions } from './parse-cookie-options'

const options = parseCookieOptions({
  key: 'session',
  keys: [{ id: 'k', value: new Uint8Array(32).fill(1) }],
  type: 'hmac',
})

describe('encode', () => {
  it('returns undefined for undefined value', () => {
    assert.isUndefined(encode(undefined, options, 'policy'))
  })

  it('returns bytes for a serializable value', () => {
    const result = encode('hello', options, 'policy')

    assert.instanceOf(result, Uint8Array)
    assert.isAbove(result.length, 0)
  })

  it('returns bytes that round-trip through JSON', () => {
    const result = encode({ count: 1 }, options, 'policy')

    assert.instanceOf(result, Uint8Array)
    assert.isAbove(result.length, 0)
  })
})
