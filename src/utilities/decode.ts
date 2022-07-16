import { JSONType } from '../types'

export const decode = (value: Buffer): JSONType | undefined => {
  try {
    return JSON.parse(value.toString()) as JSONType
  } catch {
    return undefined
  }
}
