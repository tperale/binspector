/**
 * The writer module
 *
 * @module writer
 */
import { BinaryCursorEndianness, BinaryWriter } from './cursor.ts'
import { UnknownPropertyType } from './error.ts'
import Meta from './metadatas.ts'
import {
  isRelation,
  isUnknownProperty,
  isPrimitiveRelation,
  type PropertyType,
} from './decorators/primitive.ts'
import { ExecutionScope, InstantiableObject } from './types.ts'
import { usePrePost } from './decorators/prepost.ts'
import { useConditions } from './decorators/condition.ts'
import { TransformerExecLevel, useTransformer } from './decorators/transformer.ts'
import { writeBitField } from './decorators/bitfield.ts'

interface BinwriteOptions {
  endian?: BinaryCursorEndianness
}

const defaultBinwriteOptions = {
  endian: undefined,
}

function _binwrite<Target> (cursor: BinaryWriter, ObjectDefinition: InstantiableObject<Target>, instance: Target): BinaryWriter {
  const ObjectMetadata = ObjectDefinition[Symbol.metadata] as NonNullable<DecoratorMetadataObject>
  if (ObjectMetadata === undefined) {
    throw new Error('undefined')
  }

  const bitfields = Meta.getBitFields(ObjectMetadata)
  if (bitfields.length > 0) {
    writeBitField(bitfields, instance, cursor)
    return cursor
  }

  usePrePost(Meta.getClassPre(ObjectMetadata), instance, cursor, ExecutionScope.OnWrite)

  Meta.getFields<Target>(ObjectMetadata).forEach((field) => {
    usePrePost(Meta.getPre(ObjectMetadata, field.propertyName), instance, cursor, ExecutionScope.OnWrite)

    const finalRelationField = isUnknownProperty(field) ? useConditions(Meta.getConditions(ObjectMetadata, field.propertyName), instance) : field
    if (finalRelationField !== undefined) {
      function write (field: PropertyType<Target>, value: any): void {
        if (isPrimitiveRelation(field)) {
          cursor.write(field.primitive, value as number)
        } else if (isRelation(field)) {
          _binwrite(cursor, field.relation, value)
        } else {
          throw new UnknownPropertyType(field)
        }
      }

      // Condition don't need to be used since the object are already in here.
      const transformers = Meta.getTransformers(ObjectMetadata, field.propertyName, true)
      const value = useTransformer(transformers, instance[field.propertyName], instance, ExecutionScope.OnWrite)
      if (Array.isArray(value)) {
        value.flat(Infinity).forEach((x) => {
          write(finalRelationField, useTransformer(transformers, x, instance, ExecutionScope.OnWrite, TransformerExecLevel.PrimitiveTranformer))
        })
      } else {
        write(finalRelationField, useTransformer(transformers, value, instance, ExecutionScope.OnWrite, TransformerExecLevel.PrimitiveTranformer))
      }
    }
    usePrePost(Meta.getPost(ObjectMetadata, field.propertyName), instance, cursor, ExecutionScope.OnWrite)
  })

  usePrePost(Meta.getClassPost(ObjectMetadata), instance, cursor, ExecutionScope.OnWrite)

  return cursor
}

/**
 * `binwrite` transforms a binspector definition instance into an
 * `ArrayBuffer`.
 *
 * @example
 *
 * Given the following protocol definition:
 *
 * ```typescript
 * class Protocol {
 *   @Uint8
 *   x: number
 *
 *   @Uint8
 *   y: number
 * }
 * ```
 *
 * There are two ways to call the `binwrite` function:
 *
 * - Pass an instance of the `Protocol` class to binwrite:
 *
 * ```typescript
 * const protocol = new Protocol()
 * protocol.x = 1
 * protocol.y = 2
 *
 * binwrite(protocol) // => ArrayBuffer { [Uint8Contents]: <01 02>, byteLength: 2 }
 * ```
 *
 * - Pass an object that represent the definition with the definition
 *   constructor
 *
 * ```typescript
 * const protocol = { x: 1, y: 2 }
 *
 * binwrite(protocol, Protocol) // => ArrayBuffer { [Uint8Contents]: <01 02>, byteLength: 2 }
 * ```
 *
 * @param {Target} instance Object or definition instance to serialize.
 * @param {InstantiableObject<Target> | Partial<BinwriteOptions>} ObjectDefinitionOrOpt
 * @param {Partial<BinwriteOptions>} opt
 *
 * @returns {ArrayBufferLike} The serialized object buffer.
 */
export function binwrite<Target> (instance: Target, ObjectDefinitionOrOpt: InstantiableObject<Target> | Partial<BinwriteOptions> = defaultBinwriteOptions, opt?: Partial<BinwriteOptions>): ArrayBufferLike {
  const isConstructor = typeof ObjectDefinitionOrOpt === 'function' && !!ObjectDefinitionOrOpt.prototype && ObjectDefinitionOrOpt.prototype.constructor === ObjectDefinitionOrOpt
  const argOpt = isConstructor
    ? (opt === undefined ? defaultBinwriteOptions : opt)
    : ObjectDefinitionOrOpt
  const finalOpt = { ...defaultBinwriteOptions, ...argOpt }
  const cursor = new BinaryWriter(finalOpt.endian)

  const definition = isConstructor
    ? ObjectDefinitionOrOpt
    : ((instance as object).constructor as InstantiableObject<Target>)

  return _binwrite(cursor, definition, instance).buffer
}

/**
 * `computeBinSize` compute the size in byte of a binspector declaration
 * instance.
 *
 * @param {Target} instance Binspector declaration instance.
 *
 * @returns {number} Size in byte.
 */
export function computeBinSize<Target extends object> (instance: Target | Target[]): number {
  function _getSize (x: Target): number {
    const buf = binwrite(x)
    return buf.byteLength
  }

  if (Array.isArray(instance)) {
    return instance.reduce((acc, curr) => acc + _getSize(curr), 0)
  } else {
    return _getSize(instance)
  }
}
