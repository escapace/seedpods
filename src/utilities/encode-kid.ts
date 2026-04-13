export const encodeKid = (value: string): string => Buffer.from(value).toString('base64url')
