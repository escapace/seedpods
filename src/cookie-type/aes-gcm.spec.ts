import { assert, describe, it } from 'vitest'
import { deriveKey } from '../utilities/derive-key'
import { from, to } from './aes-gcm'

const keyA = { id: 'a', value: await deriveKey('key-a', { iterations: 1 }) } as const
const keyB = { id: 'b', value: await deriveKey('key-b', { iterations: 1 }) } as const
const keyC = { id: 'c', value: await deriveKey('key-c', { iterations: 1 }) } as const

describe('aes-gcm', () => {
  it('serializes the three-part format and decrypts with the selected key', async () => {
    const cookieValue = Buffer.from('hello')

    const encryptedCookie = await to(cookieValue, [keyA])
    const segments = encryptedCookie!.split('.')
    const decryptedCookie = await from(encryptedCookie!, [keyA])

    assert.lengthOf(segments, 3)
    assert.equal(segments[0], 'YQ')
    assert.deepEqual(decryptedCookie, { rotate: false, value: cookieValue })
  })

  it('rejects unknown key identifiers', async () => {
    const cookieValue = Buffer.from('hello')

    const encryptedCookie = await to(cookieValue, [keyA])
    const decryptedCookie = await from(encryptedCookie!, [keyB])

    assert.equal(decryptedCookie, undefined)
  })

  it('second key', async () => {
    const cookieValue = Buffer.from('hello')

    const encryptedCookie = await to(cookieValue, [keyB, keyC])
    const decryptedCookie = await from(encryptedCookie!, [keyA, keyB])

    assert.deepEqual(decryptedCookie, { rotate: true, value: cookieValue })
  })

  it('rejects tampered key identifiers without falling back to another configured key', async () => {
    const encryptedCookie = await to(Buffer.from('hello'), [keyA])
    const [, cipher, iv] = encryptedCookie!.split('.')

    assert.equal(await from(`Yg.${cipher}.${iv}`, [keyA, keyB]), undefined)
  })

  it('empty', async () => {
    assert.equal(await to(Buffer.from(''), [keyA]), undefined)
    assert.equal(await to(Buffer.from([]), [keyA]), undefined)
  })

  it('malformed', async () => {
    assert.equal(await from('', [keyA]), undefined)
    assert.equal(await from('.asd', [keyA]), undefined)
    assert.equal(
      await from((await to(Buffer.from('hello'), [keyA]))!.slice(0, -1), [keyA]),
      undefined,
    )
  })
})
