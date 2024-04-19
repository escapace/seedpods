/*!
 *
 * Adaptation of https://github.com/denoland/deno_std licensed under the MIT
 * License found in the LICENSE-DENO-STD file in the root directory of this
 * source tree.
 *
 */

/**
 * Validate Cookie Value.
 * See {@link https://tools.ietf.org/html/rfc6265#section-4.1}.
 * @param value Cookie value.
 */
export function validateCookieValue(value: string): boolean {
  for (let index = 0; index < value.length; index++) {
    const c = value.charAt(index)

    if (
      c < String.fromCharCode(0x21) ||
      c === String.fromCharCode(0x22) ||
      c === String.fromCharCode(0x2c) ||
      c === String.fromCharCode(0x3b) ||
      c === String.fromCharCode(0x5c) ||
      c === String.fromCharCode(0x7f)
    ) {
      return false
    }

    if (c > String.fromCharCode(0x80)) {
      return false
    }
  }

  return true
}
