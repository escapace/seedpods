export function timingSafeEqual(a: Buffer, b: Buffer) {
  if (a.length !== b.length) {
    throw new TypeError('Input buffers must have the same length')
  }

  const len = a.length
  let out = 0
  let i = -1

  while (++i < len) {
    out |= a[i] ^ b[i]
  }

  return out === 0
}
