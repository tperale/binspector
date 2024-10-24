import { describe, expect } from '@jest/globals'
import { useConditions, IfThen, Else, Choice } from '../condition'
import { type RelationTypeProperty, type PrimitiveTypeProperty } from '../primitive'
import { NoConditionMatched } from '../../error'
import Meta from '../../metadatas'

function testCondition (TargetClass: new () => any, relation: any, post?: (relation: PrimitiveTypeProperty | RelationTypeProperty | undefined, instance: any) => void, field: string = 'field') {
  const instance = new TargetClass()

  const conditions = Meta.getConditions(TargetClass[Symbol.metadata] as DecoratorMetadataObject, field)
  const result = useConditions(conditions, instance)

  expect(result).toEqual(expect.objectContaining({ relation }))

  if (post !== undefined) {
    post(result, instance)
  }
}

describe('@Condition: basic testing', () => {
  it('@IfThen: return a Number relation', () => {
    class TestClass {
      testField: number = 1
      @IfThen((obj: TestClass) => obj.testField === 1, Number)
      field: number
    }

    testCondition (TestClass, Number)
  })
  it('@Else: return a "String" relation', () => {
    class TestClass {
      @IfThen((_) => false, Number)
      @Else(String)
      field: number
    }

    testCondition (TestClass, String)
  })
  it('@IfThen: return a "Number" relation everytime the condition are checked', () => {
    class TestClass {
      @IfThen((_) => true, Number)
      @Else(String)
      field: number
    }

    testCondition (TestClass, Number)
    // A bug used to be present that would mix the order of the conditions
    // everytime they were called
    testCondition (TestClass, Number)
  })
  it('@Choice: return a "Number" relation by matching "testField" value', () => {
    class TestClass {
      testField: number = 1
      @Choice('testField', {
        1: Number
      })
      field: number
    }

    testCondition (TestClass, Number)
  })
  it('@Choice: pass a single parameters to a child relation', () => {
    class TestArg {
      foo: number

      constructor (foo: number) {
        this.foo = foo
      }
    }
    class TestClass {
      testField: number = 1
      @Choice('testField', {
        1: [TestArg, (instance: TestClass) => [instance.testField]]
      })
      field: TestArg
    }

    testCondition (TestClass, TestArg, (relation, instance) => {
      expect(relation).toBeDefined()
      expect(relation).toEqual(expect.objectContaining({ relation: TestArg }))
      // @ts-expect-error relation already tested
      expect(relation.args).toBeDefined()

      // @ts-expect-error testing purpose no worry
      const newTestArg = new relation.relation(...relation.args(instance))
      expect(newTestArg).toEqual(expect.objectContaining({ foo: 1 }))
    })
  })
  it('@Choice: pass multiple parameters to child relation constructor', () => {
    class TestArg {
      foo: number
      bar: number

      constructor (foo: number, bar: number) {
        this.foo = foo
        this.bar = bar
      }
    }

    class TestClass {
      foo: number = 1
      bar: number = 2
      @Choice('foo', {
        1: [TestArg, 'foo, bar']
      })
      field: TestArg
    }

    testCondition (TestClass, TestArg, (relation, instance) => {
      expect(relation).toBeDefined()
      expect(relation).toEqual(expect.objectContaining({ relation: TestArg }))
      // @ts-expect-error relation already tested
      expect(relation.args).toBeDefined()

      // @ts-expect-error testing purpose no worry
      const newTestArg = new relation.relation(...relation.args(instance))
      expect(newTestArg).toEqual(expect.objectContaining({ foo: 1, bar: 2 }))
    })
  })
})

describe('@Condition: error testing', () => {
  it('NoConditionMatched: should alway define a valid option', () => {
    class TestClass {
      @IfThen((_) => false, Number)
      field: number
    }

    const instance = new TestClass()
    const conditions = Meta.getConditions(TestClass[Symbol.metadata] as DecoratorMetadataObject, 'field')

    expect(() => {
      useConditions(conditions, instance)
    }).toThrow(NoConditionMatched)
  })
})
