import { type PropertyType } from './decorators/primitive'
import { type Condition, ConditionSymbol } from './decorators/condition'
import { type Controller, ControllerSymbol } from './decorators/controller'
import { type Transformer, TransformerSymbol } from './decorators/transformer'
import { type Validator, ValidatorSymbol } from './decorators/validator'
import { type BitField, BitFieldSymbol } from './decorators/bitfield'
import { type PrePost, PreFunctionSymbol, PostFunctionSymbol } from './decorators/prepost'
import { type DecoratorMetadataObject } from './types'

import './symbol-polyfill.ts'

function getMetadata<T> (
  metadata: DecoratorMetadataObject,
  propertyKey: string,
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
  propertyKey: string,
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

function getField (metadata: DecoratorMetadataObject, propertyKey: string): PropertyType | undefined {
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

function isFieldDecorated (metadata: DecoratorMetadataObject, propertyKey: string): boolean {
  return getField(metadata, propertyKey) !== undefined
}

function getPre (metadata: DecoratorMetadataObject, propertyKey: string): PrePost[] {
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

function getConditions (metadata: DecoratorMetadataObject, propertyKey: string): Condition[] {
  return getMetadata(
    metadata,
    propertyKey,
    ConditionSymbol
  )
}

function setCondition (
  metadata: DecoratorMetadataObject,
  propertyKey: string,
  condition: Condition
): Condition[] {
  return setMetadata(metadata, propertyKey, ConditionSymbol, condition)
}

function getController (metadata: DecoratorMetadataObject, propertyKey: string): Controller | undefined {
  // return Reflect.getMetadata(ControllerSymbol, target as object, propertyKey as string)
  if (typeof metadata[ControllerSymbol] === 'object') {
    return metadata[ControllerSymbol][propertyKey]
  }
  return undefined
}

function setController (
  metadata: DecoratorMetadataObject,
  propertyKey: string,
  controller: Controller
): Controller {
  if (typeof metadata[ControllerSymbol] !== 'object') {
    metadata[ControllerSymbol] = {}
  }
  metadata[ControllerSymbol][propertyKey] = controller
  return controller
}

function getTransformers (metadata: DecoratorMetadataObject, propertyKey: string): Transformer[] {
  return getMetadata(
    metadata,
    propertyKey,
    TransformerSymbol
  )
}

function setTransformer (
  metadata: DecoratorMetadataObject,
  propertyKey: string,
  transformer: Transformer
): Transformer[] {
  return setMetadata(metadata, propertyKey, TransformerSymbol, transformer)
}

function getValidators (metadata: DecoratorMetadataObject, propertyKey: string): Validator[] {
  return getMetadata(
    metadata,
    propertyKey,
    ValidatorSymbol
  )
}

function setValidator (
  metadata: DecoratorMetadataObject,
  propertyKey: string,
  validator: Validator
): Validator[] {
  return setMetadata(metadata, propertyKey, validator.type, validator)
}

function getPost (metadata: DecoratorMetadataObject, propertyKey: string): PrePost[] {
  return getMetadata(
    metadata,
    propertyKey,
    PostFunctionSymbol
  )
}

function setPost (
  metadata: DecoratorMetadataObject,
  propertyKey: string,
  post: PrePost
): PrePost[] {
  return setMetadata(metadata, propertyKey, PostFunctionSymbol, post)
}

function getBitField (metadata: DecoratorMetadataObject, propertyKey: string): BitField | undefined {
  const bitfields = getBitFields(metadata)
  return bitfields.find(x => x.propertyName === propertyKey)
}

function getBitFields (metadata: DecoratorMetadataObject): BitField[] {
  const bitfields = metadata[BitFieldSymbol]
  // const bitfields = Reflect.getMetadata(BitFieldSymbol, target as object)
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
  getController,
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
