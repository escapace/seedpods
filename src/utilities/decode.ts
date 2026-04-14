import sjson from 'secure-json-parse'
import { bytesToUtf8 } from './bytes'
import { parseCookieValue } from './parse-cookie-options'

export const decode = (value: Uint8Array) => {
  try {
    return parseCookieValue(
      sjson.parse(bytesToUtf8(value), undefined, {
        constructorAction: 'remove',
        protoAction: 'remove',
      }) as unknown,
    )
  } catch {
    return
  }
}
