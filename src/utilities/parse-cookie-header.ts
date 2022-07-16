/*!
 *
 * Adaptation of https://github.com/jshttp/cookie licensed under the MIT License
 * found in the LICENSE-JSHTTP-COOKIE file in the root directory of this source
 * tree.
 *
 */

export function parseCookieHeader(string?: string) {
  const map: Map<string, string> = new Map()

  if (string === undefined) {
    return map
  }

  let index = 0
  while (index < string.length) {
    const eqIdx = string.indexOf('=', index)

    // no more cookie pairs
    if (eqIdx === -1) {
      break
    }

    let endIdx = string.indexOf(';', index)

    if (endIdx === -1) {
      endIdx = string.length
    } else if (endIdx < eqIdx) {
      // backtrack on prior semicolon
      index = string.lastIndexOf(';', eqIdx - 1) + 1
      continue
    }

    const key = string.slice(index, eqIdx).trim()

    if (!map.has(key)) {
      let value = string.slice(eqIdx + 1, endIdx).trim()

      // quoted values
      if (value.charCodeAt(0) === 0x22) {
        value = value.slice(1, -1)
      }

      map.set(key, value)
    }

    index = endIdx + 1
  }

  return map
}
