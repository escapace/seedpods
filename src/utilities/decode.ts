import sjson from 'secure-json-parse'
import { cookieValueSchema } from './parse-cookie-options'

export const decode = (value: Buffer) => {
  try {
    const payload = cookieValueSchema.parse(
      sjson.parse(value.toString(), undefined, {
        constructorAction: 'remove',
        protoAction: 'remove'
      }) as unknown
    )

    return payload
  } catch {
    return
  }
}
