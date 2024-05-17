import { describe } from '@jest/globals'
import { useValidators, Enum, Match, Validate } from '../validator'
import Meta from '../../metadatas'

describe('Testing the usage of the validator decorator', () => {
  it('should pass the matching test', () => {
    class TestClass {
      @Match(2, { primitiveCheck: false })
      field: number
    }

    const instance = new TestClass()
    instance.field = 2

    const validators = Meta.getValidators(TestClass[Symbol.metadata], 'field')
    useValidators(validators, instance.field, instance)
  })
  it('should work with custom function', () => {
    class TestClass {
      value: number

      @Validate((x, instance) => x === instance.value, { primitiveCheck: false })
      field: number
    }

    const instance = new TestClass()
    instance.value = 2
    instance.field = 2

    const validators = Meta.getValidators(TestClass[Symbol.metadata], 'field')
    useValidators(validators, instance.field, instance)
  })
  it('should work with each member of array', () => {
    class TestClass {
      @Match(2, { each: true, primitiveCheck: false })
      field: number[]
    }

    const instance = new TestClass()
    instance.field = [2, 2, 2]

    const validators = Meta.getValidators(TestClass[Symbol.metadata], 'field')
    useValidators(validators, instance.field, instance)
  })
  it('should work comparing array', () => {
    class TestClass {
      @Match([1, 2, 3], { primitiveCheck: false })
      field: number[]
    }

    const instance = new TestClass()
    instance.field = [1, 2, 3]

    const validators = Meta.getValidators(TestClass[Symbol.metadata], 'field')
    useValidators(validators, instance.field, instance)
  })
  it('should with validate decorator that receive function', () => {
    class TestClass {
      @Validate((x) => x[0] === 1, { primitiveCheck: false })
      field: number[]
    }

    const instance = new TestClass()
    instance.field = [1, 2, 3]

    const validators = Meta.getValidators(TestClass[Symbol.metadata], 'field')
    useValidators(validators, instance.field, instance)
  })
  it('should work with enum decorator', () => {
    enum Type {
      ReadOnly = 1,
      ReadWrite = 2,
    }
    class TestClass {
      @Enum(Type, { primitiveCheck: false })
      field: Type
    }

    const instance = new TestClass()
    instance.field = 2

    const validators = Meta.getValidators(TestClass[Symbol.metadata], 'field')
    useValidators(validators, instance.field, instance)

    expect(instance.field).toStrictEqual(Type.ReadWrite)
  })
  it('should work with enum decorator and each member of array', () => {
    enum Type {
      ReadOnly = 1,
      ReadWrite = 2,
    }
    class TestClass {
      @Enum(Type, { each: true, primitiveCheck: false })
      field: Type[]
    }

    const instance = new TestClass()
    instance.field = [1, 1, 2]

    const validators = Meta.getValidators(TestClass[Symbol.metadata], 'field')
    useValidators(validators, instance.field, instance)
  })
})

describe('Testing failing validator', () => {
  it('should throw an error', () => {
    class TestClass {
      @Match(1, { primitiveCheck: false })
      field: number
    }

    const instance = new TestClass()
    instance.field = 2

    const validators = Meta.getValidators(TestClass[Symbol.metadata], 'field')
    expect(() => { useValidators(validators, instance.field, instance) }).toThrow()
  })
  it('should throw an error', () => {
    enum Type {
      ReadOnly = 1,
      ReadWrite = 2,
    }
    class TestClass {
      @Enum(Type, { primitiveCheck: false })
      field: number
    }

    const instance = new TestClass()
    instance.field = 3

    const validators = Meta.getValidators(TestClass[Symbol.metadata], 'field')
    expect(() => { useValidators(validators, instance.field, instance) }).toThrow()
  })
})
