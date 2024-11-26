/**
 * Module definition of {@link Primitive} property decorators.
 *
 * The {@link Primitive} type decorators are used to define the data type of
 * decorated properties within a binary format definition. They must always
 * be the first decorator applied to a property (the closest one to the
 * property).
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
 *  style TypeReading fill:blue,stroke:#f66,stroke-width:2px,color:#fff,stroke-dasharray: 5 5
 * ```
 *
 * @module Primitive
 */
import { type PropertyMetaDescriptor, createPropertyMetaDescriptor, commaSeparetedRecursiveGet } from './common'
import { RelationNotDefinedError, RelationAlreadyDefinedError, WrongBitfieldClassImplementation } from '../error'
import Meta from '../metadatas'
import { type PrimitiveSymbol, isPrimitiveSymbol, type InstantiableObject, type DecoratorType, type Context, type DecoratorMetadataObject } from '../types'

const PrimitiveTypePropertySymbol = Symbol('primitive')

const UnknownTypePropertySymbol = Symbol('unknown-property-symbol')

const RelationTypePropertySymbol = Symbol('relation-type-property-symbol')

/**
 * `UnknownPropertyType` are primitive type that needs to be defined at
 * runtime with the help of {@link Condition} decorator.
 *
 * @typeParam This The type of the class the decorator is applied to.
 */
export type UnknownTypeProperty<This> = PropertyMetaDescriptor<This>

/**
 * `PrimitiveTypeProperty` are primitive type that can be immediately read or
 * written during the binary reading or writing process.
 * Those primitive are the following:
 *  - u8: Unsigned 8 bit integer
 *  - u16: Unsigned 16 bit integer
 *  - u32: Unsigned 32 bit integer
 *  - u64: Unsigned 64 bit integer
 *  - i8: Signed 8 bit integer
 *  - i16: Signed 16 bit integer
 *  - i32: Signed 32 bit integer
 *  - i64: Signed 64 bit integer
 *  - float32: Floating point 32 bit number
 *  - float64: Floating point 64 bit number
 *  - char: Character
 *
 * @typeParam This The type of the class the decorator is applied to.
 *
 * @extends {PropertyMetaDescriptor}
 */
export interface PrimitiveTypeProperty<This> extends PropertyMetaDescriptor<This> {
  /**
   * Property that holds the primitive symbol type.
   */
  primitive: PrimitiveSymbol
}

/**
 * RelationParameters function definition receive the target instance and return an array of parameter to pass to the relation.
 *
 * @example
 *
 * If we have the following protocol definition.
 *
 * ```typescript
 * class Chunk {
 *   constructor(type, size) {
 *     this._type = type
 *     this._size = size
 *   }
 * }
 * class Protocol {
 *   @Relation(PrimitiveSymbol.u8)
 *   type: number
 *
 *   @Relation(PrimitiveSymbol.u8)
 *   size: number
 *
 *   @Relation(Chunk, (targetInstance: Protocol) => [targetInstance.type, targetInstance.size])
 *   data: Chunk
 * }
 * ```
 *
 * The `RelationParameters` definition to pass the property `type` and `size`
 * to the `Chunk` constructor is the following
 * `(targetInstance: Protocol) => [targetInstance.type, targetInstance.size]`
 *
 * @typeParam This The type of the class the decorator is applied to.
 */
export type RelationParameters<This> = ((targetInstance: This) => any[]) | string

/**
 * `RelationTypeProperty` are primitive type that holds information about
 * another binary type definition.
 *
 * @typeParam This The type of the class the decorator is applied to.
 *
 * @extends {PropertyMetaDescriptor}
 */
export interface RelationTypeProperty<This, Target> extends PropertyMetaDescriptor<This> {
  /**
   * Class definition containing a format definition.
   */
  relation: InstantiableObject<Target>
  /**
   * Function that retrieve arguments at runtime.
   */
  args: ((targetInstance: This) => any[]) | undefined
}

/**
 * `PropertyType` contains the different types a decorated property can hold.
 * Either:
 *  - {@link UnknownTypeProperty}: A property that will be defined at runtime.
 *  - {@link PrimitiveTypeProperty}: A property that can be resolved
 *  immediately.
 *  - {@link RelationTypeProperty}: A reference to a nested binary file
 *  definition.
 *
 * @typeParam This The type of the class the decorator is applied to.
 */
export type PropertyType<This> = RelationTypeProperty<This, any> | PrimitiveTypeProperty<This> | UnknownTypeProperty<This>

/**
 * `isPrimitiveRelation` check if the property type is a
 * {@link PrimitiveTypeProperty}.
 *
 * @typeParam This The type of the class the decorator is applied to.
 *
 * @param {PropertyType} property
 * @returns {field is PrimitiveTypeProperty}
 *
 * @category Type Guards
 */
export function isPrimitiveRelation<This> (property: PropertyType<This>): property is PrimitiveTypeProperty<This> {
  return property.type === PrimitiveTypePropertySymbol
}

/**
 * `isUnknownProperty` check if the property type is an
 * {@link UnknownTypeProperty}.
 *
 * @typeParam This The type of the class the decorator is applied to.
 *
 * @param {PropertyType} property
 * @returns {field is UnknownPropertyType<T>}
 *
 * @category Type Guards
 */
export function isUnknownProperty<This> (property: PropertyType<This>): property is UnknownTypeProperty<This> {
  return property.type === UnknownTypePropertySymbol
}

/**
 * `isRelation` check if the property type is a {@link RelationTypeProperty}.
 *
 * @typeParam This The type of the class the decorator is applied to.
 *
 * @param {PropertyType} property
 * @returns {property is RelationType}
 *
 * @category Type Guards
 */
export function isRelation<This> (property: PropertyType<This>): property is RelationTypeProperty<This, any> {
  const relation: InstantiableObject<This> = (property as RelationTypeProperty<This, any>).relation
  return relation !== undefined
}

/**
 * `createPrimitiveTypeProperty` helper to create a
 * {@link PrimitiveTypeProperty} metadata object.
 *
 * @typeParam This The type of the class the decorator is applied to.
 *
 * @param {metadata} metadata
 * @param {keyof T} propertyKey
 * @param {PrimitiveSymbol} primitive
 * @returns {PrimitiveTypeProperty}
 *
 * @category Advanced Use
 */
export function createPrimitiveTypeProperty<This> (metadata: DecoratorMetadataObject, propertyKey: keyof This, primitive: PrimitiveSymbol): PrimitiveTypeProperty<This> {
  return {
    ...createPropertyMetaDescriptor<This>(PrimitiveTypePropertySymbol, 'primitive', metadata, propertyKey),
    primitive,
  }
}

/**
 * `createRelationTypeProperty` helper to create a
 * {@link RelationTypeProperty} metadata object.
 *
 * @typeParam This The type of the class the decorator is applied to.
 * @typeParam Target The type of the relation
 *
 * @param {metadata} metadata
 * @param {keyof This} propertyKey
 * @param {InstantiableObject<Target>} relation
 * @param {RelationParameters<This>} args
 * @returns {RelationTypeProperty<This, Target>}
 *
 * @category Advanced Use
 */
export function createRelationTypeProperty<This, Target> (metadata: DecoratorMetadataObject, propertyKey: keyof This, relation: InstantiableObject<Target>, args?: RelationParameters<This>): RelationTypeProperty<This, Target> {
  const argsFunc = typeof args === 'string'
    ? (targetInstance: This) => commaSeparetedRecursiveGet(targetInstance, args)
    : args as ((targetInstance: This) => any[]) | undefined

  return {
    ...createPropertyMetaDescriptor<This>(RelationTypePropertySymbol, 'relation', metadata, propertyKey),
    relation,
    args: argsFunc,
  }
}
/**
 * @overload
 * @returns {DecoratorType<This, Value>} The property decorator function.
 */
/**
 * @overload
 * @param {PrimitiveSymbol} relation Primitive type of the property.
 * @returns {DecoratorType<This, Value>} The property decorator function.
 */
/**
 * @overload
 * @param {InstantiableObject<This>} relation Class definition reference of the
 * nested type definition.
 * @param {RelationParameters<This>} [args] Optional arguments passed to the
 * nested type definition.
 * @returns {DecoratorType<This, Value>} The property decorator function.
 */
/**
 * `@Relation` property decorator defines the type of the decorated
 * property. This can be either:
 *  - A {@link PrimitiveSymbol} type, that refers to a type definition that
 *  will be processed immediately.
 *  - A {@link RelationTypeProperty} type, that refers to a nested type
 *  definition
 *
 *  @example
 *
 *  The most basic usage of the `@Relation` is to define the primitive type of
 *  the decorated property.
 *  In the following example a basic format definition is written that defines
 *  the `data` property as an _unsigned 8 bit integer_.
 *
 *  ```typescript
 *  class Protocol {
 *    @Relation(PrimitiveSymbol.u8)
 *    data: number
 *  }
 *  ```
 *
 *  The `@Relation` decorator can also be used to refer to a nested structure.
 *  In the following example the `Protocol` format definition refers to the
 *  `Coord` definition with the `@Relation` decorator.
 *  This will result in a nested object accessible through the property
 *  `data`.
 *
 *  ```typescript
 *  class Coord {
 *    @Relation(PrimitiveSymbol.i16)
 *    x: number
 *
 *    @Relation(PrimitiveSymbol.i16)
 *    y: number
 *  }
 *
 *  class Protocol {
 *    @Relation(Coord)
 *    data: number
 *  }
 *  ```
 *
 *  It's also possible to use `@Relation` decorator to pass arguments to the
 *  nested object relation.
 *
 *  ```typescript
 *  class SubProtocol {
 *    _count: number
 *
 *    constructor(count: number) {
 *      this._count = count
 *    }
 *  }
 *
 *  class Protocol {
 *    @Relation(PrimitiveType.u8)
 *    count: number
 *
 *    // Can refer to the argument just with a string
 *    // to pass multiple arguments you can use comma-separeted references.
 *    @Relation(SubProtocol, 'count')
 *    sub: SubProtocol
 *
 *    // Using function is also possible, the return type needs to be an array.
 *    @Relation(SubProtocol, (_) => [_.count])
 *    sub_: SubProtocol
 *  }
 *  ```
 *
 * @remarks
 *
 * Even thought it's possible to use the `@Relation()` decorator without
 * parameters you shouldn't do it yourself. This will be automatically done
 * with the help of {@link Condition} decorators.
 *
 * @typeParam This The type of the class the decorator is applied to.
 * @typeParam Target The type of the relation
 * @typeParam Value The type of the decorated property.
 *
 * @param {InstantiableObject<This> | PrimitiveSymbol} [relation] Defines the
 * property type as either a primitive, a nested type definition, or null in
 * case of an unknown property.
 * @param {RelationParameters<This>} [args] Optional arguments passed to the
 * nested type definition.
 * @returns {DecoratorType<This, Value>} The property decorator function.
 *
 * @throws {@link RelationAlreadyDefinedError} if a relation metadata is found.
 *
 * @category Decorators
 */
export function Relation<This, Target, Value> (relation?: InstantiableObject<Target> | PrimitiveSymbol, args?: RelationParameters<This>): DecoratorType<This, Value> {
  return function (_: undefined, context: Context<This, Value>): void {
    if (Meta.getBitFields(context.metadata).length > 0) {
      throw new WrongBitfieldClassImplementation(String(context.name))
    }

    const propertyName = context.name as keyof This
    const field = Meta.getField(context.metadata, propertyName)
    if (field !== undefined) {
      throw new RelationAlreadyDefinedError(field, String(propertyName))
    }
    if (relation === undefined) {
      Meta.setField(context.metadata, createPropertyMetaDescriptor<This>(UnknownTypePropertySymbol, 'unknown', context.metadata, propertyName))
    } else if (isPrimitiveSymbol(relation)) {
      Meta.setField(context.metadata, createPrimitiveTypeProperty<This>(context.metadata, propertyName, relation))
    } else {
      Meta.setField(context.metadata, createRelationTypeProperty<This, Target>(context.metadata, propertyName, relation, args))
    }
  }
}

/**
 * `relationExistOrThrow` Verifiy the existance of a primitive in the metadata
 * or throw an error.
 *
 * @typeParam This The type of the class the decorator is applied to.
 * @typeParam Target The type of the relation
 * @typeParam Value The type of the decorated property.
 *
 * @param {metadata} metadata The Class metadata object.
 * @param {context} context The decorator context object.
 * @returns {void}
 *
 * @throws {@link RelationNotDefinedError} if no relation metadata is found.
 *
 * @category Advanced Use
 */
export function relationExistOrThrow<This, Value> (metadata: DecoratorMetadataObject, context: Context<This, Value>): void {
  if (Meta.getField(metadata, context.name as keyof This) === undefined) {
    throw new RelationNotDefinedError(context.name)
  }
}
