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
  propertyName: string | symbol
}

/**
 * Chained accessor to get the value of `expr` for `obj`.
 *
 * @param {any} obj The object to access the value.
 * @param {string} expr The path of the property to access that can contains small arithmetic expressions.
 * @returns {any} The resolved property value.
 *
 * @throws {ReferenceError} if you attempt to access a non existing property.
 *
 */
export function recursiveGet (obj: any, expr: string): any {
  const _isOperation = (x: string): boolean => ['+', '-'].includes(x)

  const _get = (path: string): any => path.split('.').reduce((acc: any, key: string) => {
    if (acc.hasOwnProperty(key) === false) {
      throw new ReferenceError(`In 'recursiveGet' function from the expression '${expr}', can't access the property '${key}' available property are [${Object.getOwnPropertyNames(acc).toString()}].`)
    }
    return acc[key]
  }, obj)

  const elem = expr.split (' ').map(x => _isOperation(x)
    ? null // TODO Support operation
    : _get(x)
  )

  return elem[0]
}

export function commaSeparetedRecursiveGet (obj: any, args: string): any[] {
  const keys = args.split(',')
  return keys.map(key => recursiveGet(obj, key.trim()))
}
