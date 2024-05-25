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
  newValue: any
): T[] {
  const metas = getMetadata(metadata, propertyKey, metadataKey)
  const newMetas = [...metas, newValue]
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

function getPre (metadata: DecoratorMetadataObject, propertyKey: string | symbol): PrePost[] {
  return getMetadata(
    metadata,
    propertyKey,
    PreFunctionSymbol
  )
}

function setPre (
  metadata: DecoratorMetadataObject,
  propertyKey: string,
  pre: PrePost
): PrePost[] {
  return setMetadata(metadata, propertyKey, PreFunctionSymbol, pre)
}

function getConditions (metadata: DecoratorMetadataObject, propertyKey: string | symbol): Condition[] {
  return getMetadata(
    metadata,
    propertyKey,
    ConditionSymbol
  )
}

function setCondition (
  metadata: DecoratorMetadataObject,
  propertyKey: string | symbol,
  condition: Condition
): Condition[] {
  return setMetadata(metadata, propertyKey, ConditionSymbol, condition)
}

function getControllers (metadata: DecoratorMetadataObject, propertyKey: string | symbol): Controller[] {
  // if (typeof metadata[ControllerSymbol] === 'object') {
  //   return metadata[ControllerSymbol][propertyKey]
  // }
  // return undefined
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
  // if (typeof metadata[ControllerSymbol] !== 'object') {
  //   metadata[ControllerSymbol] = {}
  // }
  // metadata[ControllerSymbol][propertyKey] = controller
  // return controller
  return setMetadata(metadata, propertyKey, ControllerSymbol, controller)
}

function getTransformers (metadata: DecoratorMetadataObject, propertyKey: string | symbol): Transformer[] {
  return getMetadata(
    metadata,
    propertyKey,
    TransformerSymbol
  )
}

function setTransformer (
  metadata: DecoratorMetadataObject,
  propertyKey: string | symbol,
  transformer: Transformer
): Transformer[] {
  return setMetadata(metadata, propertyKey, TransformerSymbol, transformer)
}

function getValidators (metadata: DecoratorMetadataObject, propertyKey: string | symbol): Validator[] {
  return getMetadata(
    metadata,
    propertyKey,
    ValidatorSymbol
  )
}

function setValidator (
  metadata: DecoratorMetadataObject,
  propertyKey: string | symbol,
  validator: Validator
): Validator[] {
  return setMetadata(metadata, propertyKey, validator.type, validator)
}

function getPost (metadata: DecoratorMetadataObject, propertyKey: string | symbol): PrePost[] {
  return getMetadata(
    metadata,
    propertyKey,
    PostFunctionSymbol
  )
}

function setPost (
  metadata: DecoratorMetadataObject,
  propertyKey: string | symbol,
  post: PrePost
): PrePost[] {
  return setMetadata(metadata, propertyKey, PostFunctionSymbol, post)
}

function getBitField (metadata: DecoratorMetadataObject, propertyKey: string | symbol): BitField | undefined {
  const bitfields = getBitFields(metadata)
  return bitfields.find(x => x.propertyName === propertyKey)
}

function getBitFields (metadata: DecoratorMetadataObject): BitField[] {
  const bitfields = metadata[BitFieldSymbol]
  return Array.isArray(bitfields) ? bitfields : []
}

function setBitField (
  metadata: DecoratorMetadataObject,
  bitfield: BitField
): BitField[] {
  const bitfields = [...getBitFields(metadata), bitfield]
  // Reflect.defineMetadata(BitFieldSymbol, bitfields, target as object)
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
