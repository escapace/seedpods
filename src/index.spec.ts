/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { assert } from 'chai'
import { cookie, SYMBOL_COOKIE } from './cookie'
import { to as toAesGcm } from './cookie-type/aes-gcm'
import { jar, SYMBOL_JAR, TypeAction } from './jar'
import { take } from './take'
import { deriveKey } from './utilities/derive-key'
import { encode } from './utilities/encode'

const keyA = await deriveKey('key-a', { iterations: 1 })
const keyB = await deriveKey('key-b', { iterations: 1 })
const keyC = await deriveKey('key-c', { iterations: 1 })
const keyD = await deriveKey('key-d', { iterations: 1 })

const vixen = cookie({
  key: 'vixen',
  type: 'aes-gcm',
  name: 'vixen',
  secure: true,
  prefix: '__Secure-',
  maxAge: 86400,
  keys: [keyA, keyC]
})

const vixenTwo = cookie({
  key: 'vixenTwo',
  name: 'vixen',
  type: 'aes-gcm',
  secure: true,
  sameSite: 'Strict',
  path: '/two',
  prefix: '__Secure-',
  maxAge: 86400,
  keys: [keyB]
})

const vixenThree = cookie({
  key: 'vixenThree',
  type: 'aes-gcm',
  name: 'vixen',
  secure: true,
  domain: 'example.com',
  prefix: '__Secure-',
  maxAge: 86400,
  keys: [keyC]
})

const tycho = cookie<'tycho', 'aes-gcm', string[]>({
  key: 'tycho',
  type: 'aes-gcm',
  domain: 'example.com',
  keys: [keyB, keyA],
  path: '/tycho'
})

const dazzle = cookie<'dazzle', 'hmac', number>({
  key: 'dazzle',
  type: 'hmac',
  httpOnly: true,
  sameSite: 'Lax',
  // expires: new Date('2023-01-11'),
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

    assert.deepStrictEqual(cookieJar[SYMBOL_JAR], {
      state: {
        cookies: {
          vixen,
          tycho,
          dazzle,
          ball
        }
      },
      log: [
        { type: TypeAction.Cookie, payload: ball },
        { type: TypeAction.Cookie, payload: dazzle },
        { type: TypeAction.Cookie, payload: tycho },
        { type: TypeAction.Cookie, payload: vixen }
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
  it('.', async () => {
    assert.isFunction(take)
    assert.hasAllKeys(await take('', cookieJar), [
      'del',
      'get',
      'set',
      'values',
      'entries'
    ])
  })

  it('.', async () => {
    const cookieHeader = `__Secure-vixen=${
      (await toAesGcm(
        encode(
          { change: 'triangle', author: 'escape' },
          vixen[SYMBOL_COOKIE].options
        )!,
        [keyC]
      )) as string
    }; tycho=${
      (await toAesGcm(
        encode(['threw', 'satellites', 'class'], tycho[SYMBOL_COOKIE].options)!,
        [keyB, keyA]
      )) as string
    }; __Host-ball=${Buffer.from('ride problem cause market').toString(
      'base64url'
    )}; abc=qwe`

    const t = await take(cookieHeader, cookieJar, {
      tycho(prev?: string[], next?: string[]): string[] {
        return [...(prev ?? []), ...(next ?? [])]
      }
    })

    assert.equal((await t.values()).length, 2)

    assert.ok(
      (await t.values()).some((value) => value.startsWith('__Secure-vixen='))
    )

    assert.ok(
      (await t.values()).some(
        (value) =>
          value ===
          '__Host-ball=; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/; Secure'
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

    assert.equal((await t.values()).length, 4)
    assert.ok(
      (await t.values()).some((value) => value.startsWith('__Secure-vixen='))
    )
    assert.ok((await t.values()).some((value) => value.startsWith('tycho=')))
    assert.ok((await t.values()).some((value) => value.startsWith('dazzle=')))

    assert.ok(
      (await t.values()).some((value) =>
        value.startsWith(
          '__Host-ball=; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/; Secure'
        )
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

    assert.equal((await t.values()).length, 3)
    assert.ok(
      (await t.values()).some((value) =>
        value.startsWith('__Secure-vixen=; Expires=')
      )
    )

    assert.ok(
      (await t.values()).some((value) =>
        value.startsWith(
          'tycho=; Domain=example.com; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/tycho'
        )
      )
    )
    assert.ok(
      (await t.values()).some((value) =>
        value.startsWith(
          '__Host-ball=; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/; Secure'
        )
      )
    )

    assert.hasAllKeys(Object.fromEntries(await t.entries()), [
      'vixen',
      'tycho',
      'ball'
    ])

    // @ts-expect-error type
    assert.throws(() => t.del('abc'))

    // @ts-expect-error type
    assert.throws(() => t.set('abc', 'hello'))

    // @ts-expect-error type
    assert.throws(() => t.get('abc'))
  })

  it('same key cookies', () => {
    assert.throws(() => {
      jar()
        .put(vixen)
        .put(
          cookie({
            key: 'vixen',
            type: 'aes-gcm',
            secure: true,
            prefix: '__Secure-',
            // maxAge: 86400,
            keys: [keyA, keyC]
          })
        )
    })
  })

  it('same name cookies', async () => {
    const jarr = jar().put(vixen).put(vixenTwo).put(vixenThree)

    const cookieHeader = [
      `__Secure-vixen=${
        (await toAesGcm(
          encode({ key: 'vixen' }, vixen[SYMBOL_COOKIE].options)!,
          [keyC]
        )) as string
      }`,
      'qweqweqwe=123',
      `__Secure-vixen=${
        (await toAesGcm(
          encode({ key: 'vixenTwo' }, vixenTwo[SYMBOL_COOKIE].options)!,
          [keyB]
        )) as string
      }`,
      `__Secure-vixen=${
        (await toAesGcm(
          encode({ key: 'vixenThree' }, vixenThree[SYMBOL_COOKIE].options)!,
          [keyC]
        )) as string
      }`
    ].join('; ')

    const t = await take(cookieHeader, jarr)

    const values = await t.values()

    assert.equal(values.length, 1)
    assert.ok(values[0].endsWith('; Max-Age=86400; Secure'))

    assert.deepEqual(await t.get('vixen'), { key: 'vixen' })
    assert.deepEqual(await t.get('vixenTwo'), { key: 'vixenTwo' })
    assert.deepEqual(await t.get('vixenThree'), {
      key: 'vixenThree'
    })
  })
})
