import { describe, expect } from '@jest/globals'
import { useBitField, Bitfield } from '../bitfield'
import { Relation } from '../primitive'
import Meta from '../../metadatas'
import { Cursor } from '../../cursor'

describe('Testing the usage of the bitfield decorator', () => {
  it('should return a bitfield populated', () => {
    class TestBitField {
      // The 1st and 2nd bits are set in this field
      @Bitfield(2)
      field1: number = 1

      // The remaining bit are set into this field
      @Bitfield(6)
      field2: number
    }

    const instance = new TestBitField()

    const bitfields = Meta.getBitFields(TestBitField[Symbol.metadata])

    const buf = new Uint8Array([0b00100101]).buffer
    const cur = new Cursor(buf)

    expect(useBitField(bitfields, instance, cur)).toMatchObject({ field1: 1, field2: 9 })
  })
  it('', () => {
    expect(() => {
      class TestBitField {
        @Relation(Number)
        field1: number = 1

        @Bitfield(6)
        field2: number
      }
    }).toThrow(/Can't define bitfield inside an instance with relations/)
  })
})
