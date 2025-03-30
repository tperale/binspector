/**
 * The reader module
 *
 * @mermaid
 *
 * @module reader
 */
import { type Cursor } from './cursor.ts'
import { UnknownPropertyType, ReferringToEmptyClassError, WrongArgumentReturnType } from './error.ts'
import Meta from './metadatas.ts'
import {
  isRelation,
  isPrimitiveRelation,
  isUnknownProperty,
  type PropertyType,
} from './decorators/primitive.ts'
import { ExecutionScope, type InstantiableObject } from './types.ts'
import { useController, type ControllerReader } from './decorators/controller.ts'
import { TransformerExecLevel, useTransformer } from './decorators/transformer.ts'
import { useValidators } from './decorators/validator.ts'
import { useConditions } from './decorators/condition.ts'
import { usePrePost } from './decorators/prepost.ts'
import { useBitField } from './decorators/bitfield.ts'
import { useContextGet, useContextSet, CtxType } from './decorators/context.ts'
import { type BinspectorMetaClass, type BinspectorMetaPropertiesComponent, type BinspectorMetaProperty } from './bindump.ts'

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
export function binread<Target> (content: Cursor, ObjectDefinition: InstantiableObject<Target>, ctx = {}, meta: Partial<BinspectorMetaClass> = {}, ...args: any[]): Target {
  const ObjectDefinitionName = ObjectDefinition.name
  function getBinReader (field: PropertyType<Target>, instance: Target): (meta?: Partial<BinspectorMetaPropertiesComponent>, arg?: any) => any {
    if (isPrimitiveRelation(field)) {
      return () =>
        content.read(field.primitive)
    } else if (isRelation(field)) {
      // TODO No need to do the check inside the function.
      return (meta: Partial<BinspectorMetaClass>, readerArgs?: any[]) => {
        const finalArgs = field.args !== undefined
          ? field.args(instance)
          : readerArgs !== undefined
            ? [readerArgs]
            : []

        if (!Array.isArray(finalArgs)) {
          throw new WrongArgumentReturnType(ObjectDefinitionName, String(field.propertyName))
        }

        return binread(content, field.relation, ctx, meta, ...finalArgs)
      }
    } else {
      throw new UnknownPropertyType(field)
    }
  }

  const instance: Target = new ObjectDefinition(...args)

  const metadata = ObjectDefinition[Symbol.metadata] as NonNullable<DecoratorMetadataObject>

  if (metadata === undefined) {
    throw new ReferringToEmptyClassError(ObjectDefinitionName)
  }

  const bitfields = Meta.getBitFields(metadata)
  if (bitfields.length > 0) {
    return useBitField(bitfields, instance, content)
  }

  usePrePost(Meta.getClassPre(metadata), instance, content, ExecutionScope.OnRead)

  // Meta used for debugging
  meta.className = ObjectDefinitionName
  meta.properties = []

  Meta.getFields<Target>(metadata).forEach((field) => {
    usePrePost(Meta.getPre(metadata, field.propertyName), instance, content, ExecutionScope.OnRead)

    const metaCtx = Meta.getContext(field.metadata, field.propertyName)

    const ctxGetter = metaCtx.filter(x => x.func_type === CtxType.CtxGetter)
    if (ctxGetter.length) {
      instance[field.propertyName] = useContextGet(metaCtx, instance, ctx)
      return
    }

    const finalRelationField = isUnknownProperty(field) ? useConditions(Meta.getConditions(field.metadata, field.propertyName), instance) : field
    if (finalRelationField !== undefined) {
      const metaProp: Partial<BinspectorMetaProperty> = {
        propertyName: String(field.propertyName),
      }
      meta.properties?.push(metaProp as BinspectorMetaProperty)

      const transformers = Meta.getTransformers(metadata, field.propertyName)
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
      const controllers = Meta.getControllers(metadata, field.propertyName)
      if (controllers.length > 0) {
        metaProp.components = []
      }
      const value = controllers.length > 0
        ? useController(controllers, instance, content, propertyReader)
        : propertyReader()

      const transformedValue = useTransformer(transformers, value, instance)

      useValidators(Meta.getValidators(metadata, field.propertyName), transformedValue, instance, content)

      instance[field.propertyName] = transformedValue
      useContextSet(metaCtx, transformedValue, instance, ctx)
    }
    usePrePost(Meta.getPost(metadata, field.propertyName), instance, content, ExecutionScope.OnRead)
  })

  usePrePost(Meta.getClassPost(metadata), instance, content, ExecutionScope.OnRead)

  return instance
}
