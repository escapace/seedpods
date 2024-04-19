export type AnyObject =
  | null
  | Record<number | string | symbol, unknown>
  | undefined

const isObject = (value: unknown): value is AnyObject =>
  typeof value === 'object'

function equalArray(left: unknown[], right: unknown[]) {
  const { length } = left

  if (length !== right.length) {
    return false
  }

  for (let index = length; index-- !== 0; ) {
    if (!isEqual(left[index], right[index])) {
      return false
    }
  }

  return true
}

export function isEqual(left: unknown, right: unknown) {
  if (left === right) {
    return true
  }

  // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
  if (left && isObject(left) && right && isObject(right)) {
    if (left.constructor !== right.constructor) {
      return false
    }

    if (Array.isArray(left) && Array.isArray(right)) {
      return equalArray(left, right)
    }

    if (left.valueOf !== Object.prototype.valueOf) {
      return left.valueOf() === right.valueOf()
    }

    const leftKeys = Object.keys(left)

    for (let index = leftKeys.length; index-- !== 0; ) {
      const key = leftKeys[index]

      if (!isEqual(left[key], right[key])) {
        return false
      }
    }

    return true
  }

  if (Number.isNaN(left) && Number.isNaN(right)) {
    return true
  }

  return left === right
}
