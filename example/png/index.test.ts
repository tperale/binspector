import { test } from '@jest/globals'
import { binread } from '../../src/reader'
import { BinaryCursor } from '../../src/cursor'
import { promises as fs } from 'fs'
import path from 'path'
import { PNG } from './png'

test('', async () => {
  const data = await fs.readFile(path.join(__dirname, 'sample.png'))
  console.log(JSON.stringify(binread(new BinaryCursor(data.buffer), PNG), null, 2))
})
