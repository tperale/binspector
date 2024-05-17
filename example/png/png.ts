import { PrimitiveSymbol, Relation, Count, Match, Validate, While, Enum, IfThen } from '../../src'

enum PNGTypes {
  IHDR = 'IHDR',
  PLTE = 'PLTE',
  bKGD = 'bKGD',
  pHYs = 'pHYs',
  tIME = 'tIME',
  IDAT = 'IDAT',
  IEND = 'IEND',
}

enum IHDRColorType {
  grayscale = 0x00,
  rgb = 0x02,
  plte = 0x03,
  agrayscale = 0x04,
  rgba = 0x06,
}

class PNGChunkIHDR {
  @Relation(PrimitiveSymbol.u32)
  width: number

  @Relation(PrimitiveSymbol.u32)
  height: number

  @Relation(PrimitiveSymbol.u8)
  bit_depth: number

  @Enum(IHDRColorType)
  @Relation(PrimitiveSymbol.u8)
  color_type: IHDRColorType

  @Relation(PrimitiveSymbol.u8)
  compression_method: number

  @Relation(PrimitiveSymbol.u8)
  filter_method: number

  @Relation(PrimitiveSymbol.u8)
  interlace_method: number
}

class RGB {
  @Relation(PrimitiveSymbol.u8)
  red: number

  @Relation(PrimitiveSymbol.u8)
  green: number

  @Relation(PrimitiveSymbol.u8)
  blue: number
}

class PNGChunkPLTE {
  _length: number

  @Count('_length')
  @Relation(RGB)
  rgb: RGB

  constructor(length: number) {
    this._length = length / 3
  }
}

class PNGChunkbKGD {
  @Relation(PrimitiveSymbol.u8)
  palette_index: number
}

enum PhysUnit {
  pixel = 0x00,
  meter = 0x01
}

class PNGChunkpHYs {
  @Relation(PrimitiveSymbol.u32)
  x: number

  @Relation(PrimitiveSymbol.u32)
  y: number

  @Enum(PhysUnit)
  @Relation(PrimitiveSymbol.u8)
  unit: PhysUnit
}

class PNGChunktIME {
  @Relation(PrimitiveSymbol.u16)
  year: number

  @Relation(PrimitiveSymbol.u8)
  month: number

  @Relation(PrimitiveSymbol.u8)
  day: number

  @Relation(PrimitiveSymbol.u8)
  hour: number

  @Relation(PrimitiveSymbol.u8)
  minute: number

  @Relation(PrimitiveSymbol.u8)
  second: number
}

class PNGChunkIDAT {
  _length: number

  @Count('_length')
  @Relation(PrimitiveSymbol.u8)
  data: number

  constructor (length: number) {
    this._length = length
  }
}

class PNGChunk {
  @Relation(PrimitiveSymbol.u32)
  length: number

  @Enum(PNGTypes)
  @Count(4, { targetType: String })
  @Relation(PrimitiveSymbol.char)
  type: PNGTypes

  @IfThen((curr: PNGChunk) => curr.type === PNGTypes.IHDR, PNGChunkIHDR)
  @IfThen((curr: PNGChunk) => curr.type === PNGTypes.PLTE, PNGChunkPLTE, (curr: PNGChunk) => [curr.length])
  @IfThen((curr: PNGChunk) => curr.type === PNGTypes.bKGD, PNGChunkbKGD)
  @IfThen((curr: PNGChunk) => curr.type === PNGTypes.pHYs, PNGChunkpHYs)
  @IfThen((curr: PNGChunk) => curr.type === PNGTypes.tIME, PNGChunktIME)
  @IfThen((curr: PNGChunk) => curr.type === PNGTypes.IDAT, PNGChunkIDAT, (curr: PNGChunk) => [curr.length])
  @IfThen((curr: PNGChunk) => curr.type === PNGTypes.IEND)
  data: PNGChunkIDAT | PNGChunkPLTE | PNGChunkbKGD | PNGChunkpHYs | PNGChunktIME | PNGChunkIHDR

  // @Crc(u32)
  @Relation(PrimitiveSymbol.u32)
  crc: number
}

export class PNG {
  @Match([137, 80, 78, 71, 13, 10, 26, 10])
  @Count(8)
  @Relation(PrimitiveSymbol.u8)
  magic: number[]

  @Validate((chunks: PNGChunk[]) => chunks[0].type === PNGTypes.IHDR)
  @While((chunk: PNGChunk) => chunk.type !== PNGTypes.IEND)
  @Relation(PNGChunk)
  chunks: PNGChunk
}
