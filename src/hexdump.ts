import { type BinaryReader } from './cursor.ts'

const ansi = (start: number, end: number) => (input: string) => `\u001B[${start}m${input}\u001B[${end}m`

const dim = ansi(2, 22)
const green = ansi(32, 39)

export interface BinspectorMeta {
  startOffset: number
  endOffset: number
}

export interface BinspectorMetaClass extends BinspectorMeta {
  className: string
  properties: BinspectorMetaProperty[]
}

export type BinspectorMetaPropertiesComponent = BinspectorMeta | BinspectorMetaClass

export interface BinspectorMetaProperty {
  propertyName: string
  components: BinspectorMetaPropertiesComponent | BinspectorMetaPropertiesComponent[]
}

function isMetaClass (component: BinspectorMetaPropertiesComponent): component is BinspectorMetaClass {
  return Object.hasOwn(component, 'className')
}

enum TerminalColors {
  none,
  dim,
  green
}

export interface BindumpOptions {
  /**
   * Number of elements per lines.
   */
  lineLength: number
  /**
   * Numeral system to be used for the number representation.
   */
  base: number
  /**
   * Show the address at the beginning of the line representation.
   */
  showAddress: boolean
  /**
   * The minimun address length for the address representation at the beginning
   * of the line.
   *
   * `showAddress` needs to be `true`.
   */
  addressMinPadding: number
  addressColor: TerminalColors
  /**
   * Show the ASCII representation at the end of the line representation.
   */
  showAsciiRepresentation: boolean
  /**
   * Character used to represent zeroes in the ASCII representation.
   *
   * `showAsciiRepresentation` needs to be `true`.
   */
  zeroAsciiCharRepresentation: string
  /**
   * Character style used to represent zeroes in the ASCII representation.
   *
   * `showAsciiRepresentation` needs to be `true`.
   */
  zeroColorRepresentation: TerminalColors
  /**
   * Character used to represent non-ASCII character in the ASCII
   * representation.
   *
   * `showAsciiRepresentation` needs to be `true`.
   */
  nonAsciiCharRepresentation: string
  /**
   * Character used separate the sections:
   *  - address
   *  - dump
   *  - ASCII representation
   */
  separator: string
  /**
   * The offset to apply to the address passed to the bindump.
   * This option is used to show more than just the address passed.
   */
  bufferOffsetPadding: number
}

const defaultBindumpOptions: BindumpOptions = {
  lineLength: 16,
  base: 16,
  showAddress: true,
  addressMinPadding: 8,
  addressColor: TerminalColors.green,
  showAsciiRepresentation: true,
  zeroAsciiCharRepresentation: '.',
  nonAsciiCharRepresentation: '·',
  zeroColorRepresentation: TerminalColors.dim,
  separator: '│',
  bufferOffsetPadding: 0,
}

function ansiRepresentation (color: TerminalColors, input: string) {
  switch (color) {
    case TerminalColors.dim:
      return dim(input)
    case TerminalColors.green:
      return green(input)
    case TerminalColors.none:
    default:
      return input
  }
}

function hexToAscii (value: number, opt: BindumpOptions): string {
  if (value >= 0x20 && value <= 0x7e) {
    return String.fromCharCode(value)
  } else if (value === 0x00) {
    return ansiRepresentation(opt.zeroColorRepresentation, opt.zeroAsciiCharRepresentation)
  } else {
    return opt.nonAsciiCharRepresentation
  }
}

function binDumpEmptyLine (opt: BindumpOptions): string {
  let line = ''

  const baseReprSize = (2 ** 8 - 1).toString(opt.base).length
  const basePadding = ' '.repeat(baseReprSize)

  // Address representation
  if (opt.showAddress) {
    line += `${' '.repeat(opt.addressMinPadding)} ${opt.separator} `
  }

  // Binary content representation
  line += ` ${basePadding}`.repeat(opt.lineLength)

  // Content in ASCII representation
  if (opt.showAsciiRepresentation) {
    line += `${opt.separator} ${' '.repeat(opt.lineLength)} ${opt.separator}`
  }

  return line
}

export function binDumpLine (cur: BinaryReader, offset: number, endOffset: number = 0, opt: BindumpOptions): string {
  let line = ''

  const baseReprSize = (2 ** 8 - 1).toString(opt.base).length
  const basePadding = ' '.repeat(baseReprSize)

  const lineAddress = Math.floor(offset / opt.lineLength) * opt.lineLength
  const paddingStart = lineAddress > 0 ? offset % lineAddress : offset

  const offsetFinish = endOffset === 0 ? Math.min(offset + opt.lineLength, cur.length) : Math.min(endOffset, offset + opt.lineLength, cur.length)
  const buf = [...new Uint8Array(cur.data.buffer.slice(offset, offsetFinish))]

  // Address representation
  if (opt.showAddress) {
    const lineAddressStr = lineAddress.toString(opt.base)
    const addressPadding = Math.max(lineAddressStr.length, opt.addressMinPadding)
    line += `${ansiRepresentation(opt.addressColor, lineAddressStr.padStart(addressPadding, '0'))} ${opt.separator} `
  }

  // Add padding to the start of the line
  // If the offset is not aligned to the address, the line start should be padded
  line += ` ${basePadding}`.repeat(paddingStart)

  // Binary content representation
  line += buf.map((x) => {
    const num = x.toString(opt.base).padStart(baseReprSize, '0')
    if (x === 0) {
      return ansiRepresentation(opt.zeroColorRepresentation, num)
    }
    return num
  }).join(' ')

  // Add padding to the end of the line
  // If the endOffset is not aligned to the (address + lineLength),
  // the line start should be padded
  line += ` ${basePadding}`.repeat(opt.lineLength - buf.length - paddingStart)

  // Content in ASCII representation
  if (opt.showAsciiRepresentation) {
    line += ` ${opt.separator} ${' '.repeat(paddingStart)}`
    line += buf.map(x => hexToAscii(x, opt)).join('')
    line += `${' '.repeat(opt.lineLength - buf.length - paddingStart)} ${opt.separator}`
  }

  return line
}

export function binDump (cur: BinaryReader, start: number = 0, end: number = 0, opt?: Partial<BindumpOptions>): string {
  const options = { ...defaultBindumpOptions, ...opt }
  const content = []

  if (start > cur.length) {
    throw new Error('Start Offset bigger than the buffer length')
  }

  if (end > cur.length) {
    throw new Error('End Offset bigger than the buffer length')
  }

  const startOffset = Math.max(start - options.bufferOffsetPadding, 0)
  const endOffset = end > 0
    ? Math.min(end + options.bufferOffsetPadding, cur.length)
    : cur.length

  let offset = startOffset
  while (offset < endOffset) {
    const endLine = offset + (options.lineLength - (offset % options.lineLength))
    content.push(binDumpLine(cur, offset, Math.min(endLine, endOffset), options))
    offset += options.lineLength
    // Re-align the offset to the address
    offset = offset - (offset % options.lineLength)
  }

  return content.join('\n')
}

function binDumpPrimitive (cur: BinaryReader, startOffset: number, endOffset: number, propertyName: string, value: any, opt: BindumpOptions, indent = 0) {
  const line = ((typeof startOffset === 'number') && (typeof endOffset === 'number') && (endOffset > 0))
    ? binDump(cur, startOffset, endOffset, opt)
    : binDumpEmptyLine(opt)

  return `${line} ${' '.repeat(indent)}${propertyName}`.concat(value !== undefined ? `: ${value}` : '')
}

function binDumpClass (cur: BinaryReader, meta: BinspectorMetaClass | BinspectorMetaClass[], obj: any = {}, indent = 0): string {
  const opt = defaultBindumpOptions
  const emptyLineOpt = { ...opt, separator: '┊' }

  function _dumpProperties (x: BinspectorMetaClass, obj: any = {}) {
    return x.properties.flatMap(({ propertyName, components }) => {
      const newObj = obj[propertyName] === undefined ? {} : obj[propertyName]
      if (Array.isArray(components)) {
        if (components.every(isMetaClass)) {
          return [
            `${binDumpEmptyLine(emptyLineOpt)} ${' '.repeat(indent + 2)}${propertyName}[:${components.length}]{}:`,
            binDumpClass(cur, components, newObj, indent + 4)
          ]
        } else {
          if (typeof newObj === 'string') {
            const startOffset = Math.min(...components.map(x => x.startOffset))
            const endOffset = Math.max(...components.map(x => x.endOffset))
            return binDumpPrimitive(cur, startOffset, endOffset, propertyName, newObj, opt, indent + 2)
          } else {
            return components.map((x, i) =>
              binDumpPrimitive(cur, x.startOffset, x.endOffset, `${propertyName}_${i}`, newObj[i], opt, indent + 2)
            )
          }
        }
      } else {
        if (isMetaClass(components)) {
          return [
            `${binDumpEmptyLine(emptyLineOpt)} ${' '.repeat(indent + 2)}${propertyName}{}:`,
            binDumpClass(cur, components, newObj, indent + 4)
          ]
        } else {
          return binDumpPrimitive(cur, components.startOffset, components.endOffset, propertyName, newObj, opt, indent + 2)
        }
      }
    })
  }

  if (Array.isArray(meta)) {
    return [
      ...meta.flatMap((x, i) => ([
        `${binDumpEmptyLine(emptyLineOpt)} ${' '.repeat(indent)}[${i}]{}: ${x.className} `,
        ..._dumpProperties(x, obj[i])]
      ))
    ].join('\n')
  } else {
    return [`${binDumpEmptyLine(emptyLineOpt)} ${' '.repeat(indent)}{}: ${meta.className} `, ..._dumpProperties(meta, obj)].join('\n')
  }
}

export default {
  show: (cur: BinaryReader) => {
    return binDump(cur, 0, cur.length, defaultBindumpOptions)
  },
  at: (cur: BinaryReader, start: number, end: number = 0) => {
    return binDump(cur, start, end, defaultBindumpOptions)
  },
  dump: (cur: BinaryReader, meta: BinspectorMetaClass, obj?: any) => {
    return binDumpClass(cur, meta, obj)
  }
}
