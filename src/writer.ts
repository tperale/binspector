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
  isUnknownProperty,
  isPrimitiveRelation,
  type PropertyType
} from './decorators/primitive'
import { type InstantiableObject } from './types'
import { usePrePost } from './decorators/prepost'
import { useConditions } from './decorators/condition'
import { useTransformer, TransformerExecutionScope } from './decorators/transformer'
import { writeBitField } from './decorators/bitfield'

/**
 * binwrite.
 *
 * @param {BinaryWriter} cursor
 * @param {InstantiableObject} ObjectDefinition
 * @param {Target} instance
 * @returns {void}
 *
 */
export function binwrite<Target> (cursor: BinaryWriter, ObjectDefinition: InstantiableObject<Target>, instance: Target): void {
  function getBinWriter (field: PropertyType<Target>, instance: any, value: any): () => void {
    const strToArray = (x: any): any => (typeof x === 'string' && x.length > 1) ? x.split('') : x

    const write = (field: PropertyType<Target>, value: any): void => {
      if (isPrimitiveRelation(field)) {
        cursor.write(field.primitive, value as number | string)
      } else if (isRelation(field)) {
        binwrite(cursor, field.relation, value)
      } else {
        throw new UnknownPropertyType(field)
      }
    }

    const _value = strToArray(value)
    return () => {
      if (Array.isArray(_value)) {
        _value.flat(Infinity).flatMap(strToArray).forEach(x => {
          write(field, x)
        })
      } else {
        write(field, _value)
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

    const finalRelationField = isUnknownProperty(field) ? useConditions(Meta.getConditions(field.metadata, field.propertyName), instance) : field
    if (finalRelationField !== undefined) {
      // Condition don't need to be used since the object are already in here.
      const transformers = Meta.getTransformers(metadata, field.propertyName)
      transformers.reverse()
      const transformedValue = useTransformer(transformers, instance[field.propertyName], instance, TransformerExecutionScope.OnWrite)

      const propertyWriter = getBinWriter(finalRelationField, instance, transformedValue)

      // TODO Some controller should include instruction on how to normalize the data
      // For instance matrix should normalize the data into a single array
      // NullString should add back the \0
      // targetType sin

      propertyWriter()
    }
    usePrePost(Meta.getPost(metadata, field.propertyName), instance, cursor)
  })
}
