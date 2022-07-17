/* eslint-disable @typescript-eslint/no-explicit-any */

import $ from '@escapace/typelevel'
import { isPlainObject } from 'lodash-es'
import { Cookie, isCookie, SYMBOL_COOKIE } from './cookie'

export const SYMBOL_JAR = Symbol.for('SEEDPODS-JAR')

export enum TypeAction {
  Cookie
}

// export type Placeholder = number | string | symbol
// export type PlaceholderState<T extends Placeholder = Placeholder> = T

export interface ActionCookie<T extends Cookie = Cookie> {
  type: TypeAction.Cookie
  payload: T
}

export type Actions = ActionCookie

export interface State {
  cookies: Record<string, Cookie>
}

export interface InitialState {
  cookies: {}
}

export interface Model<T extends Actions[] = any[], U extends State = State> {
  log: T
  state: U
}

export type Fluent<T, K extends string | number | symbol> = {
  [P in Extract<keyof T, K>]: T[P]
}

export type Payload<T extends Actions> = T['payload']

export type Reducer<T extends State, U extends Actions> = $.Cast<
  $.Assign<
    T,
    {
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
  U extends Actions = never
> = Jar<
  $.If<$.Is.Never<U>, T, Model<$.Cons<U, T['log']>, Reducer<T['state'], U>>>
>

// export type Cast<T extends JarSymbols> = T extends JarSymbols<
//   Model<infer A, infer B>
// >
//   ? Model<A, B>
//   : never

export type Key<T> = T extends Cookie<infer KEY> ? KEY : never

export interface JAR<T extends Model = Model> {
  [SYMBOL_JAR]: T
}

export interface Jar<T extends Model> extends JAR<T> {
  put: <U extends Cookie>(
    cookie: U
  ) => Fluent<Next<T, ActionCookie<U>>, 'put' | typeof SYMBOL_JAR>
}

const reducer = (_model: Model, action: Actions): Model => {
  const model: Model = {
    state: {
      ..._model.state
    },
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    log: [action, ..._model.log]
  }

  switch (action.type) {
    case TypeAction.Cookie: {
      const cookie: any = action.payload

      isCookie(cookie)

      const key = cookie[SYMBOL_COOKIE].options.key

      model.state = {
        ...model.state,
        cookies: {
          ...model.state.cookies,
          [key]: cookie
        }
      }

      break
    }
  }

  return model
}

const put = (model: Model) => (cookie: Cookie) => {
  const next = reducer(model, {
    type: TypeAction.Cookie,
    payload: cookie
  })

  return { put: put(next), [SYMBOL_JAR]: next }
}

export const jar = (): // model: Model = { state: { cookies: {} }, log: [] }
Fluent<Next, 'put'> => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return { put: put({ state: { cookies: {} }, log: [] }) } as Fluent<
    Next,
    'put'
  >
}

export function isJar(value: unknown): asserts value is JAR {
  if (
    !(
      isPlainObject(value) &&
      isPlainObject((value as Record<string | symbol, unknown>)[SYMBOL_JAR])
    )
  ) {
    throw new Error('Not a cookie jar.')
  }
}
