import { type PropertyType } from './decorators/primitive'
import { type Condition, ConditionSymbol } from './decorators/condition'
import { type Controller, ControllerSymbol } from './decorators/controller'
import { type Transformer, TransformerSymbol } from './decorators/transformer'
import { type Validator, ValidatorSymbol } from './decorators/validator'
import { type BitField, BitFieldSymbol } from './decorators/bitfield'
import { type Ctx, CtxSymbol } from './decorators/context'
import { type PrePost, PreFunctionSymbol, PostFunctionSymbol, PreClassFunctionSymbol, PostClassFunctionSymbol, PrePostSymbols, PrePostClass } from './decorators/prepost'
import { type DecoratorMetadataObject } from './types'

import './symbol-polyfill'

type MetadataSymbol = typeof BitFieldSymbol
  | typeof PreClassFunctionSymbol
  | typeof PreFunctionSymbol
  | typeof ConditionSymbol
  | typeof ControllerSymbol
  | typeof TransformerSymbol
  | typeof ValidatorSymbol
  | typeof CtxSymbol
  | typeof PostFunctionSymbol
  | typeof PostClassFunctionSymbol

function getClassMetadata<T> (
  metadata: DecoratorMetadataObject,
  metadataKey: MetadataSymbol,
): T[] {
  if (metadata[metadataKey] === undefined) {
    metadata[metadataKey] = []
  }
  const meta = metadata[metadataKey]
  return Array.isArray(meta) ? meta : []
}

function removeClassMetadata<T> (
  metadata: DecoratorMetadataObject,
  metadataKey: MetadataSymbol,
  rmValue: any,
): T[] {
  const metas = getClassMetadata(metadata, metadataKey)
  const newMetas = metas.filter((x: any) => x.id !== rmValue.id)
  metadata[metadataKey] = newMetas
  return metadata[metadataKey]
}

function setClassMetadata<T> (
  metadata: DecoratorMetadataObject,
  metadataKey: MetadataSymbol,
  newValue: any,
  reverse = false,
): T[] {
  const metas = getClassMetadata(metadata, metadataKey)
  const newMetas = reverse ? [newValue, ...metas] : [...metas, newValue]
  metadata[metadataKey] = newMetas
  return newMetas
}

function getMetadata<T> (
  metadata: DecoratorMetadataObject,
  propertyKey: string | number | symbol,
  metadataKey: MetadataSymbol,
  reverse = false,
): T[] {
  // TODO Can be optionnal since its set on the set metadata
  if (metadata[metadataKey] === undefined) {
    metadata[metadataKey] = {}
  }
  const meta = (metadata[metadataKey][propertyKey] || []).slice()
  return reverse ? meta.reverse() : meta
}

function removeMetadata<T> (
  metadata: DecoratorMetadataObject,
  propertyKey: string | symbol | number,
  metadataKey: MetadataSymbol,
  rmValue: any,
): T[] {
  const metas = getMetadata(metadata, propertyKey, metadataKey)
  const newMetas = metas.filter((x: any) => x.id !== rmValue.id)
  metadata[metadataKey][propertyKey] = newMetas
  return metadata[metadataKey][propertyKey]
}

function setMetadata<T> (
  metadata: DecoratorMetadataObject,
  propertyKey: string | symbol | number,
  metadataKey: MetadataSymbol,
  newValue: any,
  reverse = false,
): T[] {
  const metas = getMetadata(metadata, propertyKey, metadataKey)
  const newMetas = reverse ? [newValue, ...metas] : [...metas, newValue]
  metadata[metadataKey][propertyKey] = newMetas
  return newMetas
}

const FieldSymbol = Symbol('field-symbol')

function getFields<This> (metadata: DecoratorMetadataObject): Array<PropertyType<This>> {
  const fields = metadata[FieldSymbol]
  return Array.isArray(fields) ? fields : []
}

function getField<This> (metadata: DecoratorMetadataObject, propertyKey: keyof This): PropertyType<This> | undefined {
  const fields = getFields(metadata)
  return fields.find(x => x.propertyName === propertyKey)
}

function setField<This> (
  metadata: DecoratorMetadataObject,
  field: PropertyType<This>,
): Array<PropertyType<This>> {
  const fields = [...getFields(metadata), field]
  metadata[FieldSymbol] = fields
  return fields
}

function removeField<This> (
  metadata: DecoratorMetadataObject,
  propertyKey: keyof This
): Array<PropertyType<This>> {
  const fields = getFields(metadata).filter(x => x.propertyName !== propertyKey)
  metadata[FieldSymbol] = fields
  return fields
}

function isFieldDecorated<This> (metadata: DecoratorMetadataObject, propertyKey: keyof This): boolean {
  return getField(metadata, propertyKey) !== undefined
}

function getClassPre<This> (metadata: DecoratorMetadataObject): Array<PrePost<This>> {
  return getClassMetadata(
    metadata,
    PreClassFunctionSymbol,
  )
}

function getPre<This> (metadata: DecoratorMetadataObject, propertyKey: keyof This): Array<PrePost<This>> {
  return getMetadata(
    metadata,
    propertyKey,
    PreFunctionSymbol,
  )
}

function getConditions<This> (metadata: DecoratorMetadataObject, propertyKey: keyof This): Array<Condition<This>> {
  return getMetadata(
    metadata,
    propertyKey,
    ConditionSymbol,
  )
}

function setCondition<This> (
  metadata: DecoratorMetadataObject,
  propertyKey: keyof This,
  condition: Condition<This>,
): Array<Condition<This>> {
  return setMetadata(metadata, propertyKey, ConditionSymbol, condition, true)
}

function getControllers<This> (metadata: DecoratorMetadataObject, propertyKey: keyof This): Array<Controller<This>> {
  return getMetadata(
    metadata,
    propertyKey,
    ControllerSymbol,
  )
}

function setController<This> (
  metadata: DecoratorMetadataObject,
  propertyKey: keyof This,
  controller: Controller<This>,
): Array<Controller<This>> {
  return setMetadata(metadata, propertyKey, ControllerSymbol, controller)
}

function getTransformers<This> (metadata: DecoratorMetadataObject, propertyKey: keyof This, reverse = false): Array<Transformer<This>> {
  return getMetadata(
    metadata,
    propertyKey,
    TransformerSymbol,
    reverse
  )
}

function setTransformer<This> (
  metadata: DecoratorMetadataObject,
  propertyKey: string | symbol,
  transformer: Transformer<This>,
): Array<Transformer<This>> {
  return setMetadata(metadata, propertyKey, TransformerSymbol, transformer)
}

function getValidators<This, Value> (metadata: DecoratorMetadataObject, propertyKey: keyof This): Array<Validator<This, Value>> {
  return getMetadata(
    metadata,
    propertyKey,
    ValidatorSymbol,
  )
}

function setValidator<This, Value> (
  metadata: DecoratorMetadataObject,
  propertyKey: string | symbol,
  validator: Validator<This, Value>,
): Array<Validator<This, Value>> {
  return setMetadata(metadata, propertyKey, ValidatorSymbol, validator)
}

function getPost<This> (metadata: DecoratorMetadataObject, propertyKey: keyof This): Array<PrePost<This>> {
  return getMetadata(
    metadata,
    propertyKey,
    PostFunctionSymbol,
  )
}

function getClassPost<This> (metadata: DecoratorMetadataObject): Array<PrePostClass<This>> {
  return getClassMetadata(
    metadata,
    PostClassFunctionSymbol,
  )
}

function setPrePost<This> (
  metadata: DecoratorMetadataObject,
  sym: PrePostSymbols,
  prepost: PrePost<This> | PrePostClass<This>,
  propertyKey?: keyof This,
): Array<PrePost<This>> {
  if ((sym === PreClassFunctionSymbol) || (sym === PostClassFunctionSymbol)) {
    return setClassMetadata(metadata, sym, prepost)
  } else if (((sym === PreFunctionSymbol) || (sym === PostFunctionSymbol)) && (propertyKey !== undefined)) {
    return setMetadata(metadata, propertyKey, sym, prepost)
  } else {
    throw new Error()
  }
}

function removePrePost<This> (
  metadata: DecoratorMetadataObject,
  sym: PrePostSymbols,
  prepost: PrePost<This> | PrePostClass<This>,
  propertyKey?: keyof This,
): Array<PrePost<This>> {
  if ((sym === PreClassFunctionSymbol) || (sym === PostClassFunctionSymbol)) {
    return removeClassMetadata(metadata, sym, prepost)
  } else if (((sym === PreFunctionSymbol) || (sym === PostFunctionSymbol)) && (propertyKey !== undefined)) {
    return removeMetadata(metadata, propertyKey, sym, prepost)
  } else {
    throw new Error()
  }
}

function getBitField<This> (metadata: DecoratorMetadataObject, propertyKey: keyof This): BitField<This> | undefined {
  const bitfields = getBitFields(metadata)
  return bitfields.find(x => x.propertyName === propertyKey)
}

function getBitFields<This> (metadata: DecoratorMetadataObject): Array<BitField<This>> {
  if (metadata[BitFieldSymbol] === undefined) {
    metadata[BitFieldSymbol] = []
  }
  const bitfields = metadata[BitFieldSymbol]
  return Array.isArray(bitfields) ? bitfields : []
}

function setBitField<This> (
  metadata: DecoratorMetadataObject,
  bitfield: BitField<This>,
): Array<BitField<This>> {
  const bitfields = [...getBitFields(metadata), bitfield]
  metadata[BitFieldSymbol] = bitfields
  return bitfields
}

function getContext<This, Value> (metadata: DecoratorMetadataObject, propertyKey: keyof This): Array<Ctx<This, Value>> {
  return getMetadata(
    metadata,
    propertyKey,
    CtxSymbol,
  )
}

function setContext<This, Value> (
  metadata: DecoratorMetadataObject,
  propertyKey: keyof This,
  ctx: Ctx<This, Value>,
): Array<Ctx<This, Value>> {
  return setMetadata(metadata, propertyKey, CtxSymbol, ctx)
}

export default {
  getMetadata,
  setMetadata,
  getField,
  getFields,
  setField,
  removeField,
  isFieldDecorated,
  getClassPre,
  getPre,
  getConditions,
  setCondition,
  getControllers,
  setController,
  getTransformers,
  setTransformer,
  getValidators,
  setValidator,
  getPost,
  getClassPost,
  setPrePost,
  removePrePost,
  getBitField,
  getBitFields,
  setBitField,
  getContext,
  setContext,
}
