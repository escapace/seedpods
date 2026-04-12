import sjson from 'secure-json-parse'
import { parseCookieValue } from './parse-cookie-options'

export const decode = (value: Buffer) => {
  try {
    return parseCookieValue(
      sjson.parse(value.toString(), undefined, {
        constructorAction: 'remove',
        protoAction: 'remove',
      }) as unknown,
    )
  } catch {
    return
  }
}
