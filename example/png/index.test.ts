import { test } from '@jest/globals'
import { binread } from '../../src/reader'
import { BinaryReader } from '../../src/cursor'
import { promises as fs } from 'fs'
import path from 'path'
import { PNG } from './png'

test('', async () => {
  const data = await fs.readFile(path.join(__dirname, 'sample.png'))
  console.log(JSON.stringify(binread(new BinaryReader(data.buffer), PNG), null, 2))
})
