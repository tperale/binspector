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
import { type DecoratorType, type Context } from '../types'
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
export type TransformerFunction = (value: any, targetInstance: any) => any

/**
 * Transformer.
 *
 * @extends {MetaDescriptor<T>}
 */
export interface Transformer extends MetaDescriptor {
  options: TransformerOptions
  /**
   * @type {TransformerFunction<T>} The transformer function taking the value in input and return the transformed value.
   */
  transformer: TransformerFunction
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
export function transformerDecoratorFactory (name: string, func: TransformerFunction, opt: Partial<TransformerOptions> = TransformerOptionsDefault): DecoratorType {
  const options = { ...TransformerOptionsDefault, ...opt }

  return function (_: any, context: Context) {
    if (options.primitiveCheck) {
      relationExistOrThrow(context.metadata, context)
    }

    const transformer: Transformer = {
      type: TransformerSymbol,
      name,
      metadata: context.metadata,
      propertyName: context.name,
      options,
      transformer: func as TransformerFunction
    }

    Meta.setTransformer(context.metadata, context.name, transformer)
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
export function Transform (transformFunction: TransformerFunction, opt: Partial<TransformerOptions>): DecoratorType {
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
export function useTransformer (transformers: Array<Transformer>, propertyValue: any, targetInstance: any): any {
  return transformers.reduce((transformedTmpValue, transformer) => {
    if (Array.isArray(transformedTmpValue) && transformer.options.each) {
      return transformedTmpValue.map(x => transformer.transformer(x, targetInstance))
    } else {
      return transformer.transformer(transformedTmpValue, targetInstance)
    }
  }, propertyValue)
}
