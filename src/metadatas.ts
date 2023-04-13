import 'reflect-metadata'
import { type PropertyType } from './decorators/primitive'
import { type Validator, ValidatorSymbol } from './decorators/validator'
import { type Controller, ControllerSymbol } from './decorators/controller'
import { type Transformer, TransformerSymbol } from './decorators/transformer'
import { type Condition, ConditionSymbol } from './decorators/condition'

function getMetadata<T> (
  target: T,
  propertyKey: keyof T,
  metadataKey: symbol
): T[] {
  const meta = Reflect.getMetadata(metadataKey, target as object, propertyKey as string) as T[]
  return Array.isArray(meta) ? meta : []
}

function setMetadata<T> (
  target: T,
  propertyKey: keyof T,
  metadataKey: symbol,
  newValue: any
): T[] {
  const metas = getMetadata(target, propertyKey, metadataKey)
  const newMetas = [...metas, newValue]
  Reflect.defineMetadata(metadataKey, newMetas, target as object, propertyKey as string)
  return newMetas
}

function getValidators<T> (target: T, propertyKey: keyof T): Array<Validator<T>> {
  return getMetadata(
    target,
    propertyKey,
    ValidatorSymbol
  ) as Array<Validator<T>>
}

function setValidator<T> (
  target: T,
  propertyKey: keyof T,
  validator: Validator<T>
): Array<Validator<T>> {
  return setMetadata(target, propertyKey, validator.type, validator) as Array<Validator<T>>
}

function getConditions<T> (target: T, propertyKey: keyof T): Array<Condition<T, unknown>> {
  return getMetadata(
    target,
    propertyKey,
    ConditionSymbol
  ) as Array<Condition<T, unknown>>
}

function setCondition<T> (
  target: T,
  propertyKey: keyof T,
  condition: Condition<T, unknown>
): Array<Condition<T, unknown>> {
  return setMetadata(target, propertyKey, ConditionSymbol, condition) as Array<Condition<T, unknown>>
}

function getTransformers<T> (target: T, propertyKey: keyof T): Array<Transformer<T>> {
  return getMetadata(
    target,
    propertyKey,
    TransformerSymbol
  ) as Array<Transformer<T>>
}

function setTransformer<T> (
  target: T,
  propertyKey: keyof T,
  transformer: Transformer<T>
): Array<Transformer<T>> {
  return setMetadata(target, propertyKey, TransformerSymbol, transformer) as Array<Transformer<T>>
}

function getController<T> (target: T, propertyKey: keyof T): Controller<T> | undefined {
  return Reflect.getMetadata(ControllerSymbol, target as object, propertyKey as string)
}

function setController<T> (
  target: T,
  propertyKey: keyof T,
  controller: Controller<T>
): Controller<T> {
  Reflect.defineMetadata(ControllerSymbol, controller, target as object, propertyKey as string)
  return controller
}

const FieldSymbol = Symbol('field-symbol')

function getFields<T> (target: T): Array<PropertyType<T>> {
  const fields = Reflect.getMetadata(FieldSymbol, target as object)
  return Array.isArray(fields) ? fields : []
}

function getField<T> (target: T, propertyKey: keyof T): PropertyType<T> | undefined {
  const fields = getFields(target)
  return fields.find(x => x.propertyName === propertyKey)
}

function isFieldDecorated<T> (target: T, propertyKey: keyof T): boolean {
  return getField(target, propertyKey) !== undefined
}

function setField<T> (
  target: T,
  field: PropertyType<T>
): Array<PropertyType<T>> {
  const fields = [...getFields(target), field]
  Reflect.defineMetadata(FieldSymbol, fields, target as object)
  return fields
}

export default {
  getMetadata,
  setMetadata,
  getValidators,
  setValidator,
  getTransformers,
  setTransformer,
  getConditions,
  setCondition,
  getController,
  setController,
  isFieldDecorated,
  getField,
  getFields,
  setField
}
