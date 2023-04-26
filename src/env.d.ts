declare const crypto = {
  subtle: SubtleCrypto,
  getRandomValues: typeof Crypto.getRandomValues
}
