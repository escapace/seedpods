/* eslint-disable no-labels */

export const to = async (
  buffer: Buffer,
  keys: Buffer[]
): Promise<string | undefined> => {
  if (buffer.length === 0) {
    return undefined
  }

  const key = await crypto.subtle.importKey('raw', keys[0], 'AES-GCM', false, [
    'encrypt',
    'decrypt'
  ])

  // https://developer.mozilla.org/en-US/docs/Web/API/AesGcmParams
  const iv = Buffer.from(crypto.getRandomValues(new Uint8Array(12)))
  const cipher = Buffer.from(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, buffer)
  )

  return cipher.toString('base64url') + '.' + iv.toString('base64url')
}

export const from = async (cookieValue: string, keys: Buffer[]) => {
  const split = cookieValue.split('.')

  if (split.length !== 2) {
    return undefined
  }

  const [ciperB64, ivB64] = split

  const cipher = Buffer.from(ciperB64, 'base64url')
  const iv = Buffer.from(ivB64, 'base64url')

  let success = false
  let rotate = false
  let value: Buffer | undefined

  outer: for (let index = 0; index < keys.length; index++) {
    const key = await crypto.subtle.importKey(
      'raw',
      keys[index],
      'AES-GCM',
      false,
      ['encrypt', 'decrypt']
    )

    try {
      value = Buffer.from(
        await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipher)
      )

      rotate = index > 0
      success = true
      break outer
    } catch (e) {
      continue
    }
  }

  if (success && value !== undefined) {
    return { value, rotate }
  }

  return undefined
}
