import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { DTB } from './devicetree'

test('Testing DTB "am335x-bone.dtb" read/write equality', async () => {
  const filename = path.join(path.dirname(fileURLToPath(import.meta.url)), 'am335x-bone.dtb')
  expect(filename).fileReadWriteEquality(DTB)
})
