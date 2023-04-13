/**
 *   ReadOnly
 * Validator decorators definition
 *
 * @module Validator
 */
import { type DecoratorType } from '../types'
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
   * @type {boolean} Specifies if validated value is an array and each of its item must be validated.
   */
  each: boolean
  primitiveCheck: boolean
  /**
   * @type {string} Validation error message to be shown if validator function
   * return false.
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
export type ValidatorFunction<T> = (value: any, targetInstance: T) => boolean

/**
 * Validator.
 *
 * @extends {MetaDescriptor<T>}
 */
export interface Validator<T> extends MetaDescriptor<T> {
  options: ValidatorOptions

  /**
   * @type {ValidatorFunction<T>}
   */
  validator: ValidatorFunction<T>
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
export function validatorDecoratorFactory (name: string, func: ValidatorFunction<unknown>, opt: Partial<ValidatorOptions> = ValidatorOptionsDefault): DecoratorType {
  return function <T>(target: T, propertyKey: keyof T) {
    if (opt.primitiveCheck) {
      relationExistOrThrow(target, propertyKey)
    }

    const validator: Validator<T> = {
      type: ValidatorSymbol,
      name,
      target,
      propertyName: propertyKey,
      options: { ...ValidatorOptionsDefault, ...opt },
      validator: func as ValidatorFunction<T>
    }

    Meta.setValidator(target, propertyKey, validator)
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
export function Validate (validatingFunction: ValidatorFunction<unknown>, opt?: Partial<ValidatorOptions>): DecoratorType {
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
 * Or ASCII string.
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
      if (Array.isArray(matchingValue) && Array.isArray(value)) {
        return matchingValue.every((x, i) => x === value[i])
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
  function enumerationValidator<T> (value: any, _: T): boolean {
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
export function useValidators<T> (validators: Array<Validator<T>>, value: any, targetInstance: T): void {
  validators.forEach((validator: Validator<T>) => {
    if (validator.options.each) {
      value.forEach((x: any) => {
        if (!validator.validator(x, targetInstance)) {
          throw new ValidationTestFailed(validator.name, String(validator.propertyName), x, validator.options.message)
        }
      })
    } else {
      if (!validator.validator(value, targetInstance)) {
        throw new ValidationTestFailed(validator.name, String(validator.propertyName), value, validator.options.message)
      }
    }
  })
}
