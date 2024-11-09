import { describe } from '@jest/globals'
import { useValidators, Enum, Match, Validate } from '../validator'
import Meta from '../../metadatas'

function testValidator (TargetClass: new () => any, field: string, preFunc?: (instance: any) => void): void {
  const instance = new TargetClass()

  if (preFunc !== undefined) {
    preFunc(instance)
  }

  const validators = Meta.getValidators(TargetClass[Symbol.metadata], field)
  useValidators(validators, instance[field], instance)
}

function testErrorValidator (TargetClass: new () => any, field: string, preFunc?: (instance: any) => void): void {
  expect(() => {
    testValidator(TargetClass, field, preFunc)
  }).toThrow()
}

describe('Testing validator decorator functions', () => {
  it('should pass the matching test', () => {
    class TestClass {
      @Match(2, { primitiveCheck: false })
      field: number
    }

    testValidator(TestClass, 'field', (x) => {
      x.field = 2
    })
  })
  it('should work with custom function', () => {
    class TestClass {
      value: number

      @Validate((x, instance) => x === instance.value, { primitiveCheck: false })
      field: number
    }

    testValidator(TestClass, 'field', (x) => {
      x.value = 2
      x.field = 2
    })
  })
  it('should work with each member of array', () => {
    class TestClass {
      @Match(2, { each: true, primitiveCheck: false })
      field: number[]
    }

    testValidator(TestClass, 'field', (x) => {
      x.field = [2, 2, 2]
    })
  })
  it('should work with array passed as @Match argument and field with a value', () => {
    class TestClass {
      @Match(['a', 'b', 'c'], { primitiveCheck: false })
      field: string[]
    }

    testValidator(TestClass, 'field', (x) => {
      x.field = 'b'
    })
  })
  it('should work comparing array', () => {
    class TestClass {
      @Match([1, 2, 3], { primitiveCheck: false })
      field: number[]
    }

    testValidator(TestClass, 'field', (x) => {
      x.field = [1, 2, 3]
    })
  })
  it('should work with validate decorator that receive function', () => {
    class TestClass {
      @Validate(x => x[0] === 1, { primitiveCheck: false })
      field: number[]
    }

    testValidator(TestClass, 'field', (x) => {
      x.field = [1, 2, 3]
    })
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

    testValidator(TestClass, 'field', (x) => {
      x.field = 2
    })
    // expect(instance.field).toStrictEqual(Type.ReadWrite)
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

    testValidator(TestClass, 'field', (x) => {
      x.field = [1, 1, 2]
    })
  })
})

describe('Testing validator decorator errors', () => {
  it('should throw an error because no relation is present', () => {
    expect(() => {
      class TestClass {
        @Match(1)
        field: number
      }
    }).toThrow()
  })
  it('should throw an error because the property is not matching the rule', () => {
    class TestClass {
      @Match(1, { primitiveCheck: false })
      field: number
    }

    testErrorValidator(TestClass, 'field', (x) => {
      x.field = 2
    })
  })
  it('should throw an error because an element of the property value is not matching the rule', () => {
    class TestClass {
      @Match(1, { each: true, primitiveCheck: false })
      field: number
    }

    testErrorValidator(TestClass, 'field', (x) => {
      x.field = [1, 1, 2]
    })
  })
  it('should throw an error because the property value is not part of the "enum"', () => {
    enum Type {
      ReadOnly = 1,
      ReadWrite = 2,
    }
    class TestClass {
      @Enum(Type, { primitiveCheck: false })
      field: number
    }

    testErrorValidator(TestClass, 'field', (x) => {
      x.field = 3
    })
  })
})
