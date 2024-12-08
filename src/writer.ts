/**
 * The reader module
 *
 * @mermaid
 *
 * @module reader
 */
import { BinaryWriter } from './cursor'
import { UnknownPropertyType } from './error'
import Meta from './metadatas'
import {
  isRelation,
  isUnknownProperty,
  isPrimitiveRelation,
  type PropertyType,
} from './decorators/primitive'
import { ExecutionScope, type InstantiableObject } from './types'
import { usePrePost } from './decorators/prepost'
import { useConditions } from './decorators/condition'
import { useTransformer } from './decorators/transformer'
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
export function binwrite<Target> (cursor: BinaryWriter, ObjectDefinition: InstantiableObject<Target>, instance: Target): BinaryWriter {
  function binWrite (field: PropertyType<Target>, value: any): void {
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
    if (Array.isArray(_value)) {
      _value.flat(Infinity).flatMap(strToArray).forEach((x) => {
        write(field, x)
      })
    } else {
      write(field, _value)
    }
  }

  const metadata = ObjectDefinition[Symbol.metadata] as NonNullable<DecoratorMetadataObject>
  if (metadata === undefined) {
    throw new Error('undefined')
  }

  const bitfields = Meta.getBitFields(metadata)
  if (bitfields.length > 0) {
    writeBitField(bitfields, instance, cursor)
    return cursor
  }

  usePrePost(Meta.getClassPre(metadata), instance, cursor, ExecutionScope.OnWrite)

  Meta.getFields<Target>(metadata).forEach((field) => {
    usePrePost(Meta.getPre(metadata, field.propertyName), instance, cursor, ExecutionScope.OnWrite)

    const finalRelationField = isUnknownProperty(field) ? useConditions(Meta.getConditions(field.metadata, field.propertyName), instance) : field
    if (finalRelationField !== undefined) {
      // Condition don't need to be used since the object are already in here.
      const transformers = Meta.getTransformers(metadata, field.propertyName)
      const reversedTransformers = transformers.slice().reverse()
      const transformedValue = useTransformer(reversedTransformers, instance[field.propertyName], instance, ExecutionScope.OnWrite)
      binWrite(finalRelationField, transformedValue)

      // TODO Some controller should include instruction on how to normalize the data
      // For instance matrix should normalize the data into a single array
      // NullString should add back the \0
      // targetType sin
    }
    usePrePost(Meta.getPost(metadata, field.propertyName), instance, cursor, ExecutionScope.OnWrite)
  })

  usePrePost(Meta.getClassPost(metadata), instance, cursor, ExecutionScope.OnWrite)

  return cursor
}

export function computeBinSize (instance: any): number {
  function _getSize (x: any): number {
    const bw = new BinaryWriter()
    binwrite(bw, x.constructor, x)
    return bw.length
  }

  if (Array.isArray(instance)) {
    return instance.reduce((acc, curr) => acc + _getSize(curr), 0)
  } else {
    return _getSize(instance)
  }
}
