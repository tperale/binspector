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
import { type DecoratorType } from '../types'
import { type Cursor } from '../cursor'
import Meta from '../metadatas'

export const PreFunctionSymbol = Symbol('pre-function')
export const PostFunctionSymbol = Symbol('post-function')

export type PrePostFunction<T> = (instance: T, cursor: Cursor) => any

export interface PrePostOptions {
  primitiveCheck: boolean
}

export const PrePostOptionsDefault = {
  primitiveCheck: true
}

export interface PrePost<T> extends MetaDescriptor<T> {
  options: PrePostOptions
  func: PrePostFunction<T>
}

function prePostFunctionDecoratorFactory (name: string, typeSym: symbol, metaSetter: any, func: PrePostFunction<unknown>, opt: Partial<PrePostOptions> = PrePostOptionsDefault): DecoratorType {
  return function <T>(target: T, propertyKey: keyof T) {
    if (opt.primitiveCheck) {
      relationExistOrThrow(target, propertyKey)
    }
    const options = {
      ...PrePostOptionsDefault,
      ...opt
    }
    const preFunction: PrePost<T> = {
      type: typeSym,
      name,
      target,
      propertyName: propertyKey,
      options,
      func
    }

    metaSetter(target, propertyKey, preFunction)
  }
}

/**
 * preFunctionDecoratorFactory.
 *
 * @param {string} name
 * @param {PrePostFunction} func
 * @param {Partial} opt
 * @returns {DecoratorType} The property decorator function ran at runtime
 *
 * @category Advanced Use
 */
export function preFunctionDecoratorFactory (name: string, func: PrePostFunction<unknown>, opt: Partial<PrePostOptions> = PrePostOptionsDefault): DecoratorType {
  return prePostFunctionDecoratorFactory(name, PreFunctionSymbol, Meta.setPre, func, opt)
}

/**
 * postFunctionDecoratorFactory.
 *
 * @param {string} name
 * @param {PrePostFunction} func
 * @param {Partial} opt
 * @returns {DecoratorType} The property decorator function ran at runtime
 *
 * @category Advanced Use
 */
export function postFunctionDecoratorFactory (name: string, func: PrePostFunction<unknown>, opt: Partial<PrePostOptions> = PrePostOptionsDefault): DecoratorType {
  return prePostFunctionDecoratorFactory(name, PostFunctionSymbol, Meta.setPost, func, opt)
}

/**
 * `@Pre` decorator defines a function computed before reading the property value.
 *
 * @param {PrePostFunction} func
 * @param {Partial} opt
 * @returns {DecoratorType} The property decorator function ran at runtime
 *
 * @category Decorators
 */
export function Pre (func: PrePostFunction<unknown>, opt?: Partial<PrePostOptions>): DecoratorType {
  return preFunctionDecoratorFactory('pre', func, opt)
}

/**
 * `@Post` decorator defines a function computed after fully reading and transforming the property value.
 *
 * @param {PrePostFunction} func
 * @param {Partial} opt
 * @returns {DecoratorType} The property decorator function ran at runtime
 *
 * @category Decorators
 */
export function Post (func: PrePostFunction<unknown>, opt?: Partial<PrePostOptions>): DecoratorType {
  return postFunctionDecoratorFactory('post', func, opt)
}

/**
 * `@Offset` decorator define the place to move the cursor of the buffer to perform the following operation on it.
 *
 * @param {number | string} offset
 * @param {Partial} opt
 * @returns {DecoratorType} The property decorator function ran at runtime
 *
 * @category Decorators
 */
export function Offset (offset: number | string, opt?: Partial<PrePostOptions>): DecoratorType {
  return preFunctionDecoratorFactory('offset', (targetInstance, cursor) => {
    cursor.move(typeof offset === 'string' ? recursiveGet(targetInstance, offset) : offset)
  }, opt)
}

/**
 * usePrePost.
 *
 * @param {Array} prepost
 * @param {T} targetInstance
 * @param {Cursor} cursor
 * @returns {void}
 *
 * @category Advanced Use
 */
export function usePrePost<T> (prepost: Array<PrePost<T>>, targetInstance: T, cursor: Cursor): void {
  prepost.forEach(x => {
    x.func(targetInstance, cursor)
  })
}
