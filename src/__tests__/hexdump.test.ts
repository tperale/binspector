import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'

import { BinDump } from '../hexdump.ts'
import { BinaryReader } from '../cursor.ts'

describe('Using the hexdump', () => {
  it('should display the binary', () => {
    const arr = new Uint8Array([
      0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0A,
      0x0B, 0x0C, 0x00, 0x00, 0x00, 0x10, 0x11, 0x12, 0x13, 0x14,
      0x15, 0x16, 0x17, 0x18, 0x19, 0x1A, 0x1B, 0x1C, 0x1D, 0x1E,
      0x1F, 0x20, 0x21, 0x22, 0x23, 0x24, 0x25, 0x26, 0x27, 0x28,
      0x29, 0x2A, 0x2B, 0x2C, 0x2D, 0x2E, 0x2F, 0x30, 0x31, 0x32,
    ]).buffer
    const curr = new BinaryReader(arr)
    console.log(new BinDump(curr).show())
    expect(true).toBe(true)
  })
  it('should display the binary', () => {
    const filename = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../example/devicetree/am335x-bone.dtb')
    const data = fs.readFileSync(filename)
    const arr = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength)

    const curr = new BinaryReader(arr)
    const bd = new BinDump(curr)
    console.log(bd.at(0x154A))
    console.log(bd.at(0x10450))
    expect(true).toBe(true)
  })
})
