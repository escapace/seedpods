interface DeriveOptions {
  iterations?: number
  length?: number
  salt?: string
}

export const deriveKey = async (secret: string, options?: DeriveOptions): Promise<Buffer> => {
  const passphraseKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    'PBKDF2',
    false,
    ['deriveKey', 'deriveBits'],
  )

  const key = await crypto.subtle.deriveKey(
    {
      hash: 'SHA-512',
      iterations: options?.iterations ?? 600_000,
      name: 'PBKDF2',
      salt:
        typeof options?.salt === 'string'
          ? Buffer.from(options.salt)
          : crypto.getRandomValues(new Uint8Array(32)),
    },
    passphraseKey,
    {
      length: 256,
      name: 'AES-GCM',
    },
    true,
    ['encrypt', 'decrypt'],
  )

  const buffer = Buffer.from(await crypto.subtle.exportKey('raw', key))

  return buffer
}
