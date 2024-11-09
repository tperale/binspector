import { test } from '@jest/globals'
import { binread } from '../../src/reader'
import { BinaryReader, BinaryCursorEndianness } from '../../src/cursor'
import { promises as fs } from 'fs'
import path from 'path'
import { Bitmap } from './bmp'

test('', async () => {
  const data = await fs.readFile(path.join(__dirname, 'sample.bmp'))
  const bmp = binread(new BinaryReader(data.buffer, BinaryCursorEndianness.LittleEndian), Bitmap)
  console.log(bmp.toString())
  // bmp.render()
})
