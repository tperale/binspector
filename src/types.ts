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

export type DecoratorMetadataObject = Record<PropertyKey, any>

/**
 * Context
 */
export interface Context {
  name: string,
  metadata: DecoratorMetadataObject,
}

/**
 * DecoratorType.
 */
export type DecoratorType = (target: any, context: Context) => void

/**
 * InstantiableObject.
 */
export type InstantiableObject = (new (...args: any[]) => any)

export type Primitive = InstantiableObject | PrimitiveSymbol
