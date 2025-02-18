import { describe, expect } from '@jest/globals'
import { Count, While, Until, MapTo, Matrix, useController, ControllerReader, Size } from '../controller'
import { Cursor, BinaryReader } from '../../cursor'
import { PrimitiveSymbol, EOF } from '../../types'
import { EOFError, RelationNotDefinedError } from '../../error'
import Meta from '../../metadatas'

class TestCursor extends Cursor {
  offset (): number {
    return 0
  }

  move (address: number): number {
    return address
  }

  read (_: PrimitiveSymbol): string | number | bigint | typeof EOF {
    return 0
  }

  write (_: PrimitiveSymbol, _2: number | string): void {
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

  const controllers = Meta.getControllers(TargetClass[Symbol.metadata] as DecoratorMetadataObject, field)
  if (controllers !== undefined) {
    expect(useController(controllers, instance, cursor, reader)).toStrictEqual(equal)
  }
}

function testController (TargetClass: new () => any, field: string, reader: ControllerReader, equal: any, preFunc?: (instance: any) => void): void {
  return testControllerGeneric(TargetClass, field, new TestCursor(), reader, equal, preFunc)
}

function testControllerCursor (TargetClass: new () => any, field: string, reader: ControllerReader, equal: any, cursor: BinaryReader, preFunc?: (instance: any) => void): void {
  return testControllerGeneric(TargetClass, field, cursor, reader, equal, preFunc)
}

describe('@Controller: functions', () => {
  it('@Count: read 3 time', () => {
    class TestClass {
      @Count(3, { primitiveCheck: false })
      field: number
    }

    testController(
      TestClass,
      'field',
      () => 1, [1, 1, 1],
      (x) => { x.field = 1 },
    )
  })
  it('@Count: read 2 time based on value retrieved at runtime using recursiveGet', () => {
    class TestClass {
      count = 1

      @Count('count', { primitiveCheck: false })
      field: number
    }

    testController(
      TestClass,
      'field',
      () => 1, [1, 1],
      (x) => { x.count = 2 },
    )
  })
  it('@Count: recursiveGet should retrieve child properties', () => {
    class TestClass {
      child = { count: 2 }

      @Count('child.count', { primitiveCheck: false })
      field: number
    }

    testController(TestClass, 'field', () => 1, [1, 1])
  })
  it('@Count: recursiveGet should support simple arithmetic', () => {
    class TestClass {
      child = { offsetStart: 2, offsetEnd: 5 }

      @Count('child.offsetEnd - child.offsetStart', { primitiveCheck: false })
      field: number
    }

    testController(TestClass, 'field', () => 1, [1, 1, 1])
  })
  it('@Count: recursiveGet should support simple arithmetic with number', () => {
    class TestClass {
      child = { count: 2 }

      @Count('child.count + 1', { primitiveCheck: false })
      field: number
    }

    testController(TestClass, 'field', () => 1, [1, 1, 1])
  })
  it('@Count: recursiveGet should support simple arithmetic with number', () => {
    class TestClass {
      child = { count: 2 }

      @Count('2 - 1', { primitiveCheck: false })
      field: number
    }

    testController(TestClass, 'field', () => 1, [1])
  })
  it('@Count: recursiveGet should support simple arithmetic', () => {
    class TestClass {
      child = { offsetStart: 2, offsetEnd: 5 }

      @Count('child.offsetEnd - child.offsetStart', { primitiveCheck: false })
      field: number
    }

    testController(TestClass, 'field', () => 1, [1, 1, 1])
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
  it('@Matrix: should retrieve a matrix line', () => {
    class TestClass {
      @Matrix(4, 2, { primitiveCheck: false })
      field: number
    }

    testController(TestClass, 'field', () => 1, [
      [1, 1, 1, 1],
      [1, 1, 1, 1],
    ])
  })
  it('@Matrix: recreate the Matrix decorator using Controller chaining', () => {
    class TestClass {
      @Count(2, { primitiveCheck: false })
      @Count(4, { primitiveCheck: false })
      field: number
    }

    testController(TestClass, 'field', () => 1, [
      [1, 1, 1, 1],
      [1, 1, 1, 1],
    ])
  })
  it('@MapTo: pass the array to the reader function', () => {
    class TestClass {
      @MapTo([1, 2, 3, 4], { primitiveCheck: false })
      field: number
    }

    testController(TestClass, 'field', x => x, [1, 2, 3, 4])
  })
})

describe('@Controller: functions w/ cursor', () => {
  it('@Count: read 2 bytes with 4 bytes alignment', () => {
    class TestClass {
      @Count(2, { primitiveCheck: false, alignment: 4 })
      field: number
    }

    const cur = new BinaryReader(new Uint8Array([0x01, 0x02, 0x01, 0x01, 0x05]).buffer)
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

    const cur = new BinaryReader(new Uint8Array([0x01, 0x02, 0x01, 0x01, 0x05]).buffer)
    testControllerCursor(TestClass, 'field', () => cur.read(PrimitiveSymbol.u8), [1, 2, 1, 1], cur)

    expect(cur.offset()).toStrictEqual(4)
    expect(cur.read(PrimitiveSymbol.u8)).toStrictEqual(5)
    expect(cur.offset()).toStrictEqual(5)
  })
  it('@Until: read using "peek" to move back the cursor', () => {
    class TestClass {
      @Until(0x05, { primitiveCheck: false, peek: true })
      field: number
    }

    const cur = new BinaryReader(new Uint8Array([0x03, 0x01, 0x05]).buffer)
    testControllerCursor(TestClass, 'field', () => cur.read(PrimitiveSymbol.u8), [3, 1], cur)

    expect(cur.offset()).toStrictEqual(2)
    expect(cur.read(PrimitiveSymbol.u8)).toStrictEqual(5)
    expect(cur.offset()).toStrictEqual(3)
  })
  it('@Until: read until the end of the cursor', () => {
    class TestClass {
      @Until(EOF, { primitiveCheck: false })
      field: number
    }

    const cur = new BinaryReader(new Uint8Array([0x01, 0x02, 0x03, 0x04]).buffer)
    testControllerCursor(TestClass, 'field', () => cur.read(PrimitiveSymbol.u8), [1, 2, 3, 4], cur)
  })
  it('@Count: should not move the cursor', () => {
    class TestClass {
      @Count(0, { primitiveCheck: false })
      field: number
    }

    const cur = new BinaryReader(new Uint8Array([0x03, 0x01, 0x05]).buffer)
    testControllerCursor(TestClass, 'field', () => cur.read(PrimitiveSymbol.u8), [], cur)

    expect(cur.offset()).toStrictEqual(0)
    expect(cur.read(PrimitiveSymbol.u8)).toStrictEqual(0x03)
    expect(cur.offset()).toStrictEqual(1)
  })
  it('@Matrix: should retrieve a matrix with each line aligned to 4 bytes', () => {
    class TestClass {
      @Matrix(3, 3, { primitiveCheck: false, alignment: 4 })
      field: number
    }

    const cur = new BinaryReader(new Uint8Array([
      0x01, 0x02, 0x03, 0x04,
      0x05, 0x06, 0x07, 0x08,
      0x09, 0x0A, 0x0B, 0x0C,
    ]).buffer)
    testControllerCursor(TestClass, 'field', () => cur.read(PrimitiveSymbol.u8), [
      [0x01, 0x02, 0x03],
      [0x05, 0x06, 0x07],
      [0x09, 0x0A, 0x0B],
    ], cur)

    expect(cur.offset()).toStrictEqual(12)
  })
  it('@Size: create an array of 3 byte size', () => {
    class TestClass {
      @Size(3, { primitiveCheck: false })
      field: number
    }

    const cur = new BinaryReader(new Uint8Array([
      0x1, 0x2, 0x3, 0x4, 0x5, 0x6, 0x7,
    ]).buffer)
    testControllerCursor(TestClass, 'field', () => cur.read(PrimitiveSymbol.u8), [1, 2, 3], cur)
  })

  it('@Size: create an array of 2 byte size based on another field value', () => {
    class TestClass {
      count = 2

      @Size('count', { primitiveCheck: false })
      field: number
    }

    const cur = new BinaryReader(new Uint8Array([
      0x1, 0x2, 0x3, 0x4, 0x5, 0x6, 0x7,
    ]).buffer)
    cur.move(2)
    testControllerCursor(TestClass, 'field', () => cur.read(PrimitiveSymbol.u8), [3, 4], cur)
  })
})

describe('@Controller: errors', () => {
  it('should throw an error if no primitive defined', () => {
    expect(() => {
      class TestClass {
        @Until(3)
        field: number
      }
    }).toThrow(RelationNotDefinedError)
  })
  it('@Count: should throw EOFError', () => {
    expect(() => {
      class TestClass {
        @Count(1, { primitiveCheck: false })
        field: number
      }
      const cur = new BinaryReader(new Uint8Array([]).buffer)
      testControllerCursor(TestClass, 'field', () => cur.read(PrimitiveSymbol.u8), [], cur)
    }).toThrow(EOFError)
  })
  it('@Count: recursiveGet should throw an error when referencing a string in an arithmetic expression', () => {
    expect(() => {
      class TestClass {
        child = { count: 'hello' }

        @Count('child.count - 2', { primitiveCheck: false })
        field: number
      }

      testController(TestClass, 'field', () => 1, [1])
    }).toThrow(ReferenceError)
  })
})
