/**
 * Commons decorators types and functions
 *
 * @module Common
 */
/**
 */
export interface MetaDescriptor {
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

export interface PropertyMetaDescriptor<This> extends MetaDescriptor {
  /**
   * Property name of the object the decorator is applied.
   */
  propertyName: keyof This
}

export interface ClassMetaDescriptor extends MetaDescriptor {
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

export function createPropertyMetaDescriptor<This> (type: symbol, name: string, metadata: DecoratorMetadataObject, propertyName: keyof This): PropertyMetaDescriptor<This> {
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

type RecursiveKeyOf<TObj extends object> = {
  [TKey in keyof TObj & (string | number)]:
  TObj[TKey] extends any[]
    ? `${TKey}`
    : TObj[TKey] extends object
      ? `${TKey}.${RecursiveKeyOf<TObj[TKey]>}`
      : `${TKey}`
}[keyof TObj & (string | number)]

type NumericalString = `${number}`

type RecursiveKeyWithOperations<TObj extends object, T extends string, U extends string = RecursiveKeyOf<TObj> | NumericalString> =
  T extends U
    ? T
    : T extends `${U} + ${infer R}`
      ? T extends `${infer F} + ${R}`
        ? `${F} + ${RecursiveKeyWithOperations<TObj, R, Exclude<U, F>>}`
        : never
      : T extends `${U} - ${infer R}`
        ? T extends `${infer F} - ${R}`
          ? `${F} - ${RecursiveKeyWithOperations<TObj, R, Exclude<U, F>>}`
          : never
        : U

type CommaSeparetedRecursiveKey<TObj extends object, T extends string, U extends string = RecursiveKeyOf<TObj>> =
  T extends U
    ? T
    : T extends `${U},${infer R}`
      ? T extends `${infer F},${R}`
        ? `${F},${CommaSeparetedRecursiveKey<TObj, R, Exclude<U, F>>}`
        : never
      : U

export type StringFormattedRecursiveKeyOf<T extends object, Args extends string> = Args extends RecursiveKeyWithOperations<T, Args> ? Args : RecursiveKeyWithOperations<T, Args>
export type StringFormattedCommaSepRecursiveKeyOf<T extends object, Args extends string> = Args extends CommaSeparetedRecursiveKey<T, Args> ? Args : CommaSeparetedRecursiveKey<T, Args>
export type NumberOrRecursiveKey<This extends object, Args extends string> = number | StringFormattedRecursiveKeyOf<This, Args>

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
export function recursiveGet<T extends object, Args extends string> (obj: T, expr: RecursiveKeyWithOperations<T, Args>): any {
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

export function commaSeparetedRecursiveGet<T extends object, Args extends string> (obj: T, args: CommaSeparetedRecursiveKey<T, Args>): any[] {
  const keys = args.split(',')
  return keys.map(key => recursiveGet(obj, key.trim() as RecursiveKeyWithOperations<T, typeof key>))
}
