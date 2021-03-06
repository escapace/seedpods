import { assert } from 'chai'
import { jar, SYMBOL_JAR, TypeAction } from './jar'
import { cookie } from './cookie'
import sodium from 'sodium-native'
import { take } from './take'
import { to as toSecretbox } from './cookie-type/secretbox'

const keyA = Buffer.alloc(sodium.crypto_secretbox_KEYBYTES)
const keyB = Buffer.alloc(sodium.crypto_secretbox_KEYBYTES)
const keyC = Buffer.alloc(sodium.crypto_secretbox_KEYBYTES)
const keyD = Buffer.alloc(sodium.crypto_secretbox_KEYBYTES)

;[keyA, keyB, keyC, keyD].map((value) => sodium.randombytes_buf(value))

const vixen = cookie({
  key: 'vixen',
  type: 'secretbox',
  secure: true,
  prefix: '__Secure-',
  maxAge: 86400,
  keys: [keyA, keyC]
})

const tycho = cookie<'tycho', 'secretbox', string[]>({
  key: 'tycho',
  type: 'secretbox',
  domain: 'example.com',
  keys: [keyB, keyA],
  path: '/tycho'
})

const dazzle = cookie<'dazzle', 'hmac', number>({
  key: 'dazzle',
  type: 'hmac',
  httpOnly: true,
  sameSite: 'Lax',
  expires: new Date('2023-01-11'),
  keys: [keyC, keyB]
})

const ball = cookie({
  key: 'ball',
  type: 'hmac',
  secure: true,
  path: '/',
  prefix: '__Host-',
  keys: [keyD]
})

const cookieJar = jar().put(vixen).put(tycho).put(dazzle).put(ball)

describe('jar', () => {
  it('.', () => {
    assert.isFunction(jar)
    assert.hasAllKeys(jar(), ['put'])

    assert.hasAllKeys(cookieJar, ['put', SYMBOL_JAR])

    assert.deepEqual(cookieJar[SYMBOL_JAR], {
      state: {
        cookies: {
          vixen,
          tycho,
          dazzle,
          ball
        }
      },
      log: [
        { type: TypeAction.Cookie, payload: vixen },
        { type: TypeAction.Cookie, payload: tycho },
        { type: TypeAction.Cookie, payload: dazzle },
        { type: TypeAction.Cookie, payload: ball }
      ]
    })
  })

  it('fails', () => {
    assert.throw(
      // @ts-expect-error test
      () => jar().put(vixen).put(tycho).put(dazzle).put({}),
      /not a cookie/i
    )
  })
})

describe('take', () => {
  it('.', () => {
    assert.isFunction(take)
    assert.hasAllKeys(take('', cookieJar), [
      'del',
      'get',
      'set',
      'values',
      'entries',
      Symbol.iterator
    ])
  })

  it('.', () => {
    const cookieHeader = `__Secure-vixen=${
      toSecretbox(
        Buffer.from(JSON.stringify({ change: 'triangle', author: 'escape' })),
        [keyC]
      ) as string
    }; tycho=${
      toSecretbox(
        Buffer.from(JSON.stringify(['threw', 'satellites', 'class'])),
        [keyB, keyA]
      ) as string
    }; __Host-ball=${Buffer.from('ride problem cause market').toString(
      'base64url'
    )}; abc=qwe`

    const t = take(cookieHeader, cookieJar, {
      tycho(prev?: string[], next?: string[]): string[] {
        return [...(prev ?? []), ...(next ?? [])]
      }
    })

    assert.equal(Array.from(t.values()).length, 2)

    assert.ok(
      Array.from(t.values()).some((value) =>
        value.startsWith('__Secure-vixen=')
      )
    )

    assert.ok(
      Array.from(t.values()).some((value) =>
        value.startsWith('__Host-ball=; Path=/; Expires=')
      )
    )

    assert.deepEqual(t.get('vixen'), { change: 'triangle', author: 'escape' })
    assert.deepEqual(t.get('tycho'), ['threw', 'satellites', 'class'])
    assert.deepEqual(t.get('dazzle'), undefined)
    assert.deepEqual(t.get('ball'), undefined)

    t.set('vixen', { change: 'triangle', author: 'escape', sweet: 'silent' })
    t.set('tycho', ['every'])
    t.set('tycho', ['plain'])
    t.set('dazzle', 100)

    assert.equal(Array.from(t.values()).length, 4)
    assert.ok(
      Array.from(t.values()).some((value) =>
        value.startsWith('__Secure-vixen=')
      )
    )
    assert.ok(
      Array.from(t.values()).some((value) => value.startsWith('tycho='))
    )
    assert.ok(
      Array.from(t.values()).some((value) => value.startsWith('dazzle='))
    )
    assert.ok(
      Array.from(t.values()).some((value) =>
        value.startsWith('__Host-ball=; Path=/; Expires=')
      )
    )

    assert.deepEqual(t.get('vixen'), {
      change: 'triangle',
      author: 'escape',
      sweet: 'silent'
    })

    assert.deepEqual(t.get('tycho'), [
      'threw',
      'satellites',
      'class',
      'every',
      'plain'
    ])

    assert.deepEqual(t.get('dazzle'), 100)
    assert.deepEqual(t.get('ball'), undefined)

    t.set('vixen', undefined)
    t.del('tycho')
    t.del('dazzle')
    t.del('ball')

    assert.equal(Array.from(t.values()).length, 3)
    assert.ok(
      Array.from(t.values()).some((value) =>
        value.startsWith('__Secure-vixen=; Expires=')
      )
    )
    assert.ok(
      Array.from(t.values()).some((value) =>
        value.startsWith('tycho=; Domain=example.com; Path=/tycho; Expires=')
      )
    )
    assert.ok(
      Array.from(t.values()).some((value) =>
        value.startsWith('__Host-ball=; Path=/; Expires=')
      )
    )

    assert.hasAllKeys(Object.fromEntries(t), ['vixen', 'tycho', 'ball'])

    // @ts-expect-error type
    assert.throws(() => t.del('abc'))

    // @ts-expect-error type
    assert.throws(() => t.set('abc', 'hello'))

    // @ts-expect-error type
    assert.throws(() => t.get('abc'))
  })
})
