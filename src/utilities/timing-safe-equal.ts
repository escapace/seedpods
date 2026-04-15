export function timingSafeEqual(a: Uint8Array, b: Uint8Array) {
  if (a.length !== b.length) {
    return false
  }

  const length = a.length
  let out = 0
  let index = -1

  while (++index < length) {
    out |= a[index] ^ b[index]
  }

  return out === 0
}
