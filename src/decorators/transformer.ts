/**
 * Module definition of {@link Transformer} property decorators.
 *
 * The {@link Transformer} decorators transform a fully read property into
 * a new, derived property. These transformations occur immediately after
 * the value has been read.
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
 * By default, custom transformers are applied only during the reading phase.
 * To support binary encoding (writing phase), define an additional transformer
 * with a {@link ExecutionScope} set to `OnWrite` or `OnBoth` via
 * {@link TransformerOptions}.
 *
 * The {@link Transformer} category define various decorators to perform
 * transformation.
 *
 * - **Generic Transformer**: Defines custom transformer function using
 * the {@link Transform} decorator.
 *
 * - **Predefined Transformer**: Defines basic transformation to apply to
 * the decorated property that already include both read and write transformer
 * see {@link TransformScale} and {@link TransformOffset}.
 *
 * @module Transformer
 */
import { createPropertyMetaDescriptor, type PropertyMetaDescriptor } from './common'
import { relationExistsOrThrow } from '../error'
import { ExecutionScope, type DecoratorType, type Context } from '../types'
import Meta from '../metadatas'

export const TransformerSymbol = Symbol('transformer')

/**
 * TransformerOptions.
 */
export interface TransformerOptions {
  /**
   * Ensures that a relation exists before defining the Transformer decorator.
   */
  primitiveCheck: boolean
  /**
   * Applies the transformer function to each element if the value is an array.
   */
  each: boolean
  /**
   * Specifies whether the transformer function should be executed during
   * the read phase, the write phase, or both.
   */
  scope: ExecutionScope
}

export const TransformerOptionsDefault = {
  primitiveCheck: true,
  each: false,
  scope: ExecutionScope.OnRead,
}

/**
 * TransformerFunction is a function that takes as arguments the current value
 * of the property as well as an instance of the class the decorated property
 * belongs in, and returns a transformed value.
 */
export type TransformerFunction<This> = (value: any, targetInstance: This) => any

/**
 * Transformer metadata type definition.
 *
 * This interface define how a transformer decorator will be stored in the
 * metadata of the class definition.
 *
 * @extends {PropertyMetaDescriptor}
 */
export interface Transformer<This> extends PropertyMetaDescriptor<This> {
  options: TransformerOptions
  /**
   * Function that perform the transformation.
   */
  transformer: TransformerFunction<This>
}

/**
 * `transformerDecoratorFactory` is a utility function used to create
 * `Transformer` type property decorators, used to transform the value
 * of a property.
 *
 * @remarks
 *
 * Use this factory function to design custom 'Transformer' type decorators
 * tailored to specific data format requirements that are not supported by the
 * library yet.
 *
 * @typeParam This The type of the class the decorator is applied to.
 * @typeParam Value The type of the decorated property.
 *
 * @param {string} name The name of the 'Transformer' type decorator.
 * @param {TransformerFunction} func The function to execute as part of the
 * transformation process.
 * @param {Partial<TransformerOptions>} [opt] Optional configuration.
 * @returns {DecoratorType<This, Value>} The property decorator function.
 *
 * @category Advanced Use
 */
export function transformerDecoratorFactory<This, Value> (name: string, func: TransformerFunction<This>, opt: Partial<TransformerOptions> = TransformerOptionsDefault): DecoratorType<This, Value> {
  const options = { ...TransformerOptionsDefault, ...opt }

  return function (_: any, context: Context<This, Value>) {
    if (options.primitiveCheck) {
      relationExistsOrThrow(context.metadata, context)
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
 * `@Transform` decorator applies a custom transformation function to the
 * decorated property value immediately after it is read or written during
 * binary processing.
 *
 * The decorator enables dynamic transformations, such as decoding, scaling,
 * or reformatting values, providing flexibility in how data is interpreted and
 * manipulated during parsing.
 *
 * @example
 *
 * The following example demonstrates how to use the `@Transform` decorator to
 * apply custom logic during parsing. In this case, it decodes an array
 * into a UTF-8 string.
 *
 * ```typescript
 * class Protocol {
 *   @Transform((value: number[]) => {
 *     const buf = new Uint8Array(value)
 *     return new TextDecoder().decode(buf)
 *   })
 *   @Until(EOF)
 *   @Relation(PrimitiveSymbol.u8)
 *   decodedString: string;
 * }
 * ```
 *
 * To add support for writing, define a complementary transformer for the
 * writing phase:
 *
 * ```typescript
 * class Protocol {
 *   @Transform((value: number[]) => {
 *     const buf = new Uint8Array(value)
 *     return new TextDecoder().decode(buf)
 *   }, { scope: ExecutionScope.OnRead })
 *   @Transform((value: string) => {
 *     const buf = new TextEncoder().encode(value)
 *     return Array.from(buf)
 *   }, { scope: ExecutionScope.OnWrite })
 *   @Until(EOF)
 *   @Relation(PrimitiveSymbol.u8)
 *   decodedString: string;
 * }
 * ```
 *
 * @remarks
 *
 * By default, the `@Transform` decorator applies the transformation only
 * during the reading phase. To enable the reverse transformation during
 * the writing phase, define a separate transformer with the appropriate
 * execution scope.
 *
 * @typeParam This The type of the class the decorator is applied to.
 * @typeParam Value The type of the decorated property.
 *
 * @param {TransformerFunction<This>} transformFunction A function that based
 * on the current value of the decorated property and instance, returns a
 * transformed value.
 * @param {Partial<TransformerOptions>} [opt] Optional configuration.
 * @returns {DecoratorType<This, Value>} The property decorator function.
 *
 * @category Decorators
 */
export function Transform<This, Value> (transformFunction: TransformerFunction<This>, opt?: Partial<TransformerOptions>): DecoratorType<This, Value> {
  return transformerDecoratorFactory('transform', transformFunction, opt)
}

/**
 * `@TransformScale` decorator applies a scaling transformation to the decorated
 * property value during the binary reading or writing phase.
 * The decorator multiplies the value by the given scale factor when reading
 * and divides it by the same factor when writing, ensuring symmetry.
 *
 * @typeParam This The type of the class the decorator is applied to.
 * @typeParam Value The type of the decorated property.
 *
 * @param {number} scale The scaling factor to apply.
 * @param {Partial<TransformerOptions>} [opt] Optional configuration.
 * @returns {DecoratorType<This, Value>} The property decorator function.
 *
 * @category Decorators
 */
export function TransformScale<This, Value> (scale: number, opt?: Partial<TransformerOptions>): DecoratorType<This, Value> {
  return function (_: any, context: Context<This, Value>) {
    transformerDecoratorFactory('transform-scale', x => x * scale, { ...opt, each: true })(_, context)
    transformerDecoratorFactory('transform-scale', x => x / scale, { ...opt, each: true, scope: ExecutionScope.OnWrite })(_, context)
  }
}

/**
 * `@TransformOffset` decorator applies an offset transformation to the
 * decorated property value during the binary reading or writing phase.
 * The decorator adds the specified offset to the value when reading and
 * subtracts it during writing, ensuring symmetry.
 *
 * @typeParam This The type of the class the decorator is applied to.
 * @typeParam Value The type of the decorated property.
 *
 * @param {number} off The offset number to apply.
 * @param {Partial<TransformerOptions>} [opt] Optional configuration.
 * @returns {DecoratorType<This, Value>} The property decorator function.
 *
 * @category Decorators
 */
export function TransformOffset<This, Value> (off: number, opt?: Partial<TransformerOptions>): DecoratorType<This, Value> {
  return function (_: any, context: Context<This, Value>) {
    transformerDecoratorFactory('transform-offset', x => x + off, { ...opt, each: true })(_, context)
    transformerDecoratorFactory('transform-offset', x => x - off, { ...opt, each: true, scope: ExecutionScope.OnWrite })(_, context)
  }
}

/**
 * useTransformer execute an array of `Transformer` decorator metadata on a
 * property of a target instance.
 *
 * @typeParam This The type of the class the decorator is applied to.
 *
 * @param {Array<Transformer<This>>} transformers An array of transformers to apply.
 * @param {any} propertyValue The initial value of the property to transform.
 * @param {This} targetInstance The target class instance containing the property.
 * @returns {any} The transformed value.
 *
 * @category Advanced Use
 */
export function useTransformer<This> (transformers: Array<Transformer<This>>, propertyValue: any, targetInstance: This, scope = ExecutionScope.OnRead): any {
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
