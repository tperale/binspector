import { Context, EOF, PrimitiveSymbol } from './types.ts'
import { EOFError } from './error.ts'

declare global {
  interface DataView {
    getUint24(pos: number, littleEndian: boolean): number
    getInt24(pos: number, littleEndian: boolean): number
    setUint24(pos: number, val: number, littleEndian: boolean): void
    setInt24(pos: number, val: number, littleEndian: boolean): void
  }
}

DataView.prototype.getUint24 = function (pos, littleEndian) {
  const p1 = this.getUint8(pos)
  const p2 = this.getUint8(pos + 1)
  const p3 = this.getUint8(pos + 2)

  return littleEndian
    ? (p3 << 16) | (p2 << 8) | p1
    : (p1 << 16) | (p2 << 8) | p3
}

DataView.prototype.getInt24 = function (pos, littleEndian) {
  const num = this.getUint24(pos, littleEndian)

  const negative = (num & 0x800000) > 0

  if (negative) {
    return -(((~num) & 0xFFFFFF) + 1)
  } else {
    return num
  }
}

DataView.prototype.setUint24 = function (pos, val, littleEndian) {
  if (littleEndian) {
    this.setUint8(pos, val & 0xFF)
    this.setUint8(pos + 1, (val >> 8) & 0xFF)
    this.setUint8(pos + 2, (val >> 16) & 0xFF)
  } else {
    this.setUint8(pos + 2, val & 0xFF)
    this.setUint8(pos + 1, (val >> 8) & 0xFF)
    this.setUint8(pos, (val >> 16) & 0xFF)
  }
}

DataView.prototype.setInt24 = function (pos, val, littleEndian) {
  this.setUint24(pos, val, littleEndian)
}

/**
 * Cursor
 */
export abstract class Cursor extends DataView<ArrayBufferLike> {
  abstract offset (): number
  abstract move (address: number): number
  abstract read (primitive: PrimitiveSymbol): number | bigint
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
  protected index: number = 0
  protected length: number = 0
  protected endianness: BinaryCursorEndianness = BinaryCursorEndianness.BigEndian

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

  static getPrimitiveSize (primType: PrimitiveSymbol): number {
    switch (primType) {
      case PrimitiveSymbol.u8:
      case PrimitiveSymbol.i8:
        return 1
      case PrimitiveSymbol.u16:
      case PrimitiveSymbol.i16:
        return 2
      case PrimitiveSymbol.u24:
      case PrimitiveSymbol.i24:
        return 3
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
  protected _readPrimitive (primType: PrimitiveSymbol): number | bigint {
    const endian = this.endianness === BinaryCursorEndianness.LittleEndian
    switch (primType) {
      case PrimitiveSymbol.u8:
        return this.getUint8(this.index)
      case PrimitiveSymbol.u16:
        return this.getUint16(this.index, endian)
      case PrimitiveSymbol.u24:
        return this.getUint24(this.index, endian)
      case PrimitiveSymbol.u32:
        return this.getUint32(this.index, endian)
      case PrimitiveSymbol.u64:
        return this.getBigUint64(this.index, endian)
      case PrimitiveSymbol.i8:
        return this.getInt8(this.index)
      case PrimitiveSymbol.i16:
        return this.getInt16(this.index, endian)
      case PrimitiveSymbol.i24:
        return this.getInt24(this.index, endian)
      case PrimitiveSymbol.i32:
        return this.getInt32(this.index, endian)
      case PrimitiveSymbol.i64:
        return this.getBigInt64(this.index, endian)
      case PrimitiveSymbol.float32:
        return this.getFloat32(this.index, endian)
      case PrimitiveSymbol.float64:
        return this.getFloat64(this.index, endian)
      default:
        return 0
    }
  }

  write (_: PrimitiveSymbol, _2: number | bigint): void {
    throw new Error('Shouldn\'t call "write" method on a BinaryReader object')
  }

  read (primitive: PrimitiveSymbol): number | bigint {
    try {
      const value = this._readPrimitive(primitive)
      this.forward(BinaryCursor.getPrimitiveSize(primitive))
      return value
    } catch (err) {
      if (err instanceof RangeError) {
        throw new EOFError()
      }
      throw err
    }
  }

  constructor (array: ArrayBufferView | ArrayBufferLike, endian: BinaryCursorEndianness = BinaryCursorEndianness.BigEndian) {
    if (ArrayBuffer.isView(array)) {
      super(array.buffer, array.byteOffset, array.byteLength)
    } else {
      super(array)
    }

    this.endianness = endian
  }
}

function BufferAccessor (_: unknown, context: Context<BinaryWriter, ArrayBufferLike>) {
  function createArrayBufferFromBinaryReader (view: DataView, data: Array<[(number | bigint), PrimitiveSymbol, number, BinaryCursorEndianness]>): ArrayBufferLike {
    data.forEach(([value, primitive, index, _endian]) => {
      const endian = _endian === BinaryCursorEndianness.LittleEndian

      switch (primitive) {
        case PrimitiveSymbol.u8:
          view.setUint8(index, Number(value))
          break
        case PrimitiveSymbol.u16:
          view.setUint16(index, Number(value), endian)
          break
        case PrimitiveSymbol.u24:
          view.setUint24(index, Number(value), endian)
          break
        case PrimitiveSymbol.u32:
          view.setUint32(index, Number(value), endian)
          break
        case PrimitiveSymbol.u64:
          view.setBigUint64(index, BigInt(value), endian)
          break
        case PrimitiveSymbol.i8:
          view.setInt8(index, Number(value))
          break
        case PrimitiveSymbol.i16:
          view.setInt16(index, Number(value), endian)
          break
        case PrimitiveSymbol.i24:
          view.setInt24(index, Number(value), endian)
          break
        case PrimitiveSymbol.i32:
          view.setInt32(index, Number(value), endian)
          break
        case PrimitiveSymbol.i64:
          view.setBigInt64(index, BigInt(value), endian)
          break
        case PrimitiveSymbol.float32:
          view.setFloat32(index, Number(value), endian)
          break
        case PrimitiveSymbol.float64:
          view.setFloat64(index, Number(value), endian)
          break
      }
    }, 0)

    return view.buffer
  }

  if (context.kind === 'accessor') {
    return {
      get (this: BinaryWriter) {
        if (this.hasChanged) {
          this.cachedBuffer = createArrayBufferFromBinaryReader(new DataView(new ArrayBuffer(this.length)), this.data)
          this.hasChanged = false
        }
        return this.cachedBuffer
      },
    }
  }
}

function ByteLengthAccessor (_: unknown, context: Context<BinaryWriter, number>) {
  if (context.kind === 'accessor') {
    return {
      get (this: BinaryWriter) {
        return this.length
      },
    }
  }
}

export class BinaryWriter extends BinaryCursor {
  protected hasChanged: boolean = false
  protected cachedBuffer: ArrayBufferLike = new ArrayBuffer(0)
  protected data: Array<[(number | bigint), PrimitiveSymbol, number, BinaryCursorEndianness]> = []

  /**
   * This accessor overwrite the `byteLength` property inherited from the DataView.
   *
   * Because the `byteLength` property is readOnly the decorator here is used as
   * an hack to remain compliant as a ArrayBufferView but manage to show
   * dynamic data.
   */
  @ByteLengthAccessor
  accessor byteLength: number

  /**
   * This accessor overwrite the `buffer` property inherited from the DataView.
   *
   * This accessor is used because `buffer` are difficult to resize with
   * DataView.
   * The decorator is used as an hack to re-write the getter of this property
   * and returns the ArrayBuffer based on the data written at any time while
   * remaining compliant with the ArrayBufferView interface.
   */
  @BufferAccessor
  accessor buffer: ArrayBufferLike

  write (primitive: PrimitiveSymbol, value: number | bigint): void {
    this.hasChanged = true
    const size = BinaryCursor.getPrimitiveSize(primitive)
    const index = this.offset()
    const endian = this.getEndian()

    this.data.push([value, primitive, index, endian])

    this.forward(size)
  }

  read (_: PrimitiveSymbol): number | bigint {
    throw new Error('Shouldn\'t call "read" method on a BinaryWriter object')
  }

  constructor (endian: BinaryCursorEndianness = BinaryCursorEndianness.BigEndian) {
    super(new ArrayBuffer(0))

    this.endianness = endian
  }
}
