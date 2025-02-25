import { test } from '@jest/globals'
import { promises as fs } from 'fs'
import path from 'path'
import { PNG } from './png'

test('Testing PNG "sample.png" read/write equality', async () => {
  const data = await fs.readFile(path.join(__dirname, 'sample.png'))
  expect(data.buffer).binReadWriteEquality(PNG)
})
