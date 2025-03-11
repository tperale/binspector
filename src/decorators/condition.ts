/**
 * Module definition of {@link Condition} property decorators.
 *
 * The {@link Condition} decorators are used to handle scenarios where parts
 * of a binary file format exist conditionally, based on values determined
 * at runtime.
 *
 * These decorators enable the parser to dynamically select the
 * {@link Primitive.Relation} to read next, based on the provided conditions.
 * This functionality is essential for parsing formats that have conditional
 * properties or polymorphic structures.
 *
 * {@link Condition} decorators are executed *before* reading a property
 * to determine the type of the next relation to read.
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
import { recursiveGet, type PropertyMetaDescriptor, createPropertyMetaDescriptor, StringFormattedRecursiveKeyOf } from './common.ts'
import { type PrimitiveTypeProperty, type RelationTypeProperty, type RelationParameters, Relation, createPrimitiveTypeProperty, createRelationTypeProperty } from './primitive.ts'
import { isPrimitiveSymbol, type DecoratorType, type Primitive, type Context } from '../types.ts'
import { NoConditionMatched } from '../error.ts'
import Meta from '../metadatas.ts'

export const ConditionSymbol = Symbol('condition-symbol')
export const DynamicConditionSymbol = Symbol('dynamic-condition-symbol')

/**
 * `ConditionFunction` type are the function passed to the {@link Condition} decorators.
 * It receive the instance of the non finalized object in its current state and return a boolean.
 */
export type ConditionFunction<This> = (targetInstance: This) => boolean
export type DynamicGetterFunction<This, Value> = (targetInstance: This) => Primitive<Value> | undefined
export type DynamicConditionFunction<This, Value> = (targetInstance: This) => PrimitiveTypeProperty<This> | RelationTypeProperty<This, Value> | undefined

/**
 * `Condition`
 *
 * @typeParam This The type of the class the decorator is applied to.
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
 * `conditionDecoratorFactory`
 *
 * @param {string} name Name of the condition decorator.
 * @param {ConditionFunction} cond Condition to control the relation to read.
 * @param {Primitive<Target>} [then] Property type to read if the 'cond'
 * function pass.
 * @param {RelationParameters<This>} [args]
 * @returns {DecoratorType<This, Value>} The property decorator function.
 *
 * @category Advanced Use
 */
export function conditionDecoratorFactory<This extends object, Target, Value, Args extends string> (name: string, cond: ConditionFunction<This>, then?: Primitive<Target>, args?: RelationParameters<This, Args>): DecoratorType<This, Value> {
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
      condition: cond,
      relation: then !== undefined ? createRelation(then) : undefined,
    }

    Meta.setCondition(context.metadata, propertyName, condition)
  }
}

/**
 * `dynamicConditionDecoratorFactory`
 *
 * @typeParam This The type of the class the decorator is applied to.
 * @typeParam Target The type of the relation
 * @typeParam Value The type of the decorated property.
 *
 * @param {string} name Name of the controller decorator.
 * @param {DynamicGetterFunction} func Condition to control the relation to read.
 * @param {RelationParameters<This>} [args]
 * @returns {DecoratorType<This, Value>} The property decorator function.
 *
 * @category Advanced Use
 */
export function dynamicConditionDecoratorFactory<This extends object, Target, Value, Args extends string> (name: string, func: DynamicGetterFunction<This, Target>, args?: RelationParameters<This, Args>): DecoratorType<This, Value> {
  return function (_: undefined, context: Context<This, Value>) {
    const propertyName = context.name as keyof This
    function createRelation (relationOrPrimitive: Primitive<Target> | undefined): PrimitiveTypeProperty<This> | RelationTypeProperty<This, Target> | undefined {
      if (relationOrPrimitive === undefined) {
        return undefined
      } else if (isPrimitiveSymbol(relationOrPrimitive)) {
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
 * `@IfThen` decorator determine if a {@link Primitive} passed as argument
 * should be read with the associated property based on a condition passed
 * as argument.
 *
 * @example
 *
 * In the following example the `data` property will be associated with a
 * unsigned 16 bit integer if the value of the property type is equal to
 * `0x01`.
 * If the condition is not met the `data` property will be left undefined.
 *
 * ```typescript
 * class Protocol {
 *   @Relation(PrimitiveSymbol.u8)
 *   type: number
 *
 *   @IfThen(instance => instance.type === 0x01, PrimitiveSymbol.u16)
 *   @Else()
 *   data: number
 * }
 * ```
 *
 * The `@IfThen` decorators are executed with a top-down direction. This means
 * the condition the further away from the property get executed first.
 *
 * ```typescript
 * class Protocol {
 *   @IfThen(_ => true, Foo) // This one get picked first.
 *   @IfThen(_ => true, Bar)
 *   @Else()
 *   condition: Foo | Bar
 * }
 * ```
 *
 * @remarks
 *
 * The `@IfThen` decorator is often used in conjunction with other conditional
 * decorators like {@link Else}.
 *
 * @typeParam This The type of the class the decorator is applied to.
 * @typeParam Target The type of the relation
 * @typeParam Value The type of the decorated property.
 *
 * @param {ControllerIfFunction} cond A function that receives the instance of
 * the class the property belongs in as a parameter and return a boolean.
 * @param {Primitive<Target>} [then] Property type to read if the 'cond'
 * function pass.
 * @param {RelationParameters<This>} [args] Optional arguments passed to the
 * nested type definition if the 'cond' pass.
 * @returns {DecoratorType<This, Value>} The property decorator function.
 *
 * @category Decorators
 */
export function IfThen<This extends object, Target, Value, Args extends string> (cond: ConditionFunction<This>, then?: Primitive<Target>, args?: RelationParameters<This, Args>): DecoratorType<This, Value> {
  return conditionDecoratorFactory('ifthen', cond, then, args)
}

/**
 * @overload
 * @returns {DecoratorType<This, Value>} The property decorator function.
 */
/**
 * @overload
 * @param {Primitive} then
 * @returns {DecoratorType<This, Value>} The property decorator function.
 */
/**
 * `@Else` decorator acts as a fallback when no other condition is met.
 * This decorator always executes if none of the preceding conditions
 * passed.
 *
 * @example
 *
 * In the following example the `data` property of the `Protocol` class will
 * be associated with a unsigned 8-bits integer if the `type` property doesn't
 * equals to `0x01`.
 *
 * ```typescript
 * class Protocol {
 *   @Relation(PrimitiveSymbol.u8)
 *   type: number
 *
 *   @IfThen(_ => _.type === 0x01, PrimitiveSymbol.u16)
 *   @Else(PrimitiveSymbol.u8)
 *   data: number
 * }
 * ```
 *
 * @typeParam This The type of the class the decorator is applied to.
 * @typeParam Target The type of the relation
 * @typeParam Value The type of the decorated property.
 *
 * @param {Primitive<Target>} [then] The property type to read if no other
 * condition is met.
 * @param {RelationParameters<This>} [args] Optional arguments passed to the
 * nested type definition if the 'cond' pass.
 * @returns {DecoratorType<This, Value>} The property decorator function.
 *
 * @category Decorators
 */
export function Else<This extends object, Target, Value, Args extends string> (then?: Primitive<Target>, args?: RelationParameters<This, Args>): DecoratorType<This, Value> {
  return conditionDecoratorFactory('else', () => true, then, args)
}

/**
 * @overload
 *
 * @param {string} cmp
 * @param {Record} match
 * @param {RelationParameters<This>} [args] The arguments to pass to the matching relation definition (see {@link Primitive.RelationParameters})
 * @returns {DecoratorType<This, Value>} The property decorator function.
 *
 * @category Decorators
 */
/**
 * @overload
 *
 * @param {Function} cmp
 * @param {Record} match
 * @param {RelationParameters<This>} [args] The arguments to pass to the matching relation definition (see {@link Primitive.RelationParameters})
 * @returns {DecoratorType<This, Value>} The property decorator function.
 *
 * @category Decorators
 */
/**
 * `@Choice` decorator match a value to a record of value:primitive.
 *
 * The `@Choice` decorator is just syntactic sugar to the `@IfThen` decorator,
 * useful for simple straightforward equality comparaison that doesn't requires
 * any preprocessing.
 *
 * @example
 *
 * The simplest way to use the `@Choice` decorator is to reference the name
 * of a property belonging to the target instance to match with the record.
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
 * class Protocol {
 *   @While((value: Chunk) => value.type !== 0x03)
 *   message: Chunk[]
 * }
 * ```
 *
 * You can also pass arguments to the relation using comma separeted string.
 * In the following example the value of the property 'length' and
 * 'type' is passed to the constructor of 'Data' on creation.
 * Notice that relation you
 * want to pass arguments requires to be defined inside of an array of two
 * member.
 *
 * ```typescript
 * class Data {
 *   _length: number
 *   _type: number
 *
 *   @Count('_length')
 *   @Relation(PrimitiveSymbol.u8)
 *   data: number[]
 *
 *   ...
 *
 *   constructor(length: number, type: number) {
 *     this._length = length
 *     this._type = type
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
 * class Protocol {
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
 *   data: Header | Data | undefined
 * }
 * ```
 *
 * An alternative to string reference is to use functions if you need
 * to performs manipulation on the datas.
 *
 * ```typescript
 * class Protocol {
 *   @Relation(PrimitiveSymbol.u32)
 *   length: number
 *
 *   @Relation(PrimitiveSymbol.u8)
 *   type: number
 *
 *   @Choice(_ => _.type, {
 *     0x01: Header,
 *     0x02: [Data, (instance: BinProtocol) => [instance.length - 5, instance.type]],
 *     0x03: undefined,
 *   })
 *   data: number
 * }
 * ```

 * You can also define the default arguments you pass to every relations.
 * In the following example the value of the property 'length' will be passed
 * to every relation on creation.
 *
 * ```typescript
 * class Protocol {
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
 * - Use `@Choice` with the `@Else` decorator to pass a {@link Primitive} by
 *   default (see {@link Else})
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
 * - If you are working with recursive types definition you should use the
 *   `@Select` decorator instead (for more informations see {@link Select}).
 *
 * @typeParam This The type of the class the decorator is applied to.
 * @typeParam Value The type of the decorated property.
 *
 * @param {string | ((targetInstance: T) => any)} cmp The name of the property
 * of the target instance containing a value or a function receiving the
 * target instance as parameter that return the value to compare to the record
 * param.
 * @param {Record<any, Primitive<any> | [Primitive<any>, RelationParameters<This>] | undefined>} match
 * A record where keys are compared against the evaluated `cmp` value, and
 * values define the corresponding relations.
 * @param {RelationParameters<This>} [args] The arguments to pass to the matching
 * relation definition (see {@link Primitive.RelationParameters})
 * @returns {DecoratorType<This, Value>} The property decorator function.
 *
 * @category Decorators
 */
export function Choice<This extends object, Value, Args extends string> (cmp: StringFormattedRecursiveKeyOf<This, Args> | ((targetInstance: This) => any), match: Record<any, Primitive<any> | [Primitive<any>, RelationParameters<This, Args>] | undefined>, args?: RelationParameters<This, Args>): DecoratorType<This, Value> {
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
 * `@Select` decorator works similarly to the {@link Choice} decorator but
 * the function passed as argument directly returns the {@link Primitive}
 * instead of declaring the condition.
 *
 * The `@Select` decorator should be used for a small subset of special cases,
 * most of the time the `@Choice` decorator fits the job perfectly.
 * But sometimes certain format definitions have a long list of sub type you
 * need match to a set of value and defining every available options in the
 * `@Choice` decorator is verbose.
 *
 * At the end of the day use the one you feel make your definition easier to
 * read in your declaration, both are valid options.
 *
 * @example
 *
 * In the following example let's imagine the `DEFINITION` object is actually
 * bigger than it is.
 * The `@Select` decorator is used to pick the {@link Primitive} type of the
 * decorated property with the help of a combination of key found in the
 * `Protocol` instance.
 *
 * ```typescript
 * class SubProtocol {
 *   ...
 * }
 *
 * const DEFINITION = {
 *    0: {
 *      1: SubProtocol,
 *      ...
 *      0xFF: undefined // Return undefined if shouldn't read anything
 *    },
 *    ...
 * }
 *
 * class Protocol {
 *   @Relation(PrimitiveType.u8)
 *   foo: number
 *
 *   @Relation(PrimitiveType.u8)
 *   bar: number
 *
 *   @Select(_ => DEFINITION[_.foo][_.bar])
 *   sub_protocol: any
 * }
 * ```
 *
 * A use case where the `@Select` decorator is mandatory is when working with
 * recursive type definition. Because of the way circular dependencies works in
 * TS you can't reference statically a class that has not already been defined.
 * A workaround to this is to use lazy getter with the `@Select` decorator.
 *
 * ```typescript
 * class Element {
 *   @Uint8
 *   type: number
 *
 *   @Select(_ => ({
 *     0x00: () => undefined,
 *     0x01: () => Protocol,
 *     0x02: () => PrimitiveSymbol.u8,
 *     0x03: () => PrimitiveSymbol.u16,
 *     0x04: () => PrimitiveSymbol.u32,
 *   }[_.type]()))
 *   data: any
 * }
 * class Protocol {
 *   @Uint32
 *   length: number
 *
 *   @Size('length')
 *   @Relation(Element)
 *   elements: Element[]
 * }
 * ```
 *
 * @typeParam This The type of the class the decorator is applied to.
 * @typeParam Value The type of the decorated property.
 *
 * @param {DynamicGetterFunction<This, any>} getter A function that receive the
 * current object instance as parameter and returns a Primitive.
 * @param {RelationParameters<This>} [args] The arguments to pass to the matching
 * relation definition (see {@link Primitive.RelationParameters})
 * @returns {DecoratorType<This, Value>} The property decorator function.
 *
 * @category Decorators
 */
export function Select<This extends object, Value, Args extends string> (getter: DynamicGetterFunction<This, any>, args?: RelationParameters<This, Args>): DecoratorType<This, Value> {
  return dynamicConditionDecoratorFactory<This, Value, Value, Args>('select', getter, args)
}

/**
 * `useConditions` function helper
 *
 * Get the first matching {@link Primitive.Relation} based on the
 * {@link Condition} decorators condition that decorate a property.
 *
 * @typeParam This The type of the class the decorator is applied to.
 * @typeParam Value The type of the decorated property.
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
      // It's still unclear if I need to throw an error or not. Right now usecases
      // seems to indicate it's better to not throw.
      // throw new NoConditionMatched()
      return undefined
    }

    return cond.relation
  }
}
