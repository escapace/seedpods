import sjson from 'secure-json-parse'
import { JSONType } from '../types'

export const decode = (value: Buffer): JSONType | undefined => {
  try {
    return sjson.parse(value.toString(), undefined, {
      protoAction: 'remove',
      constructorAction: 'remove'
    })
  } catch {
    return undefined
  }
}
