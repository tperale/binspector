import { describe, expect } from '@jest/globals'
import Meta from '../metadatas'
import { ValidatorSymbol, type Validator, ValidatorOptionsDefault } from '../decorators/validator'
import { type Context } from '../types'

class Coord {
  x: number
  y: number
}

const testSymbol = Symbol('test')

function Decorator (_: any, context: Context): void {
  Meta.setMetadata(context.metadata, context.name, testSymbol, context.name)
}

class MyClass {
  @Decorator
  field1: Coord

  @Decorator
  field2: number[]
}

describe('Set metadata information through the metadata API', () => {
  it('should manage to retrieve the type information set by the decorator from the Reflect API', () => {
    const c = new MyClass()
    expect(Meta.getMetadata(MyClass[Symbol.metadata] as DecoratorMetadataObject, 'field1', testSymbol)).toStrictEqual(['field1'])
    expect(Meta.getMetadata(MyClass[Symbol.metadata] as DecoratorMetadataObject, 'field2', testSymbol)[0]).toStrictEqual('field2')
  })
  it('should store the validator', () => {
    const c = new MyClass()
    const validator: Validator = {
      type: ValidatorSymbol,
      name: 'test',
      metadata: MyClass[Symbol.metadata] as DecoratorMetadataObject,
      propertyName: 'field1',
      options: ValidatorOptionsDefault,
      validator: (_: any) => true,
    }
    expect(Meta.setValidator(c, 'field1', validator)).toStrictEqual([
      validator,
    ])
  })
})
