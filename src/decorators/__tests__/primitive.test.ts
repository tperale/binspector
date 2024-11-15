import { describe, expect } from '@jest/globals'
import { Relation, RelationAlreadyDefinedError } from '../primitive'
import { PrimitiveSymbol, type DecoratorMetadataObject } from '../../types'
import Meta from '../../metadatas'

describe('Testing the usage of decorator to create metadata about property', () => {
  it('should retrieve the member of the instance in the same order of definition', () => {
    class TestMatch {
      @Relation(PrimitiveSymbol.u32)
      test: number

      @Relation(PrimitiveSymbol.u32)
      hello: string

      @Relation(Number)
      field: number
    }

    const fields = Meta.getFields(TestMatch[Symbol.metadata] as DecoratorMetadataObject)
    expect(fields.map((x: any) => x.propertyName)).toStrictEqual([
      'test',
      'hello',
      'field',
    ])
  })

  it('should throw an error when defined more than once', () => {
    expect(() => {
      class Protocol {
        @Relation(PrimitiveSymbol.u8)
        @Relation(PrimitiveSymbol.u8)
        test: number
      }
    }).toThrow(RelationAlreadyDefinedError)
  })
})
