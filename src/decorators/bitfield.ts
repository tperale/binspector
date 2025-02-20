/**
 * Module definition of {@link BitField} decorators.
 *
 * {@link BitField} type decorators define bitfields data-structure.
 *
 * Bitfields are classes where properties have a fixed size in bits.
 *
 * In a bitfield class definition the topmost `@Bitfield` decorated
 * property match the most significant bit being encoded/decoded.
 *
 * @example
 *
 * ```typescript
 * class StatusRegister {
 *   @Bitfield(1)
 *   carry_flag: number
 *
 *   @Bitfield(1)
 *   zero_flag: number
 *
 *   @Bitfield(1)
 *   interrupt_disable_flag: number
 *
 *   @Bitfield(1)
 *   decimal_flag: number
 *
 *   @Bitfield(1)
 *   break_flag: number
 *
 *   @Bitfield(1)
 *   _: number
 *
 *   @Bitfield(1)
 *   overflow_flag: number
 * }
 *
 * class Header {
 *   @Relation(StatusRegister)
 *   bitfield: StatusRegister
 * }
 * ```
 *
 * @remarks
 *
 * {@link BitField} type decorator can't be used inside class
 * definition that also contains {@link Primitive} definition.
 * To create a {@link BitField} object create a class solely
 * made for the bitfield definition as in the example.
 *
 * @see {@link Bitfield}
 *
 * @module Bitfield
 */
import { type PropertyMetaDescriptor, createPropertyMetaDescriptor } from './common'
import { type Cursor, type BinaryWriter } from '../cursor'
import { WrongBitfieldClassImplementation } from '../error'
import { type DecoratorType, PrimitiveSymbol, type Context } from '../types'
import Meta from '../metadatas'

export const BitFieldSymbol = Symbol('bitfield')

/**
 * BitFieldOptions.
 *
 * @category Options
 */
export interface BitFieldOptions {
  /**
   * Verify there is no relation defined in the target object.
   */
  primitiveCheck: boolean
}

/**
 * @category Options
 */
export const BitFieldOptionsDefault = {
  primitiveCheck: true,
}

export interface BitField<This> extends PropertyMetaDescriptor<This> {
  options: BitFieldOptions
  bitlength: number
}

/**
 * `bitFieldDecoratorFactory` is a function to help with the creation of {@link BitField} type decorators.
 *
 * @typeParam This The type of the bitfield.
 * @typeParam Value The type of the property decorated or the target type the bitfield resolve to.
 *
 * @param {string} name Decorator name
 * @param {number} len Size of the bitfield property
 * @param {Partial} opt Partial definition of the BitFieldOptions
 * @returns {DecoratorType}
 *
 * @category Advanced Use
 */
export function bitFieldDecoratorFactory<This, Value> (name: string, len: number, opt: Partial<BitFieldOptions> = BitFieldOptionsDefault): DecoratorType<This, Value> {
  const options = { ...BitFieldOptionsDefault, ...opt }

  return function (_: undefined, context: Context<This, Value>) {
    if (options.primitiveCheck) {
      if (Meta.getFields(context.metadata).length > 0) {
        throw new WrongBitfieldClassImplementation(String(context.name))
      }
    }

    const bitfield: BitField<This> = {
      ...createPropertyMetaDescriptor(BitFieldSymbol, name, context.metadata, context.name as keyof This),
      options,
      bitlength: len,
    }

    Meta.setBitField(context.metadata, bitfield)
  }
}

/**
 * `@Bitfield` decorator define the bit-length of the property it decorates.
 *
 * The sum of the bit-length declared by the properties decorated with a
 * `@Bitfield` can exceed 8-bits and may not be aligned byte aligned.
 *
 * @example
 *
 * The top-most property of a class decorated with a `@Bitfield` decorator will
 * contain the most significant bits (MSB) of the value decoded/encoded.
 * In the example 'field_1' contains the two most significant bits.
 *
 * ```typescript
 * class BitFieldObject {
 *   @Bitfield(2)
 *   field_1: number
 *
 *   @Bitfield(4)
 *   field_2: number
 *
 *   @Bitfield(1)
 *   field_3: number
 * }
 *
 * class Header {
 *   @Relation(BitfieldObject)
 *   bitfield: BitFieldObject
 * }
 * ```
 *
 * @remarks
 *
 * The sum of the bit-length declared by the properties decorated with a
 * `@Bitfield` would result in a 8, 16 or 32bits integer being read. Right now
 * 24 bits bitfields or longer than 32bits are not supported.
 *
 * @throws {WrongBitfieldClassImplementation} If a {@link Primitive} (`@Relation`) has already been defined inside the bitfield class
 *
 * @typeParam This The type of the bitfield.
 * @typeParam Value The type of the property decorated or the target type the bitfield resolve to.
 *
 * @param {number} len The bitlength of the property it decorate.
 * @returns {DecoratorType}
 *
 * @category Decorators
 */
export function Bitfield<This, Value> (len: number, opt?: Partial<BitFieldOptions>): DecoratorType<This, Value> {
  return bitFieldDecoratorFactory('bitfield', len, opt)
}

/**
 * Read a bitfield definition from a {@link Cursor}. This function is used
 * in the context of the {@link binread} function.
 *
 * @typeParam This The type of the bitfield.
 *
 * @param {Array} bitfields An array of {@link BitField} definition
 * @param {This} targetInstance The object related to the `bitfields` argument where the bitfield content will be written to.
 * @param {Cursor} cursor {@link Cursor} to read the content of the bitfield from.
 *
 * @category Advanced Use
 */
export function useBitField<This> (bitfields: Array<BitField<This>>, targetInstance: This, cursor: Cursor): This {
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
  bitfields.reduce((offset: number, bf: BitField<This>) => {
    const OFFSET = offset - bf.bitlength
    const MASK = ((1 << bf.bitlength) - 1)
    // @ts-expect-error Mandatory to set number
    targetInstance[bf.propertyName] = (value >> OFFSET) & MASK
    return OFFSET
  }, (Math.ceil(totalBitLength / 8) * 8))

  return targetInstance
}

/**
 * Write a bitfield definition to a {@link BinaryWriter}. This function is used
 * in the context of the {@link binwrite}.
 *
 * @typeParam This The type of the bitfield.
 *
 * @param {Array} bitfields An array of {@link BitField} definition
 * @param {This} targetInstance The object related to the `bitfields` argument with the bitfield content
 * @param {BinaryWriter} cursor Cursor the write the content of the bitfield to.
 *
 * @category Advanced Use
 */
export function writeBitField<This> (bitfields: Array<BitField<This>>, targetInstance: This, cursor: BinaryWriter): void {
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
  const primitive = getPrimitive(totalBitLength)
  let result = 0 // (1 << totalBitLength) - 1
  bitfields.reduce((offset: number, bf: BitField<This>) => {
    const OFFSET = offset - bf.bitlength
    const MASK = ((1 << bf.bitlength) - 1)
    const value = Number(targetInstance[bf.propertyName])

    result |= ((MASK & value) << OFFSET)
    return OFFSET
  }, (Math.ceil(totalBitLength / 8) * 8))

  cursor.write(primitive, result)
}
