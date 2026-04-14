import { assert, describe, it } from 'vitest'
import { decodeKid } from './decode-kid'
import { encodeKid } from './encode-kid'

describe('decode-kid', () => {
  it('accepts valid serialized key identifiers', () => {
    assert.equal(decodeKid(encodeKid('current-session')), 'current-session')
  })

  it('rejects missing or empty key identifier segments', () => {
    assert.equal(decodeKid(''), undefined)
    assert.equal(decodeKid('.'), undefined)
    assert.equal(decodeKid('!!!'), undefined)
  })

  it('rejects malformed or non-canonical key identifier segments', () => {
    for (const value of ['abc+', 'YQ=', 'AQ+', 'AQ/', 'AQ\n', 'AA.BB', '-', '_']) {
      assert.equal(decodeKid(value), undefined)
    }
  })
})
