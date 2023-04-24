/**
 * Module definition of {@link BitField} decorators.
 *
 * {@link BitField} type decorators define bitfields type object.
 * Use this type of decorator when you need to define a data structure
 * made from group of bit within a byte.
 *
 * @module Bitfield
 */
import { type MetaDescriptor } from './common'
import { type DecoratorType, PrimitiveSymbol } from '../types'
import { type Cursor } from '../cursor'
import Meta from '../metadatas'

export const BitFieldSymbol = Symbol('bitfield')

/**
 * BitFieldOptions.
 */
export interface BitFieldOptions {
  /**
   * @type {boolean} Verify there is no relation defined in the target object.
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

/**
 * bitFieldDecoratorFactory is a function to help with the creation of {@link BitField} type decorators.
 *
 * @param {string} name
 * @param {number} len
 * @param {Partial} opt
 * @returns {DecoratorType}
 *
 * @category Advanced Use
 */
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

/**
 * `@Bitfield` decorator define the bit-length of the property it decorates.
 *
 * @example
 *
 * ```typescript
 * class BitFieldObject {
 *   @Bitfield(2)
 *   field_1: number
 *
 *   @Bitfield(4)
 *   field_2: number
 *
 *   @Bitfield(2)
 *   field_3: number
 * }
 *
 * class Header {
 *   @Relation(BitfieldObject)
 *   bitfield: BitFieldObject
 * }
 * ```
 *
 * @remark
 *
 * This decorator must be only used inside class definition that only includes
 * bitfield decorators.
 *
 * @param {number} len The bitlength of the property it decorate.
 * @returns {DecoratorType}
 *
 * @category Decorators
 */
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
