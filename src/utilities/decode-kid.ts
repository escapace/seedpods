export const decodeKid = (value: string): string | undefined => {
  if (value.length === 0) {
    return
  }

  const buffer = Buffer.from(value, 'base64url')

  if (buffer.length === 0) {
    return
  }

  const decoded = buffer.toString()

  if (decoded.length === 0) {
    return
  }

  return Buffer.from(decoded).toString('base64url') === value ? decoded : undefined
}
