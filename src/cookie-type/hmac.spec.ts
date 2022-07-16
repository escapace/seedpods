import { assert } from 'chai'
import { to, from } from './hmac'

// 'chain-happy-record-blank'
// 'desk-species-eventually-vowel'
// 'man-independent-needed-full'

describe('hmac', () => {
  it('key', () => {
    const cookieValue = Buffer.from('hello')

    const signedCookie = to(cookieValue, [
      Buffer.from('chain-happy-record-blank')
    ])

    assert.equal(
      signedCookie,
      'aGVsbG8.O9MpLTsvrxg2Z5O2RV05_LJ6I5Skmx6tQ1g3rQXcaW8'
    )

    const unsignedCookie = from(signedCookie as string, [
      Buffer.from('chain-happy-record-blank')
    ])

    assert.deepEqual(unsignedCookie, { value: cookieValue, rotate: false })
  })

  it('wrong key', () => {
    const cookieValue = Buffer.from('hello')

    const signedCookie = to(cookieValue, [
      Buffer.from('chain-happy-record-blank')
    ])

    assert.equal(
      signedCookie,
      'aGVsbG8.O9MpLTsvrxg2Z5O2RV05_LJ6I5Skmx6tQ1g3rQXcaW8'
    )

    const unsignedCookie = from(signedCookie as string, [
      Buffer.from('record-blank')
    ])

    assert.equal(unsignedCookie, undefined)
  })

  it('second key', () => {
    const cookieValue = Buffer.from('hello')

    const signedCookie = to(cookieValue, [
      Buffer.from('chain-happy-record-blank')
    ])

    assert.equal(
      signedCookie,
      'aGVsbG8.O9MpLTsvrxg2Z5O2RV05_LJ6I5Skmx6tQ1g3rQXcaW8'
    )

    const unsignedCookie = from(signedCookie as string, [
      Buffer.from('desk-species-eventually-vowel'),
      Buffer.from('chain-happy-record-blank')
    ])

    assert.deepEqual(unsignedCookie, { value: cookieValue, rotate: true })
  })

  it('empty', () => {
    assert.equal(
      to(Buffer.from(''), [Buffer.from('chain-happy-record-blank')]),
      undefined
    )

    assert.equal(
      to(Buffer.from([]), [Buffer.from('chain-happy-record-blank')]),
      undefined
    )
  })

  it('malformed', () => {
    assert.equal(
      from('', [Buffer.from('desk-species-eventually-vowel')]),
      undefined
    )

    assert.equal(
      from('.asd', [Buffer.from('desk-species-eventually-vowel')]),
      undefined
    )
  })
})
