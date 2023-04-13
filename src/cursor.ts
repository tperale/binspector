import { EOF, PrimitiveSymbol } from './types'

export enum CursorEndianness {
  BigEndian = 0,
  LittleEndian = 1,
}

export class Cursor {
  endian: boolean = false
  data: DataView
  index: number = 0
  endianness: CursorEndianness = CursorEndianness.BigEndian

  forward (len: number): number {
    this.index += len
    return this.index
  }

  getPrimitive (primType: PrimitiveSymbol): [number, string | number] {
    switch (primType) {
      case PrimitiveSymbol.u8:
        return [1, this.data.getUint8(this.index)]
      case PrimitiveSymbol.u16:
        return [2, this.data.getUint16(this.index, this.endianness === CursorEndianness.LittleEndian)]
      case PrimitiveSymbol.u32:
        return [4, this.data.getUint32(this.index, this.endianness === CursorEndianness.LittleEndian)]
      // case .u64:
      //   return [1, this.data.getBigUint64(this.index)];
      case PrimitiveSymbol.i8:
        return [1, this.data.getInt8(this.index)]
      case PrimitiveSymbol.i16:
        return [2, this.data.getInt16(this.index, this.endianness === CursorEndianness.LittleEndian)]
      case PrimitiveSymbol.i32:
        return [4, this.data.getInt32(this.index, this.endianness === CursorEndianness.LittleEndian)]
      // case .i64:
      //   return [1, this.data.getBigInt64(this.index)];
      case PrimitiveSymbol.char:
        return [1, String.fromCharCode(this.data.getUint8(this.index))]
    }
    return [0, 0]
  }

  read (primitive: PrimitiveSymbol): string | number | typeof EOF {
    // TODO Throw an error when out of bound ?
    try {
      const [len, value] = this.getPrimitive(primitive)
      this.forward(len)
      return value
    } catch {
      return EOF
    }
  }

  length (): number {
    return this.data.byteLength
  }

  constructor (array: ArrayBuffer, endian: CursorEndianness = CursorEndianness.BigEndian) {
    this.data = new DataView(array)
    this.endianness = endian
  }
}
