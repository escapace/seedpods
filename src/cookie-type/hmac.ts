import type { SeedpodsConfiguredKey } from '../types'
import { decodeKid } from '../utilities/decode-kid'
import { encodeKid } from '../utilities/encode-kid'
import { timingSafeEqual } from '../utilities/timing-safe-equal'

const sign = async (input: Buffer, keyMaterial: Buffer): Promise<Buffer> => {
  const key = await crypto.subtle.importKey(
    'raw',
    keyMaterial,
    { hash: 'SHA-256', name: 'HMAC' },
    false,
    ['sign', 'verify'],
  )

  return Buffer.from(await crypto.subtle.sign('HMAC', key, input))
}

export const to = async function (
  buffer: Buffer,
  keys: SeedpodsConfiguredKey[],
): Promise<string | undefined> {
  if (buffer.length === 0) {
    return undefined
  }

  const [key] = keys
  const kid = encodeKid(key.id)
  const payload = buffer.toString('base64url')
  const input = `${kid}.${payload}`
  const signature = await sign(Buffer.from(input), key.value)

  return `${input}.${signature.toString('base64url')}`
}

export const from = async (cookieValue: string, keys: SeedpodsConfiguredKey[]) => {
  const split = cookieValue.split('.')

  if (split.length !== 3) {
    return
  }

  const [kidSegment, payloadSegment] = split
  const id = decodeKid(kidSegment)

  if (id === undefined) {
    return
  }

  const index = keys.findIndex((key) => key.id === id)

  if (index === -1) {
    return
  }

  const selected = keys[index]
  const value = Buffer.from(payloadSegment, 'base64url')
  const expectedInput = await to(value, [selected])

  if (expectedInput === undefined) {
    return
  }

  const expectedBuffer = Buffer.from(expectedInput)
  const inputBuffer = Buffer.from(cookieValue)

  if (expectedBuffer.length !== inputBuffer.length) {
    return
  }

  if (!timingSafeEqual(expectedBuffer, inputBuffer)) {
    return
  }

  return { rotate: index > 0, value }
}
