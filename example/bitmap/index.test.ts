import { test } from '@jest/globals'
import { binread } from '../../src/reader'
import { Cursor, CursorEndianness  } from '../../src/cursor'
import { promises as fs } from 'fs'
import path from 'path'
import { Bitmap } from './bmp'

test('', async () => {
  const data = await fs.readFile(path.join(__dirname, 'sample.bmp'))
  const bmp = binread(new Cursor(data.buffer, CursorEndianness.LittleEndian), Bitmap)
  // console.log(JSON.stringify(bmp, null, 2))
  bmp.render()
})
