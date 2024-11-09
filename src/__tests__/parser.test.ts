import { describe, expect } from '@jest/globals'
import { Relation, While, Count, Until, MapTo, Match, Enum, IfThen, Else, Choice, Bitfield, Offset, Endian, Peek } from '../decorators'
import { EOF, PrimitiveSymbol, type InstantiableObject } from '../types'
import { binread } from '../reader'
import { withBinspectorContext } from '../context'
import { BinaryReader, BinaryCursorEndianness } from '../cursor'

function expectReadTest<Target> (buffer: Array<number>, ObjectDefinition: InstantiableObject<Target>, endian: BinaryCursorEndianness = BinaryCursorEndianness.BigEndian) {
  return expect(binread(new BinaryReader(new Uint8Array(buffer).buffer, endian), ObjectDefinition))
}

function expectReadTestToThrow<Target> (buffer: Array<number>, ObjectDefinition: InstantiableObject<Target>) {
  return expect(() => binread(new BinaryReader(new Uint8Array(buffer).buffer), ObjectDefinition)).toThrow()
}

describe('Reading binary content into js object', () => {
  it('should create a new js object', () => {
    class Coord {
      @Relation(PrimitiveSymbol.u8)
      x: number

      @Relation(PrimitiveSymbol.u8)
      y: number
    }

    expectReadTest([0x09, 0x20], Coord).toMatchObject({ x: 9, y: 32 })
  })
  it('should create a new nested js object', () => {
    class Coord {
      @Relation(PrimitiveSymbol.u8)
      x: number

      @Relation(PrimitiveSymbol.u8)
      y: number
    }

    class Protocol {
      @Relation(Coord)
      fstCoord: Coord

      @Relation(Coord)
      sndCoord: Coord
    }

    expectReadTest([0x09, 0x20, 0x10, 0x21], Protocol).toMatchObject({
      fstCoord: { x: 9, y: 32 },
      sndCoord: { x: 16, y: 33 },
    })
  })
  it('should read character', () => {
    class Protocol {
      @Relation(PrimitiveSymbol.char)
      character: string
    }

    expectReadTest([0x41], Protocol).toMatchObject({
      character: 'A',
    })
  })
  it('should pass parameter to the relation constructor', () => {
    class Header {
      _size: number

      @Count('_size')
      @Relation(PrimitiveSymbol.u8)
      buf: number[]

      constructor (size: number) {
        this._size = size
      }
    }

    class Protocol {
      @Relation(PrimitiveSymbol.u8)
      size: number

      @Relation(Header, _ => [_.size])
      relation: Header
    }

    expectReadTest([0x02, 0x01, 0x02], Protocol).toMatchObject({
      size: 0x02,
      relation: { buf: [0x01, 0x02] },
    })
  })

  it('should pass the context to the sub-relation', () => {
    class Header extends withBinspectorContext {
      @Count('_ctx.size')
      @Relation(PrimitiveSymbol.u8)
      buf: number[]
    }

    class Protocol {
      @Relation(PrimitiveSymbol.u8)
      size: number

      @Relation(Header)
      relation: Header
    }

    expectReadTest([0x02, 0x01, 0x02], Protocol).toMatchObject({
      size: 0x02,
      relation: { buf: [0x01, 0x02] },
    })
  })
})

describe('Reading binary with validator', () => {
  it('should match field with number', () => {
    class Protocol {
      @Match(0x01)
      @Relation(PrimitiveSymbol.u8)
      field: number
    }

    expectReadTest([0x01], Protocol).toMatchObject({
      field: 0x01,
    })
  })
  it('should match field with array', () => {
    class Protocol {
      @Match([0x01, 0x02])
      @Count(2)
      @Relation(PrimitiveSymbol.u8)
      field: number[]
    }

    expectReadTest([0x01, 0x02], Protocol).toMatchObject({
      field: [0x01, 0x02],
    })
  })
})

describe('Reading binary with controller', () => {
  it('should create u8 array field', () => {
    class Protocol {
      @Count(2)
      @Relation(PrimitiveSymbol.u8)
      array: number[]
    }

    expectReadTest([0x01, 0x02], Protocol).toMatchObject({
      array: [0x01, 0x02],
    })
  })
  it('should be able to use a variable with count decorator', () => {
    class Protocol {
      @Relation(PrimitiveSymbol.u8)
      len: number

      @Count('len')
      @Relation(PrimitiveSymbol.u8)
      field: number
    }

    expectReadTest([0x03, 0x02, 0x03, 0x04], Protocol).toMatchObject({
      len: 0x03,
      field: [0x02, 0x03, 0x04],
    })
  })
  it('should parse content as string', () => {
    class Protocol {
      @Relation(PrimitiveSymbol.u8)
      len: string

      @Count('len', { targetType: String })
      @Relation(PrimitiveSymbol.char)
      field: string

      @Count('len')
      @Relation(PrimitiveSymbol.char)
      array: string[]
    }

    expectReadTest([0x03, 0x41, 0x42, 0x43, 0x41, 0x42, 0x43], Protocol).toMatchObject({
      len: 0x03,
      field: 'ABC',
      array: ['A', 'B', 'C'],
    })
  })
  it('should work with while', () => {
    class Protocol {
      @Relation(PrimitiveSymbol.u8)
      something: string

      @While((x, _, curr: Protocol) => x !== curr.something)
      @Relation(PrimitiveSymbol.u8)
      array: number[]
    }

    expectReadTest([0x03, 0x01, 0x02, 0x03], Protocol).toMatchObject({
      something: 0x03,
      array: [0x01, 0x02, 0x03],
    })
  })
  it('should work with "map" controllers', () => {
    class SubClass {
      _size: number

      @Count('_size')
      @Relation(PrimitiveSymbol.u8)
      data: number[]

      constructor (size: number) {
        this._size = size
      }
    }

    class TestClass {
      @MapTo([1, 2])
      @Relation(SubClass)
      field: SubClass[]
    }

    expectReadTest([0x1, 0x2, 0x3, 0x4, 0x5, 0x6, 0x7], TestClass).toMatchObject({
      field: [{
        _size: 1,
        data: [1],
      }, {
        _size: 2,
        data: [2, 3],
      }],
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

    expectReadTest([0x03, 0x02, 0x03, 0x04], Header).toMatchObject({
      coords: [0x03, 0x02, 0x03, 0x04],
    })
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

    expectReadTest([0x03, 0x02, 0x03, 0x04], Header).toMatchObject({
      coords: [{ x: 0x03, y: 0x02 }, { x: 0x03, y: 0x04 }],
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

    expectReadTestToThrow([0x03, 0x02], Header)
  })
  it('should throw an error if the condition didn\'t end properly', () => {
    class Header {
      @Count(4)
      @Relation(PrimitiveSymbol.u8)
      x: number
    }

    expectReadTestToThrow([0x03, 0x02], Header)
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
      @IfThen(_ => true, Coord)
      coord: Coord
    }

    expectReadTest([0x03, 0x02], Header).toMatchObject({
      coord: { x: 0x03, y: 0x02 },
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
      @IfThen(_ => true, Coord)
      coords: Coord[]
    }

    expectReadTest([0x03, 0x02, 0x03, 0x02], Header).toMatchObject({
      coords: [{ x: 0x03, y: 0x02 }, { x: 0x03, y: 0x02 }],
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

    expectReadTest([0x02, 0x03, 0x02, 0x03], Header).toMatchObject({
      coords: { x: 0x03, y: 0x02, z: 0x03 },
    })
  })
  it('should leaving property blank', () => {
    class Data {
      @Relation(PrimitiveSymbol.u8)
      type: number

      @IfThen(_ => _.type === 0x01, PrimitiveSymbol.u8)
      @IfThen(_ => _.type === 0x02)
      payload: number | undefined
    }

    class Header {
      @Count(2)
      @Relation(Data)
      data: Data[]
    }

    expectReadTest([0x01, 0xFF, 0x02], Header).toMatchObject({
      data: [{
        type: 0x01,
        payload: 0xFF,
      }, {
        type: 0x02,
      }],
    })
  })
  it('should work with choice decorator', () => {
    class Header {
      @Relation(PrimitiveSymbol.u8)
      type: number

      @Choice(_ => _.type, {
        0x01: PrimitiveSymbol.u8,
        0x02: PrimitiveSymbol.u16,
        0x03: undefined,
      })
      payload: number
    }

    expectReadTest([0x02, 0x00, 0x01], Header).toMatchObject({
      type: 0x02,
      payload: 0x0001,
    })

    expectReadTest([0x03, 0x01, 0x01], Header).toMatchObject({
      type: 0x03,
    })
  })
  it('should raise an Error when not passing an array as argument', () => {
    class Coord {
      _scale: number

      @Relation(PrimitiveSymbol.u8)
      x: number

      @Relation(PrimitiveSymbol.u8)
      y: number

      constructor (scale: number) {
        this._scale = scale
      }
    }

    class Header {
      _scale = 1

      // @ts-expect-error we are testing this case
      @IfThen(_ => true, Coord, _ => _._scale)
      coord: Coord
    }

    expectReadTestToThrow([0x03, 0x02], Header)
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

    expectReadTest([0x11], Header).toMatchObject({
      bf: {
        field1: 0,
        field2: 1,
        field3: 1,
      },
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

    expectReadTest([0x30, 0x01, 0x05], Header).toMatchObject({
      bf: {
        field1: 0,
        field2: 0b1100000000,
        field3: 0,
      },
      field: 5,
    })
  })
  it('should work with LittleEndian bitfield', () => {
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

    expectReadTest([0x30, 0x41, 0x05], Header, BinaryCursorEndianness.LittleEndian).toMatchObject({
      bf: {
        field1: 1,
        field2: 0b0000010011,
        field3: 0,
      },
      field: 5,
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

    expectReadTest([0x01, 0x02, 0x03, 0x04], Protocol).toMatchObject({
      value: 0x03,
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

    expectReadTest([0x01, 0x02, 0x03, 0x04, 0x05, 0x06], Protocol).toMatchObject({
      value_1: 0x0102,
      value_2: 0x0403,
      value_3: 0x0506,
    })
  })

  it('should peek the cursor to the mentionned address', () => {
    class Protocol {
      @Peek(2)
      @Relation(PrimitiveSymbol.u8)
      value: number
    }

    const header = new Uint8Array([0x01, 0x02, 0x03, 0x04]).buffer
    const curr = new BinaryReader(header)
    expect(binread(curr, Protocol)).toMatchObject({
      value: 0x03,
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
    const curr = new BinaryReader(header)
    expect(binread(curr, Protocol)).toMatchObject({
      value: 0x01,
    })
    expect(curr.offset()).toStrictEqual(0)
  })
})

describe('Reading a relation to an empty definition', () => {
  it('should throw an error', () => {
    class Header {
    }

    class Protocol {
      @Relation(Header)
      header: Header
    }

    expectReadTestToThrow([0x01, 0x02, 0x03, 0x04], Protocol)
  })
})
