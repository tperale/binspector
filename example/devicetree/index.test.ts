import { test } from '@jest/globals'
import { binread } from '../../src/reader'
import { BinaryReader } from '../../src/cursor'
import { promises as fs } from 'fs'
import path from 'path'
import { DTB } from './devicetree'

test('', async () => {
  const data = await fs.readFile(path.join(__dirname, 'am335x-bone.dtb'))
  const dts = binread(new BinaryReader(data.buffer), DTB).asObject()
  // console.log(JSON.stringify(dts, null, 2))
})
