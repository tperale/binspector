import { promises as fs } from 'node:fs'
import path from 'node:path'
import { Bson } from './bson'

test('Testing BSON "helloworld.bson" read/write equality', async () => {
  const data = await fs.readFile(path.join(__dirname, 'helloworld.bson'))
  expect(data.buffer).binReadWriteEquality(Bson)
})

test('Testing BSON "nested.bson" read/write equality', async () => {
  const data = await fs.readFile(path.join(__dirname, 'nested.bson'))
  expect(data.buffer).binReadWriteEquality(Bson)
})
