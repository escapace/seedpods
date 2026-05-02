/*!
 *
 * Adaptation of https://github.com/jshttp/cookie licensed under the MIT License
 * found in the https://github.com/jshttp/cookie/blob/master/LICENSE file.
 *
 */

/**
 * Parses a `Cookie` header value into a map of cookie names and values.
 *
 * @remarks
 * Repeated cookie names are preserved in encounter order. Quoted cookie values keep their surrounding double quotes because rfc6265bis treats them as part of the cookie-value. Fragments without an equals sign are ignored. When the input is `undefined`, the function returns an empty map.
 *
 * @param string - Raw `Cookie` header value.
 * @returns A map from each cookie name to all received values for that name.
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
    const value = string.slice(eqIndex + 1, endIndex).trim()

    if (map.has(key)) {
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
