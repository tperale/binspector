import { type BinaryReader } from './cursor'

interface HexdumpOptions {
  lineLength: number
  base: number
  showAddress: boolean
  addressMinPadding: number
  showAsciiRepresentation: boolean
  zeroAsciiCharRepresentation: string
  nonAsciiCharRepresentation: string
  separator: string
  bufferOffsetPadding: number
}

const defaultHexdumpOptions: HexdumpOptions = {
  lineLength: 16,
  base: 16,
  showAddress: true,
  addressMinPadding: 8,
  showAsciiRepresentation: true,
  zeroAsciiCharRepresentation: '.',
  nonAsciiCharRepresentation: '·',
  separator: '|',
  bufferOffsetPadding: 3
}

function hexToAscii (value: number, opt: HexdumpOptions): string {
  if (value >= 0x20 && value <= 0x7e) {
    return String.fromCharCode(value)
  } else if (value === 0x00) {
    return opt.zeroAsciiCharRepresentation
  } else {
    return opt.nonAsciiCharRepresentation
  }
}

export function hexDumpLine (cur: BinaryReader, offset: number, opt: HexdumpOptions): string {
  const offsetFinish = Math.min(offset + opt.lineLength, cur.length)
  const buf = [...new Uint8Array(cur.data.buffer.slice(offset, offsetFinish))]
  let line = ''

  // Address representation
  if (opt.showAddress) {
    const lineAddressStr = (Math.round(offset / opt.lineLength) * opt.lineLength).toString(opt.base)
    const addressPadding = Math.max(lineAddressStr.length, opt.addressMinPadding)
    line += `${lineAddressStr.padStart(addressPadding, '0')} ${opt.separator} `
  }

  // Binary content representation
  line += buf.map(x => x.toString(opt.base).padStart(2, '0')).join(' ').padEnd(3 * opt.lineLength)

  // Content in ASCII representation
  if (opt.showAsciiRepresentation) {
    line += ` ${opt.separator} ${buf.map(x => hexToAscii(x, opt)).join('')}`
  }

  return line
}

export function hexDump (cur: BinaryReader, addrOffset: number = 0, opt?: Partial<HexdumpOptions>): string {
  const options = { ...defaultHexdumpOptions, ...opt }

  if (addrOffset > cur.length) {
    throw new Error('Start Offset bigger than the buffer length')
  }

  let content = ''
  const fixedAddrOffset = addrOffset - (addrOffset % options.base)
  const startOffset = Math.max(fixedAddrOffset - (options.bufferOffsetPadding * options.lineLength), 0)
  const endOffset = addrOffset > 0
    ? Math.min(fixedAddrOffset + (options.bufferOffsetPadding * options.lineLength), cur.length)
    : cur.length
  let offset = startOffset
  while (offset < endOffset) {
    content += hexDumpLine(cur, offset, options)
    content += '\n'
    offset += options.lineLength
  }
  return content
}

export class BinDump {
  _cursor: BinaryReader
  _opt: HexdumpOptions

  show (): string {
    return hexDump(this._cursor, 0, this._opt)
  }

  at (offset: number): string {
    return hexDump(this._cursor, offset, this._opt)
  }

  constructor (cur: BinaryReader, opt?: Partial<HexdumpOptions>) {
    const options = { ...defaultHexdumpOptions, ...opt }
    this._opt = options
    this._cursor = cur
  }
}
