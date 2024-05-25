import { describe, expect } from '@jest/globals'
import { Relation, While, Count, Until, Match, Enum, IfThen, Else, Choice, Bitfield, Offset, Endian } from '../decorators'
import { EOF, PrimitiveSymbol } from '../types'
import { binwrite } from '../writer'
import { BinaryCursor, BinaryCursorEndianness } from '../cursor'

describe('Binary Writter testing', () => {
  it('should output a buffer', () => {
    class Coord {
      @Relation(PrimitiveSymbol.u8)
      x: number

      @Relation(PrimitiveSymbol.u8)
      y: number
    }

    const coord = new Coord()
    coord.x = 0x09
    coord.y = 0x20

    const buf = new Uint8Array([0x09, 0x20]).buffer
    const cur = new BinaryCursor()
    binwrite(Coord, coord, cur)
    expect(cur).toMatchObject(buf)
  })
  it('should output content of nested js object', () => {
    class Coord {
      @Relation(PrimitiveSymbol.u8)
      x: number

      @Relation(PrimitiveSymbol.u8)
      y: number

      constructor (x: number, y: number) {
        this.x = x
        this.y = y
      }
    }

    class TestClass {
      @Relation(Coord)
      fst: Coord

      @Relation(Coord)
      snd: Coord

      constructor (fst: Coord, snd: Coord) {
        this.fst = fst
        this.snd = snd
      }
    }

    const test = new TestClass(new Coord(1, 2), new Coord(3, 4))

    const testBuf = new Uint8Array([0x01, 0x02, 0x03, 0x04]).buffer
    const cur = new BinaryCursor()
    binwrite(TestClass, test, cur)
    expect(cur.data.buffer).toMatchObject(testBuf)
  })

})
