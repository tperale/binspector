import { test } from '@jest/globals'
import { promises as fs } from 'fs'
import path from 'path'
import { DTB } from './devicetree'

test('Testing DTB "am335x-bone.dtb" read/write equality', async () => {
  const data = await fs.readFile(path.join(__dirname, 'am335x-bone.dtb'))
  expect(data.buffer).binReadWriteEquality(DTB)
})
