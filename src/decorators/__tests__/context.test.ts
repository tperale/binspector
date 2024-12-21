import { describe, expect } from '@jest/globals'
import { CtxSet, CtxGet, useContextGet, useContextSet, CtxAppend } from '../context'
import Meta from '../../metadatas'

function testContextGet (TargetClass: new () => any, field: string, ctx: object, expected: any) {
  const instance = new TargetClass()

  const contexts = Meta.getContext(TargetClass[Symbol.metadata] as DecoratorMetadataObject, field)
  expect(useContextGet(contexts, instance, ctx)).toEqual(expected)
}

function testContextSet (TargetClass: new () => any, field: string, value: any, ctx: object) {
  const instance = new TargetClass()

  const contexts = Meta.getContext(TargetClass[Symbol.metadata] as DecoratorMetadataObject, field)
  useContextSet(contexts, value, instance, ctx)
}

describe('@Ctx: functions', () => {
  it('should modify the ctx object', () => {
    class TestClass {
      @CtxSet('test')
      data: number
    }
    const ctx: any = {}
    const VALUE = 1
    testContextSet(TestClass, 'data', VALUE, ctx)
    expect(ctx.test).toEqual(VALUE)
  })
  it('should modify the ctx object with recursive accessors', () => {
    class TestClass {
      @CtxSet('foo.bar.1')
      data: number

      @CtxSet('foo.bar.2')
      data_2: number
    }
    const ctx: any = {}
    const VALUE = 1
    testContextSet(TestClass, 'data', VALUE, ctx)
    testContextSet(TestClass, 'data_2', VALUE, ctx)
    expect(ctx.foo.bar[1]).toEqual(VALUE)
    expect(ctx.foo.bar[2]).toEqual(VALUE)
  })
  it('should get value from the ctx object', () => {
    class TestClass {
      @CtxGet('test')
      data: number
    }
    const VALUE = 1
    const ctx = { test: VALUE }
    testContextGet(TestClass, 'data', ctx, VALUE)
  })
  it('should get value from the ctx object with recursive accessors', () => {
    class TestClass {
      @CtxGet('foo.bar')
      data: number
    }
    const VALUE = 1
    const ctx = { foo: { bar: VALUE } }
    testContextGet(TestClass, 'data', ctx, VALUE)
  })
  it('should get default context value', () => {
    class TestClass {
      @CtxGet('test.foo', 0)
      data: number
    }
    const ctx = { }
    testContextGet(TestClass, 'data', ctx, 0)
  })
  it('should append the value to an array', () => {
    class TestClass {
      @CtxAppend('foo')
      data: number
    }
    const ctx: any = {}
    testContextSet(TestClass, 'data', 0, ctx)
    expect(ctx.foo).toEqual([0])
  })
  it('should concat the value to the existing array', () => {
    class TestClass {
      @CtxAppend('foo')
      data: number[]
    }
    const ctx: any = { foo: [1, 2] }
    testContextSet(TestClass, 'data', [3, 4], ctx)
    expect(ctx.foo).toEqual([1, 2, 3, 4])
  })
  it('should throw when accessing non existing properties', () => {
    class TestClass {
      @CtxGet('test.foo')
      data: number
    }
    const VALUE = 1
    const ctx = { test: VALUE }
    expect(() => testContextGet(TestClass, 'data', ctx, VALUE)).toThrow()
  })
})
