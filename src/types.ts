export const EOF = Symbol('End Of File')

export enum PrimitiveSymbol {
  u8,
  u16,
  u32,
  u64,
  i8,
  i16,
  i32,
  i64,
  float32,
  float64,
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
export type Context<This, Value> =
  | ClassAccessorDecoratorContext<This, Value>
  | ClassGetterDecoratorContext<This, Value>
  | ClassFieldDecoratorContext<This, Value>

/**
 * DecoratorType.
 */
export type DecoratorType<This, Value> = (target: undefined, context: Context<This, Value>) => void

/**
 * InstantiableObject.
 */
export type InstantiableObject<Target> = (new (...args: any[]) => Target)

export type Primitive<Target> = InstantiableObject<Target> | PrimitiveSymbol
