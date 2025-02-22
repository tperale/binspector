import { describe, expect } from '@jest/globals'
import { BinaryCursorEndianness, BinaryReader, BinaryWriter } from '../cursor'
import { EOF, PrimitiveSymbol } from '../types'

function testBinaryReader<T extends readonly [] | readonly PrimitiveSymbol[]> (arr: number[], sequence: T, result: { [K in keyof T]: number | bigint }, endian = BinaryCursorEndianness.BigEndian): BinaryReader {
  const buf = Uint8Array.from(arr).buffer
  const cur = new BinaryReader(buf)
  cur.setEndian(endian)

  sequence.map((prim: PrimitiveSymbol, i: number) => expect(cur.read(prim)).toEqual(result[i]))

  return cur
}

function testFloatBinaryReader<T extends readonly [] | readonly PrimitiveSymbol[]> (arr: number[], sequence: T, result: { [K in keyof T]: number | bigint }, endian = BinaryCursorEndianness.BigEndian): BinaryReader {
  const buf = Uint8Array.from(arr).buffer
  const cur = new BinaryReader(buf)
  cur.setEndian(endian)

  sequence.map((prim: PrimitiveSymbol, i: number) => expect(cur.read(prim)).toBeCloseTo(result[i] as number))

  return cur
}

function testReadWriteEquality (arr: number[], sequence: PrimitiveSymbol[], endian = BinaryCursorEndianness.BigEndian): void {
  const buf_in = Uint8Array.from(arr)
  const br = new BinaryReader(buf_in.buffer)
  br.setEndian(endian)

  const content = sequence.map((prim: PrimitiveSymbol) => br.read(prim))

  const bw = new BinaryWriter()
  bw.setEndian(endian)
  sequence.map((prim: PrimitiveSymbol, i: number) => bw.write(prim, content[i] as number | bigint))

  const buf_out = new Uint8Array(bw.buffer())

  for (let i = 0; i != buf_in.byteLength; i++) {
    expect(buf_in[i]).toStrictEqual(buf_out[i])
  }
}

describe('Tests BinaryReader', () => {
  it('BinaryReader: reads a sequence', () => {
    const cur = testBinaryReader([0x09, 0x20, 0xFF, 0x34, 0x56], [PrimitiveSymbol.u8, PrimitiveSymbol.u32], [0x09, 0x20FF3456])
    expect(cur.index).toStrictEqual(5)
  })
  it('BinaryReader: reads EOF', () => {
    const cur = testBinaryReader([0x09], [PrimitiveSymbol.u8], [9])
    expect(cur.read(PrimitiveSymbol.u8)).toStrictEqual(EOF)
  })
  it('u16: reads u16', () => {
    testBinaryReader([0x12, 0x34], [PrimitiveSymbol.u16], [0x1234])
  })
  it('u16: reads LittleEndian', () => {
    const cur = testBinaryReader([0x12, 0x34], [PrimitiveSymbol.u16], [0x3412], BinaryCursorEndianness.LittleEndian)
    expect(cur.getEndian()).toStrictEqual(BinaryCursorEndianness.LittleEndian)
  })
  it('u64: reads bigint under 2^53', () => {
    testBinaryReader([0x00, 0x00, 0x56, 0x78, 0x9A, 0xBC, 0xDE, 0xFF], [PrimitiveSymbol.u64], [BigInt(0x56789ABCDEFF)])
  })
  it('u64: reads bigint over 2^53', () => {
    testBinaryReader([0x12, 0x34, 0x56, 0x78, 0x9A, 0xBC, 0xDE, 0xFF], [PrimitiveSymbol.u64], [BigInt('0x123456789ABCDEFF')])
  })
  it('float32: read 0', () => {
    testBinaryReader([0x00, 0x00, 0x00, 0x00], [PrimitiveSymbol.float32], [0])
  })
  it('float32: single precision float', () => {
    testFloatBinaryReader([0x44, 0x9a, 0x52, 0x2b], [PrimitiveSymbol.float32], [1234.5678])
    testFloatBinaryReader([0x2b, 0x52, 0x9a, 0x44], [PrimitiveSymbol.float32], [1234.5678], BinaryCursorEndianness.LittleEndian)
  })
  it('float64: double precision float', () => {
    testFloatBinaryReader([0x40, 0x93, 0x4a, 0x45, 0x6d, 0x5c, 0xfa, 0xad], [PrimitiveSymbol.float64], [1234.5678])
    testFloatBinaryReader([0xad, 0xfa, 0x5c, 0x6d, 0x45, 0x4a, 0x93, 0x40], [PrimitiveSymbol.float64], [1234.5678], BinaryCursorEndianness.LittleEndian)
  })
})

describe('Tests read -> write equality', () => {
  it('u64: BigInt', () => {
    testReadWriteEquality([0x12, 0x34, 0x56, 0x78, 0x9A, 0xBC, 0xDE, 0xFF], [PrimitiveSymbol.u64])
    testReadWriteEquality([0x12, 0x34, 0x56, 0x78, 0x9A, 0xBC, 0xDE, 0xFF], [PrimitiveSymbol.u64], BinaryCursorEndianness.LittleEndian)
  })
  it('float32: single precision float 32', () => {
    testReadWriteEquality([0x44, 0x9a, 0x52, 0x2b], [PrimitiveSymbol.float32])
    testReadWriteEquality([0x2b, 0x52, 0x9a, 0x44], [PrimitiveSymbol.float32], BinaryCursorEndianness.LittleEndian)
  })
  it('float64: double precision float', () => {
    testReadWriteEquality([0x40, 0x93, 0x4a, 0x45, 0x6d, 0x5c, 0xfa, 0xad], [PrimitiveSymbol.float64])
    testReadWriteEquality([0xad, 0xfa, 0x5c, 0x6d, 0x45, 0x4a, 0x93, 0x40], [PrimitiveSymbol.float64], BinaryCursorEndianness.LittleEndian)
  })
})
