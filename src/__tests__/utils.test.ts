import { describe, expect } from '@jest/globals'
import { Relation } from '../decorators'
import { PrimitiveSymbol } from '../types'
import { binread } from '../reader'
import { BinaryCursor } from '../cursor'
import { jsonify } from '../utils'

describe('Reading binary content into js object', () => {
  it('should create a new nested js object', () => {
    class Coord {
      _something = 1

      _else = 2

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
    const obj = binread(new BinaryCursor(header), Header)
    expect(jsonify(obj)).toStrictEqual({ fstCoord: { x: 9, y: 32 }, sndCoord: { x: 16, y: 33 } })
  })
}) 
