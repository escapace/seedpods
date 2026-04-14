import { bytesToBase64Url, utf8ToBytes } from './bytes'

export const encodeKid = (value: string): string => bytesToBase64Url(utf8ToBytes(value))
