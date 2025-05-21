/* eslint-disable typescript/no-explicit-any */
import type $ from '@escapace/typelevel'
import { assertCookie, SYMBOL_COOKIE, type Cookie, type Key } from './cookie'

export const SYMBOL_JAR = Symbol.for('SEEDPODS-JAR')

export enum TypeAction {
  Cookie,
  Combine,
}

// export type Placeholder = number | string | symbol
// export type PlaceholderState<T extends Placeholder = Placeholder> = T

export interface ActionCookie<T extends Cookie = Cookie> {
  payload: T
  type: TypeAction.Cookie
}

export interface ActionCombine<T extends Jar = Jar> {
  payload: T
  type: TypeAction.Combine
}

export type Actions = ActionCombine | ActionCookie

export interface State {
  cookies: Record<string, Cookie>
}

export interface InitialState {
  // eslint-disable-next-line typescript/no-empty-object-type
  cookies: {}
}

export interface Model<T extends Actions[] = any[], U extends State = State> {
  log: T
  state: U
}

export type Fluent<T, K extends number | string | symbol> = {
  [P in Extract<keyof T, K>]: T[P]
}

export type Payload<T extends Actions> = T['payload']

export type Reducer<T extends State, U extends Actions> = $.Cast<
  $.Assign<
    T,
    {
      [TypeAction.Combine]: {
        cookies: $.Assign<
          T['cookies'],
          $.Cast<Payload<U>, ActionCombine['payload']>[typeof SYMBOL_JAR]['state']['cookies']
        >
      }
      [TypeAction.Cookie]: {
        cookies: $.Assign<
          T['cookies'],
          Record<Key<Payload<U>>, $.Cast<Payload<U>, ActionCookie['payload']>>
        >
      }
    }[$.Cast<U['type'], TypeAction>]
  >,
  State
>

export type Next<
  T extends Model = { log: []; state: InitialState },
  U extends Actions = never,
> = Jar<$.If<$.Is.Never<U>, T, Model<$.Cons<U, T['log']>, Reducer<T['state'], U>>>>

export type Keys<T extends JAR> = keyof T[typeof SYMBOL_JAR]['state']['cookies']

export type Value<T extends JAR, U extends Keys<T>> =
  T[typeof SYMBOL_JAR]['state']['cookies'][U] extends Cookie<any, any, infer VALUE> ? VALUE : any

// export type Cast<T extends JarSymbolsk = T extends JarSymbols<
//   Model<infer A, infer B>
// >
//   ? Model<A, B>
//   : never

export interface JAR<T extends Model = Model> {
  [SYMBOL_JAR]: T
}

export interface Jar<T extends Model = Model> extends JAR<T> {
  combine: <U extends Jar>(
    jar: U,
  ) => Fluent<Next<T, ActionCombine<U>>, 'combine' | 'put' | typeof SYMBOL_JAR>
  put: <U extends Cookie>(
    cookie: U,
  ) => Fluent<Next<T, ActionCookie<U>>, 'combine' | 'put' | typeof SYMBOL_JAR>
}

const reducer = (_model: Model, action: Actions): Model => {
  const model: Model = {
    // eslint-disable-next-line typescript/no-unsafe-assignment
    log: [action, ..._model.log],
    state: {
      ..._model.state,
    },
  }

  switch (action.type) {
    case TypeAction.Cookie: {
      const cookie: unknown = action.payload

      assertCookie(cookie)

      const key = cookie[SYMBOL_COOKIE].options.key

      if (Object.keys(model.state.cookies).includes(key)) {
        throw new Error(`Cookie with key '${key}' already exists.`)
      }

      model.state = {
        ...model.state,
        cookies: {
          ...model.state.cookies,
          [key]: cookie,
        },
      }

      break
    }
    case TypeAction.Combine: {
      const jar: unknown = action.payload

      assertJar(jar)

      model.state = {
        ...model.state,
        cookies: {
          ...model.state.cookies,
          ...jar[SYMBOL_JAR].state.cookies,
        },
      }
    }
  }

  return model
}

const put = (model: Model) => (cookie: Cookie) => {
  const next = reducer(model, {
    payload: cookie,
    type: TypeAction.Cookie,
  })

  return { combine: combine(next), put: put(next), [SYMBOL_JAR]: next }
}

const combine = (model: Model) => (jar: Jar) => {
  const next = reducer(model, {
    payload: jar,
    type: TypeAction.Combine,
  })

  return { combine: combine(next), put: put(next), [SYMBOL_JAR]: next }
}

export const jar = (): // model: Model = { state: { cookies: {} }, log: [] }
Fluent<Next, 'combine' | 'put'> =>
  // eslint-disable-next-line typescript/consistent-type-assertions
  ({
    combine: combine({ log: [], state: { cookies: {} } }),
    put: put({ log: [], state: { cookies: {} } }),
  }) as Fluent<Next, 'combine' | 'put'>

export function assertJar(value: unknown): asserts value is JAR {
  if (
    typeof value !== 'object' ||
    typeof (value as Record<string | symbol, unknown>)[SYMBOL_JAR] !== 'object'
  ) {
    throw new TypeError('Not a cookie jar.')
  }
}
