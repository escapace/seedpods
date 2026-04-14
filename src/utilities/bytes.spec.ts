import { assert, describe, it } from 'vitest'
import { base64UrlToBytesExact, bytesToBase64Url, bytesToUtf8, utf8ToBytes } from './bytes'

describe('bytes', () => {
  it('accepts canonical base64url inputs', () => {
    const cases = [
      ['AQ', '\u0001'],
      ['YQ', 'a'],
      ['Zm8', 'fo'],
      ['aGVsbG8', 'hello'],
    ] as const

    for (const [input, expected] of cases) {
      const decoded = base64UrlToBytesExact(input)

      assert.isDefined(decoded)
      assert.equal(bytesToBase64Url(decoded), input)
      assert.equal(bytesToUtf8(decoded), expected)
    }
  })

  it('rejects non-canonical but decodable base64url inputs', () => {
    const malformedValues = ['AQ=', 'AQ==', 'AQ+', 'AQ/', 'AQ\n', 'AA.BB', '-', '_']

    for (const value of malformedValues) {
      assert.equal(base64UrlToBytesExact(value), undefined)
    }
  })

  it('round-trips canonical utf-8 input through base64url', () => {
    const value = utf8ToBytes('current-session')

    assert.deepEqual(base64UrlToBytesExact(bytesToBase64Url(value)), value)
  })
})
