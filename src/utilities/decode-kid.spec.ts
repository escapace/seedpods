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

  it('rejects malformed key identifier segments', () => {
    assert.equal(decodeKid('abc+'), undefined)
    assert.equal(decodeKid('YQ='), undefined)
  })
})
