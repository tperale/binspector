import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Bitmap } from './bmp.ts'

test('Testing Bitmap "sample.bmp" read/write equality', async () => {
  const filename = path.join(path.dirname(fileURLToPath(import.meta.url)), 'sample.bmp')
  expect(filename).fileReadWriteEquality(Bitmap)
})

test('Testing Bitmap "lena.bmp" read/write equality', async () => {
  const filename = path.join(path.dirname(fileURLToPath(import.meta.url)), 'lena.bmp')
  expect(filename).fileReadWriteEquality(Bitmap)
})
