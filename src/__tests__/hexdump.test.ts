import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'

import BinDump from '../hexdump.ts'
import { BinaryReader } from '../cursor.ts'

const arr = new BinaryReader(new Uint8Array([
  0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0A,
  0x0B, 0x0C, 0x00, 0x00, 0x00, 0x10, 0x11, 0x12, 0x13, 0x14,
  0x15, 0x16, 0x17, 0x18, 0x19, 0x1A, 0x1B, 0x1C, 0x1D, 0x1E,
  0x1F, 0x20, 0x21, 0x22, 0x23, 0x24, 0x25, 0x26, 0x27, 0x28,
  0x29, 0x2A, 0x2B, 0x2C, 0x2D, 0x2E, 0x2F, 0x30, 0x31, 0x32,
]).buffer)

describe('Using the hexdump', () => {
  it('should display the entire bindump', () => {
    console.log(BinDump.show(arr))
    expect(true).toBe(true)
  })
  it('should display parts of the bindump', () => {
    const filename = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../example/devicetree/am335x-bone.dtb')
    const data = fs.readFileSync(filename)
    const arr = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength)
    const curr = new BinaryReader(arr)

    console.log(BinDump.at(curr, 0x10450))
    console.log(BinDump.at(curr, 0x100, 0x120))
    console.log(BinDump.at(curr, 0x102, 0x125))

    expect(true).toBe(true)
  })
})
