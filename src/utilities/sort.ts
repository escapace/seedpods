import { isArray, isPlainObject } from 'lodash-es'
import { JSONType } from '../types'

export const sort = <T extends JSONType>(value: T): T => {
  if (isArray(value)) {
    return ([...value] as JSONType[]).map((item) => sort(item)) as T
  }

  if (isPlainObject(value)) {
    return Object.assign(
      {},
      ...Object.keys(value as { [key: string]: JSONType })
        .sort((a, b) => a.localeCompare(b))
        .map((key) => ({
          [key]: sort((value as { [key: string]: JSONType })[key])
        }))
    ) as T
  }

  return value
}
