/**
 * Module definition of {@link Transformer} type decorators.
 *
 * The {@link Transformer} decorators take a fully read property and transform
 * it into a new property.
 *
 * The {@link Transformer} decorators are executed just after the value has
 * been read.
 *
 * ```mermaid
 * flowchart TB
 *  subgraph s1[For each properties]
 *  direction TB
 *  PreOperation[__Pre__ property reading operations] --> Condition
 *  click PreOperation "/binspector/modules/PrePost.html" "Documentation for 'Pre' type decorators"
 *  Condition[__Condition__ get the definitive subtype to read based on current state] --> s2
 *  click Condition "/binspector/modules/Condition.html" "Documentation for 'Condtion' type decorators"
 *  subgraph s2[Reading subtype]
 *  Controller[__Controller__ decides when to stop reading the subtype based on a set of arbitrary conditions] --> TypeReading[Read __Relation__ or __Primitive__]
 *  click Controller "/binspector/modules/Controller.html" "Documentation for 'Controller' type decorators"
 *  click TypeReading "/binspector/modules/Primitive.html" "Documentation for 'Primitive' type decorators"
 *  end
 *  TypeReading --> Controller
 *  s2 --> Transform[__Transform__ the value we read into something else]
 *  click Transform "/binspector/modules/Transformer.html" "Documentation for 'Transformer' type decorators"
 *  Transform --> Validate[__Validate__ the final value]
 *  click Validate "/binspector/modules/Validator.html" "Documentation for 'Validator' type decorators"
 *  Validate --> PostOperation[__Post__ property reading operations]
 *  click PostOperation "/binspector/modules/PrePost.html" "Documentation for 'Post' type decorators"
 *  end
 *  PostOperation -->  A@{ shape: framed-circle, label: "Stop" }
 *  style Transform fill:blue,stroke:#f66,stroke-width:2px,color:#fff,stroke-dasharray: 5 5
 * ```
 *
 * For instance those {@link Transformer} type decorators can be used to apply
 * a string encoding to a byte array.
 *
 * By default the custom transformers you will define are only applied when
 * reading the binary. To also support encoding binary file from your object
 * you need to define a second custom transformer with a different
 * {@link TransformerExecutionScope} passed to the {@link TransformerOptions}.
 *
 * @module Transformer
 */
import { createPropertyMetaDescriptor, type PropertyMetaDescriptor } from './common'
import { relationExistOrThrow } from './primitive'
import { type DecoratorType, type Context } from '../types'
import Meta from '../metadatas'

/**
 */
export const TransformerSymbol = Symbol('transformer')

export enum TransformerExecutionScope {
  OnRead = 0x01,
  OnWrite = 0x02,
  OnBoth = 0x03,
}

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
  /**
   * Whether that Transformer function must be executed during the read process or the write process (or both).
   */
  scope: TransformerExecutionScope
}

export const TransformerOptionsDefault = {
  primitiveCheck: true,
  each: false,
  scope: TransformerExecutionScope.OnRead,
}

/**
 * TransformerFunction.
 */
export type TransformerFunction<This> = (value: any, targetInstance: This) => any

/**
 * Transformer.
 *
 * @extends {PropertyMetaDescriptor}
 */
export interface Transformer<This> extends PropertyMetaDescriptor<This> {
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
      ...createPropertyMetaDescriptor(TransformerSymbol, name, context.metadata, context.name as keyof This),
      options,
      transformer: func,
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
 * TransformScale
 *
 * @param {number} scale
 * @returns {DecoratorType}
 *
 * @category Decorators
 */
export function TransformScale<This, Value> (scale: number, opt?: Partial<TransformerOptions>): DecoratorType<This, Value> {
  return function (_: any, context: Context<This, Value>) {
    transformerDecoratorFactory('transform-scale', x => x * scale, opt)(_, context)
    transformerDecoratorFactory('transform-scale', x => x / scale, { ...opt, scope: TransformerExecutionScope.OnWrite })(_, context)
  }
}

/**
 * TransformOffset
 *
 * @param {number} offset
 * @returns {DecoratorType}
 *
 * @category Decorators
 */
export function TransformOffset<This, Value> (off: number, opt?: Partial<TransformerOptions>): DecoratorType<This, Value> {
  return function (_: any, context: Context<This, Value>) {
    transformerDecoratorFactory('transform-offset', x => x + off, opt)(_, context)
    transformerDecoratorFactory('transform-offset', x => x - off, { ...opt, scope: TransformerExecutionScope.OnWrite })(_, context)
  }
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
export function useTransformer<This> (transformers: Array<Transformer<This>>, propertyValue: any, targetInstance: This, scope = TransformerExecutionScope.OnRead): any {
  return transformers.reduce((transformedTmpValue, transformer) => {
    if ((transformer.options.scope & scope) > 0) {
      if (Array.isArray(transformedTmpValue) && transformer.options.each) {
        return transformedTmpValue.map(x => transformer.transformer(x, targetInstance))
      } else {
        return transformer.transformer(transformedTmpValue, targetInstance)
      }
    }
    return transformedTmpValue
  }, propertyValue)
}
