import { toIMF } from './to-imf'
import { assert } from 'chai'

describe('to-imf', () => {
  it('to IMF', () => {
    const actual = toIMF(new Date(Date.UTC(1994, 3, 5, 15, 32)))

    const expected = 'Tue, 05 Apr 1994 15:32:00 GMT'
    assert.equal(actual, expected)
  })

  it('to IMF 0', () => {
    const actual = toIMF(new Date(0))

    const expected = 'Thu, 01 Jan 1970 00:00:00 GMT'
    assert.equal(actual, expected)
  })
})
