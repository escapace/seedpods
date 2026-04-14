import {
  SEEDPODS_AES_GCM_AUTHENTICATION_TAG_LENGTH,
  SEEDPODS_AES_GCM_IV_LENGTH,
} from '../constants'
import type { SeedpodsConfiguredKey } from '../types'
import { base64UrlToBytesExact, bytesToBase64Url, utf8ToBytes } from '../utilities/bytes'
import { decodeKid } from '../utilities/decode-kid'
import { encodeKid } from '../utilities/encode-kid'

export const to = async (
  buffer: Uint8Array,
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
  const iv = crypto.getRandomValues(new Uint8Array(SEEDPODS_AES_GCM_IV_LENGTH))
  const cipher = new Uint8Array(
    await crypto.subtle.encrypt(
      { additionalData: utf8ToBytes(kid), iv, name: 'AES-GCM' },
      key,
      buffer,
    ),
  )

  return `${kid}.${bytesToBase64Url(cipher)}.${bytesToBase64Url(iv)}`
}

export const from = async (cookieValue: string, keys: SeedpodsConfiguredKey[]) => {
  const split = cookieValue.split('.')

  if (split.length !== 3) {
    return
  }

  const [kidSegment, ciperB64, ivB64] = split

  if (ciperB64.length === 0 || ivB64.length === 0) {
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
  const cipher = base64UrlToBytesExact(ciperB64)
  const iv = base64UrlToBytesExact(ivB64)

  if (
    cipher === undefined ||
    iv === undefined ||
    cipher.length < SEEDPODS_AES_GCM_AUTHENTICATION_TAG_LENGTH
  ) {
    return
  }

  if (iv.length !== SEEDPODS_AES_GCM_IV_LENGTH) {
    return
  }

  const key = await crypto.subtle.importKey('raw', selected.value, 'AES-GCM', false, [
    'encrypt',
    'decrypt',
  ])

  try {
    const value = new Uint8Array(
      await crypto.subtle.decrypt(
        { additionalData: utf8ToBytes(kidSegment), iv, name: 'AES-GCM' },
        key,
        cipher,
      ),
    )

    return { rotate: index > 0, value }
  } catch {
    return
  }
}
