import { assert } from 'chai'
import { decode } from './decode'

describe('decode', () => {
  it('.', () => {
    assert.deepEqual(decode(Buffer.from(JSON.stringify({ hello: 'world' }))), {
      hello: 'world'
    })

    assert.deepEqual(decode(Buffer.from('{ 123! }')), undefined)
  })
})
