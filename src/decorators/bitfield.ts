import { type MetaDescriptor } from './common'
//  , propertyTargetType
// import { relationExistOrThrow } from './primitive'
import { type DecoratorType, PrimitiveSymbol } from '../types'
import { type Cursor } from '../cursor'
import Meta from '../metadatas'

export const BitFieldSymbol = Symbol('bitfield')

/**
 * BitFieldOptions.
 */
export interface BitFieldOptions {
  /**
   * @type {boolean} Verify there is no other field in the current instance
   */
  primitiveCheck: boolean
}

export const BitFieldOptionsDefault = {
  primitiveCheck: true
}

export interface BitField<T> extends MetaDescriptor<T> {
  options: BitFieldOptions
  bitlength: number
}

export function bitFieldDecoratorFactory (name: string, len: number, opt: Partial<BitFieldOptions> = BitFieldOptionsDefault): DecoratorType {
  return function <T>(target: T, propertyKey: keyof T) {
    if (opt.primitiveCheck) {
      if (Meta.getFields(target).length > 0) {
        // TODO Create new Error
        throw new Error('Can\'t define bitfield inside an instance with relations')
      }
    }
    const options = {
      ...BitFieldOptionsDefault,
      ...opt
    }
    const bitfield: BitField<T> = {
      type: BitFieldSymbol,
      name,
      target,
      propertyName: propertyKey,
      options,
      bitlength: len
    }

    Meta.setBitField(target, bitfield)
  }
}

export function Bitfield (len: number): DecoratorType {
  return bitFieldDecoratorFactory('bitfield', len)
}

export function useBitField<T> (bitfields: Array<BitField<T>>, targetInstance: T, cursor: Cursor): T {
  const getPrimitive = (length: number): PrimitiveSymbol => {
    const remainToAlign = (8 - (length % 8)) % 8
    switch ((length + remainToAlign) / 8) {
      case 1:
        return PrimitiveSymbol.u8
      case 2:
        return PrimitiveSymbol.u16
      // TODO Support u24
      case 4:
        return PrimitiveSymbol.u32
      default:
        // TODO Throw
        return PrimitiveSymbol.u8
    }
  }

  const totalBitLength = bitfields.reduce((size, curr) => size + curr.bitlength, 0)
  const value = cursor.read(getPrimitive(totalBitLength)) as number
  bitfields.reduce((offset: number, bf: BitField<T>) => {
    // @ts-expect-error Weird thing with the keyof to fix
    targetInstance[bf.propertyName] = (value >> offset) & ((0x1 << bf.bitlength) - 1)
    return offset + bf.bitlength
  }, 0)

  return targetInstance
}
