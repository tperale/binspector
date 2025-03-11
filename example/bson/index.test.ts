import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Bson } from './bson.ts'

test('Testing BSON "helloworld.bson" read/write equality', () => {
  const filename = path.join(path.dirname(fileURLToPath(import.meta.url)), 'helloworld.bson')
  expect(filename).fileReadWriteEquality(Bson)
})

test('Testing BSON "nested.bson" read/write equality', () => {
  const filename = path.join(path.dirname(fileURLToPath(import.meta.url)), 'nested.bson')
  expect(filename).fileReadWriteEquality(Bson)
})
