/**
 * Module definition of {@link Validator} decorators.
 *
 * {@link Validator} are a class of decorators that help you ensure the binary
 * file being parsed adhere the binary file definition.
 *
 * If the validation of the property failed an error will be raised to help
 * spot potential error in the format definition.
 *
 * The validation happens as the last step of the property reading loop.
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
 * @module Validator
 */
import { type Cursor } from '../cursor'
import { type DecoratorType, type Context } from '../types'
import { createPropertyMetaDescriptor, type PropertyMetaDescriptor } from './common'
import { relationExistOrThrow } from './primitive'
import { ValidationTestFailed } from '../error'
import Meta from '../metadatas'

/**
 */
export const ValidatorSymbol = Symbol('validator')

export interface ValidatorOptions {
  /**
   * Specifies if validated value is an array and each of its item must be validated.
   */
  each: boolean
  /**
   * Do not throw an error if the validation doesn't match
   */
  optional: boolean
  /**
   * Verify a relation already exist before the definition of the controller
   */
  primitiveCheck: boolean
  /**
   * Validation error message to be shown if validator function return false.
   */
  message: string // TODO | ((args: ValidatorErrorArguments) => string);
}

export const ValidatorOptionsDefault = {
  each: false,
  primitiveCheck: true,
  optional: false,
  message: '',
}

/**
 * ValidatorFunction.
 */
export type ValidatorFunction<This, Value> = (value: Value, targetInstance: This) => boolean

/**
 * Validator.
 *
 * @extends {PropertyMetaDescriptor}
 */
export interface Validator<This, Value> extends PropertyMetaDescriptor<This> {
  options: ValidatorOptions

  /**
   *
   */
  validator: ValidatorFunction<This, Value>
}

/**
 * validatorDecoratorFactory.
 *
 * @param {string} name
 * @param {ValidatorFunction} func
 * @param {ValidatorOptions} opt
 * @returns {DecoratorType}
 *
 * @category Advanced Use
 */
export function validatorDecoratorFactory<This, Value> (name: string, func: ValidatorFunction<This, Value>, opt: Partial<ValidatorOptions> = ValidatorOptionsDefault): DecoratorType<This, Value> {
  const options = { ...ValidatorOptionsDefault, ...opt }

  return function (_: undefined, context: Context<This, Value>) {
    if (options.primitiveCheck) {
      relationExistOrThrow(context.metadata, context)
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
 * @param {ValidatorFunction} validatingFunction A function that will validate the content of the property.
 * @returns {DecoratorType} A decorator
 *
 * @category Decorators
 */
export function Validate<This, Value> (validatingFunction: ValidatorFunction<This, Value>, opt?: Partial<ValidatorOptions>): DecoratorType<This, Value> {
  return validatorDecoratorFactory('validate', validatingFunction, opt)
}

/**
 * `@Match` decorator
 *
 * Define a decorator that gives the proper information to verify the content of a field.
 * Binary files will often use magic number to validate the structure of the file.
 *
 * @example
 *
 * The most simple use case is to compare to a number.
 *
 * ```typescript
 * class Header {
 *    @Match(0xFE)
 *    @Relation(PrimitiveSymbol.char)
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
 *    @Relation(PrimitiveSymbol.char)
 *    magic: number[],
 * }
 * ```
 *
 * Or to check the value is one of the value from an array passed as a parameter.
 *
 * ```typescript
 * class Header {
 *    @Match([1, 8, 16])
 *    @Relation(PrimitiveSymbol.u8)
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
 *    @Relation(PrimitiveSymbol.char)
 *    magic: string,
 * }
 * ```
 *
 * @param {any} matchingValue
 * @param {Object} opt
 * @returns {DecoratorType}
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
 * `@Enum` decorator
 *
 * Validates the final content of the property belong to a typescript `Enum` object passed as a parameter.
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
 *   @Relation(PrimitiveSymbol.char)
 *   type: ReadWrite
 * }
 * ```
 *
 * @param {object} enumeration
 * @param {Object} opt
 * @returns {DecoratorType}
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
 * useValidators.
 *
 * @param {Array} validators
 * @param {any} value
 * @param {T} targetInstance
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
