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
export interface Ctx<This> extends PropertyMetaDescriptor<This> {
  options: CtxOptions
  /**
   * Function that retrieve the key to access the context
   */
  keyGetter: CtxKeyFunction<This>
  /**
   * Context type: retrieve a value or set a value
   */
  func_type: CtxType
}

function ctxPropertyFunctionDecoratorFactory<This extends object, Value> (name: string, func_type: CtxType, keyGetter: string | CtxKeyFunction<This>, opt: Partial<CtxOptions> = CtxOptionsDefault): DecoratorType<This, Value> {
  const options = { ...CtxOptionsDefault, ...opt }

  return function (_: any, context: Context<This, Value>) {
    const propertyKey = context.name as keyof This
    if (!Meta.isFieldDecorated(context.metadata, propertyKey)) {
      // Create an empty relation that wont be read.
      Relation()(_, context)
    }
    const ctx: Ctx<This> = {
      ...createPropertyMetaDescriptor(CtxSymbol, name, context.metadata, propertyKey),
      func_type,
      options,
      keyGetter: typeof keyGetter === 'string' ? () => keyGetter : keyGetter,
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
 * @param {Partial<CtxOptions>} [opt] Optional configuration.
 * @returns {DecoratorType<This, Value>} The property decorator function.
 *
 * @category Decorators
 */
export function CtxGet<This extends object, Value> (keyGetter: CtxKeyFunction<This> | string, opt?: Partial<CtxOptions>): DecoratorType<This, Value> {
  return ctxPropertyFunctionDecoratorFactory<This, Value> ('ctx-get', CtxType.CtxGetter, keyGetter, opt)
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
  return ctxPropertyFunctionDecoratorFactory<This, Value> ('ctx-set', CtxType.CtxSetter, keyGetter, opt)
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
export function useContextGet<This> (metaCtx: Array<Ctx<This>>, targetInstance: This, ctx: GlobalCtx): any {
  const values = metaCtx.filter(x => x.func_type === CtxType.CtxGetter).map((x) => {
    const key = x.keyGetter(targetInstance)

    // TODO future version should pass some typing to the context
    return key.split('.').reduce((acc: any, key: string) => {
      if (Object.prototype.hasOwnProperty.call(acc, key) === false) {
        throw new ReferenceError(`Can't retrieve key: '${key}' from ctx: ${JSON.stringify(ctx)}.`)
      }
      return acc[key]
    }, ctx)
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
export function useContextSet<This> (metaCtx: Array<Ctx<This>>, propertyValue: any, targetInstance: This, ctx: GlobalCtx): void {
  metaCtx.filter(x => x.func_type === CtxType.CtxSetter).forEach((x) => {
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
    ref[lastKey] = propertyValue
  })
}
