/**
 * Commons decorators types and functions
 *
 * @module Common
 */
/**
 */
export interface MetaDescriptor<T> {
  /**
   * Validator name.
   */
  type: symbol

  /**
   * Name of the decorator.
   */
  name: string

  /**
   * Instance object to which this decorator is applied.
   */
  target: T

  /**
   * Property name of the object the decorator is applied.
   */
  propertyName: keyof T
}

export function recursiveGet (obj: any, key: string): any {
  // TODO Not verified properly right now
  return key.split('.').reduce((acc, key) => acc[key], obj)
}

/**
 * propertyTargetType.
 *
 * @param {T} target
 * @param {keyof T} propertyKey
 * @returns {Function}
 */
export function propertyTargetType<T>(target: T, propertyKey: keyof T): Function {
  return Reflect.getMetadata('design:type', target as object, propertyKey as string)
}
