import { Match, Count, Relation } from '../decorators/index.ts'
import { ValidatorSymbol } from '../decorators/validator.ts'
import { PrimitiveSymbol } from '../types.ts'
import Meta from '../metadatas.ts'

describe('Testing the usage of decorator to create metadata about property', () => {
  class TestMatch {
    @Match(42)
    @Relation(PrimitiveSymbol.u32)
    test: number

    @Count(3)
    @Relation(PrimitiveSymbol.u32)
    hello: string

    @Relation(Number)
    field: number
  }

  it('should retrieve the member of the instance in the same order of definition', () => {
    const fields = Meta.getFields(TestMatch[Symbol.metadata] as DecoratorMetadataObject)
    expect(fields.map(x => x.propertyName)).toStrictEqual([
      'test',
      'hello',
      'field',
    ])
  })
  it('should retrieve the correct metadata content', () => {
    const testMatchPropertyMetadatas = Meta.getValidators(
      TestMatch[Symbol.metadata] as DecoratorMetadataObject,
      'test',
    )
    expect(Array.isArray(testMatchPropertyMetadatas)).toBe(true)
    expect(testMatchPropertyMetadatas.length).toBe(1)
    expect(testMatchPropertyMetadatas[0].type).toBe(ValidatorSymbol)
    expect(testMatchPropertyMetadatas[0].name).toEqual('match')
    expect(testMatchPropertyMetadatas[0].propertyName).toEqual('test')
  })
})
