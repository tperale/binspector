import { promises as fs } from 'node:fs'
import path from 'node:path'
import { Bson } from './bson.ts'

const USAGE = `
Usage:

> deno run index.ts <file>.bson
`

if (process.argv[1] === import.meta.filename) {
  console.log(JSON.stringify(process.argv))
  const argv = process.argv.slice(2)
  if (argv.length == 1) {
    const data = await fs.readFile(path.join(import.meta.dirname, argv[0]))
    console.log(JSON.stringify(Bson.from(data.buffer).toJson(), null, 2))
  } else {
    console.log(USAGE)
  }
}
