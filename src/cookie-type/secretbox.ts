/*!
 *
 * Adaptation of https://github.com/fastify/fastify-secure-session licensed under
 * the MIT License found in the LICENSE-FASTIFY-SECURE-SESSION file in the root
 * directory of this source tree.
 *
 */

import sodium from 'sodium-native'

export const genNonce = () => {
  const buffer = Buffer.allocUnsafe(sodium.crypto_secretbox_NONCEBYTES)
  sodium.randombytes_buf(buffer)

  return buffer
}

export const to = (buffer: Buffer, keys: Buffer[]): string | undefined => {
  if (buffer.length === 0) {
    return undefined
  }

  const nonce = genNonce()

  const ciphertext = Buffer.allocUnsafe(
    buffer.length + sodium.crypto_secretbox_MACBYTES
  )

  sodium.crypto_secretbox_easy(ciphertext, buffer, nonce, keys[0])

  return ciphertext.toString('base64url') + '.' + nonce.toString('base64url')
}

export const from = (cookieValue: string, keys: Buffer[]) => {
  const split = cookieValue.split('.')
  const cyphertextB64 = split[0]
  const nonceB64 = split[1]

  if (split.length !== 2) {
    // the cookie is malformed
    // log.debug(
    //   'fastify-secure-session: the cookie is malformed, creating an empty session'
    // )
    return undefined
  }

  const cipher = Buffer.from(cyphertextB64, 'base64url')
  const nonce = Buffer.from(nonceB64, 'base64url')

  if (cipher.length < sodium.crypto_secretbox_MACBYTES) {
    // not long enough
    // log.debug(
    //   'fastify-secure-session: the cipher is not long enough, creating an empty session'
    // )
    return undefined
  }

  if (nonce.length !== sodium.crypto_secretbox_NONCEBYTES) {
    // the length is not correct
    // log.debug(
    //   'fastify-secure-session: the nonce does not have the required length, creating an empty session'
    // )
    return undefined
  }

  const value = Buffer.allocUnsafe(
    cipher.length - sodium.crypto_secretbox_MACBYTES
  )

  let rotate = false

  const success = keys.some((secretKey, index) => {
    const decoded = sodium.crypto_secretbox_open_easy(
      value,
      cipher,
      nonce,
      secretKey
    )

    rotate = decoded && index > 0

    return decoded
  })

  if (!success) {
    // log.debug(
    //   'fastify-secure-session: unable to decrypt, creating an empty session'
    // )

    return undefined
  }

  return { value, rotate }
}
