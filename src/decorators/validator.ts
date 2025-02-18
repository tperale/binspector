/**
 * Module definition of {@link Validator} property decorators.
 *
 * {@link Validator} decorators ensure that a decorated property adheres
 * to an expected format or value. These decorators validate the value
 * of a property against predefined rules, such as matching a specific value,
 * conforming to an enumeration, or meeting a custom condition.
 *
 * If validation fails, an error is raised, allowing developers to identify
 * and debug discrepancies between the binary data and its expected format.
 *
 * The validation happens as the final step of the property reading loop, after
 * the property has been fully read and transformed.
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
 *  style Validate fill:blue,stroke:#f66,stroke-width:2px,color:#fff,stroke-dasharray: 5 5
 * ```
 *
 * The {@link Validator} category define various decorators to perform
 * validation.
 *
 * - **Generic Validator**: Defines custom validator function using
 * the {@link Validate} decorator.
 *
 * - **Magic Number Validator**: Verify the value of the decorated
 * property against a pre-defined value with the {@link Match}
 * decorator.
 *
 * - **Enum Validator**: Verify a value belong to a TypeScript enum
 * with the {@link Enum} decorator.
 *
 * @module Validator
 */
import { type Cursor } from '../cursor'
import { type DecoratorType, type Context } from '../types'
import { createPropertyMetaDescriptor, type PropertyMetaDescriptor } from './common'
import { relationExistsOrThrow, ValidationTestFailed } from '../error'
import Meta from '../metadatas'

export const ValidatorSymbol = Symbol('validator')

/**
 * @category Options
 */
export interface ValidatorOptions {
  /**
   * Ensures that a relation exists before defining the Transformer decorator.
   */
  primitiveCheck: boolean
  /**
   * Applies the validator function to each element if the value is an array.
   */
  each: boolean
  /**
   * Prevents an error from being thrown if the validation fails.
   */
  optional: boolean
  /**
   * Validation error message to be shown if validator function return false.
   */
  message: string // TODO | ((args: ValidatorErrorArguments) => string);
}

/**
 * @category Options
 */
export const ValidatorOptionsDefault = {
  each: false,
  primitiveCheck: true,
  optional: false,
  message: '',
}

/**
 * ValidatorFunction. is a function that takes the current value and
 * instance as input and returns a boolean if an arbitrary condition
 * pass.
 */
export type ValidatorFunction<This, Value> = (value: Value, targetInstance: This) => boolean

/**
 * Validator metadata type definition.
 *
 * This interface define how a validator decorator will be stored in the
 * metadata of the class definition.
 *
 * @extends {PropertyMetaDescriptor}
 */
export interface Validator<This, Value> extends PropertyMetaDescriptor<This> {
  options: ValidatorOptions
  /**
   * Function that perform the validation.
   */
  validator: ValidatorFunction<This, Value>
}

/**
 * `validatorDecoratorFactory` is a utility function used to create
 * `Validator` type property decorators, used to validate the value
 * of a property.
 *
 * @remarks
 *
 * Use this factory function to design custom 'Validator' type decorators
 * tailored to specific data format requirements that are not supported by the
 * library yet.
 *
 * @param {string} name The name of the 'validator' type decorator.
 * @param {ValidatorFunction} func A function that validates the value of the
 * decorated property.
 * @param {Partial<ValidatorOptions>} [opt] Optional configuration.
 * @returns {DecoratorType<This, Value>} The property decorator function.
 *
 * @category Advanced Use
 */
export function validatorDecoratorFactory<This, Value> (name: string, func: ValidatorFunction<This, Value>, opt: Partial<ValidatorOptions> = ValidatorOptionsDefault): DecoratorType<This, Value> {
  const options = { ...ValidatorOptionsDefault, ...opt }

  return function (_: undefined, context: Context<This, Value>) {
    if (options.primitiveCheck) {
      relationExistsOrThrow(context.metadata, context)
    }

    const validator: Validator<This, Value> = {
      ...createPropertyMetaDescriptor(ValidatorSymbol, name, context.metadata, context.name as keyof This),
      options,
      validator: func,
    }

    Meta.setValidator(context.metadata, context.name, validator)
  }
}

/**
 * `@Validate` decorator
 *
 * @typeParam This The type of the class the decorator is applied to.
 * @typeParam Value The type of the decorated property.
 *
 * @param {ValidatorFunction} validatingFunction A function that validates
 * the value of the decorated property.
 * @param {Partial<ValidatorOptions>} [opt] Optional configuration.
 * @returns {DecoratorType<This, Value>} The property decorator function.
 *
 * @category Decorators
 */
export function Validate<This, Value> (validatingFunction: ValidatorFunction<This, Value>, opt?: Partial<ValidatorOptions>): DecoratorType<This, Value> {
  return validatorDecoratorFactory('validate', validatingFunction, opt)
}

/**
 * `@Match` decorator validates that the value of the decorated property
 * matches a specified value.
 *
 * This is commonly used to enforce "magic numbers" or other fixed values in binary
 * formats that help verify file structure or integrity.
 *
 * @example
 *
 * The most simple use case is to compare to a number.
 *
 * ```typescript
 * class Header {
 *    @Match(0xFE)
 *    @Uint8
 *    magic: number,
 * }
 * ```
 *
 * The `@Match` decorator can also be used to match arrays.
 *
 * ```typescript
 * class Header {
 *    @Match([0xBE, 0xEF])
 *    @Count(2)
 *    @Uint8
 *    magic: number[],
 * }
 * ```
 *
 * Or to check the value is one of the value from an array passed as a parameter.
 *
 * ```typescript
 * class Header {
 *    @Match([1, 8, 16])
 *    @Uint8
 *    magic: number,
 * }
 * ```
 *
 * Or an ASCII string.
 *
 * ```typescript
 * class Header {
 *    @Match('.PNG')
 *    @Count(4)
 *    @Ascii
 *    magic: string,
 * }
 * ```
 *
 * @typeParam This The type of the class the decorator is applied to.
 * @typeParam Value The type of the decorated property.
 *
 * @param {any} matchingValue The value or array of values to match against the
 * decorated property value.
 * @param {Partial<ValidatorOptions>} [opt] Optional configuration.
 * @returns {DecoratorType<This, Value>} The property decorator function.
 *
 * @category Decorators
 */
export function Match<This, Value> (matchingValue: Value | Array<Value>, opt?: Partial<ValidatorOptions>): DecoratorType<This, Value | Array<Value>> {
  /**
   * matchValidatorFactory.
   *
   * @param {any} matchingValue
   */
  const matchValidatorFactory = (matchingValue: any) => {
    return function <T>(value: any, _: T): boolean {
      if (Array.isArray(matchingValue)) {
        if (Array.isArray(value)) {
          return matchingValue.every((x, i) => x === value[i])
        } else {
          return matchingValue.includes(value)
        }
      } else {
        return matchingValue === value
      }
    }
  }

  return validatorDecoratorFactory('match', matchValidatorFactory(matchingValue), { ...{ message: `The value did not match with '${String(matchingValue)}'` }, ...opt })
}

/**
 * `@Enum` decorator validates that the decorated property value belongs to a
 * specified TypeScript `Enum`.
 *
 * This ensures that the value conforms to one of the keys or values defined in
 * the provided `Enum`.
 *
 * @example
 *
 * You can validate a property to an enum based on a number.
 *
 * ```typescript
 * enum ReadWrite {
 *   ReadOnly = 1,
 *   ReadWrite = 2,
 * }
 *
 * class Protocol {
 *   @Enum(ReadWrite)
 *   @Relation(PrimitiveSymbol.u8)
 *   type: ReadWrite
 * }
 * ```
 *
 * Or based on a string.
 *
 * ```typescript
 * enum ChunkType {
 *   IEND = 'IEND',
 *   IDAT = 'IDAT',
 * }
 *
 * class Protocol {
 *   @Enum(ChunkType)
 *   @Count(4)
 *   @Ascii
 *   type: ReadWrite
 * }
 * ```
 *
 * @typeParam This The type of the class the decorator is applied to.
 * @typeParam Value The type of the decorated property.
 *
 * @param {Record<string, Value>} enumeration The enum object to validate
 * against.
 * @param {Partial<ValidatorOptions>} [opt] Optional configuration.
 * @returns {DecoratorType<This, Value>} The property decorator function.
 *
 * @category Decorators
 */
export function Enum<This, Value> (enumeration: Record<string, Value>, opt?: Partial<ValidatorOptions>): DecoratorType<This, Value | Array<Value>> {
  function enumerationValidator (value: Value, _: This): boolean {
    return Object.prototype.hasOwnProperty.call(enumeration, value)
  }

  return validatorDecoratorFactory('enum', enumerationValidator, { ...{ message: `The value did not belong to enum '${JSON.stringify(enumeration)}'` }, ...opt })
}

/**
 * useValidators execute an array of `Validator` decorator metadata on a
 * property of a target instance.
 *
 * @typeParam This The type of the class the decorator is applied to.
 * @typeParam Value The type of the decorated property.
 *
 * @param {Array<Validator<This, Value>>} validators An array of validator
 * metadata to apply.
 * @param {Value} value The value of the decorated property to validate.
 * @param {Cursor} [cursor] The optional cursor, used for providing context
 * in validation errors.
 * @returns {void}
 *
 * @category Advanced Use
 */
export function useValidators<This, Value> (validators: Array<Validator<This, Value>>, value: Value, targetInstance: This, cursor?: Cursor): void {
  validators.forEach((validator) => {
    if (validator.options.each && Array.isArray(value)) {
      value.forEach((x: Value) => {
        if (!validator.validator(x, targetInstance) && !validator.options.optional) {
          throw new ValidationTestFailed(validator.name, String(validator.propertyName), x, validator.options.message, cursor)
        }
      })
    } else {
      if (!validator.validator(value, targetInstance) && !validator.options.optional) {
        throw new ValidationTestFailed(validator.name, String(validator.propertyName), value, validator.options.message, cursor)
      }
    }
  })
}
