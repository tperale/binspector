/**
 * The reader module
 *
 * @mermaid
 *
 * @module reader
 */
import { type BinaryCursor } from './cursor'
import { EOFError, UnknownPropertyType } from './error'
import Meta from './metadatas'
import {
  isRelation,
  isPrimitiveRelation,
  isUnknownProperty,
  type PropertyType
} from './decorators/primitive'
import { EOF, type InstantiableObject } from './types'
import { useController, type ControllerReader } from './decorators/controller'
import { useTransformer } from './decorators/transformer'
import { useValidators } from './decorators/validator'
import { usePrePost } from './decorators/prepost'
import { useBitField } from './decorators/bitfield'

/**
 * binwrite.
 *
 * @param {InstantiableObject} ObjectDefinition
 * @param {Cursor} content
 * @returns {T}
 *
 */
export function binwrite (ObjectDefinition: InstantiableObject, instance: any, cursor: BinaryCursor): any {
  function getBinWriter (field: PropertyType, instance: any): () => void {
    if (isPrimitiveRelation(field)) {
      return () => { cursor.write(field.primitive, instance[field.propertyName] as number | string) }
    } else if (isRelation(field)) {
      return () => { binwrite(field.relation, instance[field.propertyName], cursor) }
    } else {
      throw new UnknownPropertyType(field)
    }
  }

  // TODO Support bitfields
  // const bitfields = Meta.getBitFields(ObjectDefinition[Symbol.metadata] as DecoratorMetadataObject)
  // if (bitfields.length > 0) {
  //   return useBitField(bitfields, instance, content)
  // }

  Meta.getFields(ObjectDefinition[Symbol.metadata] as DecoratorMetadataObject).forEach((field) => {
    // usePrePost(Meta.getPre(ObjectDefinition[Symbol.metadata] as DecoratorMetadataObject, field.propertyName), instance, content)

    // Condition don't need to be used since the object are already in here.
    const propertyWriter = getBinWriter(field, instance)

    // TODO Some controller should include instruction on how to normalize the data
    // For instance matrix should normalize the data into a single array
    // NullString should add back the \0
    // targetType sin

    // TODO Some validator should set automatically the value
    // useValidators(Meta.getValidators(ObjectDefinition[Symbol.metadata] as DecoratorMetadataObject, field.propertyName), transformedValue, instance, content)

    // TODO Transformer should do the thing in reverse

    // usePrePost(Meta.getPost(ObjectDefinition[Symbol.metadata] as DecoratorMetadataObject, field.propertyName), instance, content)
    propertyWriter()
  })

  return cursor.data.buffer
}
