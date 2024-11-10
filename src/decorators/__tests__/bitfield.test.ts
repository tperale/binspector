import { describe, expect } from '@jest/globals'

import { useBitField, Bitfield } from '../bitfield'
import { BinaryReader } from '../../cursor'
import { WrongBitfieldClassImplementation } from '../../error'
import Meta from '../../metadatas'
import { Relation } from '../primitive'

function testBitfield (TargetClass: new () => any, content: number[], match: any) {
  const instance = new TargetClass()

  const bitfields = Meta.getBitFields(TargetClass[Symbol.metadata] as DecoratorMetadataObject)

  const cur = new BinaryReader(new Uint8Array(content).buffer)

  expect(useBitField(bitfields, instance, cur)).toMatchObject(match)
}

describe('@Bitfield: basic functions', () => {
  it('@Bitfield: should parse an uint8', () => {
    class TestBitField {
      // The 1st and 2nd bits are set in this field
      @Bitfield(2)
      field1: number = 1

      // The remaining bit are set into this field
      @Bitfield(6)
      field2: number
    }

    testBitfield(TestBitField, [0b00001001], { field1: 0, field2: 9 })
  })
  it('@Bitfield: should parse an uncomplete uint16', () => {
    class TestBitField {
      @Bitfield(3)
      flag1: number

      @Bitfield(3)
      flag2: number

      @Bitfield(4)
      flag3: number

      @Bitfield(4)
      flag4: number
    }

    testBitfield(TestBitField, [0b00100101, 0b01010000], { flag1: 0b001, flag2: 0b001, flag3: 0b0101, flag4: 0b0100 })
  })
})

describe('@Bitfield: errors', () => {
  it('@Bitfield: can\'t be defined in the same class as a @Relation', () => {
    expect(() => {
      class TestBitField {
        @Relation(Number)
        field1: number = 1

        @Bitfield(6)
        field2: number
      }
    }).toThrow(WrongBitfieldClassImplementation)
  })
  it('@Bitfield: A @Relation can\'t exist along a @Bitfield', () => {
    expect(() => {
      class TestBitField {
        @Relation(Number)
        @Bitfield(6)
        field1: number = 1
      }
    }).toThrow(WrongBitfieldClassImplementation)
  })
  it('@Bitfield: The decorated property can\'t exist along a @Relation', () => {
    expect(() => {
      class TestBitField {
        @Bitfield(6)
        @Relation(Number)
        field1: number = 1
      }
    }).toThrow(WrongBitfieldClassImplementation)
  })
})
