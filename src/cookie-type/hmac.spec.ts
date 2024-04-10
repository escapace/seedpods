import { assert } from 'chai'
import { to, from } from './hmac'

// 'chain-happy-record-blank'
// 'desk-species-eventually-vowel'
// 'man-independent-needed-full'

describe('hmac', () => {
  it('key', async () => {
    const cookieValue = Buffer.from('hello')

    const signedCookie = await to(cookieValue, [
      Buffer.from('chain-happy-record-blank')
    ])

    assert.equal(
      signedCookie,
      'aGVsbG8.O9MpLTsvrxg2Z5O2RV05_LJ6I5Skmx6tQ1g3rQXcaW8'
    )

    const unsignedCookie = await from(signedCookie!, [
      Buffer.from('chain-happy-record-blank')
    ])

    assert.deepEqual(unsignedCookie, { value: cookieValue, rotate: false })
  })

  it('wrong key', async () => {
    const cookieValue = Buffer.from('hello')

    const signedCookie = await to(cookieValue, [
      Buffer.from('chain-happy-record-blank')
    ])

    assert.equal(
      signedCookie,
      'aGVsbG8.O9MpLTsvrxg2Z5O2RV05_LJ6I5Skmx6tQ1g3rQXcaW8'
    )

    const unsignedCookie = await from(signedCookie!, [
      Buffer.from('record-blank')
    ])

    assert.equal(unsignedCookie, undefined)
  })

  it('second key', async () => {
    const cookieValue = Buffer.from('hello')

    const signedCookie = await to(cookieValue, [
      Buffer.from('chain-happy-record-blank')
    ])

    assert.equal(
      signedCookie,
      'aGVsbG8.O9MpLTsvrxg2Z5O2RV05_LJ6I5Skmx6tQ1g3rQXcaW8'
    )

    const unsignedCookie = await from(signedCookie!, [
      Buffer.from('desk-species-eventually-vowel'),
      Buffer.from('chain-happy-record-blank')
    ])

    assert.deepEqual(unsignedCookie, { value: cookieValue, rotate: true })
  })

  it('empty', async () => {
    assert.equal(
      await to(Buffer.from(''), [Buffer.from('chain-happy-record-blank')]),
      undefined
    )

    assert.equal(
      await to(Buffer.from([]), [Buffer.from('chain-happy-record-blank')]),
      undefined
    )
  })

  it('malformed', async () => {
    assert.equal(
      await from('', [Buffer.from('desk-species-eventually-vowel')]),
      undefined
    )

    assert.equal(
      await from('.asd', [Buffer.from('desk-species-eventually-vowel')]),
      undefined
    )
  })
})
