import Meta from '../metadatas.ts'
import { ValidatorSymbol, type Validator, ValidatorOptionsDefault } from '../decorators/validator.ts'
import { type Context } from '../types.ts'

class Coord {
  x: number
  y: number
}

function Decorator<This, Value> (_: any, context: Context<This, Value>): void {
  Meta.setMetadata(context.metadata, context.name, ValidatorSymbol, context.name)
}

class MyClass {
  @Decorator
  field1: Coord

  @Decorator
  field2: number[]
}

describe('Set metadata information through the metadata API', () => {
  it('should store the validator', () => {
    const c = new MyClass()
    const validator: Validator<any, boolean> = {
      id: 0,
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
