/*!
 *
 * Adaptation of https://github.com/jshttp/cookie licensed under the MIT License
 * found in the https://github.com/jshttp/cookie/blob/master/LICENSE file.
 *
 */

export function parseCookieHeader(string?: string) {
  const map = new Map<string, string[]>()

  if (string === undefined) {
    return map
  }

  let index = 0
  while (index < string.length) {
    const eqIndex = string.indexOf('=', index)

    // no more cookie pairs
    if (eqIndex === -1) {
      break
    }

    let endIndex = string.indexOf(';', index)

    if (endIndex === -1) {
      endIndex = string.length
    } else if (endIndex < eqIndex) {
      // backtrack on prior semicolon
      index = string.lastIndexOf(';', eqIndex - 1) + 1
      continue
    }

    const key = string.slice(index, eqIndex).trim()

    // if (!map.has(key)) {
    let value = string.slice(eqIndex + 1, endIndex).trim()

    // quoted values
    if (value.charCodeAt(0) === 0x22) {
      value = value.slice(1, -1)
    }

    if (map.has(key)) {
      // eslint-disable-next-line typescript/no-non-null-assertion
      const array = map.get(key)!
      array.push(value)
    } else {
      const array = [value]
      map.set(key, array)
    }

    index = endIndex + 1
  }

  return map
}
