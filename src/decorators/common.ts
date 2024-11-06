/**
 * Commons decorators types and functions
 *
 * @module Common
 */
/**
 */
export interface MetaDescriptor<This> {
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
  propertyName: keyof This
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

  const elem = expr.split(' ')

  if (elem.length === 1) {
    return _get(elem[0])
  } else {
    return eval(elem.map(x => {
      if (_isOperation(x)) {
        return x
      } else if (Number.isFinite(+x)) {
        return x
      } else {
        const prop = _get(x)
        if (typeof prop === 'number') {
          return prop
        } else {
          throw new ReferenceError('Only number are supported in arithmetic expression')
        }
      }
    }).join(' '))
  }
}

export function commaSeparetedRecursiveGet (obj: any, args: string): any[] {
  const keys = args.split(',')
  return keys.map(key => recursiveGet(obj, key.trim()))
}
