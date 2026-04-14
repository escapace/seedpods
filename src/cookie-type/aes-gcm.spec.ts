import { assert, describe, it } from 'vitest'
import {
  SEEDPODS_AES_GCM_AUTHENTICATION_TAG_LENGTH,
  SEEDPODS_AES_GCM_IV_LENGTH,
} from '../constants'
import { base64UrlToBytesExact, bytesToBase64Url, utf8ToBytes } from '../utilities/bytes'
import { deriveKey } from '../utilities/derive-key'
import { from, to } from './aes-gcm'

const keyA = { id: 'a', value: await deriveKey('key-a', { iterations: 1 }) } as const
const keyB = { id: 'b', value: await deriveKey('key-b', { iterations: 1 }) } as const
const keyC = { id: 'c', value: await deriveKey('key-c', { iterations: 1 }) } as const

describe('aes-gcm', () => {
  it('serializes the three-part format and decrypts with the selected key', async () => {
    const cookieValue = utf8ToBytes('hello')

    const encryptedCookie = await to(cookieValue, [keyA])
    const segments = encryptedCookie!.split('.')
    const decryptedCookie = await from(encryptedCookie!, [keyA])
    const cipher = base64UrlToBytesExact(segments[1])
    const iv = base64UrlToBytesExact(segments[2])

    assert.lengthOf(segments, 3)
    assert.equal(segments[0], 'YQ')

    if (cipher === undefined) {
      assert.fail('Expected cipher to decode.')
    }

    if (iv === undefined) {
      assert.fail('Expected IV to decode.')
    }

    assert.isAtLeast(cipher.length, SEEDPODS_AES_GCM_AUTHENTICATION_TAG_LENGTH)
    assert.lengthOf(iv, SEEDPODS_AES_GCM_IV_LENGTH)
    assert.deepEqual(decryptedCookie, { rotate: false, value: cookieValue })
  })

  it('rejects unknown key identifiers', async () => {
    const cookieValue = utf8ToBytes('hello')

    const encryptedCookie = await to(cookieValue, [keyA])
    const decryptedCookie = await from(encryptedCookie!, [keyB])

    assert.equal(decryptedCookie, undefined)
  })

  it('second key', async () => {
    const cookieValue = utf8ToBytes('hello')

    const encryptedCookie = await to(cookieValue, [keyB, keyC])
    const decryptedCookie = await from(encryptedCookie!, [keyA, keyB])

    assert.deepEqual(decryptedCookie, { rotate: true, value: cookieValue })
  })

  it('rejects tampered key identifiers without falling back to another configured key', async () => {
    const encryptedCookie = await to(utf8ToBytes('hello'), [keyA])
    const [, cipher, iv] = encryptedCookie!.split('.')

    assert.equal(await from(`Yg.${cipher}.${iv}`, [keyA, keyB]), undefined)
  })

  it('empty', async () => {
    assert.equal(await to(utf8ToBytes(''), [keyA]), undefined)
    assert.equal(await to(new Uint8Array([]), [keyA]), undefined)
  })

  it('malformed', async () => {
    assert.equal(await from('', [keyA]), undefined)
    assert.equal(await from('.asd', [keyA]), undefined)
    assert.equal(await from('.cipher.iv', [keyA]), undefined)
    assert.equal(
      await from((await to(utf8ToBytes('hello'), [keyA]))!.slice(0, -1), [keyA]),
      undefined,
    )
  })

  it('rejects empty cipher segments', async () => {
    const encryptedCookie = await to(utf8ToBytes('hello'), [keyA])
    const [kid, , iv] = encryptedCookie!.split('.')

    assert.equal(await from(`${kid}..${iv}`, [keyA]), undefined)
  })

  it('rejects non-canonical but decodable cipher segments', async () => {
    const encryptedCookie = await to(utf8ToBytes('hello'), [keyA])
    const [kid, cipher, iv] = encryptedCookie!.split('.')

    assert.equal(await from(`${kid}.${cipher}=.${iv}`, [keyA]), undefined)
  })

  it('rejects non-canonical but decodable iv segments', async () => {
    const encryptedCookie = await to(utf8ToBytes('hello'), [keyA])
    const [kid, cipher, iv] = encryptedCookie!.split('.')

    assert.equal(await from(`${kid}.${cipher}.${iv}=`, [keyA]), undefined)
  })

  it('rejects iv segments whose decoded length differs from the configured constant', async () => {
    const encryptedCookie = await to(utf8ToBytes('hello'), [keyA])
    const [kid, cipher] = encryptedCookie!.split('.')
    const wrongLengthIv = bytesToBase64Url(new Uint8Array(SEEDPODS_AES_GCM_IV_LENGTH - 1))

    assert.equal(await from(`${kid}.${cipher}.${wrongLengthIv}`, [keyA]), undefined)
  })

  it('rejects cipher segments shorter than the configured authentication tag length', async () => {
    const encryptedCookie = await to(utf8ToBytes('hello'), [keyA])
    const [kid, , iv] = encryptedCookie!.split('.')
    const shortCipher = bytesToBase64Url(
      new Uint8Array(SEEDPODS_AES_GCM_AUTHENTICATION_TAG_LENGTH - 1),
    )

    assert.equal(await from(`${kid}.${shortCipher}.${iv}`, [keyA]), undefined)
  })
})
