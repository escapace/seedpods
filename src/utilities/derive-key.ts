import type { SeedpodsDeriveKeyOptions } from '../types'
import { utf8ToBytes } from './bytes'

/**
 * Derives a symmetric key from a secret string.
 *
 * @remarks
 * The function uses Password-Based Key Derivation Function 2 with SHA-512 and returns raw key bytes. Pass a fixed salt when the same secret must produce the same key across processes or deployments. When no salt is provided, a random salt is generated and the derived key changes between calls.
 *
 * @param secret - Secret input used as the derivation source.
 * @param options - Optional derivation parameters, including salt and iteration count.
 * @returns The derived key bytes.
 */
export const deriveKey = async (
  secret: string,
  options?: SeedpodsDeriveKeyOptions,
): Promise<Uint8Array> => {
  const passphraseKey = await crypto.subtle.importKey('raw', utf8ToBytes(secret), 'PBKDF2', false, [
    'deriveKey',
    'deriveBits',
  ])

  const key = await crypto.subtle.deriveKey(
    {
      hash: 'SHA-512',
      iterations: options?.iterations ?? 600_000,
      name: 'PBKDF2',
      salt:
        typeof options?.salt === 'string'
          ? utf8ToBytes(options.salt)
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

  return new Uint8Array(await crypto.subtle.exportKey('raw', key))
}
