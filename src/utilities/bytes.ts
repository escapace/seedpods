const textDecoder = new TextDecoder()
const textEncoder = new TextEncoder()

/**
 * Encodes a string as UTF-8 bytes.
 *
 * @param value - String value to encode.
 * @returns UTF-8 bytes for the input string.
 */
export const utf8ToBytes = (value: string): Uint8Array => textEncoder.encode(value)

/**
 * Decodes UTF-8 bytes into a string.
 *
 * @param value - Byte sequence to decode.
 * @returns String decoded from the input bytes.
 */
export const bytesToUtf8 = (value: Uint8Array): string => textDecoder.decode(value)

/**
 * Encodes bytes as a base64 string.
 *
 * @remarks
 * This helper keeps Node.js `Buffer` usage confined to base64 serialization boundaries.
 *
 * @param value - Bytes to encode.
 * @returns Canonical base64 representation of the input bytes.
 */
export const bytesToBase64 = (value: Uint8Array): string => Buffer.from(value).toString('base64')

/**
 * Encodes bytes as a base64url string.
 *
 * @remarks
 * This helper is the canonical base64url encoder used by the cookie codecs and related parsing helpers.
 * It keeps Node.js `Buffer` usage confined to base64url serialization boundaries.
 *
 * @param value - Bytes to encode.
 * @returns Canonical base64url representation of the input bytes.
 */
export const bytesToBase64Url = (value: Uint8Array): string =>
  Buffer.from(value).toString('base64url')

/**
 * Decodes a base64url string only when it is already in canonical form.
 *
 * @remarks
 * Decoding and validation are different operations here. `Buffer.from(value, 'base64url')` is permissive and
 * accepts several non-canonical spellings of the same bytes, such as padded inputs or strings that use the
 * standard base64 alphabet. This helper turns that permissive decoder into a strict validator: it decodes the
 * input, re-encodes it with {@link bytesToBase64Url}, and returns bytes only when the original string matches
 * that canonical base64url form exactly.
 *
 * The cookie codecs use this helper to ensure that one byte sequence has one accepted textual representation.
 * That keeps malformed-input rejection consistent across HMAC, AES-GCM, and key-identifier parsing, and avoids
 * relying on ad hoc round-trip checks in each caller.
 *
 * @param value - Base64url string to decode.
 * @returns Decoded bytes when the input is canonical base64url; otherwise, `undefined`.
 */
export const base64UrlToBytesExact = (value: string): Uint8Array | undefined => {
  const buffer = new Uint8Array(Buffer.from(value, 'base64url'))

  return bytesToBase64Url(buffer) === value ? buffer : undefined
}
