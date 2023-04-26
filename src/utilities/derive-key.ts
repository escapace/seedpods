export interface DeriveOptions {
  salt?: string
  iterations?: number
  length?: number
}

export const deriveKey = async (
  secret: string,
  opts?: DeriveOptions
): Promise<Buffer> => {
  const passphraseKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    'PBKDF2',
    false,
    ['deriveKey', 'deriveBits']
  )

  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      iterations: opts?.iterations ?? 600000,
      hash: 'SHA-512',
      salt:
        typeof opts?.salt === 'string'
          ? Buffer.from(opts.salt)
          : crypto.getRandomValues(new Uint8Array(32))
    },
    passphraseKey,
    {
      name: 'AES-GCM',
      length: 256
    },
    true,
    ['encrypt', 'decrypt']
  )

  const buffer = Buffer.from(await crypto.subtle.exportKey('raw', key))

  return buffer
}
