/**
 * Module definition of {@link Condition} decorators.
 *
 * {@link Condition } decorators apply certain {@link Primitive.Relation} to the property
 * they decorate based on a condition.
 * {@link Condition } decorators are optionnal and are the first type of decorator to be
 * executed when the target is read.
 * When using a {@link Condition} type decorator you should not define the size of the
 * property it decorate as it will be known at runtime.
 *
 * @module Condition
 */
import { recursiveGet, type MetaDescriptor } from './common'
import { type PrimitiveTypeProperty, type RelationTypeProperty, type RelationParameters, Relation, createPrimitiveTypeProperty, createRelationTypeProperty } from './primitive'
import { isPrimitiveSymbol, type PrimitiveSymbol, type DecoratorType, type InstantiableObject, Primitive } from '../types'
import { NoConditionMatched } from '../error'
import Meta from '../metadatas'

export const ConditionSymbol = Symbol('condition-symbol')

/**
 * ConditionFunction type are the function passed to the {@link Condition} decorators.
 * It receive the instance of the non finalized object in its current state and return a boolean.
 */
export type ConditionFunction<T> = (targetInstance: T) => boolean

/**
 * Condition.
 *
 * @extends {MetaDescriptor<T>}
 */
export interface Condition<T, K> extends MetaDescriptor<T> {
  /**
   * @type {ControllerFunction<T>} Function to control the flow of execution of the parser/writter
   */
  condition: ConditionFunction<T> // TODO property primitive could be passed directly by checking the metadata api when applying the controller function.
  /**
   * @type {PrimitiveType<T> | RelationType<T, K> | undefined}
   */
  relation: PrimitiveTypeProperty<T> | RelationTypeProperty<T, K> | undefined // TODO Rename this to something like FinalPrimitive
}

/**
 * conditionDecoratorFactory.
 *
 * @param {string} name Name of the controller decorator.
 * @param {ConditionFunction} func Condition to control the relation to read.
 * @returns {DecoratorType} The property decorator function ran at runtime
 *
 * @category Advanced Use
 */
export function conditionDecoratorFactory (name: string, func: ConditionFunction<unknown>, then?: Primitive<unknown>, args?: (currentStateObject: unknown) => any[]): DecoratorType {
  return function <T>(target: T, propertyKey: keyof T) {
    function createRelation (relationOrPrimitive: Primitive<unknown>): PrimitiveTypeProperty<T> | RelationTypeProperty<T, unknown> {
      if (isPrimitiveSymbol(relationOrPrimitive)) {
        return createPrimitiveTypeProperty(target, propertyKey, relationOrPrimitive)
      } else { // Check has constructor
        return createRelationTypeProperty(target, propertyKey, relationOrPrimitive as InstantiableObject<T>, args)
      }
    }

    if (!Meta.isFieldDecorated(target, propertyKey)) {
      Relation()(target, propertyKey as string)
    }

    const condition: Condition<T, unknown> = {
      type: ConditionSymbol,
      name,
      target,
      propertyName: propertyKey,
      condition: func as ConditionFunction<T>,
      relation: then !== undefined ? createRelation(then) : undefined
    }

    Meta.setCondition(target, propertyKey, condition)
  }
}

/**
 * `@IfThen` decorator pass the {@link Primitive.Relation} to read if the condition is met.
 *
 * @param {ControllerIfFunction} func A function that receive the instance as a parameter and return a boolean
 * @returns {DecoratorType} The property decorator function ran at runtime
 *
 * @category Decorators
 */
export function IfThen<T, K> (func: ConditionFunction<T>, then?: Primitive<K>, args?: (curr: T) => any[]): DecoratorType {
  return conditionDecoratorFactory('ifthen', func, then, args)
}

/**
 * @overload
 *
 * @returns {DecoratorType}
 *
 * @category Decorators
 */
/**
 * @overload
 *
 * @param {Primitive} then
 * @returns {DecoratorType}
 *
 * @category Decorators
 */
/**
 * `@Else` decorator is an always executed conditionnal decorator.
 *
 * @param {Primitive} then
 * @param {Function} args
 * @returns {DecoratorType}
 *
 * @category Decorators
 */
export function Else<T, K> (then?: Primitive<K>, args?: (curr: T) => any[]): DecoratorType {
  return conditionDecoratorFactory('else', () => true, then, args)
}

/**
 * @overload
 * @param {string} cmp
 * @param {Record} match
 * @param {Function} args
 * @returns {DecoratorType}
 *
 * @category Decorators
 */
/**
 * @overload
 * @param {Function} cmp
 * @param {Record} match
 * @param {Function} args
 * @returns {DecoratorType}
 *
 * @category Decorators
 */
/**
 * `@Choice` decorator match a field to record object.
 *
 * @example
 *
 * The simplest way to use the `@Choice` decorator is to reference the name of a property belonging to the target instance to match with the record.
 *
 * ```typescript
 * class Chunk {
 *   @Relation(PrimitiveSymbol.u8)
 *   type: number
 *
 *   @Choice('type', {
 *     0x01: PrimitiveSymbol.u8,
 *     0x02: PrimitiveSymbol.u16,
 *     0x03: undefined,
 *   })
 *   data: number
 * }
 *
 * class BinProtocol {
 *   @While((value: Chunk) => value.type !== 0x03)
 *   message: Chunk[]
 * }
 * ```
 *
 * @remark
 *
 * To pass to the reader a relation by default use `@Choice` with the `@Else` decorator (see {@link Else})
 *
 * ```typescript
 * class Protocol {
 *   @Relation(PrimitiveSymbol.u8)
 *   something: number
 *
 *   @Choice('something', {
 *     0x01: PrimitiveSymbol.u8
 *   })
 *   @Else(PrimitiveSymbol.u16)
 *   data: number
 * }
 * ```
 *
 * @param {string | ((targetInstance: T) => any)} cmp The name of the property of the target instance containing a value or a function receiving the target instance as parameter that return the value to compare to the record param.
 * @param {Record} match Match the 'cmp' value to the key of the record for this argument. The value is the relation to read if the value match.
 * @param {RelationParameters} args The arguments to pass to the matching relation definition (see {@link Primitive.RelationParameters})
 * @returns {DecoratorType}
 *
 * @category Decorators
 */
export function Choice<T> (cmp: string | ((targetInstance: T) => any), match: Record<any, Primitive<unknown> | [Primitive<unknown>, RelationParameters<unknown>] | undefined>, args?: RelationParameters<unknown>): DecoratorType {
  const valueToCompare = typeof cmp === 'string' ? (targetInstance: T) => recursiveGet(targetInstance, cmp) : cmp
  // Mandatory to cast to String because the key is always a string even though you declare it as a number
  const decorators = Object.keys(match).map((key: keyof typeof match) => {
    const matchValue = match[key]
    const [primValue, primArgs] = Array.isArray(matchValue) ? [matchValue[0], matchValue[1]] : [matchValue, args]
    return conditionDecoratorFactory('choice', (targetInstance: T) => key === String(valueToCompare(targetInstance)), primValue, primArgs)
  })

  return function <K>(target: K, propertyKey: keyof K) {
    decorators.forEach(decorator => {
      decorator(target, propertyKey as string)
    })
  }
}

/**
 * useConditions function helper
 *
 * Get the first matching {@link Primitive.Relation} based on the {@link Condition} decorators condition that decorate a property.
 *
 * @param {Array} conditions
 * @param {T} targetInstance
 * @returns {PrimitiveType<T> | RelationType<T, K> | undefined}
 *
 * @category Advanced Use
 */
export function useConditions<T, K> (conditions: Array<Condition<T, K>>, targetInstance: T): PrimitiveTypeProperty<T> | RelationTypeProperty<T, K> | undefined {
  const cond = conditions.reverse().find(cond => cond.condition(targetInstance))
  if (cond === undefined) {
    // TODO Improve the error handling
    // - cursor backtrace to show the position in the file
    // - current instance to print. The condition are mostly done on the current instance
    // - If creating a `@Choice` it's probably more easy to debug.
    throw new NoConditionMatched()
  }

  return cond.relation
}
