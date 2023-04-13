export const EOF = Symbol('End Of File')

export enum PrimitiveSymbol {
  u8,
  u16,
  u32,
  u64,
  u128,
  i8,
  i16,
  i32,
  i64,
  i128,
  char,
}

/**
 * isPrimitiveSymbol.
 *
 * @param {any} x
 * @returns {x is PrimitiveSymbol}
 */
export function isPrimitiveSymbol (x: any): x is PrimitiveSymbol {
  return Object.prototype.hasOwnProperty.call(PrimitiveSymbol, x)
}

/**
 * DecoratorType.
 */
export type DecoratorType = (target: any, propertyKey: string) => void

/**
 * InstantiableObject.
 */
export type InstantiableObject<T> = (new (...args: any[]) => T)

export type Primitive<T> = InstantiableObject<T> | PrimitiveSymbol
