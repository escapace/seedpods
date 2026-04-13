/* eslint-disable typescript/no-explicit-any */
import type {
  SEEDPODS_COOKIE_PREFIXES,
  SEEDPODS_COOKIE_SAME_SITE_VALUES,
  SEEDPODS_COOKIE_TYPES,
  SEEDPODS_ERROR_TYPES,
  SEEDPODS_SYMBOL_COOKIE,
  SEEDPODS_SYMBOL_JAR,
} from './constants'

/**
 * Supported cookie name prefixes for {@link createCookie}.
 *
 * @remarks
 * `__Secure-` requires `secure: true`. `__Host-` requires `secure: true`, `path: '/'`, and no `domain`.
 */
export type SeedpodsCookiePrefix = (typeof SEEDPODS_COOKIE_PREFIXES)[number]

/**
 * Supported `SameSite` attribute values for cookie definitions.
 */
export type SeedpodsCookieSameSite = (typeof SEEDPODS_COOKIE_SAME_SITE_VALUES)[number]

/**
 * Supported cookie protection modes.
 *
 * @remarks
 * `'aes-gcm'` encrypts and authenticates the cookie value. `'hmac'` signs the value without encrypting it.
 */
export type SeedpodsCookieType = (typeof SEEDPODS_COOKIE_TYPES)[number]

/**
 * Supported {@link SeedpodsError} cause types.
 */
export type SeedpodsErrorType = (typeof SEEDPODS_ERROR_TYPES)[number]

export interface SeedpodsCookieValueOptions {
  key: string
  policy: string
}

export interface SeedpodsCookieValue {
  options: SeedpodsCookieValueOptions
  value: unknown
}

/**
 * Common cookie options shared by all cookie definitions.
 *
 * @typeParam SeedpodsCookieKey - Application key used to address the cookie through the cookie interface.
 */
export interface SeedpodsCookieOptionsBase<SeedpodsCookieKey extends string = string> {
  /**
   * Application key used to read, write, and delete the cookie.
   */
  key: SeedpodsCookieKey

  /**
   * Domain attribute written to `Set-Cookie`.
   */
  domain?: string

  /**
   * Whether the cookie is inaccessible to client-side JavaScript.
   */
  httpOnly?: boolean

  /**
   * Max-Age attribute, in seconds.
   */
  maxAge?: number

  /**
   * Cookie name written to the header. When omitted, the key is used.
   */
  name?: string

  /**
   * Path attribute written to `Set-Cookie`.
   */
  path?: string

  /**
   * Optional cookie name prefix.
   */
  prefix?: SeedpodsCookiePrefix

  /**
   * SameSite attribute written to `Set-Cookie`.
   *
   * @remarks
   * `sameSite: 'None'` requires `secure: true`.
   */
  sameSite?: SeedpodsCookieSameSite

  /**
   * Whether the cookie should opt in to partitioned storage where supported.
   *
   * @remarks
   * `partitioned: true` requires `secure: true`.
   */
  partitioned?: boolean

  /**
   * Whether the cookie requires a secure transport.
   */
  secure?: boolean
}

/**
 * Options for an encrypted cookie definition.
 *
 * @remarks
 * The first key is used to write new cookies. Later keys are accepted for reading so key rotation can happen without breaking existing cookies.
 *
 * @typeParam SeedpodsCookieKey - Application key used to address the cookie through the cookie interface.
 */
export interface SeedpodsEncryptedCookieOptions<
  SeedpodsCookieKey extends string = string,
> extends SeedpodsCookieOptionsBase<SeedpodsCookieKey> {
  /**
   * Encryption keys in write-first, read-fallback order.
   */
  keys: Buffer[]

  /**
   * Encryption mode.
   */
  type: 'aes-gcm'
}

/**
 * Options for a signed cookie definition.
 *
 * @remarks
 * The cookie value remains readable by clients. The signature prevents undetected modification.
 *
 * @typeParam SeedpodsCookieKey - Application key used to address the cookie through the cookie interface.
 */
export interface SeedpodsSignedCookieOptions<
  SeedpodsCookieKey extends string = string,
> extends SeedpodsCookieOptionsBase<SeedpodsCookieKey> {
  /**
   * Signing keys in write-first, read-fallback order.
   */
  keys: Buffer[]

  /**
   * Signing mode.
   */
  type: 'hmac'
}

/**
 * Supported options accepted by {@link createCookie}.
 *
 * @typeParam SeedpodsCookieKey - Application key used to address the cookie through the cookie interface.
 */
export type SeedpodsCookieOptions<SeedpodsCookieKey extends string = string> =
  | SeedpodsEncryptedCookieOptions<SeedpodsCookieKey>
  | SeedpodsSignedCookieOptions<SeedpodsCookieKey>

export interface SeedpodsParsedCookieOptionsBase<
  SeedpodsCookieKey extends string = string,
> extends Omit<SeedpodsCookieOptionsBase<SeedpodsCookieKey>, 'name'> {
  name: string
}

export interface SeedpodsParsedEncryptedCookieOptions<
  SeedpodsCookieKey extends string = string,
> extends SeedpodsParsedCookieOptionsBase<SeedpodsCookieKey> {
  keys: Buffer[]
  type: 'aes-gcm'
}

export interface SeedpodsParsedSignedCookieOptions<
  SeedpodsCookieKey extends string = string,
> extends SeedpodsParsedCookieOptionsBase<SeedpodsCookieKey> {
  keys: Buffer[]
  type: 'hmac'
}

export type SeedpodsParsedCookieOptions<SeedpodsCookieKey extends string = string> =
  | SeedpodsParsedEncryptedCookieOptions<SeedpodsCookieKey>
  | SeedpodsParsedSignedCookieOptions<SeedpodsCookieKey>

export type SeedpodsCookieOptionsForType<
  SeedpodsCookieKey extends string = string,
  SeedpodsCookieKind extends SeedpodsCookieType = SeedpodsCookieType,
> = Extract<SeedpodsCookieOptions<SeedpodsCookieKey>, { type: SeedpodsCookieKind }>

export type SeedpodsParsedCookieOptionsForType<
  SeedpodsCookieKey extends string = string,
  SeedpodsCookieKind extends SeedpodsCookieType = SeedpodsCookieType,
> = Extract<SeedpodsParsedCookieOptions<SeedpodsCookieKey>, { type: SeedpodsCookieKind }>

/**
 * Structured data carried by each {@link SeedpodsError} cause type.
 */
export interface SeedpodsErrorMetadata {
  CookieExpected: { actual: unknown }
  CookieOptionMissing: { option: string }
  CookieOptionsExpectedObject: { actual: unknown }
  CookieOptionTypeInvalid: { actual: unknown; expected: string; option: string }
  CookieOptionUnknown: { option: string }
  CookieOptionValueInvalid: { option: string; reason: string }
  CookiePrefixConfigurationInvalid: { prefix: '__Host-' | '__Secure-'; reason: string }
  JarExpected: { actual: unknown }
}

/**
 * Machine-readable error detail carried by {@link SeedpodsError}.
 *
 * @typeParam T - Error cause type to project.
 */
export type SeedpodsErrorCause<T extends SeedpodsErrorType = SeedpodsErrorType> =
  T extends SeedpodsErrorType ? { type: T } & SeedpodsErrorMetadata[T] : never

export enum SeedpodsCookieStateType {
  Expired,
  Indecipherable,
  Set,
  SetButNeedsUpdate,
  Unset,
}

export interface SeedpodsCookieStateSet {
  type: SeedpodsCookieStateType.Set
  value: unknown
}

export interface SeedpodsCookieStateUnset {
  type: SeedpodsCookieStateType.Unset
}

export interface SeedpodsCookieStateNeedsUpdate {
  type: SeedpodsCookieStateType.SetButNeedsUpdate
  value: unknown
}

export interface SeedpodsCookieStateIndecipherable {
  type: SeedpodsCookieStateType.Indecipherable
}

export interface SeedpodsCookieStateExpired {
  type: SeedpodsCookieStateType.Expired
}

export type SeedpodsCookieState =
  | SeedpodsCookieStateExpired
  | SeedpodsCookieStateIndecipherable
  | SeedpodsCookieStateNeedsUpdate
  | SeedpodsCookieStateSet
  | SeedpodsCookieStateUnset

/**
 * Cookie definition returned by {@link createCookie}.
 *
 * @remarks
 * Most callers create values of this type through `createCookie` and then add them to a jar with {@link createJar}.
 *
 * @typeParam T - Application key used to address the cookie.
 * @typeParam U - Cookie protection mode.
 * @typeParam _V - Application value stored in the cookie.
 */
export interface SeedpodsCookie<
  T extends string = any,
  U extends SeedpodsCookieType = any,
  _V = any,
> {
  readonly [SEEDPODS_SYMBOL_COOKIE]: {
    readonly options: SeedpodsParsedCookieOptionsForType<T, U>
    fromString: (value: string | undefined) => Promise<SeedpodsCookieState>
    toString: (value: SeedpodsCookieState) => Promise<string | undefined>
  }
}

export type SeedpodsCookieKey<T> = T extends SeedpodsCookie<infer U> ? U : never

export enum SeedpodsJarActionType {
  Combine,
  Cookie,
}

export interface SeedpodsJarActionBase<
  SeedpodsActionType extends SeedpodsJarActionType,
  SeedpodsActionPayload,
> {
  payload: SeedpodsActionPayload
  type: SeedpodsActionType
}

export type SeedpodsJarCookieAction<
  SeedpodsCookieTypeValue extends SeedpodsCookie = SeedpodsCookie,
> = SeedpodsJarActionBase<SeedpodsJarActionType.Cookie, SeedpodsCookieTypeValue>

export type SeedpodsJarCombineAction<
  SeedpodsChildJar extends SeedpodsJar<SeedpodsJarState> = SeedpodsJar<SeedpodsJarState>,
> = SeedpodsJarActionBase<SeedpodsJarActionType.Combine, SeedpodsChildJar>

export type SeedpodsJarAction = SeedpodsJarCombineAction | SeedpodsJarCookieAction

export interface SeedpodsJarState<
  SeedpodsCookies extends Record<string, SeedpodsCookie> = Record<string, SeedpodsCookie>,
> {
  cookies: SeedpodsCookies
}

export type SeedpodsJarEmptyState = SeedpodsJarState<Record<never, never>>

export interface SeedpodsJarMetadata<State extends SeedpodsJarState = SeedpodsJarState> {
  state: State
}

export type SeedpodsJarBuilder<Shape, VisibleKeys extends number | string | symbol> = {
  [SeedpodsKey in Extract<keyof Shape, VisibleKeys>]: Shape[SeedpodsKey]
}

export type SeedpodsJarActionPayload<Action extends SeedpodsJarAction> = Action['payload']

export type SeedpodsReplaceProperties<Target, Source> = Omit<Target, keyof Source> & Source

export type SeedpodsMergedJarCookies<
  State extends SeedpodsJarState,
  SeedpodsChildJar extends SeedpodsJar<SeedpodsJarState>,
> = SeedpodsReplaceProperties<
  State['cookies'],
  SeedpodsChildJar[typeof SEEDPODS_SYMBOL_JAR]['state']['cookies']
>

export type SeedpodsCookiesWithCookie<
  State extends SeedpodsJarState,
  SeedpodsCookieTypeValue extends SeedpodsCookie,
> = SeedpodsReplaceProperties<
  State['cookies'],
  Record<SeedpodsCookieKey<SeedpodsCookieTypeValue>, SeedpodsCookieTypeValue>
>

export type SeedpodsJarStateAfterAction<
  State extends SeedpodsJarState = SeedpodsJarEmptyState,
  Action extends SeedpodsJarAction = never,
> = [Action] extends [never]
  ? State
  : Action extends SeedpodsJarCombineAction<infer SeedpodsChildJar>
    ? SeedpodsJarState<SeedpodsMergedJarCookies<State, SeedpodsChildJar>>
    : Action extends SeedpodsJarCookieAction<infer SeedpodsCookieTypeValue>
      ? SeedpodsJarState<SeedpodsCookiesWithCookie<State, SeedpodsCookieTypeValue>>
      : State

export type SeedpodsJarKeys<SeedpodsJarType extends SeedpodsJarInterface> = Extract<
  keyof SeedpodsJarType[typeof SEEDPODS_SYMBOL_JAR]['state']['cookies'],
  string
>

export type SeedpodsJarCookieValue<
  SeedpodsJarType extends SeedpodsJarInterface,
  SeedpodsJarKey extends SeedpodsJarKeys<SeedpodsJarType>,
> =
  SeedpodsJarType[typeof SEEDPODS_SYMBOL_JAR]['state']['cookies'][SeedpodsJarKey] extends SeedpodsCookie<
    any,
    any,
    infer SeedpodsCookieValueType
  >
    ? SeedpodsCookieValueType
    : any

export interface SeedpodsJarInterface<State extends SeedpodsJarState = SeedpodsJarState> {
  [SEEDPODS_SYMBOL_JAR]: SeedpodsJarMetadata<State>
}

/**
 * Cookie jar returned by {@link createJar}.
 *
 * @remarks
 * Most callers build this type through chained `put` and `combine` calls rather than constructing it directly.
 *
 * @typeParam State - Jar state tracked by the type system.
 */
export interface SeedpodsJar<State extends SeedpodsJarState> extends SeedpodsJarInterface<State> {
  /**
   * Merges another cookie jar into this one.
   */
  combine: <SeedpodsChildJar extends SeedpodsJar<SeedpodsJarState>>(
    jar: SeedpodsChildJar,
  ) => SeedpodsJarBuilder<
    SeedpodsJar<SeedpodsJarStateAfterAction<State, SeedpodsJarCombineAction<SeedpodsChildJar>>>,
    'combine' | 'put' | typeof SEEDPODS_SYMBOL_JAR
  >

  /**
   * Adds one cookie definition to the jar.
   */
  put: <SeedpodsCookieTypeValue extends SeedpodsCookie>(
    cookie: SeedpodsCookieTypeValue,
  ) => SeedpodsJarBuilder<
    SeedpodsJar<
      SeedpodsJarStateAfterAction<State, SeedpodsJarCookieAction<SeedpodsCookieTypeValue>>
    >,
    'combine' | 'put' | typeof SEEDPODS_SYMBOL_JAR
  >
}

/**
 * Raw `Cookie` header value accepted by {@link useCookies}.
 */
export type SeedpodsCookieHeader = string | undefined

/**
 * Reducer used to combine the current and next value for one cookie key.
 *
 * @typeParam SeedpodsValue - Cookie value type.
 */
export type SeedpodsCookiesReducer<SeedpodsValue> = (
  previous?: SeedpodsValue,
  next?: SeedpodsValue,
) => SeedpodsValue | undefined

/**
 * Reducer map accepted by {@link useCookies}.
 *
 * @typeParam SeedpodsJarType - Jar type that defines the available cookie keys and value types.
 */
export type SeedpodsCookiesReducers<SeedpodsJarType extends SeedpodsJarInterface> = {
  [SeedpodsKey in SeedpodsJarKeys<SeedpodsJarType>]?:
    | SeedpodsCookiesReducer<SeedpodsJarCookieValue<SeedpodsJarType, SeedpodsKey>>
    | undefined
}

/**
 * Mutable cookie interface returned by {@link useCookies}.
 *
 * @typeParam SeedpodsJarType - Jar type that defines the available cookie keys and value types.
 */
export interface SeedpodsCookies<SeedpodsJarType extends SeedpodsJarInterface> {
  /**
   * Records deletion of one cookie key.
   */
  del: (key: SeedpodsJarKeys<SeedpodsJarType>) => void

  /**
   * Returns changed cookie keys and their `Set-Cookie` header values.
   */
  entries: () => Promise<Array<[SeedpodsJarKeys<SeedpodsJarType>, string]>>

  /**
   * Returns the current value for one cookie key.
   */
  get: <SeedpodsKey extends SeedpodsJarKeys<SeedpodsJarType>>(
    key: SeedpodsKey,
  ) => SeedpodsJarCookieValue<SeedpodsJarType, SeedpodsKey> | undefined

  /**
   * Records a new value for one cookie key.
   */
  set: <SeedpodsKey extends SeedpodsJarKeys<SeedpodsJarType>>(
    key: SeedpodsKey,
    value: SeedpodsJarCookieValue<SeedpodsJarType, SeedpodsKey> | undefined,
  ) => void

  /**
   * Returns changed `Set-Cookie` header values.
   */
  values: () => Promise<string[]>
}

/**
 * Options for {@link deriveKey}.
 */
export interface SeedpodsDeriveKeyOptions {
  /**
   * Password-Based Key Derivation Function 2 iteration count.
   */
  iterations?: number

  /**
   * Requested output length, in bytes.
   *
   * @remarks
   * The current implementation always derives a 256-bit key.
   */
  length?: number

  /**
   * Salt used for key derivation.
   */
  salt?: string
}
