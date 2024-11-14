/**
 * Commons decorators types and functions
 *
 * @module Common
 */
/**
 */
export interface _MetaDescriptor {
  /**
   * Unique ID
   */
  id: number
  /**
   * Type symbol
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
}

export interface MetaDescriptor<This> extends _MetaDescriptor {
  /**
   * Property name of the object the decorator is applied.
   */
  propertyName: keyof This
}

export interface ClassMetaDescriptor extends _MetaDescriptor {
  /**
   * Class name of the decorated class.
   */
  className: string
}

const uid = (function () {
  let id = 0
  return function () {
    return id++
  }
})()

export function createMetaDescriptor<This> (type: symbol, name: string, metadata: DecoratorMetadataObject, propertyName: keyof This): MetaDescriptor<This> {
  return {
    id: uid(),
    type,
    name,
    metadata,
    propertyName,
  }
}

export function createClassMetaDescriptor (type: symbol, name: string, metadata: DecoratorMetadataObject, className: string): ClassMetaDescriptor {
  return {
    id: uid(),
    type,
    name,
    metadata,
    className,
  }
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
    if (Object.prototype.hasOwnProperty.call(acc, key) === false) {
      throw new ReferenceError(`In 'recursiveGet' function from the expression '${expr}', can't access the property '${key}' available property are [${Object.getOwnPropertyNames(acc).toString()}].`)
    }
    return acc[key]
  }, obj)

  const elem = expr.split(' ')

  if (elem.length === 1) {
    return _get(elem[0])
  } else {
    return eval(elem.map((x) => {
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
