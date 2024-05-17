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
import { type Cursor, CursorEndianness } from '../cursor'
import Meta from '../metadatas'

export const PreFunctionSymbol = Symbol('pre-function')
export const PostFunctionSymbol = Symbol('post-function')

export type PrePostFunction = (instance: any, cursor: Cursor) => any

/**
 * PrePostOptions.
 */
export interface PrePostOptions {
  /**
   * @type {boolean} Verify a relation already exist before the definition of the PrePost function
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
export interface PrePost extends MetaDescriptor {
  /**
   * @type {PrePostOptions} Options for prepost decorator
   */
  options: PrePostOptions

  /**
   * @type {PrePostFunction} Function that will be executed before or after the Controller, Validator and Transformer decorator.
   */
  func: PrePostFunction
}

function prePostFunctionDecoratorFactory (name: string, typeSym: symbol, metaSetter: any, func: PrePostFunction, opt: Partial<PrePostOptions> = PrePostOptionsDefault): DecoratorType {
  return function (_: any, context: Context) {
    if (opt.primitiveCheck) {
      relationExistOrThrow(context.metadata, context)
    }
    const options = {
      ...PrePostOptionsDefault,
      ...opt
    }
    const preFunction: PrePost = {
      type: typeSym,
      name,
      metadata: context.metadata,
      propertyName: context.name,
      options,
      func
    }

    metaSetter(context.metadata, context.name, preFunction)
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
export function preFunctionDecoratorFactory (name: string, func: PrePostFunction, opt: Partial<PrePostOptions> = PrePostOptionsDefault): DecoratorType {
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
export function postFunctionDecoratorFactory (name: string, func: PrePostFunction, opt: Partial<PrePostOptions> = PrePostOptionsDefault): DecoratorType {
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
export function Pre (func: PrePostFunction, opt?: Partial<PrePostOptions>): DecoratorType {
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
export function Post (func: PrePostFunction, opt?: Partial<PrePostOptions>): DecoratorType {
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
export function Offset (offset: number | string | PrePostFunction, opt?: Partial<PrePostOptions>): DecoratorType {
  return preFunctionDecoratorFactory('offset', (targetInstance, cursor) => {
    const offCompute = typeof offset === 'string' ? recursiveGet(targetInstance, offset)
      : typeof offset === 'number'
        ? offset
        : offset(targetInstance, cursor) as number
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
export function Peek (offset: number | string | PrePostFunction, opt?: Partial<PrePostOptions>): DecoratorType {
  return (_: any, context: Context) => {
    preFunctionDecoratorFactory('pre-peek', (targetInstance, cursor) => {
      const preOff = cursor.offset()
      postFunctionDecoratorFactory('post-peek', (_, cursor) => {
        console.log(preOff)
        cursor.move(preOff)
      }, opt)(_, context)
      const offCompute = typeof offset === 'string'
        ? recursiveGet(targetInstance, offset)
        : typeof offset === 'number'
          ? offset
          : offset(targetInstance, cursor) as number
      console.log(offCompute)
      cursor.move(offCompute)
    }, opt)(_, context)
  }
}

/**
 * `@Endian`
 *
 * @param {CursorEndianness} endianness
 * @param {Partial} opt PrePost options.
 * @returns {DecoratorType} The property decorator function ran at runtime
 *
 * @category Decorators
 */
export function Endian (endianness: CursorEndianness, opt?: Partial<PrePostOptions>): DecoratorType {
  return function (_: any, context: Context) {
    let currentEndian = CursorEndianness.BigEndian
    preFunctionDecoratorFactory('preEndian', (_, cursor) => {
      currentEndian = cursor.getEndian()
      cursor.setEndian(endianness)
    }, opt)(_, context)
    postFunctionDecoratorFactory('postEndian', (_, cursor) => {
      cursor.setEndian(currentEndian)
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
export function usePrePost (prepost: Array<PrePost>, targetInstance: any, cursor: Cursor): void {
  prepost.forEach(x => {
    x.func(targetInstance, cursor)
  })
}
