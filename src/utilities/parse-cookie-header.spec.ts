/*!
 *
 * Adaptation of https://github.com/jshttp/cookie licensed under the MIT License
 * found in the https://github.com/jshttp/cookie/blob/master/LICENSE file.
 *
 */

import { assert, describe, it } from 'vitest'
import { parseCookieHeader } from './parse-cookie-header'

const parse = (value?: string) => Object.fromEntries(parseCookieHeader(value).entries())

describe('parse-cookie-header', () => {
  it('.', () => {
    assert.deepEqual(parse(), {})
  })

  it('should parse cookie string to object', () => {
    assert.deepEqual(parse('foo=bar'), { foo: ['bar'] })
    assert.deepEqual(parse('foo=123'), { foo: ['123'] })
    assert.deepEqual(parse('foo="123"'), { foo: ['123'] })
  })

  it('should ignore OWS', () => {
    assert.deepEqual(parse('FOO    = bar;   baz  =   raz'), {
      baz: ['raz'],
      FOO: ['bar'],
    })
  })

  it('should parse cookie with empty value', () => {
    assert.deepEqual(parse('foo= ; bar='), { bar: [''], foo: [''] })
  })

  it('should ignore cookies without value', () => {
    assert.deepEqual(parse('foo=bar;fizz  ;  buzz'), { foo: ['bar'] })
    assert.deepEqual(parse('  fizz; foo=  bar'), { foo: ['bar'] })
  })

  it('should ignore duplicate cookies', () => {
    assert.deepEqual(parse('foo=%1;bar=bar;foo=boo'), {
      bar: ['bar'],
      foo: ['%1', 'boo'],
    })
    assert.deepEqual(parse('foo=false;bar=bar;foo=true'), {
      bar: ['bar'],
      foo: ['false', 'true'],
    })
    assert.deepEqual(parse('foo=;bar=bar;foo=boo'), {
      bar: ['bar'],
      foo: ['', 'boo'],
    })
  })
})
