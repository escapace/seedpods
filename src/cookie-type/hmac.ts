import { timingSafeEqual } from '../utilities/timing-safe-equal'

export const to = async function (
  buffer: Buffer,
  keys: Buffer[],
  keyIndex = 0
): Promise<string | undefined> {
  if (buffer.length === 0) {
    return undefined
  }

  const key = await crypto.subtle.importKey(
    'raw',
    keys[keyIndex],
    { hash: 'SHA-256', name: 'HMAC' },
    false,
    ['sign', 'verify']
  )
  const signature = Buffer.from(await crypto.subtle.sign('HMAC', key, buffer))

  return buffer.toString('base64url') + '.' + signature.toString('base64url')
}

export function compare(a: Buffer, b: Buffer) {
  if (a.length !== b.length) {
    timingSafeEqual(a, a)
    return false
  }

  return timingSafeEqual(a, b)
}

export const from = async (cookieValue: string, keys: Buffer[]) => {
  const split = cookieValue.split('.')
  const valueB64 = split[0]

  if (split.length !== 2) {
    return
  }

  const value = Buffer.from(valueB64, 'base64url')

  let rotate = false
  let success = false

  const inputBuffer = Buffer.from(cookieValue)

  for (let index = 0; index < keys.length; index++) {
    const expectedInput = await to(value, keys, index)

    if (expectedInput === undefined) {
      continue
    }

    const expectedBuffer = Buffer.from(expectedInput)

    const decoded = compare(expectedBuffer, inputBuffer)

    rotate = decoded && index > 0

    if (decoded) {
      success = true
      break
    }
  }

  if (!success) {
    return
  }

  return { rotate, value }
}
