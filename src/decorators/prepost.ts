/**
 * Module definition of {@link PrePost} decorators.
 *
 * {@link PrePost} type decorators are used to define function
 * computed before and after starting reading the relation.
 * The {@link PrePost} decorators receive the cursor instance and
 * can execute operation on it. Allowing to move/save the current offset
 * of buffer.
 *
 * @module PrePost
 */
import { type MetaDescriptor, recursiveGet } from './common'
import { relationExistOrThrow } from './primitive'
import { type DecoratorType, type Context } from '../types'
import { type Cursor, type BinaryCursorEndianness, BinaryCursor } from '../cursor'
import Meta from '../metadatas'

export const PreFunctionSymbol = Symbol('pre-function')
export const PostFunctionSymbol = Symbol('post-function')

export type PrePostFunction<This> = (instance: This, cursor: Cursor) => void

type PrePostMetadataSetter<This> = (metadata: DecoratorMetadataObject, propertyKey: keyof This, pre: PrePost<This>) => Array<PrePost<This>>

/**
 * PrePostOptions.
 */
export interface PrePostOptions {
  /**
   * Verify a relation already exist before the definition of the PrePost function
   */
  primitiveCheck: boolean
}

export const PrePostOptionsDefault = {
  primitiveCheck: true
}

/**
 * PrePost type interface structure definition.
 *
 * @extends {MetaDescriptor}
 */
export interface PrePost<This> extends MetaDescriptor<This> {
  /**
   * Options for prepost decorator
   */
  options: PrePostOptions

  /**
   * Function that will be executed before or after the Controller, Validator and Transformer decorator.
   */
  func: PrePostFunction<This>
}

function prePostFunctionDecoratorFactory<This, Value> (name: string, typeSym: symbol, metaSetter: PrePostMetadataSetter<This>, func: PrePostFunction<This>, opt: Partial<PrePostOptions> = PrePostOptionsDefault): DecoratorType<This, Value> {
  const options = { ...PrePostOptionsDefault, ...opt }

  return function (_: undefined, context: Context<This, Value>) {
    if (options.primitiveCheck) {
      relationExistOrThrow(context.metadata, context)
    }

    const propertyName = context.name as keyof This
    const preFunction: PrePost<This> = {
      type: typeSym,
      name,
      metadata: context.metadata,
      propertyName,
      options,
      func
    }

    metaSetter(context.metadata, propertyName, preFunction)
  }
}

/**
 * `preFunctionDecoratorFactory` function helps create a decorator that will save the metadata of the `Pre` decorator.
 *
 * @param {string} name Name of the 'pre' decorator.
 * @param {PrePostFunction} func Function that will be executed before the Controller/Validator/Transfromer validators.
 * @param {Partial} opt PrePost options.
 * @returns {DecoratorType} The property decorator function ran at runtime
 *
 * @category Advanced Use
 */
export function preFunctionDecoratorFactory<This, Value> (name: string, func: PrePostFunction<This>, opt: Partial<PrePostOptions> = PrePostOptionsDefault): DecoratorType<This, Value> {
  return prePostFunctionDecoratorFactory(name, PreFunctionSymbol, Meta.setPre, func, opt)
}

/**
 * `postFunctionDecoratorFactory` function helps create a decorator that will save the metadata of the `Post` decorator.
 *
 * @param {string} name Name of the 'post' decorator.
 * @param {PrePostFunction} func Function that will be executed after the Controller/Validator/Transfromer validators.
 * @param {Partial} opt PrePost options.
 * @returns {DecoratorType} The property decorator function ran at runtime
 *
 * @category Advanced Use
 */
export function postFunctionDecoratorFactory<This, Value> (name: string, func: PrePostFunction<This>, opt: Partial<PrePostOptions> = PrePostOptionsDefault): DecoratorType<This, Value> {
  return prePostFunctionDecoratorFactory(name, PostFunctionSymbol, Meta.setPost, func, opt)
}

/**
 * `@Pre` decorator defines a function computed before reading the property value.
 *
 * @param {PrePostFunction} func Function that will be executed before the Controller/Validator/Transfromer validators.
 * @param {Partial} opt PrePost options.
 * @returns {DecoratorType} The property decorator function ran at runtime
 *
 * @category Decorators
 */
export function Pre<This, Value> (func: PrePostFunction<This>, opt?: Partial<PrePostOptions>): DecoratorType<This, Value> {
  return preFunctionDecoratorFactory('pre', func, opt)
}

/**
 * `@Post` decorator defines a function computed after fully reading and transforming the property value.
 *
 * @param {PrePostFunction} func Function that will be executed after the Controller/Validator/Transfromer validators.
 * @param {Partial} opt PrePost options.
 * @returns {DecoratorType} The property decorator function ran at runtime
 *
 * @category Decorators
 */
export function Post<This, Value> (func: PrePostFunction<This>, opt?: Partial<PrePostOptions>): DecoratorType<This, Value> {
  return postFunctionDecoratorFactory('post', func, opt)
}

/**
 * `@Offset` decorator define the place to move the cursor of the buffer to perform the following operation on it.
 *
 * @param {number | string} offset
 * @param {Partial} opt PrePost options.
 * @returns {DecoratorType} The property decorator function ran at runtime
 *
 * @category Decorators
 */
export function Offset<This, Value> (offset: number | string | ((instance: This, cursor: Cursor) => number), opt?: Partial<PrePostOptions>): DecoratorType<This, Value> {
  return preFunctionDecoratorFactory('offset', (targetInstance, cursor) => {
    const offCompute = typeof offset === 'string'
      ? recursiveGet(targetInstance, offset) as number
      : typeof offset === 'number'
        ? offset
        : offset(targetInstance, cursor)
    cursor.move(offCompute)
  }, opt)
}

/**
 * `@Peek` decorator define the place to move the cursor of the buffer then move it back
 *
 * @param {number | string} offset
 * @param {Partial} opt PrePost options.
 * @returns {DecoratorType} The property decorator function ran at runtime
 *
 * @category Decorators
 */
export function Peek<This, Value> (offset?: number | string | ((instance: This, cursor: Cursor) => number), opt?: Partial<PrePostOptions>): DecoratorType<This, Value> {
  return function (_: undefined, context: Context<This, Value>) {
    preFunctionDecoratorFactory<This, Value>('pre-peek', (targetInstance, cursor) => {
      const preOff = cursor.offset()
      postFunctionDecoratorFactory<This, Value>('post-peek', (_, cursor) => {
        cursor.move(preOff)
      }, opt)(_, context)
      const offCompute =
        (offset === null || offset === undefined)
          ? preOff
        : typeof offset === 'number'
          ? offset
        : typeof offset === 'string'
          ? Number(recursiveGet(targetInstance, offset))
          : offset(targetInstance, cursor)
      cursor.move(offCompute)
    }, opt)(_, context)
  }
}

/**
 * `@Endian`
 *
 * @param {BinaryCursorEndianness} endianness
 * @param {Partial} opt PrePost options.
 * @returns {DecoratorType} The property decorator function ran at runtime
 *
 * @category Decorators
 */
export function Endian<This, Value> (endianness: BinaryCursorEndianness, opt?: Partial<PrePostOptions>): DecoratorType<This, Value> {
  return function (_: undefined, context: Context<This, Value>) {
    preFunctionDecoratorFactory('preEndian', (_2, cursor) => {
      if (cursor instanceof BinaryCursor) {
        const currentEndian = cursor.getEndian()
        cursor.setEndian(endianness)

        postFunctionDecoratorFactory('postEndian', () => {
          cursor.setEndian(currentEndian)
        }, opt)(_, context)
      }
    }, opt)(_, context)
  }
}

/**
 * usePrePost execute an array of `PrePost` decorator metadata on a target instance.
 *
 * @param {Array} prepost Array of `PrePost` decorator metadatas.
 * @param {T} targetInstance Current state of the object the `PrePost` decorators are defined in, that will be passed to the PrePost decorator functions.
 * @param {Cursor} cursor Cursor state that will be passed to the PrePost decorator functions.
 * @returns {void}
 *
 * @category Advanced Use
 */
export function usePrePost<This> (prepost: Array<PrePost<This>>, targetInstance: This, cursor: Cursor): void {
  prepost.forEach(x => {
    x.func(targetInstance, cursor)
  })
}
