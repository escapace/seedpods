import { base64UrlToBytesExact, bytesToUtf8 } from './bytes'

export const decodeKid = (value: string): string | undefined => {
  if (value.length === 0) {
    return
  }

  const buffer = base64UrlToBytesExact(value)

  if (buffer === undefined || buffer.length === 0) {
    return
  }

  const decoded = bytesToUtf8(buffer)

  if (decoded.length === 0) {
    return
  }

  return decoded
}
