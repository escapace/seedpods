export function timingSafeEqual(a: Buffer, b: Buffer) {
  if (a.length !== b.length) {
    throw new TypeError('Input buffers must have the same length')
  }

  const length = a.length
  let out = 0
  let index = -1

  while (++index < length) {
    out |= a[index] ^ b[index]
  }

  return out === 0
}
