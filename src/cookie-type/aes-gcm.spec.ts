import { assert } from 'chai'
import { deriveKey } from '../utilities/derive-key'
import { from, to } from './aes-gcm'

const keyA = await deriveKey('key-a', { iterations: 1 })
const keyB = await deriveKey('key-b', { iterations: 1 })
const keyC = await deriveKey('key-c', { iterations: 1 })

describe('aes-gcm', () => {
  it('key', async () => {
    const cookieValue = Buffer.from('hello')

    const encryptedCookie = await to(cookieValue, [keyA])

    const decryptedCookie = await from(encryptedCookie as string, [keyA])

    assert.deepEqual(decryptedCookie, { value: cookieValue, rotate: false })
  })

  it('wrong key', async () => {
    const cookieValue = Buffer.from('hello')

    const encryptedCookie = await to(cookieValue, [keyA])

    const decryptedCookie = await from(encryptedCookie as string, [keyB])

    assert.equal(decryptedCookie, undefined)
  })

  it('second key', async () => {
    const cookieValue = Buffer.from('hello')

    const encryptedCookie = await to(cookieValue, [keyB, keyC])

    const decryptedCookie = await from(encryptedCookie as string, [keyA, keyB])

    assert.deepEqual(decryptedCookie, { value: cookieValue, rotate: true })
  })

  it('empty', async () => {
    assert.equal(await to(Buffer.from(''), [keyA]), undefined)

    assert.equal(await to(Buffer.from([]), [keyA]), undefined)
  })

  it('malformed', async () => {
    assert.equal(await from('', [keyA]), undefined)

    assert.equal(await from('.asd', [keyA]), undefined)

    assert.equal(
      await from(
        ((await to(Buffer.from('hello'), [keyA])) as string).slice(0, -1),
        [keyA]
      ),
      undefined
    )
  })
})
