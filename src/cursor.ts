import { EOF, PrimitiveSymbol } from './types'

/**
 * Cursor
 */
export abstract class Cursor {
  abstract offset (): number
  abstract move (address: number): number
  abstract read (primitive: PrimitiveSymbol): string | number | bigint | typeof EOF
  abstract write (primitive: PrimitiveSymbol, value: number | string): void

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

  write (_: PrimitiveSymbol, _2: number | string): void {
    throw new Error('Shouldn\'t call "write" method on a BinaryReader object')
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

export class BinaryWriter extends BinaryCursor {
  data: Array<[number, PrimitiveSymbol, number, BinaryCursorEndianness]> = []

  write (primitive: PrimitiveSymbol, value: number | string): void {
    const size = this._getPrimitiveSize(primitive)
    const index = this.offset()
    const endian = this.getEndian()

    if (primitive === PrimitiveSymbol.char || typeof value === 'string') {
      this.data.push([String(value).charCodeAt(0), PrimitiveSymbol.u8, index, endian])
    } else {
      this.data.push([value, primitive, index, endian])
    }

    this.forward(size)
  }

  read (_: PrimitiveSymbol): string | number | bigint | typeof EOF {
    throw new Error('Shouldn\'t call "read" method on a BinaryWriter object')
  }

  buffer (): ArrayBuffer {
    const buf = new DataView(new ArrayBuffer(this.length))

    this.data.forEach(([value, primitive, index, endian]) => {
      switch (primitive) {
        case PrimitiveSymbol.u8:
          buf.setUint8(index, value)
          break
        case PrimitiveSymbol.u16:
          buf.setUint16(index, value, endian === BinaryCursorEndianness.LittleEndian)
          break
        case PrimitiveSymbol.u32:
          buf.setUint32(index, value, endian === BinaryCursorEndianness.LittleEndian)
          break
        // case .u64:
        //   return [1, this.data.getBigUint64(this.index)];
        case PrimitiveSymbol.i8:
          buf.setInt8(index, value)
          break
        case PrimitiveSymbol.i16:
          buf.setInt16(index, value, endian === BinaryCursorEndianness.LittleEndian)
          break
        case PrimitiveSymbol.i32:
          buf.setInt32(index, value, endian === BinaryCursorEndianness.LittleEndian)
          break
        // case .i64:
        //   return [1, this.data.getBigInt64(this.index)];
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
