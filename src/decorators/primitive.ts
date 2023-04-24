/**
 * Module definition of {@link PrimitiveType} decorators.
 *
 * {@link PrimitiveType} decorators should always be the first decorator defined over the
 * property definition. These decorators are used to tell the parser the type of the
 * properties to read.
 *
 * @module Primitive
 */
import { type MetaDescriptor, commaSeparetedRecursiveGet } from './common'
import { type PrimitiveSymbol, isPrimitiveSymbol, type InstantiableObject, type DecoratorType } from '../types'
import Meta from '../metadatas'

export class RelationNotDefinedError extends Error {
  constructor (propertyKey: string) {
    super(`No relation defined for the property '${propertyKey}'`)
  }
}

export class RelationAlreadyDefinedError<T> extends Error {
  constructor (propertyType: PropertyType<T>, propertyKey: string) {
    super(`The relation '${JSON.stringify(propertyType)}' already exist for the property '${propertyKey}'`)
  }
}

function createMetaDescriptor<T> (type: symbol, name: string, target: T, propertyName: keyof T): MetaDescriptor<T> {
  return {
    type,
    name,
    target,
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
export function isPrimitiveRelation<T> (field: PropertyType<T>): field is PrimitiveTypeProperty<T> {
  return field.type === PrimitiveTypePropertySymbol
}

/**
 * PrimitiveTypeField.
 *
 * @extends {MetaDescriptor}
 */
export interface PrimitiveTypeProperty<T> extends MetaDescriptor<T> {
  /**
   * @type {symbol} property that hold the primitive symbol type.
   */
  primitive: PrimitiveSymbol
}

/**
 * createPrimitiveTypeProperty.
 *
 * @param {T} target
 * @param {keyof T} propertyKey
 * @param {PrimitiveSymbol} primitive
 * @returns {PrimitiveType<T>}
 *
 * @category Advanced Use
 */
export function createPrimitiveTypeProperty<T> (target: T, propertyKey: keyof T, primitive: PrimitiveSymbol): PrimitiveTypeProperty<T> {
  return {
    ...createMetaDescriptor(PrimitiveTypePropertySymbol, 'primitive', target, propertyKey),
    primitive
  }
}

const UnknownTypePropertySymbol = Symbol('unknown-property-symbol')

/**
 * UnknownPropertyType.
 */
export type UnknownTypeProperty<T> = MetaDescriptor<T>

/**
 * isUnknownProperty.
 *
 * @param {FieldType} field
 * @returns {field is UnknownPropertyType<T>}
 *
 * @category Advanced Use
 */
export function isUnknownProperty<T> (field: PropertyType<T>): field is UnknownTypeProperty<T> {
  return field.type === UnknownTypePropertySymbol
}

/**
 */
const RelationTypePropertySymbol = Symbol('relation-type-property-symbol')

/**
 * isRelation. Check if the field is a relation type field.
 *
 * @param {RelationType | PrimitiveType} field
 * @returns {field is RelationType}
 *
 * @category Type guard
 */
export function isRelation<T, K> (field: PropertyType<T>): field is RelationTypeProperty<T, K> {
  const relation: InstantiableObject<K> = (field as RelationTypeProperty<T, K>).relation
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
export type RelationParameters<T> = ((targetInstance: T) => any[]) | string

/**
 * RelationType.
 *
 * @extends {MetaDescriptor}
 */
export interface RelationTypeProperty<T, K> extends MetaDescriptor<T> {
  /**
   * @type {InstantiableObject} Primitive value that the property hold.
   */
  relation: InstantiableObject<K>
  args: ((targetInstance: T) => any[]) | undefined
}

/**
 * createRelationTypeProperty.
 *
 * @param {T} target
 * @param {keyof T} propertyKey
 * @param {InstantiableObject} relation
 * @param {RelationParameters} args
 * @returns {RelationType<T, K>}
 *
 * @category Advanced Use
 */
export function createRelationTypeProperty<T, K> (target: T, propertyKey: keyof T, relation: InstantiableObject<K>, args?: RelationParameters<unknown>): RelationTypeProperty<T, K> {
  const argsFunc = typeof args === 'string' ? (targetInstance: T) => commaSeparetedRecursiveGet(targetInstance, args) : args as ((targetInstance: T) => any[]) | undefined
  return {
    ...createMetaDescriptor(RelationTypePropertySymbol, 'relation', target, propertyKey),
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
export function Relation<K> (relation?: InstantiableObject<K> | PrimitiveSymbol, args?: RelationParameters<unknown>): DecoratorType {
  return function<T> (target: T, propertyKey: keyof T): void {
    const field = Meta.getField(target, propertyKey)
    if (field !== undefined) {
      throw new RelationAlreadyDefinedError(field, String(propertyKey))
    }
    if (relation === undefined) {
      Meta.setField(target, createMetaDescriptor(UnknownTypePropertySymbol, 'unknown', target, propertyKey) as UnknownTypeProperty<T>)
    } else if (isPrimitiveSymbol(relation)) {
      Meta.setField(target, createPrimitiveTypeProperty(target, propertyKey, relation))
    } else {
      Meta.setField(target, createRelationTypeProperty(target, propertyKey, relation, args))
    }
  }
}

export type PropertyType<T> = RelationTypeProperty<T, unknown> | PrimitiveTypeProperty<T> | UnknownTypeProperty<T>

/**
 * relationExistOrThrow.
 *
 * Verifiy the existance of a primitive in the metadata or throw an error.
 *
 * @param {T} target
 * @param {keyof T} propertyKey
 * @returns {void}
 *
 * @category Advanced Use
 */
export function relationExistOrThrow<T> (target: T, propertyKey: keyof T): void {
  if (Meta.getField(target, propertyKey) === undefined) {
    throw new RelationNotDefinedError(propertyKey as string)
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
export function withRelation (relation: InstantiableObject<unknown> | PrimitiveSymbol, decorator: DecoratorType): DecoratorType {
  return function <T>(target: T, propertyKey: keyof T) {
    Relation(relation)(target, propertyKey as string)
    decorator(target, propertyKey as string)
  }
}
