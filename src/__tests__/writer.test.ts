import { describe, expect } from '@jest/globals'
import { Bitfield, Relation, Choice, Count, Matrix, Peek, Offset, Endian, NullTerminatedString, TransformScale, TransformOffset, Transform, Until, EnsureSize, Uint8, Uint16, Ascii, Char, Utf8, Utf16, Utf32 } from '../decorators'
import { ExecutionScope, InstantiableObject, PrimitiveSymbol, EOF } from '../types'
import { binwrite } from '../writer'
import { binread } from '../reader'
import { BinaryReader, BinaryWriter, BinaryCursorEndianness } from '../cursor'

function areArrayBufferEqual (buf1: ArrayBuffer, buf2: ArrayBuffer) {
  if (buf1.byteLength != buf2.byteLength) return false
  const arr1 = new Uint8Array(buf1)
  const arr2 = new Uint8Array(buf2)

  for (let i = 0; i != buf1.byteLength; i++) {
    if (arr1[i] != arr2[i]) return false
  }

  return true
}

function expectWriteTest<Target> (instance: any, ObjectDefinition: InstantiableObject<Target>, buf: number[], endian: BinaryCursorEndianness = BinaryCursorEndianness.BigEndian) {
  const writtenBuf = new BinaryWriter(endian)
  binwrite(writtenBuf, ObjectDefinition, instance)
  expect(areArrayBufferEqual(writtenBuf.buffer(), Uint8Array.from(buf))).toEqual(true)
}

function decodeEncodeTest<Target> (ObjectDefinition: InstantiableObject<Target>, buf: number[], endian: BinaryCursorEndianness = BinaryCursorEndianness.BigEndian) {
  const decoded = binread(new BinaryReader(new Uint8Array(buf).buffer, endian), ObjectDefinition)

  expectWriteTest(decoded, ObjectDefinition, buf, endian)
}

describe('Binary Writter testing', () => {
  it('should output a buffer', () => {
    class Protocol {
      @Uint8
      x: number

      @Uint8
      y: number
    }

    decodeEncodeTest(Protocol, [0x09, 0x20])
  })
  it('should output content of nested js object', () => {
    class Coord {
      @Uint8
      x: number

      @Uint8
      y: number

      constructor (x: number, y: number) {
        this.x = x
        this.y = y
      }
    }

    class Protocol {
      @Relation(Coord)
      fst: Coord

      @Relation(Coord)
      snd: Coord

      constructor (fst: Coord, snd: Coord) {
        this.fst = fst
        this.snd = snd
      }
    }

    decodeEncodeTest(Protocol, [0x01, 0x02, 0x03, 0x04])
  })
  it('should read character', () => {
    class Protocol {
      @Ascii
      character: string
    }

    decodeEncodeTest(Protocol, [0x41])
  })
  it('should work with controller', () => {
    class Protocol {
      @Uint8
      size: number

      @Count('size')
      @Uint8
      buf: number[]
    }

    decodeEncodeTest(Protocol, [0x02, 0x01, 0x02])
  })
  it('should work with controller and subtype', () => {
    class Coord {
      @Uint8
      x: number

      @Uint8
      y: number
    }

    class Protocol {
      @Uint8
      size: number

      @Count('size')
      @Relation(Coord)
      buf: Coord[]
    }

    decodeEncodeTest(Protocol, [0x02, 0x01, 0x02, 0x03, 0x04])
  })
  it('should parse content as string', () => {
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

    decodeEncodeTest(Protocol, [0x03, 0x41, 0x42, 0x43, 0x41, 0x42, 0x43])
  })
  it('should work with chained controller', () => {
    class Protocol {
      @Count(3)
      @Count(2)
      @Uint8
      buf: number[]
    }

    decodeEncodeTest(Protocol, [0x01, 0x02, 0x03, 0x04, 0x05, 0x06])
  })
  it('should work with chained controller (matrix))', () => {
    class Coord {
      @Uint8
      x: number

      @Uint8
      y: number
    }

    class Protocol {
      @Matrix(2, 2)
      @Relation(Coord)
      buf: Coord[]
    }

    decodeEncodeTest(Protocol, [0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08])
  })
  it('@Utf8: support encoding', () => {
    class Protocol {
      @Until(EOF)
      @Utf8
      field: string
    }

    decodeEncodeTest(Protocol, [
      0x47, 0x72, 0xc3, 0xb6, 0xc3, 0x9f, 0x65
    ])
  })
  it('@Utf16: support encoding w/ BigEndian', () => {
    class Protocol {
      @Endian(BinaryCursorEndianness.BigEndian)
      @Until(EOF)
      @Utf16
      field: string
    }

    decodeEncodeTest(Protocol, [
      0x00, 0x47, 0x00, 0x72, 0x00, 0xf6, 0x00, 0xdf, 0x00, 0x65
    ])
  })
  it('@Utf16: support encoding w/ overflow char', () => {
    class Protocol {
      @Endian(BinaryCursorEndianness.BigEndian)
      @Until(EOF)
      @Utf16
      field: string
    }

    decodeEncodeTest(Protocol, [
      0x00, 0x48, 0x00, 0x65, 0x00, 0x6c, 0x00, 0x6c, 0x00, 0x6f, 0x00, 0x20, 0xd8, 0x3d, 0xde, 0x0a
    ])
  })
  it('@Utf16: support encoding w/ overflow char & LittleEndian', () => {
    class Protocol {
      @Endian(BinaryCursorEndianness.LittleEndian)
      @Until(EOF)
      @Utf16
      field: string
    }

    decodeEncodeTest(Protocol, [
      0x48, 0x00, 0x65, 0x00, 0x6c, 0x00, 0x6c, 0x00, 0x6f, 0x00, 0x20, 0x00, 0x3d, 0xd8, 0x0a, 0xde
    ])
  })
  it('@Utf32: support encoding', () => {
    class Protocol {
      @Endian(BinaryCursorEndianness.BigEndian)
      @Until(EOF)
      @Utf32
      field: string
    }

    decodeEncodeTest(Protocol, [
      0x00, 0x00, 0x00, 0x48, 0x00, 0x00, 0x00, 0x65, 0x00, 0x00, 0x00, 0x6c, 0x00, 0x00, 0x00, 0x6c, 0x00, 0x00, 0x00, 0x6f, 0x00, 0x00, 0x00, 0x20, 0x00, 0x01, 0xf6, 0x0a
    ])
  })
  it('should work with null temrinated string', () => {
    class Protocol {
      @NullTerminatedString()
      buf: string[]
    }

    decodeEncodeTest(Protocol, [0x68, 0x65, 0x6c, 0x6c, 0x6f, 0x00])
  })
  /**
   * Alignment not supported for now in the writer
  it('should work with @NullTerminatedString and alignment', () => {
    class Protocol {
      @NullTerminatedString({ alignment: 4 })
      buf: string[]
    }

    decodeEncodeTest(Protocol, [0x68, 0x65, 0x6c, 0x6c, 0x6f, 0x00, 0x00, 0x00])
  })
  */
  it('should work with chained controller that parse strings', () => {
    class Protocol {
      @Count(2)
      @NullTerminatedString()
      buf: string[]
    }

    decodeEncodeTest(Protocol, [0x68, 0x65, 0x6c, 0x6c, 0x6f, 0x00, 0x77, 0x6f, 0x72, 0x6c, 0x64, 0x00])
  })
  /**
   * Alignment not supported in the writer
  it('should work with chained controller that parse strings with alignment', () => {
    class Protocol {
      @Count(2)
      @NullTerminatedString({ alignment: 4 })
      buf: string[]
    }

    decodeEncodeTest(Protocol, [0x68, 0x65, 0x6c, 0x6c, 0x6f, 0x00, 0x00, 0x00, 0x77, 0x6f, 0x72, 0x6c, 0x64, 0x00, 0x00, 0x00])
  })
  */
})

describe('Writing binary with bitfields', () => {
  it('should work with bitfield', () => {
    class BitField {
      @Bitfield(1)
      field1: number

      @Bitfield(3)
      field2: number

      @Bitfield(4)
      field3: number
    }

    class Protocol {
      @Relation(BitField)
      bf: BitField
    }

    decodeEncodeTest(Protocol, [0x11])
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

    class Protocol {
      @Relation(BitField)
      bf: BitField

      @Uint8
      field: number
    }

    decodeEncodeTest(Protocol, [0x30, 0x10, 0x05])
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

    class Protocol {
      @Relation(BitField)
      bf: BitField

      @Uint8
      field: number
    }

    decodeEncodeTest(Protocol, [0x30, 0x40, 0x05], BinaryCursorEndianness.LittleEndian)
  })
})

describe('Writing binary definition with PrePost decorators', () => {
  it('should offset the cursor to the mentionned address', () => {
    class Protocol {
      @Offset(2)
      @Uint8
      value: number
    }

    decodeEncodeTest(Protocol, [0x00, 0x00, 0x03])
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

    decodeEncodeTest(Protocol, [0x01, 0x02, 0x03, 0x04, 0x05, 0x06])
  })

  it('should peek the cursor to the mentionned address', () => {
    class Protocol {
      @Peek(2)
      @Uint8
      value: number

      @Uint8
      first: number
    }

    decodeEncodeTest(Protocol, [0x01, 0x00, 0x03])
  })

  it('should move the cursor if the size is not met', () => {
    class Protocol {
      @EnsureSize(2)
      @Uint8
      value: number

      @Uint8
      value_2: number
    }

    decodeEncodeTest(Protocol, [0x01, 0x00, 0x03])
  })
})

describe('Writing binary definition with Transformer decorators', () => {
  it('should work with TransformScale decorator', () => {
    class Protocol {
      @TransformScale(2)
      @Uint8
      data: number
    }

    decodeEncodeTest(Protocol, [0x02])
  })
  it('should work with TransformScale & TransformOffset decorator', () => {
    class Protocol {
      @TransformOffset(-1)
      @TransformScale(2)
      @Uint8
      data: number

      @TransformScale(2)
      @TransformOffset(-1)
      @Uint8
      data2: number
    }

    decodeEncodeTest(Protocol, [0x02, 0x01])
  })
  it('should work with custom Transformer', () => {
    class Protocol {
      @Transform((value: number[]) => {
        const buf = new Uint8Array(value)
        return new TextDecoder().decode(buf)
      }, { scope: ExecutionScope.OnRead })
      @Transform((value: string) => {
        const buf = new TextEncoder().encode(value)
        return Array.from(buf)
      }, { scope: ExecutionScope.OnWrite })
      @Until(EOF)
      @Uint8
      decodedString: string
    }

    decodeEncodeTest(Protocol, [84, 104, 105, 115, 32, 105, 115, 32, 97, 32, 115, 97, 109, 112, 108, 101, 32, 112, 97, 114, 97, 103, 114, 97, 112, 104, 46])
  })
})

describe('Writing binary definition with Condition decorators', () => {
  it('should work with choice decorator', () => {
    class Protocol {
      @Uint8
      type: number

      @Choice(_ => _.type, {
        0x01: PrimitiveSymbol.u8,
        0x02: PrimitiveSymbol.u16,
        0x03: undefined,
      })
      payload: number
    }

    decodeEncodeTest(Protocol, [0x02, 0x00, 0x03])
  })
})
