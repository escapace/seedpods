import { bytesToBase64Url, utf8ToBytes } from './bytes'

export const fingerprintPolicy = async (canonical: string): Promise<string> => {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', utf8ToBytes(canonical)))

  return bytesToBase64Url(digest)
}
