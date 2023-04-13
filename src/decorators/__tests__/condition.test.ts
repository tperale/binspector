import { describe, expect } from '@jest/globals'
import { useConditions, IfThen, Choice } from '../condition'
import { type RelationTypeProperty } from '../primitive'
import Meta from '../../metadatas'

describe('Testing the usage of the condition decorator', () => {
  it('should return a "Number" relation', () => {
    class TestClass {
      testField: number = 1
      @IfThen((obj: TestClass) => obj.testField === 1, Number)
      field: number
    }

    const instance = new TestClass()

    const conditions = Meta.getConditions(instance, 'field')

    expect(useConditions(conditions, instance)).toEqual(expect.objectContaining({ relation: Number }))
  })
  it('should work with @Choice decorator and return a "Number" relation', () => {
    class TestClass {
      testField: number = 1
      @Choice('testField', {
        1: Number
      })
      field: number
    }

    const instance = new TestClass()

    const conditions = Meta.getConditions(instance, 'field')

    expect(useConditions(conditions, instance)).toEqual(expect.objectContaining({ relation: Number }))
  })
  it('should work with @Choice that pass parameters', () => {
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

    const instance = new TestClass()

    const conditions = Meta.getConditions(instance, 'field')
    const relation = useConditions(conditions, instance) as RelationTypeProperty<TestClass, TestArg>
    expect(relation).toEqual(expect.objectContaining({ relation: TestArg }))
    expect(relation.args).toBeDefined()

    // @ts-expect-error testing purpose no worry
    const newTestArg = new relation.relation(...relation.args(instance))
    expect(newTestArg).toEqual(expect.objectContaining({ foo: 1 }))
  })
})
