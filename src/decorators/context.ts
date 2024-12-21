/**
 * Module definition of {@link Context} property decorators.
 *
 * The {@link Context} decorators provides functions to read/write the context
 * shared among the binary objects during the reading phase.
 *
 * @module Context
 */
import { Context, DecoratorType } from '../types'
import { createPropertyMetaDescriptor, PropertyMetaDescriptor, recursiveGet, StringFormattedRecursiveKeyOf } from './common'
import { Relation } from './primitive'
import Meta from '../metadatas'

export const CtxSymbol = Symbol('context')

export type GlobalCtx = object

export type CtxKeyFunction<This> = (targetInstance: This) => string

export enum CtxType {
  CtxGetter,
  CtxSetter,
}

export interface CtxOptions {
  /**
   * Ensures that a relation exists before defining the Transformer decorator.
   */
  base_type: 'array' | undefined
}

export const CtxOptionsDefault = {
  base_type: undefined,
}

/**
 * Ctx metadata type definition.
 *
 * @extends {PropertyMetaDescriptor}
 */
export interface Ctx<This, Value> extends PropertyMetaDescriptor<This> {
  options: CtxOptions
  /**
   * Function that retrieve the key to access the context
   */
  keyGetter: CtxKeyFunction<This>
  /**
   * Context type: retrieve a value or set a value
   */
  func_type: CtxType
  /**
   * Context
   */
  default_value: Value | undefined
}

function ctxPropertyFunctionDecoratorFactory<This extends object, Value> (name: string, func_type: CtxType, keyGetter: string | CtxKeyFunction<This>, defaultValue: Value | undefined, opt: Partial<CtxOptions> = CtxOptionsDefault): DecoratorType<This, Value> {
  const options = { ...CtxOptionsDefault, ...opt }

  return function (_: any, context: Context<This, Value>) {
    const propertyKey = context.name as keyof This
    if (!Meta.isFieldDecorated(context.metadata, propertyKey)) {
      // Create an empty relation that wont be read.
      Relation()(_, context)
    }
    const ctx: Ctx<This, Value> = {
      ...createPropertyMetaDescriptor(CtxSymbol, name, context.metadata, propertyKey),
      func_type,
      options,
      keyGetter: typeof keyGetter === 'string' ? () => keyGetter : keyGetter,
      default_value: defaultValue,
    }

    Meta.setContext(context.metadata, propertyKey, ctx)
  }
}

/**
 * `@CtxGet` decorator retrieve a value based on the key passed as argument
 * from a 'context' shared during the reading phase.
 *
 * @example
 *
 * In the following example, a streaming protocol that receives records
 * of arbitrary length is defined.
 * Records have two different type a 'definition' or a 'data' both use an
 * 'id' to identify themself. The definition defines the size of the data
 * message they define by using `CtxSet` to store that size into the
 * context. The data message uses `CtxGet` to fetch its size defined
 * previously by the definition.
 *
 * ```typescript
 * class RecordDefinition {
 *     @Relation(PrimitiveSymbol.u8)
 *     id: number
 *
 *     @CtxSet(_ => `Definition.${_.id}`)
 *     @Relation(PrimitiveSymbol.u8)
 *     size: number
 * }
 *
 * class RecordMessage {
 *     @Relation(PrimitiveSymbol.u8)
 *     id: number
 *
 *     @CtxGet(_ => `Definition.${_.id}`)
 *     _size: number
 *
 *     @Count('_size')
 *     @Relation(PrimitiveSymbol.u8)
 *     data
 * }
 *
 * class Record {
 *     @Relation(PrimitiveSymbol.u8)
 *     type: number
 *
 *     @Choice('type', {
 *         0x00: RecordDefinition,
 *         0x01: RecordMessage,
 *     })
 *     message: RecordDefinition | RecordMessage
 * }
 *
 * class Protocol {
 *     @Until(EOF)
 *     records: Record[]
 * }
 * ```
 *
 * @param {CtxKeyFunction<This>} keyGetter Either a string formatted as
 * recursive key or a function that returns that string based on the
 * instance value.
 * @param {Value} [defaultValue] Default value to retrieve if no value was
 * found for the key passed as argument. If no default value is passed an
 * error will be thrown.
 * @param {Partial<CtxOptions>} [opt] Optional configuration.
 * @returns {DecoratorType<This, Value>} The property decorator function.
 *
 * @category Decorators
 */
export function CtxGet<This extends object, Value> (keyGetter: CtxKeyFunction<This> | string, defaultValue?: Value, opt?: Partial<CtxOptions>): DecoratorType<This, Value> {
  return ctxPropertyFunctionDecoratorFactory<This, Value> ('ctx-get', CtxType.CtxGetter, keyGetter, defaultValue, opt)
}

/**
 * `@CtxSet` decorator set the value of the decorated property into a
 * shared 'context' during the reading phase.
 *
 * @example
 *
 * In the following example, a streaming protocol that receives records
 * of arbitrary length is defined.
 * Records have two different type a 'definition' or a 'data' both use an
 * 'id' to identify themself. The definition defines the size of the data
 * message they define by using `CtxSet` to store that size into the
 * context. The data message uses `CtxGet` to fetch its size defined
 * previously by the definition.
 *
 * ```typescript
 * class RecordDefinition {
 *     @Relation(PrimitiveSymbol.u8)
 *     id: number
 *
 *     @CtxSet(_ => `Definition.${_.id}`)
 *     @Relation(PrimitiveSymbol.u8)
 *     size: number
 * }
 *
 * class RecordMessage {
 *     @Relation(PrimitiveSymbol.u8)
 *     id: number
 *
 *     @CtxGet(_ => `Definition.${_.id}`)
 *     _size: number
 *
 *     @Count('_size')
 *     @Relation(PrimitiveSymbol.u8)
 *     data
 * }
 *
 * class Record {
 *     @Relation(PrimitiveSymbol.u8)
 *     type: number
 *
 *     @Choice('type', {
 *         0x00: RecordDefinition,
 *         0x01: RecordMessage,
 *     })
 *     message: RecordDefinition | RecordMessage
 * }
 *
 * class Protocol {
 *     @Until(EOF)
 *     records: Record[]
 * }
 * ```
 *
 * @param {CtxKeyFunction<This>} keyGetter Either a string formatted as
 * recursive key or a function that returns that string based on the
 * instance value.
 * @param {Partial<CtxOptions>} [opt] Optional configuration.
 * @returns {DecoratorType<This, Value>} The property decorator function.
 *
 * @category Decorators
 */
export function CtxSet<This extends object, Value> (keyGetter: CtxKeyFunction<This> | string, opt?: Partial<CtxOptions>): DecoratorType<This, Value> {
  return ctxPropertyFunctionDecoratorFactory<This, Value> ('ctx-set', CtxType.CtxSetter, keyGetter, undefined, opt)
}

/**
 * `@CtxAppend` decorator append the value of the decorated property into a
 * shared 'context' during the reading phase.
 *
 * It works the same way as `@CtxSet` but will append the data to an array
 * instead of an object property.
 *
 * @example
 *
*
 * ```typescript
 * class Record {
 *   @CtxAppend('Content')
 *   @Relation(PrimitiveSymbol.u8)
 *   data: number
 * }
 *
 * class Protocol {
 *     @Until(EOF)
 *     records: Record[]
 * }
 * ```
 *
 * @param {CtxKeyFunction<This>} keyGetter Either a string formatted as
 * recursive key or a function that returns that string based on the
 * instance value.
 * @param {Partial<CtxOptions>} [opt] Optional configuration.
 * @returns {DecoratorType<This, Value>} The property decorator function.
 *
 * @category Decorators
 */
export function CtxAppend<This extends object, Value> (keyGetter: CtxKeyFunction<This> | string, opt?: Partial<CtxOptions>): DecoratorType<This, Value> {
  return ctxPropertyFunctionDecoratorFactory<This, Value> ('ctx-set', CtxType.CtxSetter, keyGetter, undefined, {
    ...opt,
    base_type: 'array',
  })
}

/**
 * useContextGet execute an array of `Ctx` decorator metadata.
 *
 * @typeParam This The type of the class the decorator is applied to.
 *
 * @param {Array<Ctx<This>>} metaCtx An array of context function to apply.
 * @param {This} targetInstance The target class instance containing the property.
 * @param {GlobalCtx} ctx The shared context reference.
 * @returns {any} The context retrieved.
 *
 * @category Advanced Use
 */
export function useContextGet<This, Value> (metaCtx: Array<Ctx<This, Value>>, targetInstance: This, ctx: GlobalCtx): any {
  const values = metaCtx.filter(x => x.func_type === CtxType.CtxGetter).map((x) => {
    const key = x.keyGetter(targetInstance)

    const accessors = key.split('.')
    const lastKey = accessors[accessors.length - 1]
    const ref = accessors.slice(0, -1).reduce((acc: any, key: string) => {
      if (Object.prototype.hasOwnProperty.call(acc, key) === false) {
        if (x.options.base_type == 'array') {
          Object.defineProperty(acc, key, {
            value: []
          })
        } else {
          Object.defineProperty(acc, key, {
            value: {}
          })
        }
      }
      return acc[key]
    }, ctx)

    if (Object.prototype.hasOwnProperty.call(ref, lastKey)) {
      return ref[lastKey]
    } else if (x.default_value !== undefined) {
      return x.default_value
    } else {
      throw new ReferenceError(`Can't retrieve key: '${key}' from ctx: ${JSON.stringify(ctx)}.`)
    }
  })

  return values.length === 1 ? values[0] : values
}

/**
 * useContextSet execute an array of `Ctx` decorator metadata.
 *
 * @typeParam This The type of the class the decorator is applied to.
 *
 * @param {Array<Ctx<This>>} metaCtx An array of context function to apply.
 * @param {This} targetInstance The target class instance containing the property.
 * @param {GlobalCtx} ctx The shared context reference.
 * @returns {any} The context retrieved.
 *
 * @category Advanced Use
 */
export function useContextSet<This, Value> (metaCtx: Array<Ctx<This, Value>>, propertyValue: any, targetInstance: This, ctx: GlobalCtx): void {
  metaCtx.filter(x => x.func_type === CtxType.CtxSetter).forEach((x) => {
    const key = x.keyGetter(targetInstance)
    const accessors = key.split('.')
    const lastKey = accessors[accessors.length - 1]
    const ref = accessors.slice(0, -1).reduce((acc: any, key: string) => {
      if (Object.prototype.hasOwnProperty.call(acc, key) === false) {
        Object.defineProperty(acc, key, {
          value: {}
        })
      }
      return acc[key]
    }, ctx)

    if (x.options.base_type == 'array') {
      if (Object.prototype.hasOwnProperty.call(ref, lastKey) === false) {
        Object.defineProperty(ref, lastKey, {
          value: []
        })
      }

      if (Array.isArray(propertyValue)) {
        ref[lastKey] = ref[lastKey].concat(propertyValue)
      } else {
        ref[lastKey].push(propertyValue)
      }
    } else {
      ref[lastKey] = propertyValue
    }
  })
}
