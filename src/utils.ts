/**
 * @module reader
 */
import Meta from './metadatas'
import {
  isPrimitiveRelation,
} from './decorators/primitive'

/**
 * JSONify
 */
export function jsonify (instance: any): any {
  const result = {}

  const metadata = instance.constructor[Symbol.metadata] as DecoratorMetadataObject

  if (metadata !== undefined) {
    Meta.getBitFields(metadata).forEach((field) => {
      result[field.propertyName] = instance[field.propertyName]
    })

    Meta.getFields(metadata).forEach((field) => {
      const child = instance[field.propertyName]
      if (isPrimitiveRelation(field)) {
        result[field.propertyName] = child
      } else if (Array.isArray(child)) {
        result[field.propertyName] = child.map(jsonify)
      } else {
        result[field.propertyName] = jsonify(child)
      }
    })
  }

  return result
}
