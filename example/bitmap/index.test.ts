import { promises as fs } from 'node:fs'
import path from 'node:path'
import { Bitmap } from './bmp'

test('Testing Bitmap "sample.bmp" read/write equality', async () => {
  const data = await fs.readFile(path.join(__dirname, 'sample.bmp'))
  expect(data.buffer).binReadWriteEquality(Bitmap)
})

test('Testing Bitmap "lena.bmp" read/write equality', async () => {
  const data = await fs.readFile(path.join(__dirname, 'lena.bmp'))
  expect(data.buffer).binReadWriteEquality(Bitmap)
})
