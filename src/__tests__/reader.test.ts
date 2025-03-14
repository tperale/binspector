import { Relation, While, Count, Until, MapTo, Match, Enum, IfThen, Else, Choice, Bitfield, Offset, Endian, Peek, ValueSet, EnsureSize, Uint8, Uint16, Ascii, NullTerminatedString, Char, Utf8, Utf16, Utf32, Padding, Flatten, Matrix } from '../decorators/index.ts'
import { EOF, PrimitiveSymbol, type InstantiableObject } from '../types.ts'
import { binread } from '../reader.ts'
import { BinaryReader, BinaryCursorEndianness } from '../cursor.ts'
import { CtxGet, CtxSet } from '../decorators/context.ts'

function expectReadTest<Target> (buffer: Array<number>, ObjectDefinition: InstantiableObject<Target>, endian: BinaryCursorEndianness = BinaryCursorEndianness.BigEndian, ctx = {}, ...args: any[]) {
  return expect(binread(new BinaryReader(new Uint8Array(buffer).buffer, endian), ObjectDefinition, ctx, ...args))
}

function expectReadTestToThrow<Target> (buffer: Array<number>, ObjectDefinition: InstantiableObject<Target>) {
  return expect(() => binread(new BinaryReader(new Uint8Array(buffer).buffer), ObjectDefinition)).toThrow()
}

describe('Reading binary content into js object', () => {
  it('should create a new js object', () => {
    class Coord {
      @Uint8
      x: number

      @Uint8
      y: number
    }

    expectReadTest([0x09, 0x20], Coord).toMatchObject({ x: 9, y: 32 })
  })
  it('should create a new nested js object', () => {
    class Coord {
      @Uint8
      x: number

      @Uint8
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
      @Ascii
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
      @Uint8
      buf: number[]

      constructor (size: number) {
        this._size = size
      }
    }

    class Protocol {
      @Uint8
      size: number

      @Relation(Header, _ => [_.size])
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
      @Uint8
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
      @Uint8
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
      @Uint8
      array: number[]
    }

    expectReadTest([0x01, 0x02], Protocol).toMatchObject({
      array: [0x01, 0x02],
    })
  })
  it('should be able to use a variable with count decorator', () => {
    class Protocol {
      @Uint8
      len: number

      @Count('len')
      @Uint8
      field: number
    }

    expectReadTest([0x03, 0x02, 0x03, 0x04], Protocol).toMatchObject({
      len: 0x03,
      field: [0x02, 0x03, 0x04],
    })
  })
  it('should read content as string', () => {
    class Protocol {
      @Uint8
      len: string

      @Count('len')
      @Ascii
      field: string

      @Count('len')
      @Char
      array: string[]
    }

    expectReadTest([0x03, 0x41, 0x42, 0x43, 0x41, 0x42, 0x43], Protocol).toMatchObject({
      len: 0x03,
      field: 'ABC',
      array: ['A', 'B', 'C'],
    })
  })
  it('@Utf8: support encoding', () => {
    class Protocol {
      @Until(EOF)
      @Utf8
      field: string
    }

    expectReadTest([
      0x48, 0x65, 0x6c, 0x6c, 0x6f, 0x20, 0xf0, 0x9f, 0x98, 0x8a
    ], Protocol).toMatchObject({
      field: 'Hello 😊'
    })
  })
  it('@Utf16: support encoding w/ overflow char', () => {
    class Protocol {
      @Endian(BinaryCursorEndianness.BigEndian)
      @Until(EOF)
      @Utf16
      field: string
    }

    expectReadTest([
      0x00, 0x48, 0x00, 0x65, 0x00, 0x6c, 0x00, 0x6c, 0x00, 0x6f, 0x00, 0x20, 0xd8, 0x3d, 0xde, 0x0a
    ], Protocol).toMatchObject({
      field: 'Hello 😊'
    })
  })
  /**
   * This will fail for now
  it('@Utf16: support encoding w/ overflow char', () => {
    class Protocol {
      @Endian(BinaryCursorEndianness.BigEndian)
      @Until(EOF)
      @Utf16
      field: string
    }

    expectReadTest([
      0x00, 0x48, 0x00, 0x65, 0x00, 0x6c, 0x00, 0x6c, 0x00, 0x6f, 0x00, 0x20, 0xd8, 0x3d, 0xde, 0x0a, 0x00, 0x00, 0x00, 0x00
    ], Protocol).toMatchObject({
      field: 'Hello 😊'
    })
  })
  */
  it('@Utf16: support encoding w/ overflow char & LittleEndian', () => {
    class Protocol {
      @Endian(BinaryCursorEndianness.LittleEndian)
      @Until(EOF)
      @Utf16
      field: string
    }

    expectReadTest([
      0x48, 0x00, 0x65, 0x00, 0x6c, 0x00, 0x6c, 0x00, 0x6f, 0x00, 0x20, 0x00, 0x3d, 0xd8, 0x0a, 0xde
    ], Protocol).toMatchObject({
      field: 'Hello 😊'
    })
  })
  it('@Utf32: support encoding', () => {
    class Protocol {
      @Endian(BinaryCursorEndianness.BigEndian)
      @Until(EOF)
      @Utf32
      field: string
    }

    expectReadTest([
      0x00, 0x00, 0x00, 0x48, 0x00, 0x00, 0x00, 0x65, 0x00, 0x00, 0x00, 0x6c, 0x00, 0x00, 0x00, 0x6c, 0x00, 0x00, 0x00, 0x6f, 0x00, 0x00, 0x00, 0x20, 0x00, 0x01, 0xf6, 0x0a
    ], Protocol).toMatchObject({
      field: 'Hello 😊'
    })
  })
  it('@NullTerminatedString: read null terminated string', () => {
    class Protocol {
      @NullTerminatedString()
      field: string
    }

    expectReadTest([
      0x68, 0x65, 0x6C, 0x6C,
      0x6F, 0x00, 0x77, 0x6F,
      0x72, 0x6C, 0x64, 0x00,
    ], Protocol).toMatchObject({
      field: 'hello'
    })
  })
  it('@NullTerminatedString: create array of null terminated string', () => {
    class Protocol {
      @Until(EOF)
      @NullTerminatedString()
      field: string[]
    }

    expectReadTest([
      0x68, 0x65, 0x6C, 0x6C,
      0x6F, 0x00, 0x77, 0x6F,
      0x72, 0x6C, 0x64, 0x00,
    ], Protocol).toMatchObject({
      field: ['hello', 'world']
    })
  })
  it('@NullTerminatedString: create array of null terminated string with padding', () => {
    class ProtocolString {
      @Padding(4)
      @NullTerminatedString()
      str: string
    }

    class Protocol {
      @Until(EOF)
      @Flatten(ProtocolString, 'str')
      field: string[]
    }

    expectReadTest([
      0x68, 0x65, 0x6C, 0x6C,
      0x6F, 0x00, 0x00, 0x00,
      0x77, 0x6F, 0x72, 0x6C,
      0x64, 0x00, 0x00, 0x00
    ], Protocol).toMatchObject({
      field: ['hello', 'world']
    })
  })
  it('should work with while', () => {
    class Protocol {
      @Uint8
      something: string

      @While((x, _, curr: Protocol) => x !== curr.something)
      @Uint8
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
      @Uint8
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
  it('should work `@Matrix`', () => {
    class TestClass {
      @Matrix(3, 2, 4)
      @Uint8
      field: number[][]
    }

    expectReadTest([0x1, 0x2, 0x3, 0x0, 0x5, 0x6, 0x7, 0x0], TestClass).toMatchObject({
      field: [[0x1, 0x2, 0x3], [0x5, 0x6, 0x7]]
    })
  })
})

describe('Reading binary until EOF', () => {
  it('should read the primitive until the EOF', () => {
    class Header {
      @Until(EOF)
      @Uint8
      coords: number[]
    }

    expectReadTest([0x03, 0x02, 0x03, 0x04], Header).toMatchObject({
      coords: [0x03, 0x02, 0x03, 0x04],
    })
  })
  it('should read the relation until the EOF', () => {
    class Coord {
      @Uint8
      x: number

      @Uint8
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
      @Uint8
      x: number

      @Uint8
      y: number

      @Uint8
      z: number
    }

    expectReadTestToThrow([0x03, 0x02], Header)
  })
  it('should throw an error if the condition didn\'t end properly', () => {
    class Header {
      @Count(4)
      @Uint8
      x: number
    }

    expectReadTestToThrow([0x03, 0x02], Header)
  })
})

describe('Reading binary with conditions', () => {
  it('should support conditional reading', () => {
    class Coord {
      @Uint8
      x: number

      @Uint8
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
      @Uint8
      x: number

      @Uint8
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
      @Uint8
      x: number

      @Uint8
      y: number
    }

    class ThreeDimension extends TwoDimension {
      @Uint8
      z: number
    }

    enum Dimension {
      TwoDimension = 0x01,
      ThreeDimension = 0x02,
    }

    class Header {
      @Enum(Dimension)
      @Uint8
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
      @Uint8
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
      @Uint8
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

      @Uint8
      x: number

      @Uint8
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

      @Uint8
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

      @Uint8
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
      @Uint8
      value: number
    }

    expectReadTest([0x01, 0x02, 0x03, 0x04], Protocol).toMatchObject({
      value: 0x03,
    })
  })
  it('should offset the protocol based on a value passed as a parameter', () => {
    @Offset('_offset')
    class Protocol {
      _offset: number

      @Uint8
      value: number

      constructor (offset: number) {
        this._offset = offset
      }
    }

    expectReadTest([0x01, 0x02, 0x03, 0x04], Protocol, BinaryCursorEndianness.BigEndian, {}, 2).toMatchObject({
      value: 0x03,
    })
  })
  it('should change the endianness and then set it back', () => {
    class Protocol {
      @Uint16
      value_1: number

      @Endian(BinaryCursorEndianness.LittleEndian)
      @Uint16
      value_2: number

      @Uint16
      value_3: number
    }

    expectReadTest([0x01, 0x02, 0x03, 0x04, 0x05, 0x06], Protocol).toMatchObject({
      value_1: 0x0102,
      value_2: 0x0403,
      value_3: 0x0506,
    })
  })
  it('should change the endianness when defined as class decorator', () => {
    @Endian(BinaryCursorEndianness.LittleEndian)
    class Protocol {
      @Uint16
      value_1: number

      @Uint16
      value_2: number

      @Uint16
      value_3: number
    }

    expectReadTest([0x01, 0x02, 0x03, 0x04, 0x05, 0x06], Protocol).toMatchObject({
      value_1: 0x0201,
      value_2: 0x0403,
      value_3: 0x0605,
    })
  })
  it('should change the endianness based on a value known at runtime', () => {
    class Protocol {
      @Uint8
      endian: number

      @Endian(_ => _.endian > 0 ? BinaryCursorEndianness.BigEndian : BinaryCursorEndianness.LittleEndian)
      @Uint16
      value: number
    }

    expectReadTest([0x00, 0x01, 0x02], Protocol, BinaryCursorEndianness.BigEndian).toMatchObject({
      value: 0x0201,
    })
  })
  it('should change the endianness based on a value known at runtime at class level', () => {
    @Endian(_ => _._endian > 0 ? BinaryCursorEndianness.BigEndian : BinaryCursorEndianness.LittleEndian)
    class Protocol {
      _endian: number

      @Uint16
      value: number

      constructor (endian: number) {
        this._endian = endian
      }
    }

    expectReadTest([0x01, 0x02], Protocol, BinaryCursorEndianness.BigEndian, 0).toMatchObject({
      value: 0x0201,
    })
  })
  it('should peek the cursor to the mentionned address', () => {
    class Protocol {
      @Peek(2)
      @Uint8
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
      @Uint8
      value: number
    }

    const header = new Uint8Array([0x01, 0x02, 0x03, 0x04]).buffer
    const curr = new BinaryReader(header)
    expect(binread(curr, Protocol)).toMatchObject({
      value: 0x01,
    })
    expect(curr.offset()).toStrictEqual(0)
  })
  it('should set a value into the decorated property without reading anything or declaring ', () => {
    class Protocol {
      @ValueSet(_ => 0xFF)
      value: number
    }

    const header = new Uint8Array([0x01, 0x02, 0x03, 0x04]).buffer
    const curr = new BinaryReader(header)
    expect(binread(curr, Protocol)).toMatchObject({
      value: 0xFF,
    })
    expect(curr.offset()).toStrictEqual(0)
  })
  it('should move the cursor if the size is not met', () => {
    class Protocol {
      _offset: number

      @EnsureSize('_offset')
      @Uint8
      value: number

      @Uint8
      value_2: number

      constructor (offset: number) {
        this._offset = offset
      }
    }

    expectReadTest([0x01, 0x02, 0x03, 0x04], Protocol, BinaryCursorEndianness.BigEndian, {}, 2).toMatchObject({
      value: 0x01,
      value_2: 0x03,
    })
  })
  it('should move the cursor if the size is not met', () => {
    @EnsureSize('_size')
    class Block {
      @Count(3)
      @Uint8
      content: string

      constructor (public _size: number) {}
    }

    class Protocol {
      block_size = 4

      @Count(2)
      @Relation(Block, 'block_size')
      blocks: Block[]
    }

    expectReadTest([0x01, 0x02, 0x03, 0x00, 0x04, 0x05, 0x06, 0x00], Protocol, BinaryCursorEndianness.BigEndian, {}, 2).toMatchObject({
      block_size: 4,
      blocks: [{ content: [0x01, 0x02, 0x03] }, { content: [0x04, 0x05, 0x06] }]
    })
  })
})

describe('Reading binary definition with Ctx decorators', () => {
  it('should ', () => {
    class Protocol {
      @CtxGet('Settings.Count')
      data_type: number

      @CtxSet('Settings.Value')
      @Count('data_type')
      @Uint8
      foo: number
    }

    const ctx = { Settings: { Count: 3 } }

    expectReadTest([0x01, 0x02, 0x03], Protocol, BinaryCursorEndianness.LittleEndian, ctx).toMatchObject({
      data_type: 3,
      foo: [1, 2, 3],
    })

    expect(ctx).toMatchObject({ Settings: { Count: 3, Value: [1, 2, 3] } })
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
