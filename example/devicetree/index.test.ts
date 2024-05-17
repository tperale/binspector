import { test } from '@jest/globals'
import { binread } from '../../src/reader'
import { Cursor } from '../../src/cursor'
import { promises as fs } from 'fs'
import path from 'path'
import { DTB } from './devicetree'

test('', async () => {
  const data = await fs.readFile(path.join(__dirname, 'devicetree4.dtb'))
  console.log(JSON.stringify(binread(new Cursor(data.buffer), DTB), null, 2))
  console.log(JSON.stringify(binread(new Cursor(data.buffer), DTB).asObject(), null, 2))
})
