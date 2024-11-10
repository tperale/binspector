/**
 * Module definition of {@link Primitive} decorators.
 *
 * {@link Primitive} decorators should always be the first decorator defined over the
 * property definition. These decorators are used to tell the parser the type of the
 * properties to read.
 *
 * @module Primitive
 */
import { type MetaDescriptor, createMetaDescriptor, commaSeparetedRecursiveGet } from './common'
import { WrongBitfieldClassImplementation } from '../error'
import Meta from '../metadatas'
import { type PrimitiveSymbol, isPrimitiveSymbol, type InstantiableObject, type DecoratorType, type Context, type DecoratorMetadataObject } from '../types'

export class RelationNotDefinedError extends Error {
  constructor (propertyKey: string | symbol) {
    super(`No relation defined for the property '${propertyKey.toString()}'`)
  }
}

export class RelationAlreadyDefinedError extends Error {
  constructor (propertyType: PropertyType<any>, propertyKey: string) {
    super(`The relation '${JSON.stringify(propertyType)}' already exist for the property '${propertyKey}'`)
  }
}

/**
 */
const PrimitiveTypePropertySymbol = Symbol('primitive')

/**
 * isPrimitiveRelation check if the field is a primitive type field.
 *
 * @param {PropertyType} field
 * @returns {field is PrimitiveTypeProperty}
 *
 * @category Type guard
 */
export function isPrimitiveRelation<This> (field: PropertyType<This>): field is PrimitiveTypeProperty<This> {
  return field.type === PrimitiveTypePropertySymbol
}

/**
 * PrimitiveTypeField.
 *
 * @extends {MetaDescriptor}
 */
export interface PrimitiveTypeProperty<This> extends MetaDescriptor<This> {
  /**
   * @type {symbol} property that hold the primitive symbol type.
   */
  primitive: PrimitiveSymbol
}

/**
 * createPrimitiveTypeProperty.
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
    ...createMetaDescriptor<This>(PrimitiveTypePropertySymbol, 'primitive', metadata, propertyKey),
    primitive,
  }
}

const UnknownTypePropertySymbol = Symbol('unknown-property-symbol')

/**
 * UnknownPropertyType.
 */
export type UnknownTypeProperty<This> = MetaDescriptor<This>

/**
 * isUnknownProperty.
 *
 * @param {FieldType} field
 * @returns {field is UnknownPropertyType<T>}
 *
 * @category Advanced Use
 */
export function isUnknownProperty<This> (field: PropertyType<This>): field is UnknownTypeProperty<This> {
  return field.type === UnknownTypePropertySymbol
}

/**
 */
const RelationTypePropertySymbol = Symbol('relation-type-property-symbol')

/**
 * isRelation. Check if the field is a relation type field.
 *
 * @param {PropertyType} field
 * @returns {field is RelationType}
 *
 * @category Type guard
 */
export function isRelation<This> (field: PropertyType<This>): field is RelationTypeProperty<This, any> {
  const relation: InstantiableObject<This> = (field as RelationTypeProperty<This, any>).relation
  return relation !== undefined
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
 * The `RelationParameters` definition to pass the property `type` and `size` to the `Chunk` constructor is the following `(targetInstance: Protocol) => [targetInstance.type, targetInstance.size]`
 */
export type RelationParameters<This> = ((targetInstance: This) => any[]) | string

/**
 * RelationType.
 *
 * @extends {MetaDescriptor}
 */
export interface RelationTypeProperty<This, Target> extends MetaDescriptor<This> {
  /**
   * @type {InstantiableObject} Primitive value that the property hold.
   */
  relation: InstantiableObject<Target>
  args: ((targetInstance: This) => any[]) | undefined
}

/**
 * createRelationTypeProperty.
 *
 * @param {metadata} metadata
 * @param {} propertyKey
 * @param {InstantiableObject} relation
 * @param {RelationParameters} args
 * @returns {RelationType<T, K>}
 *
 * @category Advanced Use
 */
export function createRelationTypeProperty<This, Target> (metadata: DecoratorMetadataObject, propertyKey: keyof This, relation: InstantiableObject<Target>, args?: RelationParameters<This>): RelationTypeProperty<This, Target> {
  const argsFunc = typeof args === 'string'
    ? (targetInstance: This) => commaSeparetedRecursiveGet(targetInstance, args)
    : args as ((targetInstance: This) => any[]) | undefined

  return {
    ...createMetaDescriptor<This>(RelationTypePropertySymbol, 'relation', metadata, propertyKey),
    relation,
    args: argsFunc,
  }
}

/**
 * @overload
 *
 * @returns {DecoratorType} The property decorator function ran at runtime
 */

/**
 * @overload
 *
 * @param {PrimitiveSymbol} relation
 * @returns {DecoratorType} The property decorator function ran at runtime
 */

/**
 * `@Relation` decorator
 *
 * Define a decorator that will create a relationship to another binary decleration.
 *
 * @param {InstantiableObject | PrimitiveSymbol} relation
 * @param {RelationParameters} args
 * @returns {DecoratorType} The property decorator function ran at runtime
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
      Meta.setField(context.metadata, createMetaDescriptor<This>(UnknownTypePropertySymbol, 'unknown', context.metadata, propertyName))
    } else if (isPrimitiveSymbol(relation)) {
      Meta.setField(context.metadata, createPrimitiveTypeProperty<This>(context.metadata, propertyName, relation))
    } else {
      Meta.setField(context.metadata, createRelationTypeProperty<This, Target>(context.metadata, propertyName, relation, args))
    }
  }
}

export type PropertyType<This> = RelationTypeProperty<This, any> | PrimitiveTypeProperty<This> | UnknownTypeProperty<This>

/**
 * relationExistOrThrow.
 *
 * Verifiy the existance of a primitive in the metadata or throw an error.
 *
 * @param {metadata} metadata The Class metadata object.
 * @param {context} context The decorator context object.
 * @returns {void}
 *
 * @category Advanced Use
 */
export function relationExistOrThrow<This, Value> (metadata: DecoratorMetadataObject, context: Context<This, Value>): void {
  if (Meta.getField(metadata, context.name as keyof This) === undefined) {
    throw new RelationNotDefinedError(context.name)
  }
}
