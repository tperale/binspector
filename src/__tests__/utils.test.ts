import { describe, expect } from '@jest/globals'
import { Relation, Bitfield, Uint8 } from '../decorators'
import { binread } from '../reader'
import { BinaryReader } from '../cursor'
import { jsonify } from '../utils'

describe('Reading binary content into js object', () => {
  it('should create a new nested js object', () => {
    class Coord {
      _something = 1

      _else = 2

      @Uint8
      x: number

      @Uint8
      y: number
    }

    class Header {
      @Relation(Coord)
      fstCoord: Coord

      @Relation(Coord)
      sndCoord: Coord
    }

    const header = new Uint8Array([0x09, 0x20, 0x10, 0x21]).buffer
    const obj = binread(new BinaryReader(header), Header)
    expect(jsonify(obj)).toStrictEqual({ fstCoord: { x: 9, y: 32 }, sndCoord: { x: 16, y: 33 } })
  })
  it('should work with bitfield nested object', () => {
    class BitField {
      @Bitfield(1)
      field1: number

      @Bitfield(3)
      field2: number

      @Bitfield(4)
      field3: number
    }

    class Header {
      @Uint8
      foo: number

      @Relation(BitField)
      bar: BitField
    }

    const header = new Uint8Array([0x09, 0x20]).buffer
    const obj = binread(new BinaryReader(header), Header)
    expect(jsonify(obj)).toStrictEqual({ foo: 0x09, bar: { field1: 0, field2: 2, field3: 0 } })
  })
})
