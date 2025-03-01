import { promises as fs } from 'fs'
import path from 'path'
import { Bson } from './bson'

test('Testing BSON "helloworld.bson" read/write equality', async () => {
  const data = await fs.readFile(path.join(__dirname, 'helloworld.bson'))
  expect(data.buffer).binReadWriteEquality(Bson)
})

test('Testing BSON "nested.bson" read/write equality', async () => {
  const data = await fs.readFile(path.join(__dirname, 'nested.bson'))
  expect(data.buffer).binReadWriteEquality(Bson)
})
