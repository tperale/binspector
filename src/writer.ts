/**
 * The reader module
 *
 * @mermaid
 *
 * @module reader
 */
import { BinaryWriter } from './cursor.ts'
import { UnknownPropertyType } from './error.ts'
import Meta from './metadatas.ts'
import {
  isRelation,
  isUnknownProperty,
  isPrimitiveRelation,
  type PropertyType,
} from './decorators/primitive.ts'
import { ExecutionScope, type InstantiableObject } from './types.ts'
import { usePrePost } from './decorators/prepost.ts'
import { useConditions } from './decorators/condition.ts'
import { TransformerExecLevel, useTransformer } from './decorators/transformer.ts'
import { writeBitField } from './decorators/bitfield.ts'

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
      function write (field: PropertyType<Target>, value: any): void {
        if (isPrimitiveRelation(field)) {
          cursor.write(field.primitive, value as number)
        } else if (isRelation(field)) {
          binwrite(cursor, field.relation, value)
        } else {
          throw new UnknownPropertyType(field)
        }
      }

      // Condition don't need to be used since the object are already in here.
      const transformers = Meta.getTransformers(metadata, field.propertyName, true)
      const value = useTransformer(transformers, instance[field.propertyName], instance, ExecutionScope.OnWrite)
      if (Array.isArray(value)) {
        value.flat(Infinity).forEach((x) => {
          write(finalRelationField, useTransformer(transformers, x, instance, ExecutionScope.OnWrite, TransformerExecLevel.PrimitiveTranformer))
        })
      } else {
        write(finalRelationField, useTransformer(transformers, value, instance, ExecutionScope.OnWrite, TransformerExecLevel.PrimitiveTranformer))
      }
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
