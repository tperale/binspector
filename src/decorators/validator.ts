/**
 * Module definition of {@link Validator} decorators.
 *
 * @module Validator
 */
import { type Cursor } from '../cursor'
import { type DecoratorType, type Context } from '../types'
import { type MetaDescriptor } from './common'
import { relationExistOrThrow } from './primitive'
import { ValidationTestFailed } from '../error'
import Meta from '../metadatas'

/**
 */
export const ValidatorSymbol = Symbol('validator')

/**
interface ValidatorErrorArguments extends MetaDescriptor {
  value: any
  args: any[]
}
 */

export interface ValidatorOptions {
  /**
   * Specifies if validated value is an array and each of its item must be validated.
   */
  each: boolean
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
  message: ''
}

/**
 * ValidatorFunction.
 */
export type ValidatorFunction = (value: any, targetInstance: any) => boolean

/**
 * Validator.
 *
 * @extends {MetaDescriptor}
 */
export interface Validator extends MetaDescriptor {
  options: ValidatorOptions

  /**
   *
   */
  validator: ValidatorFunction
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
export function validatorDecoratorFactory (name: string, func: ValidatorFunction, opt: Partial<ValidatorOptions> = ValidatorOptionsDefault): DecoratorType {
  const options = { ...ValidatorOptionsDefault, ...opt }

  return function (_: any, context: Context) {
    if (options.primitiveCheck) {
      relationExistOrThrow(context.metadata, context)
    }

    const validator: Validator = {
      type: ValidatorSymbol,
      name,
      metadata: context.metadata,
      propertyName: context.name,
      options,
      validator: func
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
export function Validate (validatingFunction: ValidatorFunction, opt?: Partial<ValidatorOptions>): DecoratorType {
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
export function Match (matchingValue: any, opt?: Partial<ValidatorOptions>): DecoratorType {
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
export function Enum (enumeration: Record<string, string | number>, opt?: Partial<ValidatorOptions>): DecoratorType {
  function enumerationValidator (value: any, _: any): boolean {
    return Object.prototype.hasOwnProperty.call(enumeration, value)
  }

  return validatorDecoratorFactory('enum', enumerationValidator, { ...{ message: `The value did not belong to enum '${JSON.stringify(enumeration)}'` }, ...opt })
}

/**
 * The decarator define that the field contains the CRC code of the whole struct.
 * The parser will validate the struct by calculating its CRC and comparing it to this field.
 *
 * ```
 * {
 *   id: u32,
 *   @Count(3)
 *   name: char,
 *   @Crc
 *   crc: u32,
 * }
 * ```
 */
// TODO
// export const Crc = (term: any) => {
//   return function (target: any, propertyKey: string) {
//   };
// };

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
export function useValidators (validators: Array<Validator>, value: any, targetInstance: any, cursor?: Cursor): void {
  validators.forEach((validator: Validator) => {
    if (validator.options.each) {
      value.forEach((x: any) => {
        if (!validator.validator(x, targetInstance)) {
          throw new ValidationTestFailed(validator.name, String(validator.propertyName), x, validator.options.message, cursor)
        }
      })
    } else {
      if (!validator.validator(value, targetInstance)) {
        throw new ValidationTestFailed(validator.name, String(validator.propertyName), value, validator.options.message, cursor)
      }
    }
  })
}
