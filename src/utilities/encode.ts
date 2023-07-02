import { canonicalize } from '@escapace/canonicalize'
import { JSONType } from '../types'

export const encode = (value: JSONType): Buffer | undefined => {
  const v: string | undefined = canonicalize(value)

  return v === undefined ? undefined : Buffer.from(v)
}
