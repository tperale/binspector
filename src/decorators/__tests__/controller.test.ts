import { describe, expect } from '@jest/globals'
import { Count, While, Until, useController, ControllerReader } from '../controller'
import { Cursor, BinaryCursor } from '../../cursor'
import { PrimitiveSymbol } from '../../types'
import Meta from '../../metadatas'

class TestCursor extends Cursor {
  offset (): number {
    return 0
  }

  move (address: number): number {
    return address
  }

  constructor () {
    super()
  }
}

function * testReader (list: any[]): Generator<any> {
  for (const x of list) {
    yield x
  }
}

function testControllerGeneric (TargetClass: new () => any, field: string, cursor: Cursor, reader: ControllerReader, equal: any, preFunc?: (instance: any) => void): void {
  const instance = new TargetClass()

  if (preFunc !== undefined) {
    preFunc(instance)
  }

  const controller = Meta.getController(TargetClass[Symbol.metadata] as DecoratorMetadataObject, field)
  if (controller !== undefined) {
    expect(useController(controller, instance, cursor, reader)).toStrictEqual(equal)
  }
}

function testController (TargetClass: new () => any, field: string, reader: ControllerReader, equal: any, preFunc?: (instance: any) => void): void {
  return testControllerGeneric(TargetClass, field, new TestCursor(), reader, equal, preFunc)
}

function testControllerCursor (TargetClass: new () => any, field: string, reader: ControllerReader, equal: any, cursor: BinaryCursor, preFunc?: (instance: any) => void): void {
  return testControllerGeneric(TargetClass, field, cursor, reader, equal, preFunc)
}

describe('@Controller: functions', () => {
  it('@Count: read 3 time', () => {
    class TestClass {
      @Count(3, { primitiveCheck: false })
      field: number
    }

    testController(TestClass, 'field', () => 1, [1, 1, 1], (x) => { x.field = 1 })
  })
  it('@Count: read 2 time based on value retrieved at runtime using recursiveGet', () => {
    class TestClass {
      count = 1

      @Count('count', { primitiveCheck: false })
      field: number
    }

    testController(TestClass, 'field', () => 1, [1, 1], (x) => { x.count = 2 })
  })
  it('@Count: recursiveGet should retrieve child properties', () => {
    class TestClass {
      child = { count: 2 }

      @Count('child.count', { primitiveCheck: false })
      field: number
    }

    testController(TestClass, 'field', () => 1, [1, 1])
  })
  it('@While: read 3 time', () => {
    class TestClass {
      @While((_: any, i: number) => i < 3, { primitiveCheck: false })
      field: number
    }

    testController(TestClass, 'field', () => 1, [1, 1, 1])
  })
  it('@Until: read until \0 is met', () => {
    class TestClass {
      @Until('\0', { targetType: String, primitiveCheck: false })
      field: string
    }

    const iterator = testReader(['h', 'e', 'l', 'l', 'o', '\0'])
    testController(TestClass, 'field', () => iterator.next().value, 'hello\0')
  })
  it('@Until: read until 3 is met', () => {
    class TestClass {
      @Until(3, { primitiveCheck: false })
      field: number
    }

    const iterator = testReader([1, 2, 3])
    testController(TestClass, 'field', () => iterator.next().value, [1, 2, 3])
  })
})

describe('@Controller: functions w/ cursor', () => {
  it('@Count: read 2 bytes with 4 bytes alignment', () => {
    class TestClass {
      @Count(2, { primitiveCheck: false, alignment: 4 })
      field: number
    }

    const cur = new BinaryCursor(new Uint8Array([0x01, 0x02, 0x01, 0x01, 0x05]).buffer)
    testControllerCursor(TestClass, 'field', () => cur.read(PrimitiveSymbol.u8), [1, 2], cur)

    expect(cur.offset()).toStrictEqual(4)
    expect(cur.read(PrimitiveSymbol.u8)).toStrictEqual(5)
    expect(cur.offset()).toStrictEqual(5)
  })
  it('@Count: read 4 bytes with 4 bytes alignment', () => {
    class TestClass {
      @Count(4, { primitiveCheck: false, alignment: 4 })
      field: number
    }

    const cur = new BinaryCursor(new Uint8Array([0x01, 0x02, 0x01, 0x01, 0x05]).buffer)
    testControllerCursor(TestClass, 'field', () => cur.read(PrimitiveSymbol.u8), [1, 2, 1, 1], cur)

    expect(cur.offset()).toStrictEqual(4)
    expect(cur.read(PrimitiveSymbol.u8)).toStrictEqual(5)
    expect(cur.offset()).toStrictEqual(5)
  })
  it('@Until: read using "peek" to move back the cursor', () => {
    class TestClass {
      @Until(0x05, { primitiveCheck: false, peek: true })
      field: number

      next: number
    }

    const cur = new BinaryCursor(new Uint8Array([0x03, 0x01, 0x05]).buffer)
    testControllerCursor(TestClass, 'field', () => cur.read(PrimitiveSymbol.u8), [3, 1], cur)

    expect(cur.offset()).toStrictEqual(2)
    expect(cur.read(PrimitiveSymbol.u8)).toStrictEqual(5)
    expect(cur.offset()).toStrictEqual(3)
  })
  it('@Count: should not move the cursor', () => {
    class TestClass {
      @Count(0, { primitiveCheck: false })
      field: number
    }

    const cur = new BinaryCursor(new Uint8Array([0x03, 0x01, 0x05]).buffer)
    testControllerCursor(TestClass, 'field', () => cur.read(PrimitiveSymbol.u8), [], cur)

    expect(cur.offset()).toStrictEqual(0)
    expect(cur.read(PrimitiveSymbol.u8)).toStrictEqual(0x03)
    expect(cur.offset()).toStrictEqual(1)
  })
})

describe('@Controller: errors', () => {
  it('should throw an error if no primitive defined', () => {
    expect(() => {
      class TestClass {
        @Until(3)
        field: number
      }
    }).toThrow()
  })
})
