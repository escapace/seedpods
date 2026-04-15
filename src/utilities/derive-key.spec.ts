import { assert, describe, expect, it } from 'vitest'
import { deriveKey } from './derive-key'

describe('deriveKey', () => {
  it('derives a 32-byte key with default options', async () => {
    const key = await deriveKey('secret', { iterations: 1, salt: 'fixed' })

    assert.instanceOf(key, Uint8Array)
    assert.lengthOf(key, 32)
  })

  it('produces the same key for the same secret and salt', async () => {
    const a = await deriveKey('secret', { iterations: 1, salt: 'fixed' })
    const b = await deriveKey('secret', { iterations: 1, salt: 'fixed' })

    assert.deepEqual(a, b)
  })

  it('produces different keys for different salts', async () => {
    const a = await deriveKey('secret', { iterations: 1, salt: 'salt-a' })
    const b = await deriveKey('secret', { iterations: 1, salt: 'salt-b' })

    assert.notDeepEqual(a, b)
  })

  it('generates a random salt when none is provided', async () => {
    // Two calls with the same secret but no fixed salt produce different keys.
    const a = await deriveKey('secret', { iterations: 1 })
    const b = await deriveKey('secret', { iterations: 1 })

    assert.instanceOf(a, Uint8Array)
    assert.lengthOf(a, 32)
    assert.notDeepEqual(a, b)
  })

  it('rejects iterations less than 1', async () => {
    await expect(deriveKey('secret', { iterations: 0, salt: 'fixed' })).rejects.toThrow(RangeError)
    await expect(deriveKey('secret', { iterations: -1, salt: 'fixed' })).rejects.toThrow(RangeError)
  })

  it('rejects non-integer iterations', async () => {
    await expect(deriveKey('secret', { iterations: 1.5, salt: 'fixed' })).rejects.toThrow(
      RangeError,
    )
  })
})
