/**
 * Module definition of {@link Primitive} decorators.
 *
 * {@link Primitive} decorators should always be the first decorator defined over the
 * property definition. These decorators are used to tell the parser the type of the
 * properties to read.
 *
 * @module Primitive
 */
import { type MetaDescriptor, commaSeparetedRecursiveGet } from './common'
import { type PrimitiveSymbol, isPrimitiveSymbol, type InstantiableObject, type DecoratorType, type Context, type DecoratorMetadataObject } from '../types'
import Meta from '../metadatas'

export class RelationNotDefinedError extends Error {
  constructor (propertyKey: string | symbol) {
    super(`No relation defined for the property '${propertyKey.toString()}'`)
  }
}

export class RelationAlreadyDefinedError extends Error {
  constructor (propertyType: PropertyType, propertyKey: string) {
    super(`The relation '${JSON.stringify(propertyType)}' already exist for the property '${propertyKey}'`)
  }
}

function createMetaDescriptor (type: symbol, name: string, metadata: DecoratorMetadataObject, propertyName: string | symbol): MetaDescriptor {
  return {
    type,
    name,
    metadata,
    propertyName
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
export function isPrimitiveRelation (field: PropertyType): field is PrimitiveTypeProperty {
  return field.type === PrimitiveTypePropertySymbol
}

/**
 * PrimitiveTypeField.
 *
 * @extends {MetaDescriptor}
 */
export interface PrimitiveTypeProperty extends MetaDescriptor {
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
export function createPrimitiveTypeProperty (metadata: DecoratorMetadataObject, propertyKey: string | symbol, primitive: PrimitiveSymbol): PrimitiveTypeProperty {
  return {
    ...createMetaDescriptor(PrimitiveTypePropertySymbol, 'primitive', metadata, propertyKey),
    primitive
  }
}

const UnknownTypePropertySymbol = Symbol('unknown-property-symbol')

/**
 * UnknownPropertyType.
 */
export type UnknownTypeProperty = MetaDescriptor

/**
 * isUnknownProperty.
 *
 * @param {FieldType} field
 * @returns {field is UnknownPropertyType<T>}
 *
 * @category Advanced Use
 */
export function isUnknownProperty (field: PropertyType): field is UnknownTypeProperty {
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
export function isRelation (field: PropertyType): field is RelationTypeProperty {
  const relation: InstantiableObject = (field as RelationTypeProperty).relation
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
export type RelationParameters = ((targetInstance: any) => any[]) | string

/**
 * RelationType.
 *
 * @extends {MetaDescriptor}
 */
export interface RelationTypeProperty extends MetaDescriptor {
  /**
   * @type {InstantiableObject} Primitive value that the property hold.
   */
  relation: InstantiableObject
  args: ((targetInstance: any) => any[]) | undefined
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
export function createRelationTypeProperty (metadata: DecoratorMetadataObject, propertyKey: string | symbol, relation: InstantiableObject, args?: RelationParameters): RelationTypeProperty {
  const argsFunc = typeof args === 'string'
    ? (targetInstance: any) => commaSeparetedRecursiveGet(targetInstance, args)
    : args as ((targetInstance: any) => any[]) | undefined

  return {
    ...createMetaDescriptor(RelationTypePropertySymbol, 'relation', metadata, propertyKey),
    relation,
    args: argsFunc
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
export function Relation (relation?: InstantiableObject | PrimitiveSymbol, args?: RelationParameters): DecoratorType {
  return function (_: any, context: Context): void {
    const field = Meta.getField(context.metadata, context.name)
    if (field !== undefined) {
      throw new RelationAlreadyDefinedError(field, String(context.name))
    }
    if (relation === undefined) {
      Meta.setField(context.metadata, createMetaDescriptor(UnknownTypePropertySymbol, 'unknown', context.metadata, context.name) as UnknownTypeProperty)
    } else if (isPrimitiveSymbol(relation)) {
      Meta.setField(context.metadata, createPrimitiveTypeProperty(context.metadata, context.name, relation))
    } else {
      Meta.setField(context.metadata, createRelationTypeProperty(context.metadata, context.name, relation, args))
    }
  }
}

export type PropertyType = RelationTypeProperty | PrimitiveTypeProperty | UnknownTypeProperty

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
export function relationExistOrThrow (metadata: DecoratorMetadataObject, context: Context): void {
  if (Meta.getField(metadata, context.name) === undefined) {
    throw new RelationNotDefinedError(context.name)
  }
}

/**
 * withRelation.
 *
 * @param {symbol} relation
 * @param {DecoratorType} decorator
 * @returns {DecoratorType} The property decorator function ran at runtime
 *
 * @category Advanced Use
 */
export function withRelation (relation: InstantiableObject | PrimitiveSymbol, decorator: DecoratorType): DecoratorType {
  return function <T>(target: T, context: Context) {
    Relation(relation)(target, context)
    decorator(target, context)
  }
}
