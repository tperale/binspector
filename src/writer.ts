/**
 * The reader module
 *
 * @mermaid
 *
 * @module reader
 */
import { type BinaryWriter } from './cursor'
import { UnknownPropertyType } from './error'
import Meta from './metadatas'
import {
  isRelation,
  isPrimitiveRelation,
  type PropertyType
} from './decorators/primitive'
import { type InstantiableObject } from './types'
import { usePrePost } from './decorators/prepost'
import { writeBitField } from './decorators/bitfield'

/**
 * binwrite.
 *
 * @param {InstantiableObject} ObjectDefinition
 * @param {Cursor} content
 * @returns {T}
 *
 */
export function binwrite<Target> (ObjectDefinition: InstantiableObject<Target>, instance: Target, cursor: BinaryWriter): void {
  function getBinWriter (field: PropertyType<Target>, instance: any): () => void {
    const strToArray = (x: any): any => (typeof x === 'string' && x.length > 1) ? x.split('') : x

    const write = (field: PropertyType<Target>, value: any): void => {
      if (isPrimitiveRelation(field)) {
        cursor.write(field.primitive, value as number | string)
      } else if (isRelation(field)) {
        binwrite(field.relation, value, cursor)
      } else {
        throw new UnknownPropertyType(field)
      }
    }

    const value = strToArray(instance[field.propertyName])
    return () => {
      if (Array.isArray(value)) {
        value.flat(Infinity).flatMap(strToArray).forEach(x => {
          write(field, x)
        })
      } else {
        write(field, value)
      }
    }
  }

  const metadata = ObjectDefinition[Symbol.metadata] as NonNullable<DecoratorMetadataObject>
  if (metadata === undefined) {
    throw new Error('undefined')
  }

  const bitfields = Meta.getBitFields(metadata)
  if (bitfields.length > 0) {
    writeBitField(bitfields, instance, cursor)
    return
  }

  Meta.getFields<Target>(metadata).forEach((field) => {
    usePrePost(Meta.getPre(metadata, field.propertyName), instance, cursor)

    // Condition don't need to be used since the object are already in here.
    const propertyWriter = getBinWriter(field, instance)

    // TODO Some controller should include instruction on how to normalize the data
    // For instance matrix should normalize the data into a single array
    // NullString should add back the \0
    // targetType sin

    // TODO Transformer should do the thing in reverse

    propertyWriter()
    usePrePost(Meta.getPost(metadata, field.propertyName), instance, cursor)
  })
}
