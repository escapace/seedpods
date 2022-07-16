import { assert } from 'chai'
import { to, from } from './secretbox'
import sodium from 'sodium-native'

const keyA = Buffer.alloc(sodium.crypto_secretbox_KEYBYTES)
const keyB = Buffer.alloc(sodium.crypto_secretbox_KEYBYTES)
const keyC = Buffer.alloc(sodium.crypto_secretbox_KEYBYTES)

;[keyA, keyB, keyC].map((value) => sodium.randombytes_buf(value))

describe('keybox', () => {
  it('key', () => {
    const cookieValue = Buffer.from('hello')

    const encryptedCookie = to(cookieValue, [keyA])

    const decryptedCookie = from(encryptedCookie as string, [keyA])

    assert.deepEqual(decryptedCookie, { value: cookieValue, rotate: false })
  })

  it('wrong key', () => {
    const cookieValue = Buffer.from('hello')

    const encryptedCookie = to(cookieValue, [keyA])

    const decryptedCookie = from(encryptedCookie as string, [keyB])

    assert.equal(decryptedCookie, undefined)
  })

  it('second key', () => {
    const cookieValue = Buffer.from('hello')

    const encryptedCookie = to(cookieValue, [keyB, keyC])

    const decryptedCookie = from(encryptedCookie as string, [keyA, keyB])

    assert.deepEqual(decryptedCookie, { value: cookieValue, rotate: true })
  })

  it('empty', () => {
    assert.equal(to(Buffer.from(''), [keyA]), undefined)

    assert.equal(to(Buffer.from([]), [keyA]), undefined)
  })

  it('malformed', () => {
    assert.equal(from('', [keyA]), undefined)

    assert.equal(from('.asd', [keyA]), undefined)

    assert.equal(
      from((to(Buffer.from('hello'), [keyA]) as string).slice(0, -1), [keyA]),
      undefined
    )
  })
})
