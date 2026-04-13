import { assert, describe, it } from 'vitest'
import { to, from } from './hmac'

const keyA = { id: 'a', value: Buffer.from('chain-happy-record-blank') } as const
const keyB = { id: 'b', value: Buffer.from('desk-species-eventually-vowel') } as const

describe('hmac', () => {
  it('serializes the three-part format and verifies with the selected key', async () => {
    const cookieValue = Buffer.from('hello')

    const signedCookie = await to(cookieValue, [keyA])
    const segments = signedCookie!.split('.')
    const unsignedCookie = await from(signedCookie!, [keyA])

    assert.lengthOf(segments, 3)
    assert.equal(segments[0], 'YQ')
    assert.deepEqual(unsignedCookie, { rotate: false, value: cookieValue })
  })

  it('rejects unknown key identifiers', async () => {
    const cookieValue = Buffer.from('hello')

    const signedCookie = await to(cookieValue, [keyA])
    const unsignedCookie = await from(signedCookie!, [keyB])

    assert.equal(unsignedCookie, undefined)
  })

  it('second key', async () => {
    const cookieValue = Buffer.from('hello')

    const signedCookie = await to(cookieValue, [keyA])
    const unsignedCookie = await from(signedCookie!, [keyB, keyA])

    assert.deepEqual(unsignedCookie, { rotate: true, value: cookieValue })
  })

  it('rejects tampered key identifiers without falling back to another configured key', async () => {
    const cookieValue = Buffer.from('hello')
    const signedCookie = await to(cookieValue, [keyA])
    const [, payload, signature] = signedCookie!.split('.')

    assert.equal(await from(`Yg.${payload}.${signature}`, [keyA, keyB]), undefined)
  })

  it('empty', async () => {
    assert.equal(await to(Buffer.from(''), [keyA]), undefined)
    assert.equal(await to(Buffer.from([]), [keyA]), undefined)
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
    const kid = Buffer.from(keyA.id).toString('base64url')

    assert.equal(await from(`${kid}..signature`, [keyA]), undefined)
  })

  it('rejects inputs whose signed length differs from the recomputed value', async () => {
    const signedCookie = await to(Buffer.from('hello'), [keyA])

    assert.equal(await from(`${signedCookie!}x`, [keyA]), undefined)
  })
})
