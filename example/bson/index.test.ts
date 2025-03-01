import { promises as fs } from 'fs'
import path from 'path'
import { Bson } from './bson'

test('Testing Bitmap "sample.bmp" read/write equality', async () => {
  // const data = await fs.readFile(path.join(__dirname, 'helloworld.bson'))
  const data = await fs.readFile(path.join(__dirname, 'nested.bson'))
  expect(data.buffer).binReadWriteEquality(Bson)
})
