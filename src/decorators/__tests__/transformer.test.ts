import { transformerDecoratorFactory, Transform, useTransformer } from '../transformer.ts'
import Meta from '../../metadatas.ts'

function testTransformer (TargetClass: new () => any, field: string, value: any, equal: any, preFunc?: (instance: any) => void): void {
  const instance = new TargetClass()

  if (preFunc !== undefined) {
    preFunc(instance)
  }

  const transformers = Meta.getTransformers(TargetClass[Symbol.metadata] as DecoratorMetadataObject, field)
  expect(useTransformer(transformers, value, instance)).toStrictEqual(equal)
}

describe('@Transformer: functions', () => {
  it('should double the content of the property', () => {
    class TestClass {
      @Transform(x => x * 2, { primitiveCheck: false })
      field: number
    }

    testTransformer(TestClass, 'field', 1, 2)
  })
  it('should take into account the order of definition starting bottom to top', () => {
    class TestClass {
      @Transform((x: number) => x + 3, { primitiveCheck: false })
      @Transform(x => x * 2, { primitiveCheck: false })
      field: number
    }

    testTransformer(TestClass, 'field', 1, 5)
  })
  it('should work on arrays', () => {
    class TestClass {
      @Transform(x => x * 2, { each: true, primitiveCheck: false })
      field: number

      @Transform(x => x * 2, { each: true, primitiveCheck: false })
      field2: number[]
    }

    testTransformer(TestClass, 'field', 1, 2)
    testTransformer(TestClass, 'field2', [1, 2, 3], [2, 4, 6])
  })
  it('should work to transform into ascii array', () => {
    function asciiTransform (value: number): string {
      return String.fromCharCode(value)
    }
    const ASCII = transformerDecoratorFactory('ascii', asciiTransform, { each: true, primitiveCheck: false })

    class TestClass {
      @ASCII
      field: string
    }

    testTransformer(TestClass, 'field', [104, 101, 108, 108, 111, 32, 119, 111, 114, 108, 100], ['h', 'e', 'l', 'l', 'o', ' ', 'w', 'o', 'r', 'l', 'd'])
  })
  it('should work to transform into ascii string', () => {
    const ToString = transformerDecoratorFactory('tostring', (x: string[]) => x.join(''), { primitiveCheck: false })
    const ASCII = transformerDecoratorFactory('ascii', (x: number) => String.fromCharCode(x), { each: true, primitiveCheck: false })

    class TestClass {
      @ToString
      @ASCII
      field: string
    }

    testTransformer(TestClass, 'field', [104, 101, 108, 108, 111, 32, 119, 111, 114, 108, 100], 'hello world')
  })
})

describe('@Transformer: Errors', () => {
  it('should throw when no relation defined', () => {
    expect(() => {
      class TestClass {
        @Transform(_ => 1)
        field: number
      }
    }).toThrow()
  })
})
