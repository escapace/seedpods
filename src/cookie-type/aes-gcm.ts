import type { SeedpodsConfiguredKey } from '../types'
import { decodeKid } from '../utilities/decode-kid'
import { encodeKid } from '../utilities/encode-kid'

export const to = async (
  buffer: Buffer,
  keys: SeedpodsConfiguredKey[],
): Promise<string | undefined> => {
  if (buffer.length === 0) {
    return undefined
  }

  const [selected] = keys
  const kid = encodeKid(selected.id)
  const key = await crypto.subtle.importKey('raw', selected.value, 'AES-GCM', false, [
    'encrypt',
    'decrypt',
  ])

  // https://developer.mozilla.org/en-US/docs/Web/API/AesGcmParams
  const iv = Buffer.from(crypto.getRandomValues(new Uint8Array(12)))
  const cipher = Buffer.from(
    await crypto.subtle.encrypt(
      { additionalData: Buffer.from(kid), iv, name: 'AES-GCM' },
      key,
      buffer,
    ),
  )

  return `${kid}.${cipher.toString('base64url')}.${iv.toString('base64url')}`
}

export const from = async (cookieValue: string, keys: SeedpodsConfiguredKey[]) => {
  const split = cookieValue.split('.')

  if (split.length !== 3) {
    return
  }

  const [kidSegment, ciperB64, ivB64] = split
  const id = decodeKid(kidSegment)

  if (id === undefined) {
    return
  }

  const index = keys.findIndex((key) => key.id === id)

  if (index === -1) {
    return
  }

  const selected = keys[index]
  const cipher = Buffer.from(ciperB64, 'base64url')
  const iv = Buffer.from(ivB64, 'base64url')

  const key = await crypto.subtle.importKey('raw', selected.value, 'AES-GCM', false, [
    'encrypt',
    'decrypt',
  ])

  try {
    const value = Buffer.from(
      await crypto.subtle.decrypt(
        { additionalData: Buffer.from(kidSegment), iv, name: 'AES-GCM' },
        key,
        cipher,
      ),
    )

    return { rotate: index > 0, value }
  } catch {
    return
  }
}
