import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PNG } from './png.ts'

test('Testing PNG "sample.png" read/write equality', () => {
  const filename = path.join(path.dirname(fileURLToPath(import.meta.url)), 'sample.png')
  expect(filename).fileReadWriteEquality(PNG)
})
