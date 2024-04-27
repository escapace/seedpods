/* eslint-disable typescript/no-non-null-assertion */
import { assert, describe, it } from 'vitest'
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
  keys: [keyA, keyC],
  maxAge: 86_400,
  name: 'vixen',
  prefix: '__Secure-',
  secure: true,
  type: 'aes-gcm',
})

const vixenTwo = cookie({
  key: 'vixenTwo',
  keys: [keyB],
  maxAge: 86_400,
  name: 'vixen',
  path: '/two',
  prefix: '__Secure-',
  sameSite: 'Strict',
  secure: true,
  type: 'aes-gcm',
})

const vixenThree = cookie({
  domain: 'example.com',
  key: 'vixenThree',
  keys: [keyC],
  maxAge: 86_400,
  name: 'vixen',
  prefix: '__Secure-',
  secure: true,
  type: 'aes-gcm',
})

const tycho = cookie<'tycho', 'aes-gcm', string[]>({
  domain: 'example.com',
  key: 'tycho',
  keys: [keyB, keyA],
  path: '/tycho',
  type: 'aes-gcm',
})

const dazzle = cookie<'dazzle', 'hmac', number>({
  httpOnly: true,
  key: 'dazzle',
  // expires: new Date('2023-01-11'),
  keys: [keyC, keyB],
  sameSite: 'Lax',
  type: 'hmac',
})

const ball = cookie({
  key: 'ball',
  keys: [keyD],
  path: '/',
  prefix: '__Host-',
  secure: true,
  type: 'hmac',
})

const cookieJar = jar().put(vixen).put(tycho).put(dazzle).put(ball)

describe('jar', () => {
  it('.', () => {
    assert.isFunction(jar)
    assert.hasAllKeys(jar(), ['put'])

    assert.hasAllKeys(cookieJar, ['put', SYMBOL_JAR])

    assert.deepStrictEqual(cookieJar[SYMBOL_JAR], {
      log: [
        { payload: ball, type: TypeAction.Cookie },
        { payload: dazzle, type: TypeAction.Cookie },
        { payload: tycho, type: TypeAction.Cookie },
        { payload: vixen, type: TypeAction.Cookie },
      ],
      state: {
        cookies: {
          ball,
          dazzle,
          tycho,
          vixen,
        },
      },
    })
  })

  it('fails', () => {
    assert.throw(
      // @ts-expect-error test
      () => jar().put(vixen).put(tycho).put(dazzle).put({}),
      /not a cookie/i,
    )
  })
})

describe('take', () => {
  it('.', async () => {
    assert.isFunction(take)
    assert.hasAllKeys(await take('', cookieJar), ['del', 'get', 'set', 'values', 'entries'])
  })

  it('.', async () => {
    const cookieHeader = `__Secure-vixen=${(await toAesGcm(
      encode({ author: 'escape', change: 'triangle' }, vixen[SYMBOL_COOKIE].options)!,
      [keyC],
    ))!}; tycho=${(await toAesGcm(
      encode(['threw', 'satellites', 'class'], tycho[SYMBOL_COOKIE].options)!,
      [keyB, keyA],
    ))!}; __Host-ball=${Buffer.from('ride problem cause market').toString('base64url')}; abc=qwe`

    const t = await take(cookieHeader, cookieJar, {
      tycho(previous?: string[], next?: string[]): string[] {
        return [...(previous ?? []), ...(next ?? [])]
      },
    })

    assert.equal((await t.values()).length, 2)

    assert.ok((await t.values()).some((value) => value.startsWith('__Secure-vixen=')))

    assert.ok(
      (await t.values()).some(
        (value) => value === '__Host-ball=; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/; Secure',
      ),
    )

    assert.deepEqual(t.get('vixen'), { author: 'escape', change: 'triangle' })
    assert.deepEqual(t.get('tycho'), ['threw', 'satellites', 'class'])
    assert.deepEqual(t.get('dazzle'), undefined)
    assert.deepEqual(t.get('ball'), undefined)

    t.set('vixen', { author: 'escape', change: 'triangle', sweet: 'silent' })
    t.set('tycho', ['every'])
    t.set('tycho', ['plain'])
    t.set('dazzle', 100)

    assert.equal((await t.values()).length, 4)
    assert.ok((await t.values()).some((value) => value.startsWith('__Secure-vixen=')))
    assert.ok((await t.values()).some((value) => value.startsWith('tycho=')))
    assert.ok((await t.values()).some((value) => value.startsWith('dazzle=')))

    assert.ok(
      (await t.values()).some((value) =>
        value.startsWith('__Host-ball=; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/; Secure'),
      ),
    )

    assert.deepEqual(t.get('vixen'), {
      author: 'escape',
      change: 'triangle',
      sweet: 'silent',
    })

    assert.deepEqual(t.get('tycho'), ['threw', 'satellites', 'class', 'every', 'plain'])

    assert.deepEqual(t.get('dazzle'), 100)
    assert.deepEqual(t.get('ball'), undefined)

    t.set('vixen', undefined)
    t.del('tycho')
    t.del('dazzle')
    t.del('ball')

    assert.equal((await t.values()).length, 3)
    assert.ok((await t.values()).some((value) => value.startsWith('__Secure-vixen=; Expires=')))

    assert.ok(
      (await t.values()).some((value) =>
        value.startsWith(
          'tycho=; Domain=example.com; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/tycho',
        ),
      ),
    )
    assert.ok(
      (await t.values()).some((value) =>
        value.startsWith('__Host-ball=; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/; Secure'),
      ),
    )

    assert.hasAllKeys(Object.fromEntries(await t.entries()), ['vixen', 'tycho', 'ball'])

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
            // maxAge: 86400,
            keys: [keyA, keyC],
            prefix: '__Secure-',
            secure: true,
            type: 'aes-gcm',
          }),
        )
    })
  })

  it('same name cookies', async () => {
    const jarr = jar().put(vixen).put(vixenTwo).put(vixenThree)

    const cookieHeader = [
      `__Secure-vixen=${(await toAesGcm(encode({ key: 'vixen' }, vixen[SYMBOL_COOKIE].options)!, [
        keyC,
      ]))!}`,
      'qweqweqwe=123',
      `__Secure-vixen=${(await toAesGcm(
        encode({ key: 'vixenTwo' }, vixenTwo[SYMBOL_COOKIE].options)!,
        [keyB],
      ))!}`,
      `__Secure-vixen=${(await toAesGcm(
        encode({ key: 'vixenThree' }, vixenThree[SYMBOL_COOKIE].options)!,
        [keyC],
      ))!}`,
    ].join('; ')

    const t = await take(cookieHeader, jarr)

    const values = await t.values()

    assert.equal(values.length, 1)
    assert.ok(values[0].endsWith('; Max-Age=86400; Secure'))

    assert.deepEqual(await t.get('vixen'), { key: 'vixen' })
    assert.deepEqual(await t.get('vixenTwo'), { key: 'vixenTwo' })
    assert.deepEqual(await t.get('vixenThree'), {
      key: 'vixenThree',
    })
  })
})
