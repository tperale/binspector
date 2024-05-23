import { type BinaryCursor } from './cursor'

interface HexdumpOptions {
  lineLength: number
  base: number
  showAddress: boolean
  showAsciiRepresentation: boolean
  nonAsciiCharRepresentation: string
  separator: string
}

const defaultHexdumpOptions: HexdumpOptions = {
  lineLength: 16,
  base: 16,
  showAddress: true,
  showAsciiRepresentation: true,
  nonAsciiCharRepresentation: '.',
  separator: '|'
}

function hexToAscii (value: number, opt: HexdumpOptions): string {
  if (value >= 0x20 && value <= 0x7e) {
    return String.fromCharCode(value)
  } else {
    return opt.nonAsciiCharRepresentation
  }
}

export function hexDumpLine (cur: BinaryCursor, offset: number, opt: HexdumpOptions): string {
  const offsetFinish = Math.min(offset + opt.lineLength, cur.length())
  const buf = [...new Uint8Array(cur.data.buffer.slice(offset, offsetFinish))]
  let line = ''

  // Address representation
  if (opt.showAddress) {
    const lineNumber = Math.round(offset / opt.lineLength) * opt.lineLength
    line += `${lineNumber.toString(opt.base).padStart(8, '0')} ${opt.separator} `
  }

  // Binary content representation
  line += buf.map(x => x.toString(opt.base).padStart(2, '0')).join(' ').padEnd(3 * opt.lineLength)

  // Content in ASCII representation
  if (opt.showAsciiRepresentation) {
    line += ` ${opt.separator} ${buf.map(x => hexToAscii(x, opt)).join('')}`
  }

  return line
}

export function hexDump (cur: BinaryCursor, opt?: Partial<HexdumpOptions>): string {
  const options = { ...defaultHexdumpOptions, ...opt }

  // TODO offset based on line length to start printing the hexdump
  let content = ''
  let offset = 0
  while (offset < cur.length()) {
    content += hexDumpLine(cur, offset, options)
    content += '\n'
    offset += options.lineLength
  }
  return content
}
