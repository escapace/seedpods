import { assert } from 'chai'
import { encode } from './encode'

describe('encode', () => {
  it('.', () => {
    assert.deepEqual(
      encode({ hello: 'world' }),
      Buffer.from(JSON.stringify({ hello: 'world' }))
    )

    assert.deepEqual(
      // @ts-expect-error type
      encode(Symbol.for('qwe')),
      undefined
    )
  })
})
