/**
 * Module definition of {@link Condition} decorators.
 *
 * When reading a binary file certain parts of the format definition will only
 * exist based on a value known at runtime.
 * This is the role of {@link Condition} type decorators.
 *
 * {@link Condition} type decorators will determine the
 * {@link Primitive.Relation} to read next based on a condition.
 *
 * {@link Condition} decorators are executed before reading to determine the
 * type of the next relation to read.
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
 *  style Condition fill:blue,stroke:#f66,stroke-width:2px,color:#fff,stroke-dasharray: 5 5
 * ```
 *
 * @module Condition
 */
import { recursiveGet, type PropertyMetaDescriptor, createPropertyMetaDescriptor } from './common'
import { type PrimitiveTypeProperty, type RelationTypeProperty, type RelationParameters, Relation, createPrimitiveTypeProperty, createRelationTypeProperty } from './primitive'
import { isPrimitiveSymbol, type DecoratorType, type Primitive, type Context } from '../types'
import { NoConditionMatched } from '../error'
import Meta from '../metadatas'

export const ConditionSymbol = Symbol('condition-symbol')
export const DynamicConditionSymbol = Symbol('dynamic-condition-symbol')

/**
 * ConditionFunction type are the function passed to the {@link Condition} decorators.
 * It receive the instance of the non finalized object in its current state and return a boolean.
 */
export type ConditionFunction<This> = (targetInstance: This) => boolean
export type DynamicGetterFunction<This, Value> = (targetInstance: This) => Primitive<Value>
export type DynamicConditionFunction<This, Value> = (targetInstance: This) => PrimitiveTypeProperty<This> | RelationTypeProperty<This, Value>

/**
 * Condition.
 *
 * @extends {PropertyMetaDescriptor}
 */
export interface Condition<This> extends PropertyMetaDescriptor<This> {
  /**
   * Function to control the flow of execution of the parser/writter.
   */
  condition: ConditionFunction<This> | DynamicConditionFunction<This, any>
  /**
   * Relation to set if the condition pass.
   */
  relation: PrimitiveTypeProperty<This> | RelationTypeProperty<This, any> | undefined // TODO Rename this to something like FinalPrimitive
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
export function conditionDecoratorFactory<This, Target, Value> (name: string, func: ConditionFunction<This>, then?: Primitive<Target>, args?: RelationParameters<This>): DecoratorType<This, Value> {
  return function (_: undefined, context: Context<This, Value>) {
    const propertyName = context.name as keyof This
    function createRelation (relationOrPrimitive: Primitive<Target>): PrimitiveTypeProperty<This> | RelationTypeProperty<This, Target> {
      if (isPrimitiveSymbol(relationOrPrimitive)) {
        return createPrimitiveTypeProperty(context.metadata, propertyName, relationOrPrimitive)
      } else { // Check has constructor
        return createRelationTypeProperty(context.metadata, propertyName, relationOrPrimitive, args)
      }
    }

    if (!Meta.isFieldDecorated(context.metadata, propertyName)) {
      Relation()(_, context)
    }

    const condition: Condition<This> = {
      ...createPropertyMetaDescriptor(ConditionSymbol, name, context.metadata, propertyName),
      condition: func,
      relation: then !== undefined ? createRelation(then) : undefined,
    }

    Meta.setCondition(context.metadata, propertyName, condition)
  }
}

/**
 * dynamicConditionDecoratorFactory.
 *
 * @param {string} name Name of the controller decorator.
 * @param {ConditionFunction} func Condition to control the relation to read.
 * @returns {DecoratorType} The property decorator function ran at runtime
 *
 * @category Advanced Use
 */
export function dynamicConditionDecoratorFactory<This, Target, Value> (name: string, func: DynamicGetterFunction<This, Target>, args?: RelationParameters<This>): DecoratorType<This, Value> {
  return function (_: undefined, context: Context<This, Value>) {
    const propertyName = context.name as keyof This
    function createRelation (relationOrPrimitive: Primitive<Target>): PrimitiveTypeProperty<This> | RelationTypeProperty<This, Target> {
      if (isPrimitiveSymbol(relationOrPrimitive)) {
        return createPrimitiveTypeProperty(context.metadata, propertyName, relationOrPrimitive)
      } else { // Check has constructor
        return createRelationTypeProperty(context.metadata, propertyName, relationOrPrimitive, args)
      }
    }

    if (!Meta.isFieldDecorated(context.metadata, propertyName)) {
      Relation()(_, context)
    }

    const condition: Condition<This> = {
      ...createPropertyMetaDescriptor(DynamicConditionSymbol, name, context.metadata, propertyName),
      condition: (targetInstance: This) => createRelation(func(targetInstance)),
      relation: undefined,
    }

    Meta.setCondition(context.metadata, propertyName, condition)
  }
}

/**
 * `@IfThen` decorator pass the {@link Primitive.Relation} to read if the condition is met.
 *
 * @param {ControllerIfFunction} func A function that receive the instance as a parameter and return a boolean
 * @param {Primitive} then
 * @param {Function} args
 * @returns {DecoratorType} The property decorator function ran at runtime
 *
 * @category Decorators
 */
export function IfThen<This, Target, Value> (func: ConditionFunction<This>, then?: Primitive<Target>, args?: (curr: This) => any[]): DecoratorType<This, Value> {
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
export function Else<This, Target, Value> (then?: Primitive<Target>, args?: (curr: This) => any[]): DecoratorType<This, Value> {
  return conditionDecoratorFactory('else', () => true, then, args)
}

/**
 * @overload
 *
 * @param {string} cmp
 * @param {Record} match
 * @param {Function} args
 * @returns {DecoratorType}
 *
 * @category Decorators
 */
/**
 * @overload
 *
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
 * You can also pass arguments to the relation using comma separeted string.
 * In the following example I pass teh value of the property 'length' and 'type'
 * to the constructor of 'Data' on creation. Notice that relation you want to pass
 * arguments requires to be defined inside of an array of two member.
 *
 * ```typescript
 * class Data {
 *   _length: number
 *
 *   @Count('_length')
 *   @Relation(PrimitiveSymbol.u8)
 *   data: number[]
 *
 *   constructor(length: number, type: number) {
 *     this._length = length
 *   }
 * }
 *
 * class Header {
 *   @Count(4)
 *   @Relation(PrimitiveSymbol.u8)
 *   magic: number
 *
 *   @Relation(PrimitiveSymbol.u32)
 *   crc: number
 * }
 *
 * class BinProtocol {
 *   @Relation(PrimitiveSymbol.u32)
 *   length: number
 *
 *   @Relation(PrimitiveSymbol.u8)
 *   type: number
 *
 *   @Choice('type', {
 *     0x01: Header,
 *     0x02: [Data, 'length, type'],
 *     0x03: undefined,
 *   })
 *   data: number
 * }
 * ```
 *
 * Or functions if you want to perform some operation on the data before passing them to the
 * constructor.
 *
 * ```typescript
 * class BinProtocol {
 *   @Relation(PrimitiveSymbol.u32)
 *   length: number
 *
 *   @Relation(PrimitiveSymbol.u8)
 *   type: number
 *
 *   @Choice('type', {
 *     0x01: Header,
 *     0x02: [Data, (instance: BinProtocol) => [instance.length - 5, instance.type]],
 *     0x03: undefined,
 *   })
 *   data: number
 * }
 * ```

 * You can also define the default arguments you pass to every relations. In the
 * following example the value of the property 'length' will be passed to every relation
 * on creation.
 *
 * ```typescript
 * class BinProtocol {
 *   @Relation(PrimitiveSymbol.u32)
 *   length: number
 *
 *   @Relation(PrimitiveSymbol.u8)
 *   type: number
 *
 *   @Choice('type', {
 *     0x01: Header,
 *     0x02: Data,
 *     0x03: undefined,
 *   }, 'length')
 *   data: number
 * }
 * ```
 *
 * @remarks
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
export function Choice<This, Value> (cmp: string | ((targetInstance: This) => any), match: Record<any, Primitive<any> | [Primitive<any>, RelationParameters<This>] | undefined>, args?: RelationParameters<This>): DecoratorType<This, Value> {
  const valueToCompare = typeof cmp === 'string' ? (targetInstance: This) => recursiveGet(targetInstance, cmp) : cmp
  // Mandatory to cast to String because the key is always a string even though you declare it as a number
  const decorators = Object.keys(match).map((key: keyof typeof match) => {
    const matchValue = match[key]
    const [primValue, primArgs] = Array.isArray(matchValue) ? [matchValue[0], matchValue[1]] : [matchValue, args]
    return conditionDecoratorFactory('choice', (targetInstance: This) => key === String(valueToCompare(targetInstance)), primValue, primArgs)
  })

  return function (_: undefined, context: Context<This, Value>) {
    decorators.forEach((decorator) => {
      decorator(_, context)
    })
  }
}

/**
 * `@Select`
 *
 * @param {((targetInstance: This) => Primitive<any>)} getter
 * @param {RelationParameters} args
 * @returns {DecoratorType}
 *
 * @category Decorators
 */
export function Select<This, Value> (getter: ((targetInstance: This) => Primitive<any>), args?: RelationParameters<This>): DecoratorType<This, Value> {
  return dynamicConditionDecoratorFactory('select', getter, args)
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
export function useConditions<This, Value> (conditions: Array<Condition<This>>, targetInstance: This): PrimitiveTypeProperty<This> | RelationTypeProperty<This, Value> | undefined {
  const isDynamic = conditions.find(cond => cond.type === DynamicConditionSymbol)
  if (isDynamic !== undefined) {
    const getter = isDynamic.condition as DynamicConditionFunction<This, Value>
    return getter(targetInstance)
  } else {
    const cond = conditions.find(cond => cond.condition(targetInstance))
    if (cond === undefined) {
      // TODO Improve the error handling
      // - cursor backtrace to show the position in the file
      // - current instance to print. The condition are mostly done on the current instance
      // - If creating a `@Choice` it's probably more easy to debug.
      throw new NoConditionMatched()
    }

    return cond.relation
  }
}
