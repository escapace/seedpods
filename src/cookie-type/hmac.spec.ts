import { assert, describe, it, vi } from 'vitest'
import { SEEDPODS_HMAC_SHA_256_SIGNATURE_LENGTH } from '../constants'
import { base64UrlToBytesExact, bytesToBase64Url, utf8ToBytes } from '../utilities/bytes'
import { encodeKid } from '../utilities/encode-kid'
import { to, from } from './hmac'

const keyA = { id: 'a', value: utf8ToBytes('chain-happy-record-blank') } as const
const keyB = { id: 'b', value: utf8ToBytes('desk-species-eventually-vowel') } as const

describe('hmac', () => {
  it('serializes the three-part format and verifies with the selected key', async () => {
    const cookieValue = utf8ToBytes('hello')

    const signedCookie = await to(cookieValue, [keyA])
    const segments = signedCookie!.split('.')
    const unsignedCookie = await from(signedCookie!, [keyA])
    const signature = base64UrlToBytesExact(segments[2])

    assert.lengthOf(segments, 3)
    assert.equal(segments[0], 'YQ')

    if (signature === undefined) {
      assert.fail('Expected signature to decode.')
    }

    assert.lengthOf(signature, SEEDPODS_HMAC_SHA_256_SIGNATURE_LENGTH)
    assert.deepEqual(unsignedCookie, { rotate: false, value: cookieValue })
  })

  it('rejects unknown key identifiers', async () => {
    const cookieValue = utf8ToBytes('hello')

    const signedCookie = await to(cookieValue, [keyA])
    const unsignedCookie = await from(signedCookie!, [keyB])

    assert.equal(unsignedCookie, undefined)
  })

  it('second key', async () => {
    const cookieValue = utf8ToBytes('hello')

    const signedCookie = await to(cookieValue, [keyA])
    const unsignedCookie = await from(signedCookie!, [keyB, keyA])

    assert.deepEqual(unsignedCookie, { rotate: true, value: cookieValue })
  })

  it('rejects tampered key identifiers without falling back to another configured key', async () => {
    const cookieValue = utf8ToBytes('hello')
    const signedCookie = await to(cookieValue, [keyA])
    const [, payload, signature] = signedCookie!.split('.')

    assert.equal(await from(`Yg.${payload}.${signature}`, [keyA, keyB]), undefined)
  })

  it('empty', async () => {
    assert.equal(await to(utf8ToBytes(''), [keyA]), undefined)
    assert.equal(await to(new Uint8Array([]), [keyA]), undefined)
  })

  it('malformed', async () => {
    assert.equal(await from('', [keyA]), undefined)
    assert.equal(await from('.asd', [keyA]), undefined)
  })

  it('rejects split-valid malformed values without throwing', async () => {
    const malformedValues = ['a.b', 'abc.def', 'AQ.b.c', 'Zm8.YQ.zz', 'hello.world.signature']

    for (const value of malformedValues) {
      assert.equal(await from(value, [keyB]), undefined)
    }
  })

  it('rejects inputs whose payload recomputes to an empty signed value', async () => {
    const kid = encodeKid(keyA.id)

    assert.equal(await from(`${kid}..signature`, [keyA]), undefined)
  })

  it('rejects inputs whose signed length differs from the recomputed value', async () => {
    const signedCookie = await to(utf8ToBytes('hello'), [keyA])

    assert.equal(await from(`${signedCookie!}x`, [keyA]), undefined)
  })

  it('rejects non-canonical but decodable payload segments', async () => {
    const signedCookie = await to(utf8ToBytes('hello'), [keyA])
    const [kid, payload, signature] = signedCookie!.split('.')

    assert.equal(await from(`${kid}.${payload}=.${signature}`, [keyA]), undefined)
  })

  it('rejects non-canonical but decodable signature segments', async () => {
    const signedCookie = await to(utf8ToBytes('hello'), [keyA])
    const [kid, payload, signature] = signedCookie!.split('.')

    assert.equal(await from(`${kid}.${payload}.${signature}=`, [keyA]), undefined)
  })

  it('rejects signature segments whose decoded length differs from the configured constant', async () => {
    const signedCookie = await to(utf8ToBytes('hello'), [keyA])
    const [kid, payload] = signedCookie!.split('.')
    const wrongLengthSignature = bytesToBase64Url(
      new Uint8Array(SEEDPODS_HMAC_SHA_256_SIGNATURE_LENGTH - 1),
    )

    assert.equal(await from(`${kid}.${payload}.${wrongLengthSignature}`, [keyA]), undefined)
  })

  it('rejects signatures when the verifier produces an unexpected length', async () => {
    const signedCookie = await to(utf8ToBytes('hello'), [keyA])
    const sign = vi
      .spyOn(globalThis.crypto.subtle, 'sign')
      .mockResolvedValueOnce(new Uint8Array(SEEDPODS_HMAC_SHA_256_SIGNATURE_LENGTH - 1).buffer)

    try {
      assert.equal(await from(signedCookie!, [keyA]), undefined)
    } finally {
      sign.mockRestore()
    }
  })
})
