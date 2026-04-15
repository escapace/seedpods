import { assert, describe, it } from 'vitest'
import { timingSafeEqual } from './timing-safe-equal'

describe('timingSafeEqual', () => {
  it('returns true for identical buffers', () => {
    assert.isTrue(timingSafeEqual(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2, 3])))
  })

  it('returns false when bytes differ', () => {
    assert.isFalse(timingSafeEqual(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2, 4])))
  })

  it('returns false when lengths differ', () => {
    assert.isFalse(timingSafeEqual(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2])))
  })

  it('returns true for empty buffers', () => {
    assert.isTrue(timingSafeEqual(new Uint8Array([]), new Uint8Array([])))
  })
})
