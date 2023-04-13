/**
 * Module definition of {@link Transformer} type decorators.
 *
 * The {@link Transformer} decorators take a fully read property and transform it into a new property.
 * Those decorators can be used to apply a string encoding to a byte array.
 *
 * @module Transformer
 */
import { type MetaDescriptor } from './common'
import { relationExistOrThrow } from './primitive'
import { type DecoratorType } from '../types'
import Meta from '../metadatas'

/**
 */
export const TransformerSymbol = Symbol('transformer')

/**
 * TransformerOptions.
 */
export interface TransformerOptions {
  /**
   * @type {boolean}
   */
  primitiveCheck: boolean
  /**
   * @type {boolean}
   */
  each: boolean
}

export const TransformerOptionsDefault = {
  primitiveCheck: true,
  each: false
}

/**
 * TransformerFunction.
 */
export type TransformerFunction<T> = (value: any, targetInstance: T) => any

/**
 * Transformer.
 *
 * @extends {MetaDescriptor<T>}
 */
export interface Transformer<T> extends MetaDescriptor<T> {
  options: TransformerOptions
  /**
   * @type {TransformerFunction<T>} The transformer function taking the value in input and return the transformed value.
   */
  transformer: TransformerFunction<T>
}

/**
 * transformerDecoratorFactory.
 *
 * @param {string} name
 * @param {TransformerFunction} func
 * @param {TransformerOptions} opt
 * @returns {DecoratorType}
 *
 * @category Advanced Use
 */
export function transformerDecoratorFactory (name: string, func: TransformerFunction<unknown>, opt: Partial<TransformerOptions> = TransformerOptionsDefault): DecoratorType {
  return function <T>(target: T, propertyKey: keyof T) {
    if (opt.primitiveCheck) {
      relationExistOrThrow(target, propertyKey)
    }

    const transformer: Transformer<T> = {
      type: TransformerSymbol,
      name,
      target,
      propertyName: propertyKey,
      options: { ...TransformerOptionsDefault, ...opt },
      transformer: func as TransformerFunction<T>
    }

    Meta.setTransformer(target, propertyKey, transformer)
  }
}

/**
 * Transform.
 *
 * @param {TransformerFunction} transformFunction
 * @returns {DecoratorType}
 *
 * @category Decorators
 */
export function Transform (transformFunction: TransformerFunction<unknown>, opt: Partial<TransformerOptions>): DecoratorType {
  return transformerDecoratorFactory('transform', transformFunction, opt)
}

/**
 * useTransformer.
 *
 * @param {Array} transformers
 * @param {any} propertyValue
 * @param {T} targetInstance
 * @returns {any}
 *
 * @category Advanced Use
 */
export function useTransformer<T> (transformers: Array<Transformer<T>>, propertyValue: any, targetInstance: T): any {
  return transformers.reduce((transformedTmpValue, transformer) => {
    if (Array.isArray(transformedTmpValue) && transformer.options.each) {
      return transformedTmpValue.map(x => transformer.transformer(x, targetInstance))
    } else {
      return transformer.transformer(transformedTmpValue, targetInstance)
    }
  }, propertyValue)
}
