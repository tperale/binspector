/**
 * The reader module
 *
 * @mermaid
 *
 * @module reader
 */
import { type Cursor } from './cursor'
import { EOFError, UnknownPropertyType, ReferringToEmptyClassError, WrongArgumentReturnType } from './error'
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
import { useConditions } from './decorators/condition'
import { usePrePost } from './decorators/prepost'
import { useBitField } from './decorators/bitfield'

/**
 * binread.
 *
 * Read DataBuffer binary content from a class definition
 * and create an instance populated with the correct field
 * from the binary file.
 *
 * @param {InstantiableObject} ObjectDefinition
 * @param {Cursor} content
 * @returns {T}
 *
 * @throws
 * If you attempt to read a buffer that reach EOF before fully creating the
 * `ObjectDefinition`. {@link binread} will throw an error.
 * You can read field until the `EOF` by using a `Controller` decorator
 * (see {@link While}, {@link Until})
 *
 * @throws
 * Throws a "Self refering field" error when you create a relation to the same
 * `ObjectDefinition` passed in param.
 * You can create self refering field by using conditionnal decorator.
 */
export function binread (content: Cursor, ObjectDefinition: InstantiableObject, ...args: any[]): any {
  function getBinReader (field: PropertyType, instance: any): ControllerReader {
    if (isPrimitiveRelation(field)) {
      return () => content.read(field.primitive)
    } else if (isRelation(field)) {
      // TODO No need to do the check inside the function.
      return (readerArgs?: any[]) => {
        const finalArgs = field.args !== undefined
          ? field.args(instance)
          : readerArgs !== undefined
            ? [readerArgs]
            : []

        if (!Array.isArray(finalArgs)) {
          throw new WrongArgumentReturnType(String(instance.constructor.name), String(field.propertyName))
        }

        try {
          return binread(content, field.relation, ...[...finalArgs, instance])
        } catch (error) {
          // We need to catch the EOF error because the binread function
          // can't return it so it just throw it EOFError.
          // It's necessary to return EOF for relation that were not completely read
          // in a controller. For instance:
          // class Protocol {
          //   @Until(EOF)
          //   @Controller(DataChunk)
          //   data: DataChunk
          // }
          if (error instanceof EOFError) {
            return EOF
          } else {
            throw error
          }
        }
      }
    } else {
      throw new UnknownPropertyType(field)
    }
  }
  // TODO [Cursor] Enter a new 'namespace' that will be used for the debugging history

  const instance = new ObjectDefinition(...args)

  const metadata = ObjectDefinition[Symbol.metadata] as NonNullable<DecoratorMetadataObject>

  if (metadata === undefined) {
    throw new ReferringToEmptyClassError(String(instance.constructor.name))
  }

  const bitfields = Meta.getBitFields(metadata)
  if (bitfields.length > 0) {
    return useBitField(bitfields, instance, content)
  }

  Meta.getFields(metadata).forEach((field) => {
    usePrePost(Meta.getPre(metadata, field.propertyName), instance, content)

    // TODO [Cursor] Pass the field name information to add to the namespace
    const finalRelationField = isUnknownProperty(field) ? useConditions(Meta.getConditions(field.metadata, field.propertyName), instance) : field
    if (finalRelationField !== undefined) {
      const propertyReader = getBinReader(finalRelationField, instance)
      const controllers = Meta.getControllers(metadata, field.propertyName)
      const value = controllers.length > 0
        ? useController(controllers, instance, content, propertyReader)
        : propertyReader()

      if (value === EOF) {
        // TODO error handling throwing an error containing the backtrace + the current state of the object
        // If the value is EOF here it means it wasn't handled correctly inside a controller
        // Mandatory to throw EOF because returning EOF would break the typing.
        throw new EOFError()
      }

      const transformers = Meta.getTransformers(metadata, field.propertyName)
      const transformedValue = useTransformer(transformers, value, instance)
        transformers.reduce((res, transformer) => {
        return transformer.transformer(res, instance)
      }, value)

      useValidators(Meta.getValidators(metadata, field.propertyName), transformedValue, instance, content)

      instance[field.propertyName] = transformedValue
    }
    usePrePost(Meta.getPost(metadata, field.propertyName), instance, content)
  })

  return instance
}
