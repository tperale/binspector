/**
 * Commons decorators types and functions
 *
 * @module Common
 */
/**
 */
export interface MetaDescriptor {
  /**
   * Validator name.
   */
  type: symbol

  /**
   * Name of the decorator.
   */
  name: string

  /**
   * Metadata object to which this decorator is applied.
   */
  metadata: DecoratorMetadataObject

  /**
   * Property name of the object the decorator is applied.
   */
  propertyName: string
}

export type ArgumentsAcessor = string

export function recursiveGet (obj: any, key: ArgumentsAcessor): any {
  // TODO Not verified properly right now
  return key.split('.').reduce((acc: any, key: string) => acc[key], obj)
}

export function commaSeparetedRecursiveGet (obj: any, args: ArgumentsAcessor): any[] {
  const keys = args.split(',')
  return keys.map(key => recursiveGet(obj, key.trim()))
}

/**
 * propertyTargetType.
 *
 * @param {T} target
 * @param {keyof T} propertyKey
 * @returns {Function}
 */
// export function propertyTargetType<T>(target: T, propertyKey: keyof T): Function {
//   return Reflect.getMetadata('design:type', target as object, propertyKey as string)
// }
