import { describe, expect } from '@jest/globals'
import { Count, While, Until, useController, ControllerReader } from '../controller'
import { Cursor } from '../../cursor'
import { PrimitiveSymbol } from '../../types'
import Meta from '../../metadatas'

class TestReader extends ControllerReader {
  offset (): number {
    return 0
  }

  move (address: number): number {
    return address
  }

  constructor (read: () => any) {
    super(read)
  }
}

class BinReader extends ControllerReader {
  _cursor: Cursor

  offset (): number {
    return this._cursor.offset()
  }

  move (address: number): number {
    return this._cursor.move(address)
  }

  constructor(reader: () => any, cursor: Cursor) {
    super(reader)
    this._cursor = cursor
  }
}

function * testReader (list: any[]): Generator<any> {
  for (const x of list) {
    yield x
  }
}

function testControllerGeneric (TargetClass: new () => any, field: string, reader: ControllerReader, equal: any, preFunc?: (instance: any) => void): void {
  const instance = new TargetClass()

  if (preFunc !== undefined) {
    preFunc(instance)
  }

  const controller = Meta.getController(TargetClass[Symbol.metadata] as DecoratorMetadataObject, field)
  if (controller !== undefined) {
    expect(useController(controller, instance, reader)).toStrictEqual(equal)
  }
}

function testController (TargetClass: new () => any, field: string, reader: () => any, equal: any, preFunc?: (instance: any) => void): void {
  return testControllerGeneric(TargetClass, field, new TestReader(reader), equal, preFunc)
}

function testControllerCursor (TargetClass: new () => any, field: string, reader: () => any, equal: any, cursor: Cursor, preFunc?: (instance: any) => void): void {
  return testControllerGeneric(TargetClass, field, new BinReader(reader, cursor), equal, preFunc)
}

describe('@Controller: functions', () => {
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
})

describe('@Controller: functions w/ cursor', () => {
  it('should read 2 bytes and move the cursor to be aligned to 4 bytes', () => {
    class TestClass {
      @Count(2, { primitiveCheck: false, alignment: 4 })
      field: number
    }

    const cur = new Cursor(new Uint8Array([0x01, 0x02, 0x01, 0x01, 0x05]).buffer)
    testControllerCursor(TestClass, 'field', () => cur.read(PrimitiveSymbol.u8), [1, 2], cur)

    expect(cur.offset()).toStrictEqual(4)
    expect(cur.read(PrimitiveSymbol.u8)).toStrictEqual(5)
    expect(cur.offset()).toStrictEqual(5)
  })
  it('should read 4 bytes and move the cursor to be aligned to 4 bytes', () => {
    class TestClass {
      @Count(4, { primitiveCheck: false, alignment: 4 })
      field: number
    }

    const cur = new Cursor(new Uint8Array([0x01, 0x02, 0x01, 0x01, 0x05]).buffer)
    testControllerCursor(TestClass, 'field', () => cur.read(PrimitiveSymbol.u8), [1, 2, 1, 1], cur)

    expect(cur.offset()).toStrictEqual(4)
    expect(cur.read(PrimitiveSymbol.u8)).toStrictEqual(5)
    expect(cur.offset()).toStrictEqual(5)
  })
  it('should read the field until receive a number 5 and then move the cursor back to the previous position before reading it', () => {
    class TestClass {
      @While((x: any) => x !== 5, { primitiveCheck: false, peek: true })
      field: number

      next: number
    }

    const cur = new Cursor(new Uint8Array([0x03, 0x01, 0x05]).buffer)
    testControllerCursor(TestClass, 'field', () => cur.read(PrimitiveSymbol.u8), [3, 1], cur)

    expect(cur.offset()).toStrictEqual(2)
    expect(cur.read(PrimitiveSymbol.u8)).toStrictEqual(5)
    expect(cur.offset()).toStrictEqual(3)
  })
  it('should not move the Cursor if Count(0) is used', () => {
    class TestClass {
      @Count(0, { primitiveCheck: false })
      field: number
    }

    const cur = new Cursor(new Uint8Array([0x03, 0x01, 0x05]).buffer)
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
