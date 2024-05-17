import { describe, expect } from '@jest/globals'
import { transformerDecoratorFactory, Transform, useTransformer } from '../transformer'
import Meta from '../../metadatas'

describe('Testing the usage of the transformer decorator', () => {
  it('should double the content of the property', () => {
    class TestClass {
      @Transform(x => x * 2, { primitiveCheck: false })
      field: number
    }

    const instance = new TestClass()
    instance.field = 1

    const transformers = Meta.getTransformers(TestClass[Symbol.metadata], 'field')
    expect(useTransformer(transformers, instance.field, instance)).toStrictEqual(2)
  })
  it('should take into account the order of definition starting bottom to top', () => {
    class TestClass {
      @Transform((x: number) => x + 3, { primitiveCheck: false })
      @Transform(x => x * 2, { primitiveCheck: false })
      field: number
    }

    const instance = new TestClass()
    instance.field = 1

    const transformers = Meta.getTransformers(TestClass[Symbol.metadata], 'field')
    expect(useTransformer(transformers, instance.field, instance)).toStrictEqual(5)
  })
  it('should work on arrays', () => {
    class TestClass {
      @Transform(x => x * 2, { each: true, primitiveCheck: false })
      field: number

      @Transform(x => x * 2, { each: true, primitiveCheck: false })
      field2: number[]
    }

    const instance = new TestClass()

    const transformers = Meta.getTransformers(TestClass[Symbol.metadata], 'field')
    expect(useTransformer(transformers, 1, instance)).toStrictEqual(2)

    const transformers2 = Meta.getTransformers(TestClass[Symbol.metadata], 'field2')
    expect(useTransformer(transformers2, [1, 2, 3], instance)).toStrictEqual([2, 4, 6])
  })
  it('should work to transform into ascii array', () => {
    function asciiTransform (value: any, _: any): string {
      return String.fromCharCode(value)
    }
    const ASCII = transformerDecoratorFactory('ascii', asciiTransform, { each: true, primitiveCheck: false })

    class TestClass {
      @ASCII
      field: string
    }

    const instance = new TestClass()

    const transformers = Meta.getTransformers(TestClass[Symbol.metadata], 'field')
    expect(useTransformer(transformers, [104, 101, 108, 108, 111, 32, 119, 111, 114, 108, 100], instance)).toStrictEqual(['h', 'e', 'l', 'l', 'o', ' ', 'w', 'o', 'r', 'l', 'd'])
  })
  it('should work to transform into ascii string', () => {
    function asciiTransform (value: any, _: any): string {
      if (Array.isArray(value)) {
        return value.map(x => String.fromCharCode(x)).join('')
      } else {
        return String.fromCharCode(value)
      }
    }
    const ASCII = transformerDecoratorFactory('ascii', asciiTransform, { primitiveCheck: false })

    class TestClass {
      @ASCII
      field: string
    }

    const instance = new TestClass()

    const transformers = Meta.getTransformers(TestClass[Symbol.metadata], 'field')
    expect(useTransformer(transformers, [104, 101, 108, 108, 111, 32, 119, 111, 114, 108, 100], instance)).toStrictEqual('hello world')
  })

})
