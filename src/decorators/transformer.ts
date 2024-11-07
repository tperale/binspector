/**
 * Module definition of {@link Transformer} type decorators.
 *
 * The {@link Transformer} decorators take a fully read property and transform it into a new property.
 * Those decorators can be used to apply a string encoding to a byte array.
 *
 * @module Transformer
 */
import { createMetaDescriptor, type MetaDescriptor } from './common'
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
   * Verify a relation already exist before the definition of the controller
   */
  primitiveCheck: boolean
  /**
   * If the value to apply the transformer to is an array the transformer will be applied to every member.
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
export type TransformerFunction<This> = (value: any, targetInstance: This) => any

/**
 * Transformer.
 *
 * @extends {MetaDescriptor<T>}
 */
export interface Transformer<This> extends MetaDescriptor<This> {
  options: TransformerOptions
  /**
   * The transformer function taking the value in input and return the transformed value.
   */
  transformer: TransformerFunction<This>
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
export function transformerDecoratorFactory<This, Value> (name: string, func: TransformerFunction<This>, opt: Partial<TransformerOptions> = TransformerOptionsDefault): DecoratorType<This, Value> {
  const options = { ...TransformerOptionsDefault, ...opt }

  return function (_: any, context: Context<This, Value>) {
    if (options.primitiveCheck) {
      relationExistOrThrow(context.metadata, context)
    }

    const transformer: Transformer<This> = {
      ...createMetaDescriptor(TransformerSymbol, name, context.metadata, context.name as keyof This),
      options,
      transformer: func
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
export function Transform<This, Value> (transformFunction: TransformerFunction<This>, opt?: Partial<TransformerOptions>): DecoratorType<This, Value> {
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
export function useTransformer<This> (transformers: Array<Transformer<This>>, propertyValue: any, targetInstance: This): any {
  return transformers.reduce((transformedTmpValue, transformer) => {
    if (Array.isArray(transformedTmpValue) && transformer.options.each) {
      return transformedTmpValue.map(x => transformer.transformer(x, targetInstance))
    } else {
      return transformer.transformer(transformedTmpValue, targetInstance)
    }
  }, propertyValue)
}
