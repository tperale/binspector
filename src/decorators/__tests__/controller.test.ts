import { describe, expect } from '@jest/globals'
import { Count, While, Until, useController } from '../controller'
import { Cursor } from '../../cursor'
import { PrimitiveSymbol } from '../../types'
import Meta from '../../metadatas'

function * testReader (list: any[]): Generator<any> {
  for (const x of list) {
    yield x
  }
}

function testController (TargetClass: new () => any, field: string, reader: () => any, equal: any, preFunc?: (instance: any) => void, cursor?: Cursor): void {
  const instance = new TargetClass()

  if (preFunc !== undefined) {
    preFunc(instance)
  }

  const controller = Meta.getController(TargetClass[Symbol.metadata] as DecoratorMetadataObject, field)
  if (controller !== undefined) {
    expect(useController(controller, instance, reader, cursor)).toStrictEqual(equal)
  }
}

describe('Testing the usage of the controller decorator', () => {
  it('should read 3 time the field property', () => {
    class TestClass {
      @Count(3, { primitiveCheck: false })
      field: number
    }

    testController(TestClass, 'field', () => 1, [1, 1, 1], (x) => { x.field = 1 })
  })
  it('should read 2 time the field property based on the runtime value of property of TestClass using recursiveGet', () => {
    class TestClass {
      count = 1

      @Count('count', { primitiveCheck: false })
      field: number
    }

    testController(TestClass, 'field', () => 1, [1, 1], (x) => { x.count = 2 })
  })
  it('should use recursiveGet to get child property', () => {
    class TestClass {
      child = { count: 2 }

      @Count('child.count', { primitiveCheck: false })
      field: number
    }

    testController(TestClass, 'field', () => 1, [1, 1])
  })
  it('should read 3 using a function defined by while decorator', () => {
    class TestClass {
      @While((_: any, i: number) => i < 3, { primitiveCheck: false })
      field: number
    }

    testController(TestClass, 'field', () => 1, [1, 1, 1])
  })
  it('should read the field based on the other field value', () => {
    class TestClass {
      @Until('\0', { targetType: String, primitiveCheck: false })
      field: string
    }

    const iterator = testReader(['h', 'e', 'l', 'l', 'o', '\0'])
    testController(TestClass, 'field', () => iterator.next().value, 'hello\0')
  })
  it('should read the field based until it receive a number 3', () => {
    class TestClass {
      @Until(3, { primitiveCheck: false })
      field: number
    }

    const iterator = testReader([1, 2, 3])
    testController(TestClass, 'field', () => iterator.next().value, [1, 2, 3])
  })
  it('should read 2 bytes and move the cursor to be aligned to 4 bytes', () => {
    class TestClass {
      @Count(2, { alignment: 4 })
      field: number
    }

    const cur = new Cursor(new Uint8Array([0x01, 0x02, 0x01, 0x01, 0x05]).buffer)
    testController(TestClass, 'field', () => cur.read(PrimitiveSymbol.u8), [1, 2], undefined, cur)

    expect(cur.offset()).toStrictEqual(4)
    expect(cur.read(PrimitiveSymbol.u8)).toStrictEqual(5)
    expect(cur.offset()).toStrictEqual(5)
  })
  it('should read 4 bytes and move the cursor to be aligned to 4 bytes', () => {
    class TestClass {
      @Count(4, { alignment: 4 })
      field: number
    }

    const cur = new Cursor(new Uint8Array([0x01, 0x02, 0x01, 0x01, 0x05]).buffer)
    testController(TestClass, 'field', () => cur.read(PrimitiveSymbol.u8), [1, 2, 1, 1], undefined, cur)

    expect(cur.offset()).toStrictEqual(4)
    expect(cur.read(PrimitiveSymbol.u8)).toStrictEqual(5)
    expect(cur.offset()).toStrictEqual(5)
  })
  it('should read the field until receive a number 5 and then move the cursor back to the previous position before reading it', () => {
    class TestClass {
      @While((x: any) => x !== 5, { peek: true })
      field: number

      next: number
    }

    const cur = new Cursor(new Uint8Array([0x03, 0x01, 0x05]).buffer)
    testController(TestClass, 'field', () => cur.read(PrimitiveSymbol.u8), [3, 1], undefined, cur)

    expect(cur.offset()).toStrictEqual(2)
    expect(cur.read(PrimitiveSymbol.u8)).toStrictEqual(5)
    expect(cur.offset()).toStrictEqual(3)
  })
  it('should throw an error if no primitive defined', () => {
    expect(() => {
      class TestClass {
        @Until(3)
        field: number
      }
    }).toThrow()
  })
})
