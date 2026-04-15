import { SEEDPODS_HMAC_SHA_256_SIGNATURE_LENGTH } from '../constants'
import type { SeedpodsConfiguredKey } from '../types'
import { base64UrlToBytesExact, bytesToBase64Url, utf8ToBytes } from '../utilities/bytes'
import { decodeKid } from '../utilities/decode-kid'
import { encodeKid } from '../utilities/encode-kid'
import { timingSafeEqual } from '../utilities/timing-safe-equal'

const sign = async (input: Uint8Array, keyMaterial: Uint8Array): Promise<Uint8Array> => {
  const key = await crypto.subtle.importKey(
    'raw',
    keyMaterial,
    { hash: 'SHA-256', name: 'HMAC' },
    false,
    ['sign'],
  )

  return new Uint8Array(await crypto.subtle.sign('HMAC', key, input))
}

export const to = async function (
  buffer: Uint8Array,
  keys: SeedpodsConfiguredKey[],
): Promise<string | undefined> {
  if (buffer.length === 0) {
    return undefined
  }

  const [key] = keys
  const kid = encodeKid(key.id)
  const payload = bytesToBase64Url(buffer)
  const input = `${kid}.${payload}`
  const signature = await sign(utf8ToBytes(input), key.value)

  return `${input}.${bytesToBase64Url(signature)}`
}

export const from = async (cookieValue: string, keys: SeedpodsConfiguredKey[]) => {
  const split = cookieValue.split('.')

  if (split.length !== 3) {
    return
  }

  const [kidSegment, payloadSegment, signatureSegment] = split

  if (payloadSegment.length === 0 || signatureSegment.length === 0) {
    return
  }
  const id = decodeKid(kidSegment)

  if (id === undefined) {
    return
  }

  const index = keys.findIndex((key) => key.id === id)

  if (index === -1) {
    return
  }

  const selected = keys[index]
  const value = base64UrlToBytesExact(payloadSegment)
  const signature = base64UrlToBytesExact(signatureSegment)

  if (value === undefined || signature === undefined || value.length === 0) {
    return
  }

  if (signature.length !== SEEDPODS_HMAC_SHA_256_SIGNATURE_LENGTH) {
    return
  }

  const input = utf8ToBytes(`${kidSegment}.${payloadSegment}`)
  const expectedSignature = await sign(input, selected.value)

  if (expectedSignature.length !== signature.length) {
    return
  }

  if (!timingSafeEqual(expectedSignature, signature)) {
    return
  }

  return { rotate: index > 0, value }
}
