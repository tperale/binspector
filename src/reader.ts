/**
 * The reader module
 *
 * @mermaid
 *
 * @module reader
 */
import { BinaryReader } from './cursor.ts'
import { PartialReadingError, UnknownPropertyType, ReferringToEmptyClassError, WrongArgumentReturnType, ValidationTestFailed, EOFError } from './error.ts'
import Meta from './metadatas.ts'
import {
  isRelation,
  isPrimitiveRelation,
  isUnknownProperty,
  type PropertyType,
} from './decorators/primitive.ts'
import { ExecutionScope, type InstantiableObject } from './types.ts'
import { useController } from './decorators/controller.ts'
import { TransformerExecLevel, useTransformer } from './decorators/transformer.ts'
import { useValidators } from './decorators/validator.ts'
import { useConditions } from './decorators/condition.ts'
import { usePrePost } from './decorators/prepost.ts'
import { useBitField } from './decorators/bitfield.ts'
import { useContextGet, useContextSet, CtxType } from './decorators/context.ts'
import BinDump, { type BinspectorMetaClass, type BinspectorMetaPropertiesComponent, type BinspectorMetaProperty } from './bindump.ts'

interface BinreadOptions {
  ctx: Record<string, any>
  meta: Partial<BinspectorMetaClass>
}

const defaultBinreadOptions = {
  ctx: {},
  meta: {},
}

function _binread<Target extends object> (content: BinaryReader, instance: Target, opt: BinreadOptions): Target {
  const ObjectDefinitionName = instance.constructor.name
  function getBinReader (field: PropertyType<Target>, instance: Target): (meta?: Partial<BinspectorMetaPropertiesComponent>, arg?: any) => any {
    if (isPrimitiveRelation(field)) {
      return () =>
        content.read(field.primitive)
    } else if (isRelation(field)) {
      return (meta: Partial<BinspectorMetaClass>, readerArgs?: any[]) => {
        const finalArgs = field.args !== undefined
          ? field.args(instance)
          : readerArgs !== undefined
            ? [readerArgs]
            : []

        if (!Array.isArray(finalArgs)) {
          throw new WrongArgumentReturnType(ObjectDefinitionName, String(field.propertyName))
        }

        const target = new field.relation(...finalArgs) as object
        return _binread(content, target, { ctx: opt.ctx, meta })
      }
    } else {
      throw new UnknownPropertyType(field)
    }
  }

  const ObjectDefinition = instance.constructor
  const ObjectMetadata = ObjectDefinition[Symbol.metadata] as NonNullable<DecoratorMetadataObject>

  if (ObjectMetadata === undefined) {
    throw new ReferringToEmptyClassError(ObjectDefinitionName)
  }

  const bitfields = Meta.getBitFields(ObjectMetadata)
  if (bitfields.length > 0) {
    return useBitField(bitfields, instance, content)
  }

  usePrePost(Meta.getClassPre(ObjectMetadata), instance, content, ExecutionScope.OnRead)

  // Meta used for debugging
  opt.meta.className = ObjectDefinitionName
  opt.meta.properties = []

  Meta.getFields<Target>(ObjectMetadata).forEach((field) => {
    usePrePost(Meta.getPre(ObjectMetadata, field.propertyName), instance, content, ExecutionScope.OnRead)

    const contexts = Meta.getContext(ObjectMetadata, field.propertyName)

    const ctxGetter = contexts.filter(x => x.func_type === CtxType.CtxGetter)
    if (ctxGetter.length) {
      instance[field.propertyName] = useContextGet(contexts, instance, opt.ctx)
      return
    }

    const finalRelationField = isUnknownProperty(field) ? useConditions(Meta.getConditions(ObjectMetadata, field.propertyName), instance) : field
    if (finalRelationField !== undefined) {
      const metaProp: Partial<BinspectorMetaProperty> = {
        propertyName: String(field.propertyName),
      }
      opt.meta.properties?.push(metaProp as BinspectorMetaProperty)

      const transformers = Meta.getTransformers(ObjectMetadata, field.propertyName)
      const propertyReader = (args?: any[]) => {
        const metaComponent: Partial<BinspectorMetaPropertiesComponent> = {}

        if (Array.isArray(metaProp.components)) {
          metaProp.components.push(metaComponent as BinspectorMetaPropertiesComponent)
        } else {
          metaProp.components = metaComponent as BinspectorMetaPropertiesComponent
        }

        metaComponent.startOffset = content.offset()
        const result = useTransformer(transformers, getBinReader(finalRelationField, instance)(metaComponent, args), instance, ExecutionScope.OnRead, TransformerExecLevel.PrimitiveTranformer)
        metaComponent.endOffset = content.offset()

        return result
      }
      const controllers = Meta.getControllers(ObjectMetadata, field.propertyName)
      if (controllers.length > 0) {
        metaProp.components = []
      }

      const value = (() => {
        try {
          return controllers.length > 0
            ? useController(controllers, instance, content, propertyReader)
            : propertyReader()
        } catch (err) {
          if (err instanceof EOFError) {
            throw new PartialReadingError({ ...instance, [String(field.propertyName)]: err.value }, err)
          } else if (err instanceof PartialReadingError) {
            throw new PartialReadingError({ ...instance, [String(field.propertyName)]: err.value }, err.err)
          }
          throw err
        }
      })()

      const transformedValue = useTransformer(transformers, value, instance)

      instance[field.propertyName] = transformedValue

      try {
        useValidators(Meta.getValidators(ObjectMetadata, field.propertyName), transformedValue, instance, content)
      } catch (err) {
        if (err instanceof ValidationTestFailed) {
          throw new PartialReadingError(instance, err)
        }
        throw err
      }

      useContextSet(contexts, transformedValue, instance, opt.ctx)
    }
    usePrePost(Meta.getPost(ObjectMetadata, field.propertyName), instance, content, ExecutionScope.OnRead)
  })

  usePrePost(Meta.getClassPost(ObjectMetadata), instance, content, ExecutionScope.OnRead)

  return instance
}

/**
 * `binread` transforms a Buffer into an object based on a binspector
 * definition
 *
 * @param {BinaryReader | ArrayBufferLike | ArrayBufferView} content Byte array view to be transformed into an object.
 * @param {InstantiableObject<Target> | Target} target Class definition or class instance containing an object definition.
 * @param {BinreadOptions} opt
 *
 * @returns {Target} The byte array content transformed into an object.
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
 *
 * @throws
 * Throws a "ValidationTestFailed" error when a property doesn't match the
 * validator.
 */
export function binread<Target extends object> (content: BinaryReader | ArrayBufferLike | ArrayBufferView, target: InstantiableObject<Target> | Target, opt: Partial<BinreadOptions> = defaultBinreadOptions): Target {
  const finalOpt = { ...defaultBinreadOptions, ...opt }

  const binreader = content instanceof BinaryReader
    ? content
    : new BinaryReader(content)

  const obj = (typeof target === 'function' && target.prototype && target.prototype.constructor)
    ? new target()
    : target as Target

  try {
    _binread(binreader, obj, finalOpt)
  } catch (err) {
    if (err instanceof PartialReadingError) {
      console.log(BinDump.dump(binreader, finalOpt.meta as BinspectorMetaClass, err.value))
      throw err.err
    }
    throw err
  }

  return obj
}
