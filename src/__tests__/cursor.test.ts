import { describe, expect } from '@jest/globals'
import { BinaryReader, BinaryWriter } from '../cursor'
import { EOF, PrimitiveSymbol } from '../types'

describe('Tests on DataFrame through the Cursor object', () => {
  it('should read the project primitives', () => {
    const arr = Uint8Array.from([
      0x09, 0x20, 0xFF, 0x34, 0x56,
    ]).buffer
    const cur = new BinaryReader(arr)
    expect(cur.read(PrimitiveSymbol.u8)).toStrictEqual(9)
    expect(cur.index).toStrictEqual(1)
    expect(cur.read(PrimitiveSymbol.u32)).toStrictEqual(553595990)
    expect(cur.index).toStrictEqual(5)
    // TODO not properly working; expect(cur.read(u32)).toThrowError();
  })
  it('', () => {
    const arr = Uint8Array.from([
      0x09,
    ]).buffer
    const cur = new BinaryReader(arr)
    expect(cur.read(PrimitiveSymbol.u8)).toStrictEqual(9)
    expect(cur.read(PrimitiveSymbol.u8)).toStrictEqual(EOF)
  })
})

describe('Tests BinaryWriter', () => {
  it('should create a basic buffer', () => {
    const bw = new BinaryWriter()
    bw.write(PrimitiveSymbol.u8, 1)
    bw.write(PrimitiveSymbol.u8, 2)

    expect(bw.length).toStrictEqual(2)
    const buf = new Uint8Array(bw.buffer())

    expect(buf[0]).toStrictEqual(1)
    expect(buf[1]).toStrictEqual(2)
  })
})
