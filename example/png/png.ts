import { Relation, Count, Match, Validate, While, Enum, Choice, Uint8, Uint16, Uint32, Ascii, Endian, BinaryCursorEndianness } from '../../src'

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
  @Uint32
  width: number

  @Uint32
  height: number

  @Uint8
  bit_depth: number

  @Enum(IHDRColorType)
  @Uint8
  color_type: IHDRColorType

  @Uint8
  compression_method: number

  @Uint8
  filter_method: number

  @Uint8
  interlace_method: number
}

class RGB {
  @Uint8
  red: number

  @Uint8
  green: number

  @Uint8
  blue: number
}

class PNGChunkPLTE {
  _length: number

  @Count('_length')
  @Relation(RGB)
  rgb: RGB

  constructor (length: number) {
    this._length = length / 3
  }
}

class PNGChunkbKGD {
  @Uint8
  palette_index: number
}

enum PhysUnit {
  pixel = 0x00,
  meter = 0x01,
}

class PNGChunkpHYs {
  @Uint32
  x: number

  @Uint32
  y: number

  @Enum(PhysUnit)
  @Uint8
  unit: PhysUnit
}

class PNGChunktIME {
  @Uint16
  year: number

  @Uint8
  month: number

  @Uint8
  day: number

  @Uint8
  hour: number

  @Uint8
  minute: number

  @Uint8
  second: number
}

class PNGChunkIDAT {
  _length: number

  @Count('_length')
  @Uint8
  data: number

  constructor (length: number) {
    this._length = length
  }
}

class PNGChunk {
  @Uint32
  length: number

  @Enum(PNGTypes)
  @Count(4)
  @Ascii
  type: PNGTypes

  @Choice('type', {
    [PNGTypes.IHDR]: PNGChunkIHDR,
    [PNGTypes.PLTE]: [PNGChunkPLTE, 'length'],
    [PNGTypes.bKGD]: PNGChunkbKGD,
    [PNGTypes.pHYs]: PNGChunkpHYs,
    [PNGTypes.tIME]: PNGChunktIME,
    [PNGTypes.IDAT]: [PNGChunkIDAT, 'length'],
    [PNGTypes.IEND]: undefined,
  })
  data: PNGChunkIDAT | PNGChunkPLTE | PNGChunkbKGD | PNGChunkpHYs | PNGChunktIME | PNGChunkIHDR

  // @Crc(u32)
  @Uint32
  crc: number
}

@Endian(BinaryCursorEndianness.BigEndian)
export class PNG {
  @Match([137, 80, 78, 71, 13, 10, 26, 10])
  @Count(8)
  @Uint8
  magic: number[]

  @Validate((chunks: PNGChunk[]) => chunks[0].type === PNGTypes.IHDR)
  @While((chunk: PNGChunk) => chunk.type !== PNGTypes.IEND)
  @Relation(PNGChunk)
  chunks: PNGChunk[]
}
