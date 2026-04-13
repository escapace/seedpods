# seedpods

# API

## function assertCookie [↗](src/create-cookie.ts#L149-L163 'assertCookie')

Asserts that a value was created by [createCookie](#function-createcookie-).

```typescript
export declare function assertCookie(
  cookie: unknown,
): asserts cookie is SeedpodsCookie<string, SeedpodsCookieType, unknown>
```

### Parameters

| Parameter | Type               | Description        |
| --------- | ------------------ | ------------------ |
| `cookie`  | <pre>unknown</pre> | Value to validate. |

### Throws

[SeedpodsError](#class-seedpodserror-) When the value is not a cookie definition created by this package.

## function assertJar [↗](src/create-jar.ts#L116-L128 'assertJar')

Asserts that a value was created by [createJar](#function-createjar-).

```typescript
export declare function assertJar(value: unknown): asserts value is SeedpodsJarInterface
```

### Parameters

| Parameter | Type               | Description        |
| --------- | ------------------ | ------------------ |
| `value`   | <pre>unknown</pre> | Value to validate. |

### Throws

[SeedpodsError](#class-seedpodserror-) When the value is not a cookie jar created by this package.

## function createCookie [↗](src/create-cookie.ts#L66-L141 'createCookie')

Creates a cookie definition for one application value.

```typescript
createCookie: <T extends string, U extends SeedpodsCookieType, V>(
  options: SeedpodsCookieOptionsForType<T, U>,
) => SeedpodsCookie<T, U, V>
```

### Type Parameters

| Parameter | Description                                                                   |
| --------- | ----------------------------------------------------------------------------- |
| `T`       | Key used to read, write, and delete this cookie through the cookie interface. |
| `U`       | Cookie protection mode.                                                       |
| `V`       | Application value stored in the cookie.                                       |

### Parameters

| Parameter | Type                                           | Description                                                                      |
| --------- | ---------------------------------------------- | -------------------------------------------------------------------------------- |
| `options` | <pre>SeedpodsCookieOptionsForType\<T, U></pre> | Cookie configuration, including the key, key material, and transport attributes. |

### Returns

A cookie definition that can be added to a jar.

### Throws

When the cookie options are invalid.

### Remarks

Use this function to declare how a cookie is named, protected, and serialized. The returned definition can be added to a jar created by [createJar](#function-createjar-) and later used by [useCookies](#function-usecookies-) to read incoming cookies and produce `Set-Cookie` header values.

## function createJar [↗](src/create-jar.ts#L98-L108 'createJar')

Creates an empty cookie jar.

```typescript
createJar: () => SeedpodsJarBuilder<SeedpodsJar<SeedpodsJarEmptyState>, 'combine' | 'put'>
```

### Returns

An empty cookie jar with `put` and `combine` operations.

### Remarks

Use `put` to add cookie definitions and `combine` to merge another jar. In TypeScript, each call returns a new jar type that keeps the available cookie keys aligned with the configured definitions.

## function getSeedpodsErrorCausesByType [↗](src/error.ts#L84-L89 'getSeedpodsErrorCausesByType')

Returns the causes from a [SeedpodsError](#class-seedpodserror-) that match the given type.

```typescript
export declare function getSeedpodsErrorCausesByType<T extends SeedpodsErrorType>(
  error: SeedpodsError,
  type: T,
): Array<SeedpodsErrorCause<T>>
```

### Type Parameters

| Parameter | Description                |
| --------- | -------------------------- |
| `T`       | Error cause type to match. |

### Parameters

| Parameter | Type                                                                    | Description                |
| --------- | ----------------------------------------------------------------------- | -------------------------- |
| `error`   | <pre>[SeedpodsError](#class-seedpodserror- 'class SeedpodsError')</pre> | Error instance to inspect. |
| `type`    | <pre>T</pre>                                                            | Error cause type to match. |

### Returns

All matching causes in their original order.

## function isSeedpodsError [↗](src/error.ts#L57-L59 'isSeedpodsError')

Checks whether a value is a [SeedpodsError](#class-seedpodserror-).

```typescript
export declare function isSeedpodsError(value: unknown): value is SeedpodsError
```

### Parameters

| Parameter | Type               | Description    |
| --------- | ------------------ | -------------- |
| `value`   | <pre>unknown</pre> | Value to test. |

### Returns

`true` when the value is a `SeedpodsError`; otherwise, `false`.

## function isSeedpodsErrorOfType [↗](src/error.ts#L69-L74 'isSeedpodsErrorOfType')

Checks whether a [SeedpodsError](#class-seedpodserror-) contains at least one cause of the given type.

```typescript
export declare function isSeedpodsErrorOfType<T extends SeedpodsErrorType>(
  error: SeedpodsError,
  type: T,
): error is SeedpodsError<T>
```

### Type Parameters

| Parameter | Description                |
| --------- | -------------------------- |
| `T`       | Error cause type to match. |

### Parameters

| Parameter | Type                                                                    | Description                |
| --------- | ----------------------------------------------------------------------- | -------------------------- |
| `error`   | <pre>[SeedpodsError](#class-seedpodserror- 'class SeedpodsError')</pre> | Error instance to inspect. |
| `type`    | <pre>T</pre>                                                            | Error cause type to match. |

### Returns

`true` when the error contains at least one matching cause; otherwise, `false`.

## function useCookies [↗](src/use-cookies.ts#L37-L191 'useCookies')

Creates a cookie interface from a `Cookie` header value and a cookie jar.

```typescript
useCookies: <SeedpodsJar extends SeedpodsJarInterface>(
  cookieHeader: SeedpodsCookieHeader | undefined,
  jar: SeedpodsJar,
  reducers?: SeedpodsCookiesReducers<SeedpodsJar>,
) => Promise<SeedpodsCookies<SeedpodsJar>>
```

### Type Parameters

| Parameter     | Description                                                      |
| ------------- | ---------------------------------------------------------------- |
| `SeedpodsJar` | Jar type that defines the available cookie keys and value types. |

### Parameters

| Parameter      | Type                                                                                                              | Description                                                                                  |
| -------------- | ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `cookieHeader` | <pre>[SeedpodsCookieHeader](#type-seedpodscookieheader- 'type SeedpodsCookieHeader') \| undefined</pre>           | Incoming `Cookie` header value. When omitted, the interface starts with no received cookies. |
| `jar`          | <pre>SeedpodsJar</pre>                                                                                            | Cookie definitions created with [createJar](#function-createjar-).                           |
| `reducers`     | <pre>[SeedpodsCookiesReducers](#type-seedpodscookiesreducers- 'type SeedpodsCookiesReducers')\<SeedpodsJar></pre> | Optional reducers that combine the current cookie value with a later value passed to `set`.  |

### Returns

A cookie interface for reading values, recording changes, and generating changed `Set-Cookie` header values.

### Remarks

The returned interface reads configured cookie values through `get`, records changes through `set` and `del`, and produces changed `Set-Cookie` header values through `entries` and `values`. If the header contains the same cookie name more than once, the function keeps the best decodable value for each configured cookie.

## function deriveKey [↗](src/utilities/derive-key.ts#L13-L47 'deriveKey')

Derives a symmetric key from a secret string.

```typescript
deriveKey: (secret: string, options?: SeedpodsDeriveKeyOptions) => Promise<Buffer>
```

### Parameters

| Parameter | Type                                                                                                             | Description                                                         |
| --------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `secret`  | <pre>string</pre>                                                                                                | Secret input used as the derivation source.                         |
| `options` | <pre>[SeedpodsDeriveKeyOptions](#interface-seedpodsderivekeyoptions- 'interface SeedpodsDeriveKeyOptions')</pre> | Optional derivation parameters, including salt and iteration count. |

### Returns

The derived key bytes.

### Remarks

The function uses Password-Based Key Derivation Function 2 with SHA-512 and returns raw key bytes. Pass a fixed salt when the same secret must produce the same key across processes or deployments. When no salt is provided, a random salt is generated and the derived key changes between calls.

## function parseCookieHeader [↗](src/utilities/parse-cookie-header.ts#L17-L65 'parseCookieHeader')

Parses a `Cookie` header value into a map of cookie names and values.

```typescript
export declare function parseCookieHeader(string?: string): Map<string, string[]>
```

### Parameters

| Parameter | Type              | Description                |
| --------- | ----------------- | -------------------------- |
| `string`  | <pre>string</pre> | Raw `Cookie` header value. |

### Returns

A map from each cookie name to all received values for that name.

### Remarks

Repeated cookie names are preserved in encounter order. Surrounding double quotes are stripped from quoted values. Fragments without an equals sign are ignored. When the input is `undefined`, the function returns an empty map.

## class SeedpodsError [↗](src/error.ts#L40-L49 'SeedpodsError')

Error thrown for invalid cookie definitions, invalid cookie values, invalid jar values, and other rejected inputs.

```typescript
export declare class SeedpodsError<T extends SeedpodsErrorType = SeedpodsErrorType> extends Error
```

### Type Parameters

| Parameter | Description                               |
| --------- | ----------------------------------------- |
| `T`       | Error cause type carried by the instance. |

### Remarks

The `causes` property stores machine-readable error details. Validation may report more than one cause in a single error.

### new SeedpodsError

Constructs a new instance of the `SeedpodsError` class

```typescript
constructor(causes: ReadonlyArray<SeedpodsErrorCause<T>>);
```

#### Parameters

| Parameter | Type                                                                                                    |
| --------- | ------------------------------------------------------------------------------------------------------- |
| `causes`  | <pre>ReadonlyArray<[SeedpodsErrorCause](#type-seedpodserrorcause- 'type SeedpodsErrorCause')\<T>></pre> |

## interface SeedpodsCookie [↗](src/types.ts#L255-L265 'SeedpodsCookie')

Cookie definition returned by [createCookie](#function-createcookie-).

```typescript
export interface SeedpodsCookie<T extends string = any, U extends SeedpodsCookieType = any, _V = any>
```

### Type Parameters

| Parameter | Description                                 |
| --------- | ------------------------------------------- |
| `T`       | Application key used to address the cookie. |
| `U`       | Cookie protection mode.                     |
| `_V`      | Application value stored in the cookie.     |

### Remarks

Most callers create values of this type through `createCookie` and then add them to a jar with [createJar](#function-createjar-).

## interface SeedpodsCookieOptionsBase [↗](src/types.ts#L52-L97 'SeedpodsCookieOptionsBase')

Common cookie options shared by all cookie definitions.

```typescript
export interface SeedpodsCookieOptionsBase<SeedpodsCookieKey extends string = string>
```

### Type Parameters

| Parameter           | Description                                                              |
| ------------------- | ------------------------------------------------------------------------ |
| `SeedpodsCookieKey` | Application key used to address the cookie through the cookie interface. |

### SeedpodsCookieOptionsBase.domain

Domain attribute written to `Set-Cookie`.

```typescript
domain?: string;
```

### SeedpodsCookieOptionsBase.httpOnly

Whether the cookie is inaccessible to client-side JavaScript.

```typescript
httpOnly?: boolean;
```

### SeedpodsCookieOptionsBase.key

Application key used to read, write, and delete the cookie.

```typescript
key: SeedpodsCookieKey
```

### SeedpodsCookieOptionsBase.maxAge

Max-Age attribute, in seconds.

```typescript
maxAge?: number;
```

### SeedpodsCookieOptionsBase.name

Cookie name written to the header. When omitted, the key is used.

```typescript
name?: string;
```

### SeedpodsCookieOptionsBase.path

Path attribute written to `Set-Cookie`.

```typescript
path?: string;
```

### SeedpodsCookieOptionsBase.prefix

Optional cookie name prefix.

```typescript
prefix?: SeedpodsCookiePrefix;
```

### SeedpodsCookieOptionsBase.sameSite

SameSite attribute written to `Set-Cookie`.

```typescript
sameSite?: SeedpodsCookieSameSite;
```

### SeedpodsCookieOptionsBase.secure

Whether the cookie requires a secure transport.

```typescript
secure?: boolean;
```

## interface SeedpodsCookies [↗](src/types.ts#L423-L453 'SeedpodsCookies')

Mutable cookie interface returned by [useCookies](#function-usecookies-).

```typescript
export interface SeedpodsCookies<SeedpodsJarType extends SeedpodsJarInterface>
```

### Type Parameters

| Parameter         | Description                                                      |
| ----------------- | ---------------------------------------------------------------- |
| `SeedpodsJarType` | Jar type that defines the available cookie keys and value types. |

### SeedpodsCookies.del

Records deletion of one cookie key.

```typescript
del: (key: SeedpodsJarKeys<SeedpodsJarType>) => void;
```

### SeedpodsCookies.entries

Returns changed cookie keys and their `Set-Cookie` header values.

```typescript
entries: () => Promise<Array<[SeedpodsJarKeys<SeedpodsJarType>, string]>>
```

### SeedpodsCookies.get

Returns the current value for one cookie key.

```typescript
get: <SeedpodsKey extends SeedpodsJarKeys<SeedpodsJarType>>(key: SeedpodsKey) =>
  SeedpodsJarCookieValue<SeedpodsJarType, SeedpodsKey> | undefined
```

### SeedpodsCookies.set

Records a new value for one cookie key.

```typescript
set: <SeedpodsKey extends SeedpodsJarKeys<SeedpodsJarType>>(key: SeedpodsKey,
  value: SeedpodsJarCookieValue<SeedpodsJarType, SeedpodsKey> | undefined) => void;
```

### SeedpodsCookies.values

Returns changed `Set-Cookie` header values.

```typescript
values: () => Promise<string[]>
```

## interface SeedpodsDeriveKeyOptions [↗](src/types.ts#L458-L476 'SeedpodsDeriveKeyOptions')

Options for [deriveKey](#function-derivekey-).

```typescript
export interface SeedpodsDeriveKeyOptions
```

### SeedpodsDeriveKeyOptions.iterations

Password-Based Key Derivation Function 2 iteration count.

```typescript
iterations?: number;
```

### SeedpodsDeriveKeyOptions.length

Requested output length, in bytes.

```typescript
length?: number;
```

#### Remarks

The current implementation always derives a 256-bit key.

### SeedpodsDeriveKeyOptions.salt

Salt used for key derivation.

```typescript
salt?: string;
```

## interface SeedpodsEncryptedCookieOptions [↗](src/types.ts#L107-L119 'SeedpodsEncryptedCookieOptions')

Options for an encrypted cookie definition.

```typescript
export interface SeedpodsEncryptedCookieOptions<SeedpodsCookieKey extends string = string>
  extends SeedpodsCookieOptionsBase<SeedpodsCookieKey>
```

### Type Parameters

| Parameter           | Description                                                              |
| ------------------- | ------------------------------------------------------------------------ |
| `SeedpodsCookieKey` | Application key used to address the cookie through the cookie interface. |

### Remarks

The first key is used to write new cookies. Later keys are accepted for reading so key rotation can happen without breaking existing cookies.

### SeedpodsEncryptedCookieOptions.keys

Encryption keys in write-first, read-fallback order.

```typescript
keys: Buffer[];
```

### SeedpodsEncryptedCookieOptions.type

Encryption mode.

```typescript
type: 'aes-gcm'
```

## interface SeedpodsErrorMetadata [↗](src/types.ts#L189-L198 'SeedpodsErrorMetadata')

Structured data carried by each [SeedpodsError](#class-seedpodserror-) cause type.

```typescript
export interface SeedpodsErrorMetadata
```

## interface SeedpodsJar [↗](src/types.ts#L368-L390 'SeedpodsJar')

Cookie jar returned by [createJar](#function-createjar-).

```typescript
export interface SeedpodsJar<State extends SeedpodsJarState> extends SeedpodsJarInterface<State>
```

### Type Parameters

| Parameter | Description                           |
| --------- | ------------------------------------- |
| `State`   | Jar state tracked by the type system. |

### Remarks

Most callers build this type through chained `put` and `combine` calls rather than constructing it directly.

### SeedpodsJar.combine

Merges another cookie jar into this one.

```typescript
combine: <SeedpodsChildJar extends SeedpodsJar<SeedpodsJarState>>(jar: SeedpodsChildJar) =>
  SeedpodsJarBuilder<
    SeedpodsJar<SeedpodsJarStateAfterAction<State, SeedpodsJarCombineAction<SeedpodsChildJar>>>,
    'combine' | 'put' | typeof SEEDPODS_SYMBOL_JAR
  >
```

### SeedpodsJar.put

Adds one cookie definition to the jar.

```typescript
put: <SeedpodsCookieTypeValue extends SeedpodsCookie>(cookie: SeedpodsCookieTypeValue) =>
  SeedpodsJarBuilder<
    SeedpodsJar<
      SeedpodsJarStateAfterAction<State, SeedpodsJarCookieAction<SeedpodsCookieTypeValue>>
    >,
    'combine' | 'put' | typeof SEEDPODS_SYMBOL_JAR
  >
```

## interface SeedpodsSignedCookieOptions [↗](src/types.ts#L129-L141 'SeedpodsSignedCookieOptions')

Options for a signed cookie definition.

```typescript
export interface SeedpodsSignedCookieOptions<SeedpodsCookieKey extends string = string>
  extends SeedpodsCookieOptionsBase<SeedpodsCookieKey>
```

### Type Parameters

| Parameter           | Description                                                              |
| ------------------- | ------------------------------------------------------------------------ |
| `SeedpodsCookieKey` | Application key used to address the cookie through the cookie interface. |

### Remarks

The cookie value remains readable by clients. The signature prevents undetected modification.

### SeedpodsSignedCookieOptions.keys

Signing keys in write-first, read-fallback order.

```typescript
keys: Buffer[];
```

### SeedpodsSignedCookieOptions.type

Signing mode.

```typescript
type: 'hmac'
```

## type SeedpodsCookieHeader [↗](src/types.ts#L395 'SeedpodsCookieHeader')

Raw `Cookie` header value accepted by [useCookies](#function-usecookies-).

```typescript
export type SeedpodsCookieHeader = string | undefined
```

## type SeedpodsCookieOptions [↗](src/types.ts#L148-L150 'SeedpodsCookieOptions')

Supported options accepted by [createCookie](#function-createcookie-).

```typescript
export type SeedpodsCookieOptions<SeedpodsCookieKey extends string = string> =
  | SeedpodsEncryptedCookieOptions<SeedpodsCookieKey>
  | SeedpodsSignedCookieOptions<SeedpodsCookieKey>
```

### Type Parameters

| Parameter           | Description                                                              |
| ------------------- | ------------------------------------------------------------------------ |
| `SeedpodsCookieKey` | Application key used to address the cookie through the cookie interface. |

## type SeedpodsCookiePrefix [↗](src/types.ts#L17 'SeedpodsCookiePrefix')

Supported cookie name prefixes for [createCookie](#function-createcookie-).

```typescript
export type SeedpodsCookiePrefix = (typeof SEEDPODS_COOKIE_PREFIXES)[number]
```

### Remarks

`__Secure-` requires `secure: true`. `__Host-` requires `secure: true`, `path: '/'`, and no `domain`.

## type SeedpodsCookieSameSite [↗](src/types.ts#L22 'SeedpodsCookieSameSite')

Supported `SameSite` attribute values for cookie definitions.

```typescript
export type SeedpodsCookieSameSite = (typeof SEEDPODS_COOKIE_SAME_SITE_VALUES)[number]
```

## type SeedpodsCookiesReducer [↗](src/types.ts#L402-L405 'SeedpodsCookiesReducer')

Reducer used to combine the current and next value for one cookie key.

```typescript
export type SeedpodsCookiesReducer<SeedpodsValue> = (
  previous?: SeedpodsValue,
  next?: SeedpodsValue,
) => SeedpodsValue | undefined
```

### Type Parameters

| Parameter       | Description        |
| --------------- | ------------------ |
| `SeedpodsValue` | Cookie value type. |

## type SeedpodsCookiesReducers [↗](src/types.ts#L412-L416 'SeedpodsCookiesReducers')

Reducer map accepted by [useCookies](#function-usecookies-).

```typescript
export type SeedpodsCookiesReducers<SeedpodsJarType extends SeedpodsJarInterface> = {
  [SeedpodsKey in SeedpodsJarKeys<SeedpodsJarType>]?:
    | SeedpodsCookiesReducer<SeedpodsJarCookieValue<SeedpodsJarType, SeedpodsKey>>
    | undefined
}
```

### Type Parameters

| Parameter         | Description                                                      |
| ----------------- | ---------------------------------------------------------------- |
| `SeedpodsJarType` | Jar type that defines the available cookie keys and value types. |

## type SeedpodsCookieType [↗](src/types.ts#L30 'SeedpodsCookieType')

Supported cookie protection modes.

```typescript
export type SeedpodsCookieType = (typeof SEEDPODS_COOKIE_TYPES)[number]
```

### Remarks

`'aes-gcm'` encrypts and authenticates the cookie value. `'hmac'` signs the value without encrypting it.

## type SeedpodsErrorCause [↗](src/types.ts#L205-L206 'SeedpodsErrorCause')

Machine-readable error detail carried by [SeedpodsError](#class-seedpodserror-).

```typescript
export type SeedpodsErrorCause<T extends SeedpodsErrorType = SeedpodsErrorType> = T
  extends SeedpodsErrorType ? {
  type: T;
} & SeedpodsErrorMetadata[T] : never;
```

### Type Parameters

| Parameter | Description                  |
| --------- | ---------------------------- |
| `T`       | Error cause type to project. |

## type SeedpodsErrorType [↗](src/types.ts#L35 'SeedpodsErrorType')

Supported [SeedpodsError](#class-seedpodserror-) cause types.

```typescript
export type SeedpodsErrorType = (typeof SEEDPODS_ERROR_TYPES)[number]
```
