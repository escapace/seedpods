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

const tycho = cookie({
  key: 'tycho',
  type: 'secretbox',
  domain: 'example.com',
  keys: [keyB, keyA],
  path: '/tycho',
  reducer(prev?: string[], next?: string[]) {
    return [...(prev ?? []), ...(next ?? [])]
  }
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
    assert.hasAllKeys(take('', cookieJar), ['del', 'get', 'set', 'toStrings'])
  })

  it('.', () => {
    const { get, set, del, toStrings } = take(
      `__Secure-vixen=${
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
      )}; abc=qwe`,
      cookieJar
    )

    assert.equal(toStrings().length, 2)

    assert.ok(toStrings().some((value) => value.startsWith('__Secure-vixen=')))

    assert.ok(
      toStrings().some((value) =>
        value.startsWith('__Host-ball=; Path=/; Expires=')
      )
    )

    assert.deepEqual(get('vixen'), { change: 'triangle', author: 'escape' })
    assert.deepEqual(get('tycho'), ['threw', 'satellites', 'class'])
    assert.deepEqual(get('dazzle'), undefined)
    assert.deepEqual(get('ball'), undefined)

    set('vixen', { change: 'triangle', author: 'escape', sweet: 'silent' })
    set('tycho', ['every'])
    set('tycho', ['plain'])
    set('dazzle', 100)

    assert.equal(toStrings().length, 4)
    assert.ok(toStrings().some((value) => value.startsWith('__Secure-vixen=')))
    assert.ok(toStrings().some((value) => value.startsWith('tycho=')))
    assert.ok(toStrings().some((value) => value.startsWith('dazzle=')))
    assert.ok(
      toStrings().some((value) =>
        value.startsWith('__Host-ball=; Path=/; Expires=')
      )
    )

    assert.deepEqual(get('vixen'), {
      change: 'triangle',
      author: 'escape',
      sweet: 'silent'
    })

    assert.deepEqual(get('tycho'), [
      'threw',
      'satellites',
      'class',
      'every',
      'plain'
    ])

    assert.deepEqual(get('dazzle'), 100)
    assert.deepEqual(get('ball'), undefined)

    set('vixen', undefined)
    del('tycho')
    del('dazzle')
    del('ball')

    assert.equal(toStrings().length, 3)
    assert.ok(
      toStrings().some((value) => value.startsWith('__Secure-vixen=; Expires='))
    )
    assert.ok(
      toStrings().some((value) =>
        value.startsWith('tycho=; Domain=example.com; Path=/tycho; Expires=')
      )
    )
    assert.ok(
      toStrings().some((value) =>
        value.startsWith('__Host-ball=; Path=/; Expires=')
      )
    )
    assert.ok(
      toStrings().some((value) =>
        value.startsWith('__Host-ball=; Path=/; Expires=')
      )
    )

    // @ts-expect-error type
    assert.throws(() => del('abc'))

    // @ts-expect-error type
    assert.throws(() => set('abc', 'hello'))

    // @ts-expect-error type
    assert.throws(() => get('abc'))
  })
})
