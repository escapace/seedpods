import { JSONType } from '../types'
import { sort } from './sort'

export const encode = (value: JSONType): Buffer | undefined => {
  const v: string | undefined = JSON.stringify(sort(value))

  return v === undefined ? undefined : Buffer.from(v)
}
