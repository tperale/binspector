import { type PropertyType } from './decorators/primitive'
import { type Condition, ConditionSymbol } from './decorators/condition'
import { type Controller, ControllerSymbol } from './decorators/controller'
import { type Transformer, TransformerSymbol } from './decorators/transformer'
import { type Validator, ValidatorSymbol } from './decorators/validator'
import { type BitField, BitFieldSymbol } from './decorators/bitfield'
import { type PrePost, PreFunctionSymbol, PostFunctionSymbol } from './decorators/prepost'
import { type DecoratorMetadataObject } from './types'

import './symbol-polyfill'

function getMetadata<T> (
  metadata: DecoratorMetadataObject,
  propertyKey: string | symbol,
  metadataKey: symbol
): T[] {
  // TODO Can be optionnal since its set on the set metadata
  if (metadata[metadataKey] === undefined) {
    metadata[metadataKey] = {}
  }
  const meta = metadata[metadataKey][propertyKey]
  return Array.isArray(meta) ? meta : []
}

function setMetadata<T> (
  metadata: DecoratorMetadataObject,
  propertyKey: string | symbol,
  metadataKey: symbol,
  newValue: any,
  reverse = false
): T[] {
  const metas = getMetadata(metadata, propertyKey, metadataKey)
  const newMetas = reverse ? [newValue, ...metas] : [...metas, newValue]
  metadata[metadataKey][propertyKey] = newMetas
  return newMetas
}

const FieldSymbol = Symbol('field-symbol')

function getFields (metadata: DecoratorMetadataObject): PropertyType[] {
  const fields = metadata[FieldSymbol]
  return Array.isArray(fields) ? fields : []
}

function getField (metadata: DecoratorMetadataObject, propertyKey: string | symbol): PropertyType | undefined {
  const fields = getFields(metadata)
  return fields.find(x => x.propertyName === propertyKey)
}

function setField (
  metadata: DecoratorMetadataObject,
  field: PropertyType
): PropertyType[] {
  const fields = [...getFields(metadata), field]
  metadata[FieldSymbol] = fields
  return fields
}

function isFieldDecorated (metadata: DecoratorMetadataObject, propertyKey: string | symbol): boolean {
  return getField(metadata, propertyKey) !== undefined
}

function getPre<This> (metadata: DecoratorMetadataObject, propertyKey: string | symbol): Array<PrePost<This>> {
  return getMetadata(
    metadata,
    propertyKey,
    PreFunctionSymbol
  )
}

function setPre<This> (
  metadata: DecoratorMetadataObject,
  propertyKey: string,
  pre: PrePost<This>
): Array<PrePost<This>> {
  return setMetadata(metadata, propertyKey, PreFunctionSymbol, pre)
}

function getConditions<This> (metadata: DecoratorMetadataObject, propertyKey: string | symbol): Array<Condition<This>> {
  return getMetadata(
    metadata,
    propertyKey,
    ConditionSymbol
  )
}

function setCondition<This> (
  metadata: DecoratorMetadataObject,
  propertyKey: string | symbol,
  condition: Condition<This>
): Array<Condition<This>> {
  return setMetadata(metadata, propertyKey, ConditionSymbol, condition, true)
}

function getControllers (metadata: DecoratorMetadataObject, propertyKey: string | symbol): Controller[] {
  return getMetadata(
    metadata,
    propertyKey,
    ControllerSymbol
  )
}

function setController (
  metadata: DecoratorMetadataObject,
  propertyKey: string | symbol,
  controller: Controller
): Controller[] {
  return setMetadata(metadata, propertyKey, ControllerSymbol, controller)
}

function getTransformers<This> (metadata: DecoratorMetadataObject, propertyKey: string | symbol): Array<Transformer<This>> {
  return getMetadata(
    metadata,
    propertyKey,
    TransformerSymbol
  )
}

function setTransformer<This> (
  metadata: DecoratorMetadataObject,
  propertyKey: string | symbol,
  transformer: Transformer<This>
): Array<Transformer<This>> {
  return setMetadata(metadata, propertyKey, TransformerSymbol, transformer)
}

function getValidators<This, Value> (metadata: DecoratorMetadataObject, propertyKey: string | symbol): Array<Validator<This, Value>> {
  return getMetadata(
    metadata,
    propertyKey,
    ValidatorSymbol
  )
}

function setValidator<This, Value> (
  metadata: DecoratorMetadataObject,
  propertyKey: string | symbol,
  validator: Validator<This, Value>
): Array<Validator<This, Value>> {
  return setMetadata(metadata, propertyKey, validator.type, validator)
}

function getPost<This> (metadata: DecoratorMetadataObject, propertyKey: string | symbol): Array<PrePost<This>> {
  return getMetadata(
    metadata,
    propertyKey,
    PostFunctionSymbol
  )
}

function setPost<This> (
  metadata: DecoratorMetadataObject,
  propertyKey: string | symbol,
  post: PrePost<This>
): Array<PrePost<This>> {
  return setMetadata(metadata, propertyKey, PostFunctionSymbol, post)
}

function getBitField (metadata: DecoratorMetadataObject, propertyKey: string | symbol): BitField | undefined {
  const bitfields = getBitFields(metadata)
  return bitfields.find(x => x.propertyName === propertyKey)
}

function getBitFields (metadata: DecoratorMetadataObject): BitField[] {
  if (metadata[BitFieldSymbol] === undefined) {
    metadata[BitFieldSymbol] = []
  }
  const bitfields = metadata[BitFieldSymbol]
  return Array.isArray(bitfields) ? bitfields : []
}

function setBitField (
  metadata: DecoratorMetadataObject,
  bitfield: BitField
): BitField[] {
  const bitfields = [...getBitFields(metadata), bitfield]
  metadata[BitFieldSymbol] = bitfields
  return bitfields
}

export default {
  getMetadata,
  setMetadata,
  getField,
  getFields,
  setField,
  isFieldDecorated,
  getPre,
  setPre,
  getConditions,
  setCondition,
  getControllers,
  setController,
  getTransformers,
  setTransformer,
  getValidators,
  setValidator,
  getPost,
  setPost,
  getBitField,
  getBitFields,
  setBitField
}
