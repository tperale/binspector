import { describe, expect } from '@jest/globals'
import { useConditions, IfThen, Else, Choice } from '../condition'
import { type RelationTypeProperty } from '../primitive'
import { Cursor } from '../../cursor'
import { PrimitiveSymbol } from '../../types'
import Meta from '../../metadatas'

describe('Testing the usage of the condition decorator', () => {
  it('should return a "Number" relation from @IfThen decorator', () => {
    class TestClass {
      testField: number = 1
      @IfThen((obj: TestClass) => obj.testField === 1, Number)
      field: number
    }

    const instance = new TestClass()

    const conditions = Meta.getConditions(TestClass[Symbol.metadata] as DecoratorMetadataObject, 'field')

    expect(useConditions(conditions, instance)).toEqual(expect.objectContaining({ relation: Number }))
  })
  it('should return a "String" relation from @Else decorator', () => {
    class TestClass {
      @IfThen((_) => false, Number)
      @Else(String)
      field: number
    }

    const instance = new TestClass()
    const conditions = Meta.getConditions(TestClass[Symbol.metadata] as DecoratorMetadataObject, 'field')

    expect(useConditions(conditions, instance)).toEqual(expect.objectContaining({ relation: String }))
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

    const conditions = Meta.getConditions(TestClass[Symbol.metadata] as DecoratorMetadataObject, 'field')

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

    const conditions = Meta.getConditions(TestClass[Symbol.metadata] as DecoratorMetadataObject, 'field')
    const relation = useConditions(conditions, instance) as RelationTypeProperty
    expect(relation).toEqual(expect.objectContaining({ relation: TestArg }))
    expect(relation.args).toBeDefined()

    // @ts-expect-error testing purpose no worry
    const newTestArg = new relation.relation(...relation.args(instance))
    expect(newTestArg).toEqual(expect.objectContaining({ foo: 1 }))
  })
  it('should work with @Choice that with comma separeted parameters', () => {
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

    const instance = new TestClass()

    const conditions = Meta.getConditions(TestClass[Symbol.metadata] as DecoratorMetadataObject, 'field')
    const relation = useConditions(conditions, instance) as RelationTypeProperty

    expect(relation).toEqual(expect.objectContaining({ relation: TestArg }))
    expect(relation.args).toBeDefined()

    // @ts-expect-error testing purpose no worry
    const newTestArg = new relation.relation(...relation.args(instance))
    expect(newTestArg).toEqual(expect.objectContaining({ foo: 1, bar: 2 }))
  })
  it('should throw an error because no condition match', () => {
    class TestClass {
      @IfThen((_) => false, Number)
      field: number
    }

    const instance = new TestClass()
    const conditions = Meta.getConditions(TestClass[Symbol.metadata] as DecoratorMetadataObject, 'field')

    expect(() => {
      useConditions(conditions, instance)
    }).toThrow()
  })
 
})
