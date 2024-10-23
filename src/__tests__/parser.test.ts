import { describe, expect } from '@jest/globals'
import { Relation, While, Count, Until, Match, Enum, IfThen, Else, Choice, Bitfield, Offset, Endian, Peek } from '../decorators'
import { EOF, PrimitiveSymbol } from '../types'
import { binread } from '../reader'
import { BinaryCursor, BinaryCursorEndianness } from '../cursor'

describe('Reading binary content into js object', () => {
  it('should create a new js object', () => {
    class Coord {
      @Relation(PrimitiveSymbol.u8)
      x: number

      @Relation(PrimitiveSymbol.u8)
      y: number
    }

    const coord = new Uint8Array([0x09, 0x20]).buffer
    expect(binread(new BinaryCursor(coord), Coord)).toMatchObject({ x: 9, y: 32 })
  })
  it('should create a new nested js object', () => {
    class Coord {
      @Relation(PrimitiveSymbol.u8)
      x: number

      @Relation(PrimitiveSymbol.u8)
      y: number
    }

    class Header {
      @Relation(Coord)
      fstCoord: Coord

      @Relation(Coord)
      sndCoord: Coord
    }

    const header = new Uint8Array([0x09, 0x20, 0x10, 0x21]).buffer
    expect(binread(new BinaryCursor(header), Header)).toMatchObject({
      fstCoord: { x: 9, y: 32 },
      sndCoord: { x: 16, y: 33 }
    })
  })
  it('should read character', () => {
    class Header {
      @Relation(PrimitiveSymbol.char)
      character: string
    }

    const header = new Uint8Array([0x41]).buffer
    expect(binread(new BinaryCursor(header), Header)).toMatchObject({
      character: 'A'
    })
  })
  it('should pass parameter to the relation constructor', () => {
    class SubHeader {
      _size: number

      @Count('_size')
      @Relation(PrimitiveSymbol.u8)
      buf: number[]

      constructor (size: number) {
        this._size = size
      }
    }

    class Header {
      @Relation(PrimitiveSymbol.u8)
      size: number

      @Relation(SubHeader, (cur: Header) => [cur.size])
      relation: SubHeader
    }

    const header = new Uint8Array([0x02, 0x01, 0x02]).buffer
    expect(binread(new BinaryCursor(header), Header)).toMatchObject({
      size: 0x02,
      relation: { buf: [0x01, 0x02] }
    })
  })
})

describe('Reading binary with validator', () => {
  it('should match field with number', () => {
    class Header {
      @Match(0x01)
      @Relation(PrimitiveSymbol.u8)
      field: number
    }

    const header = new Uint8Array([0x01]).buffer
    expect(binread(new BinaryCursor(header), Header)).toMatchObject({
      field: 0x01
    })
  })
  it('should match field with array', () => {
    class Header {
      @Match([0x01, 0x02])
      @Count(2)
      @Relation(PrimitiveSymbol.u8)
      field: number
    }

    const header = new Uint8Array([0x01, 0x02]).buffer
    expect(binread(new BinaryCursor(header), Header)).toMatchObject({
      field: [0x01, 0x02]
    })
  })
})

describe('Reading binary with controller', () => {
  it('should create u8 array field', () => {
    class Header {
      @Count(2)
      @Relation(PrimitiveSymbol.u8)
      array: number[]
    }
    const header = new Uint8Array([0x01, 0x02]).buffer
    expect(binread(new BinaryCursor(header), Header)).toMatchObject({
      array: [0x01, 0x02]
    })
  })
  it('should be able to use a variable with count decorator', () => {
    class Header {
      @Relation(PrimitiveSymbol.u8)
      len: number

      @Count('len')
      @Relation(PrimitiveSymbol.u8)
      field: number
    }

    const header = new Uint8Array([0x03, 0x02, 0x03, 0x04]).buffer
    expect(binread(new BinaryCursor(header), Header)).toMatchObject({
      len: 0x03,
      field: [0x02, 0x03, 0x04]
    })
  })
  it('should parse content as string', () => {
    class Header {
      @Relation(PrimitiveSymbol.u8)
      len: string

      @Count('len', { targetType: String })
      @Relation(PrimitiveSymbol.char)
      field: string

      @Count('len')
      @Relation(PrimitiveSymbol.char)
      array: string[]
    }

    const header = new Uint8Array([0x03, 0x41, 0x42, 0x43, 0x41, 0x42, 0x43]).buffer
    expect(binread(new BinaryCursor(header), Header)).toMatchObject({
      len: 0x03,
      field: 'ABC',
      array: ['A', 'B', 'C']
    })
  })
  it('should work with while', () => {
    class Header {
      @Relation(PrimitiveSymbol.u8)
      something: string

      @While((x, _, curr: Header) => x !== curr.something)
      @Relation(PrimitiveSymbol.u8)
      array: number[]
    }

    const header = new Uint8Array([0x03, 0x01, 0x02, 0x03]).buffer
    expect(binread(new BinaryCursor(header), Header)).toMatchObject({
      something: 0x03,
      array: [0x01, 0x02, 0x03]
    })
  })
})

describe('Reading binary until EOF', () => {
  it('should read the primitive until the EOF', () => {
    class Header {
      @Until(EOF)
      @Relation(PrimitiveSymbol.u8)
      coords: number[]
    }

    const header = new Uint8Array([0x03, 0x02, 0x03, 0x04]).buffer
    expect(binread(new BinaryCursor(header), Header).coords).toStrictEqual([0x03, 0x02, 0x03, 0x04])
  })
  it('should read the relation until the EOF', () => {
    class Coord {
      @Relation(PrimitiveSymbol.u8)
      x: number

      @Relation(PrimitiveSymbol.u8)
      y: number
    }

    class Header {
      @Until(EOF)
      @Relation(Coord)
      coords: Coord
    }

    const header = new Uint8Array([0x03, 0x02, 0x03, 0x04]).buffer
    expect(binread(new BinaryCursor(header), Header)).toMatchObject({
      coords: [{ x: 0x03, y: 0x02 }, { x: 0x03, y: 0x04 }]
    })
  })
  it('should throw an error if can\'t read the primitive', () => {
    class Header {
      @Relation(PrimitiveSymbol.u8)
      x: number

      @Relation(PrimitiveSymbol.u8)
      y: number

      @Relation(PrimitiveSymbol.u8)
      z: number
    }
    const header = new Uint8Array([0x03, 0x02]).buffer
    expect(() => binread(new BinaryCursor(header), Header)).toThrow()
  })
  it('should throw an error if the condition didn\'t end properly', () => {
    class Header {
      @Count(4)
      @Relation(PrimitiveSymbol.u8)
      x: number
    }
    const header = new Uint8Array([0x03, 0x02]).buffer
    expect(() => binread(new BinaryCursor(header), Header)).toThrow()
  })
})

describe('Reading binary with conditions', () => {
  it('should support conditional reading', () => {
    class Coord {
      @Relation(PrimitiveSymbol.u8)
      x: number

      @Relation(PrimitiveSymbol.u8)
      y: number
    }

    class Header {
      @IfThen((_) => true, Coord)
      coord: Coord
    }

    const header = new Uint8Array([0x03, 0x02]).buffer
    expect(binread(new BinaryCursor(header), Header)).toMatchObject({
      coord: { x: 0x03, y: 0x02 }
    })
  })
  it('should support conditional reading with in addition to controller', () => {
    class Coord {
      @Relation(PrimitiveSymbol.u8)
      x: number

      @Relation(PrimitiveSymbol.u8)
      y: number
    }

    class Header {
      @Count(2)
      @IfThen((_) => true, Coord)
      coords: Coord[]
    }

    const header = new Uint8Array([0x03, 0x02, 0x03, 0x02]).buffer
    expect(binread(new BinaryCursor(header), Header)).toMatchObject({
      coords: [{ x: 0x03, y: 0x02 }, { x: 0x03, y: 0x02 }]
    })
  })
  it('should support conditional reading with enum', () => {
    class TwoDimension {
      @Relation(PrimitiveSymbol.u8)
      x: number

      @Relation(PrimitiveSymbol.u8)
      y: number
    }

    class ThreeDimension extends TwoDimension {
      @Relation(PrimitiveSymbol.u8)
      z: number
    }

    enum Dimension {
      TwoDimension = 0x01,
      ThreeDimension = 0x02,
    }

    class Header {
      @Enum(Dimension)
      @Relation(PrimitiveSymbol.u8)
      dimension: Dimension

      @IfThen((curr: Header) => curr.dimension === Dimension.TwoDimension, TwoDimension)
      @Else(ThreeDimension)
      coords: TwoDimension | ThreeDimension
    }

    const header = new Uint8Array([0x02, 0x03, 0x02, 0x03]).buffer
    expect(binread(new BinaryCursor(header), Header)).toMatchObject({
      coords: { x: 0x03, y: 0x02, z: 0x03 }
    })
  })
  it('should leaving property blank', () => {
    class Data {
      @Relation(PrimitiveSymbol.u8)
      type: number

      @IfThen((instance: Data) => instance.type === 0x01, PrimitiveSymbol.u8)
      @IfThen((instance: Data) => instance.type === 0x02)
      payload: number | undefined
    }

    class Header {
      @Count(2)
      @Relation(Data)
      data: Data[]
    }

    const header = new Uint8Array([0x01, 0xFF, 0x02]).buffer
    expect(binread(new BinaryCursor(header), Header)).toMatchObject({
      data: [{
        type: 0x01,
        payload: 0xFF
      }, {
        type: 0x02
      }]
    })
  })
  it('should work with choice decorator', () => {
    class Header {
      @Relation(PrimitiveSymbol.u8)
      type: number

      @Choice((instance: Header) => instance.type, {
        0x01: PrimitiveSymbol.u8,
        0x02: PrimitiveSymbol.u16,
        0x03: undefined
      })
      payload: number
    }

    const cur1 = new BinaryCursor(new Uint8Array([0x02, 0x00, 0x01]).buffer)
    expect(binread(cur1, Header)).toMatchObject({
      type: 0x02,
      payload: 0x0001
    })

    const cur2 = new BinaryCursor(new Uint8Array([0x03, 0x01, 0x01]).buffer)
    expect(binread(cur2, Header)).toMatchObject({
      type: 0x03
    })
  })
})

describe('Reading binary with bitfields', () => {
  it('should work with bitfield', () => {
    class BitField {
      @Bitfield(1)
      field1: number

      @Bitfield(3)
      field2: number

      @Bitfield(4)
      field3: number
    }
    class Header {
      @Relation(BitField)
      bf: BitField
    }

    const header = new Uint8Array([0x11]).buffer
    expect(binread(new BinaryCursor(header), Header)).toMatchObject({
      bf: {
        field1: 1,
        field2: 0,
        field3: 1
      }
    })
  })
  it('should work with uncomplete bitfield', () => {
    class BitField {
      @Bitfield(2)
      field1: number

      @Bitfield(10)
      field2: number

      @Bitfield(3)
      field3: number
    }
    class Header {
      @Relation(BitField)
      bf: BitField

      @Relation(PrimitiveSymbol.u8)
      field: number
    }

    const header = new Uint8Array([0x30, 0x01, 0x05]).buffer
    expect(binread(new BinaryCursor(header), Header)).toMatchObject({
      bf: {
        field1: 1,
        field2: 0,
        field3: 3
      },
      field: 5
    })
  })
})

describe('Reading binary definition with PrePost decorators', () => {
  it('should offset the cursor to the mentionned address', () => {
    class Protocol {
      @Offset(2)
      @Relation(PrimitiveSymbol.u8)
      value: number
    }

    const header = new Uint8Array([0x01, 0x02, 0x03, 0x04]).buffer
    expect(binread(new BinaryCursor(header), Protocol)).toMatchObject({
      value: 0x03
    })
  })

  it('should change the endianness and then set it back', () => {
    class Protocol {
      @Relation(PrimitiveSymbol.u16)
      value_1: number

      @Endian(BinaryCursorEndianness.LittleEndian)
      @Relation(PrimitiveSymbol.u16)
      value_2: number

      @Relation(PrimitiveSymbol.u16)
      value_3: number
    }

    const header = new Uint8Array([0x01, 0x02, 0x03, 0x04, 0x05, 0x06]).buffer
    expect(binread(new BinaryCursor(header), Protocol)).toMatchObject({
      value_1: 0x0102,
      value_2: 0x0403,
      value_3: 0x0506
    })
  })

  it('should peek the cursor to the mentionned address', () => {
    class Protocol {
      @Peek(2)
      @Relation(PrimitiveSymbol.u8)
      value: number
    }

    const header = new Uint8Array([0x01, 0x02, 0x03, 0x04]).buffer
    const curr = new BinaryCursor(header)
    expect(binread(curr, Protocol)).toMatchObject({
      value: 0x03
    })
    expect(curr.offset()).toStrictEqual(0)
  })

  it('should peek the cursor to the next address', () => {
    class Protocol {
      @Peek()
      @Relation(PrimitiveSymbol.u8)
      value: number
    }

    const header = new Uint8Array([0x01, 0x02, 0x03, 0x04]).buffer
    const curr = new BinaryCursor(header)
    expect(binread(curr, Protocol)).toMatchObject({
      value: 0x01
    })
    expect(curr.offset()).toStrictEqual(0)
  })

})

describe('Reading self refering binary definition', () => {
  it('should throw an error when defined as a relation', () => {
    expect(() => {
      class Header {
        @Relation(Header)
        header: Header
      }
    }).toThrow()
  })
})
