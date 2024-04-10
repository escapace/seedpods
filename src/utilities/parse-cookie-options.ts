/* eslint-disable @typescript-eslint/no-unused-vars */
import z from 'zod'

// eslint-disable-next-line no-useless-escape
const FIELD_CONTENT_REGEXP = /^(?=[\x20-\x7E]*$)[^()@<>,;:\\"\[\]?={}\s]+$/

const jsonSchema: z.ZodType<unknown> = z.lazy(() =>
  z.union([
    z.union([z.string(), z.number(), z.boolean(), z.null()]),
    z.array(jsonSchema),
    z.record(jsonSchema)
  ])
)

const sharedOptionsSchema = z.object({
  maxAge: z
    .number()
    .int()
    .refine((value) => value >= 0)
    .optional()
})

export const cookieValueSchema = z
  .object({
    options: sharedOptionsSchema
      .extend({
        key: z.string()
      })
      .strip(),
    value: jsonSchema
  })
  .strip()

const baseOptionsSchema = sharedOptionsSchema.extend({
  domain: z
    .string()
    .min(1)
    .refine(
      (value) => {
        const char1 = value.charAt(0)
        const charN = value.charAt(value.length - 1)
        if (char1 === '-' || charN === '.' || charN === '-') {
          return false
        }

        return true
      },
      { message: 'Invalid first/last char in cookie domain' }
    )
    .optional(),
  path: z
    .string()
    .min(1)
    .refine(
      (value) => {
        for (let i = 0; i < value.length; i++) {
          const c = value.charAt(i)
          if (
            c < String.fromCharCode(0x20) ||
            c > String.fromCharCode(0x7e) ||
            c === ';'
          ) {
            return false
          }
        }

        return true
      },
      { message: 'Invalid cookie path character' }
    )
    .optional(),
  secure: z.boolean().optional(),
  httpOnly: z.boolean().optional(),
  sameSite: z.enum(['Strict', 'Lax', 'None']).optional(),
  key: z
    .string()
    .min(1)
    .refine(
      (value) => {
        return FIELD_CONTENT_REGEXP.test(value)
      },
      { message: 'Invalid cookie key' }
    ),
  name: z
    .string()
    .optional()
    .refine(
      (value) => {
        if (value === undefined) {
          return true
        }

        return (
          FIELD_CONTENT_REGEXP.test(value) &&
          !['__Secure-', '__Host-'].some((prefix) => value.startsWith(prefix))
        )
      },
      { message: 'Invalid cookie key' }
    ),
  // expires: z
  //   .date()
  //   .transform((date) => ({ imf: toIMF(date), date }))
  //   .optional(),
  prefix: z.literal('__Secure-').or(z.literal('__Host-')).optional()
})

const cookieOptionsSchema = z
  .discriminatedUnion('type', [
    baseOptionsSchema
      .extend({
        type: z.literal('aes-gcm'),
        keys: z
          .array(
            z
              .any()
              .refine<Buffer>((value: unknown): value is Buffer =>
                Buffer.isBuffer(value)
              )
              .refine((value) => value.byteLength === 32, {
                message: `The key should be strictly 256 bits.`
              })
          )
          .nonempty()
          .max(5)
      })
      .strict(),
    baseOptionsSchema
      .extend({
        type: z.literal('hmac'),
        keys: z
          .array(
            z
              .any()
              .refine<Buffer>((value: unknown): value is Buffer =>
                Buffer.isBuffer(value)
              )
          )
          .nonempty()
          .max(5)
      })
      .strict()
  ])
  .refine(
    (value) => {
      if (value.prefix === '__Secure-') {
        return value.secure === true
      }

      if (value.prefix === '__Host-') {
        return (
          value.secure === true &&
          value.domain === undefined &&
          value.path === '/'
        )
      }

      return true
    },
    {
      message:
        '"__Host-" prefixed cookie must be set with a "secure" attribute, MUST NOT contain a "Domain" attribute and MUST contain a "Path" attribute with a value of "/"'
    }
  )
  .transform((cookie) => {
    const name =
      cookie.prefix === undefined
        ? cookie.name ?? cookie.key
        : `${cookie.prefix}${cookie.name ?? cookie.key}`

    return {
      ...cookie,
      name
    }
  })

export type CookieOptionsSchema = typeof cookieOptionsSchema
export type ZodInputCookieOptionsSchema = z.input<CookieOptionsSchema>
export type ZodOutputCookieOptionsSchema = z.output<CookieOptionsSchema>
export type CookieType = ZodInputCookieOptionsSchema['type']

export type CookieValueSchema = typeof cookieValueSchema
export type CookieValueInput = z.input<CookieValueSchema>
export type CookieValue = z.output<CookieValueSchema>

export type CookieOptions<
  KEY extends string,
  TYPE extends CookieType,
  _VALUE
> = Omit<ZodInputCookieOptionsSchema, 'key' | 'type'> & {
  key: KEY
  type: TYPE
}

export type CookieOptionsParsed<
  KEY extends string,
  TYPE extends CookieType,
  _VALUE
> = Omit<ZodOutputCookieOptionsSchema, 'key' | 'type'> & {
  key: KEY
  type: TYPE
}

export const parseCookieOptions = <
  KEY extends string,
  TYPE extends CookieType,
  _VALUE
>(
  value: CookieOptions<KEY, TYPE, _VALUE>
): CookieOptionsParsed<KEY, TYPE, _VALUE> => {
  const result = cookieOptionsSchema.safeParse(value)

  if (result.success) {
    return result.data as CookieOptionsParsed<KEY, TYPE, _VALUE>
  }

  const err = result.error

  if (err instanceof z.ZodError) {
    const flattenedError = err.flatten()
    const message = [
      'Encountered issues parsing options.',
      ...flattenedError.formErrors,
      ...Object.keys(flattenedError.fieldErrors).flatMap((key) => {
        const value =
          flattenedError.fieldErrors[
            key as keyof typeof flattenedError.fieldErrors
          ]!

        return value.map((str) => `Key '${key}' - ${str.toLowerCase()}.`)
      })
    ].join(' ')

    throw new Error(message)
  }

  // eslint-disable-next-line @typescript-eslint/no-throw-literal
  throw err
}
