import { describe, expect } from '@jest/globals'
import { BinaryCursor } from '../cursor'
import { EOF, PrimitiveSymbol } from '../types'

describe('Tests on DataFrame through the Cursor object', () => {
  it('should read the project primitives', () => {
    const arr = Uint8Array.from([
      0x09, 0x20, 0xFF, 0x34, 0x56
    ]).buffer
    const cur = new BinaryCursor(arr)
    expect(cur.read(PrimitiveSymbol.u8)).toStrictEqual(9)
    expect(cur.index).toStrictEqual(1)
    expect(cur.read(PrimitiveSymbol.u32)).toStrictEqual(553595990)
    expect(cur.index).toStrictEqual(5)
    // TODO not properly working; expect(cur.read(u32)).toThrowError();
  })
  it('', () => {
    const arr = Uint8Array.from([
      0x09
    ]).buffer
    const cur = new BinaryCursor(arr)
    expect(cur.read(PrimitiveSymbol.u8)).toStrictEqual(9)
    expect(cur.read(PrimitiveSymbol.u8)).toStrictEqual(EOF)
  })
})
