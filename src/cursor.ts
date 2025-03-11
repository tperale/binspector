import { EOF, PrimitiveSymbol } from './types'

/**
 * Cursor
 */
export abstract class Cursor {
  abstract offset (): number
  abstract move (address: number): number
  abstract read (primitive: PrimitiveSymbol): number | bigint | typeof EOF
  abstract write (primitive: PrimitiveSymbol, value: number | bigint): void

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

  _readPrimitive (primType: PrimitiveSymbol): number | bigint {
    const endian = this.endianness === BinaryCursorEndianness.LittleEndian
    switch (primType) {
      case PrimitiveSymbol.u8:
        return this.data.getUint8(this.index)
      case PrimitiveSymbol.u16:
        return this.data.getUint16(this.index, endian)
      case PrimitiveSymbol.u32:
        return this.data.getUint32(this.index, endian)
      case PrimitiveSymbol.u64:
        return this.data.getBigUint64(this.index, endian)
      case PrimitiveSymbol.i8:
        return this.data.getInt8(this.index)
      case PrimitiveSymbol.i16:
        return this.data.getInt16(this.index, endian)
      case PrimitiveSymbol.i32:
        return this.data.getInt32(this.index, endian)
      case PrimitiveSymbol.i64:
        return this.data.getBigInt64(this.index, endian)
      case PrimitiveSymbol.float32:
        return this.data.getFloat32(this.index, endian)
      case PrimitiveSymbol.float64:
        return this.data.getFloat64(this.index, endian)
      default:
        return 0
    }
  }

  write (_: PrimitiveSymbol, _2: number | bigint): void {
    throw new Error('Shouldn\'t call "write" method on a BinaryReader object')
  }

  read (primitive: PrimitiveSymbol): number | bigint | typeof EOF {
    try {
      const value = this._readPrimitive(primitive)
      this.forward(this._getPrimitiveSize(primitive))
      return value
    } catch {
      return EOF
    }
  }

  constructor (array: Uint8Array | ArrayBufferLike, endian: BinaryCursorEndianness = BinaryCursorEndianness.BigEndian) {
    super()
    this.data = ArrayBuffer.isView(array)
      ? new DataView(array.buffer, array.byteOffset, array.byteLength)
      : new DataView(array)
    this.endianness = endian
    this.length = this.data.byteLength
  }
}

export class BinaryWriter extends BinaryCursor {
  data: Array<[(number | bigint), PrimitiveSymbol, number, BinaryCursorEndianness]> = []

  write (primitive: PrimitiveSymbol, value: number | bigint): void {
    const size = this._getPrimitiveSize(primitive)
    const index = this.offset()
    const endian = this.getEndian()

    this.data.push([value, primitive, index, endian])

    this.forward(size)
  }

  read (_: PrimitiveSymbol): number | bigint | typeof EOF {
    throw new Error('Shouldn\'t call "read" method on a BinaryWriter object')
  }

  buffer (): ArrayBufferLike {
    const buf = new DataView(new ArrayBuffer(this.length))

    this.data.forEach(([value, primitive, index, _endian]) => {
      const endian = _endian === BinaryCursorEndianness.LittleEndian

      switch (primitive) {
        case PrimitiveSymbol.u8:
          buf.setUint8(index, Number(value))
          break
        case PrimitiveSymbol.u16:
          buf.setUint16(index, Number(value), endian)
          break
        case PrimitiveSymbol.u32:
          buf.setUint32(index, Number(value), endian)
          break
        case PrimitiveSymbol.u64:
          buf.setBigUint64(index, BigInt(value), endian)
          break
        case PrimitiveSymbol.i8:
          buf.setInt8(index, Number(value))
          break
        case PrimitiveSymbol.i16:
          buf.setInt16(index, Number(value), endian)
          break
        case PrimitiveSymbol.i32:
          buf.setInt32(index, Number(value), endian)
          break
        case PrimitiveSymbol.i64:
          buf.setBigInt64(index, BigInt(value), endian)
          break
        case PrimitiveSymbol.float32:
          buf.setFloat32(index, Number(value), endian)
          break
        case PrimitiveSymbol.float64:
          buf.setFloat64(index, Number(value), endian)
          break
      }

      return index + this._getPrimitiveSize(primitive)
    }, 0)

    return buf.buffer
  }

  constructor (endian: BinaryCursorEndianness = BinaryCursorEndianness.BigEndian) {
    super()
    this.endianness = endian
  }
}
