/*!
 *
 * Adaptation of https://github.com/tj/node-cookie-signature licensed under the
 * MIT License found in the LICENSE-COOKIE-SIGNATURE file in the root
 * directory of this source tree.
 *
 */

import crypto from 'node:crypto'

export const to = function (
  buffer: Buffer,
  keys: Buffer[],
  keyIndex = 0
): string | undefined {
  if (buffer.length === 0) {
    return undefined
  }

  return (
    buffer.toString('base64url') +
    '.' +
    crypto
      .createHmac('sha256', keys[keyIndex])
      .update(buffer)
      .digest('base64url')
  )
}

export const from = (cookieValue: string, keys: Buffer[]) => {
  const split = cookieValue.split('.')
  const valueB64 = split[0]
  // const digestB64 = split[1]

  if (split.length !== 2) {
    // the cookie is malformed
    // log.debug(
    //   'fastify-secure-session: the cookie is malformed, creating an empty session'
    // )
    return undefined
  }

  const value = Buffer.from(valueB64, 'base64url')
  // const digest = Buffer.from(digestB64, 'base64url')

  let rotate = false

  const inputBuffer = Buffer.from(cookieValue)

  const success = keys.some((_, index) => {
    const expectedInput = to(value, keys, index)

    if (expectedInput === undefined) {
      return false
    }

    const expectedBuffer = Buffer.from(expectedInput)

    const decoded =
      expectedBuffer.length === inputBuffer.length &&
      crypto.timingSafeEqual(expectedBuffer, inputBuffer)

    rotate = decoded && index > 0

    return decoded
  })

  if (!success) {
    return undefined
  }

  return { value, rotate }
}
