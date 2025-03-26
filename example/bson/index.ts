import fs from 'node:fs'
import path from 'node:path'
import { Bson } from './bson.ts'
import BinDump, { type MetaBinReadClass } from '../../src/bindump.ts'

const USAGE = `
Usage: deno run index.ts [options] <file>.bson

Show the content of a BSON binary file as a JSON object using binspector.

Arguments:
  file                BSON file to read.

Options:
  -j, --to-json       Output the content as a JSON object.
  -d, --dump          Dump the content of the BSON binary in bindump format.
  -h, --help          Display this help.
`

function parseArgument (argv: string[]) {
  const result = {
    toJson: false,
    dump: false,
    help: false,
    filename: '',
  }

  argv.forEach((arg) => {
    if (arg === '-j' || arg === '--to-json') {
      result.toJson = true
    } else if (arg === '-d' || arg === '--dump') {
      result.dump = true
    } else if (arg === '-h' || arg === '--help') {
      result.help = true
    } else if ((arg = path.join(import.meta.dirname, arg)) && fs.existsSync(arg)) {
      result.filename = arg
    }
  })

  return result
}

if (process.argv[1] === import.meta.filename) {
  console.log(JSON.stringify(process.argv))
  const args = parseArgument(process.argv.slice(2))
  if (args.filename.length) {
    const data = fs.readFileSync(args.filename)

    const meta = {}
    const bson = Bson.from(data.buffer, meta)
    if (args.help) {
      console.log(USAGE)
    } else if (args.dump) {
      console.log(BinDump.dump(data, meta as MetaBinReadClass, bson))
    } else {
      console.log(JSON.stringify(bson.toJson(), null, 2))
    }
  } else {
    console.log(USAGE)
  }
}
