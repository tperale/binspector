import { EOF, PrimitiveSymbol } from './types'

/**
 * Cursor
 */
export abstract class Cursor {
  abstract offset (): number
  abstract move (address: number): number
  abstract read (primitive: PrimitiveSymbol): string | number | bigint | typeof EOF

  forward (x: number): number {
    return this.move(this.offset() + x)
  }
}

export enum BinaryCursorEndianness {
  BigEndian = 0,
  LittleEndian = 1,
}

export abstract class BinaryCursor extends Cursor {
  index: number = 0
  length: number = 0
  endianness: BinaryCursorEndianness = BinaryCursorEndianness.BigEndian

  move (offset: number): number {
    this.index = offset
    if (this.index > this.length) {
      this.length = this.index
    }
    return offset
  }

  offset (): number {
    return this.index
  }

  getEndian (): BinaryCursorEndianness {
    return this.endianness
  }

  setEndian (endian: BinaryCursorEndianness): void {
    this.endianness = endian
  }

  _getPrimitiveSize (primType: PrimitiveSymbol): number {
    switch (primType) {
      case PrimitiveSymbol.char:
      case PrimitiveSymbol.u8:
      case PrimitiveSymbol.i8:
        return 1
      case PrimitiveSymbol.u16:
      case PrimitiveSymbol.i16:
        return 2
      case PrimitiveSymbol.u32:
      case PrimitiveSymbol.i32:
      case PrimitiveSymbol.float32:
        return 4
      case PrimitiveSymbol.u64:
      case PrimitiveSymbol.i64:
      case PrimitiveSymbol.float64:
        return 8
      default:
        return 0
    }
  }
}

export class BinaryReader extends BinaryCursor {
  data: DataView

  _readPrimitive (primType: PrimitiveSymbol): string | number | bigint {
    switch (primType) {
      case PrimitiveSymbol.u8:
        return this.data.getUint8(this.index)
      case PrimitiveSymbol.u16:
        return this.data.getUint16(this.index, this.endianness === BinaryCursorEndianness.LittleEndian)
      case PrimitiveSymbol.u32:
        return this.data.getUint32(this.index, this.endianness === BinaryCursorEndianness.LittleEndian)
      case PrimitiveSymbol.u64:
        return this.data.getBigUint64(this.index)
      case PrimitiveSymbol.i8:
        return this.data.getInt8(this.index)
      case PrimitiveSymbol.i16:
        return this.data.getInt16(this.index, this.endianness === BinaryCursorEndianness.LittleEndian)
      case PrimitiveSymbol.i32:
        return this.data.getInt32(this.index, this.endianness === BinaryCursorEndianness.LittleEndian)
      case PrimitiveSymbol.i64:
        return this.data.getBigInt64(this.index)
      case PrimitiveSymbol.float32:
        return this.data.getFloat32(this.index)
      case PrimitiveSymbol.float64:
        return this.data.getFloat64(this.index)
      case PrimitiveSymbol.char:
        return String.fromCharCode(this.data.getUint8(this.index))
      default:
        return 0
    }
  }

  read (primitive: PrimitiveSymbol): string | number | bigint | typeof EOF {
    try {
      const value = this._readPrimitive(primitive)
      this.forward(this._getPrimitiveSize(primitive))
      return value
    } catch {
      return EOF
    }
  }

  constructor (array: ArrayBuffer, endian: BinaryCursorEndianness = BinaryCursorEndianness.BigEndian) {
    super()
    this.data = new DataView(array)
    this.endianness = endian
    this.length = this.data.byteLength
  }
}
