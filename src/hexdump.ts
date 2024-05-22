import { type BinaryCursor } from './cursor'

function hexToAscii (value: number): string {
  if (value >= 0x20 && value <= 0x7e) {
    return String.fromCharCode(value)
  } else {
    return '.'
  }
}

export function hexDumpLine (cur: BinaryCursor, address: number): string {
  const lineLength = 16
  const offset = address
  const offsetFinish = Math.min(offset + lineLength, cur.length())
  // TODO add padding at the end if (off + lineLength)
  const buf = new Uint8Array(cur.data.buffer.slice(offset, offsetFinish))
  // Printing the address
  const lineNumber = Math.round(address / lineLength) * lineLength
  let line = lineNumber.toString(16).padStart(8, '0') + ' | '
  // Printing the HEX value of the binary array
  for (const value of buf) {
    line += value.toString(16).padStart(2, '0') + ' '
  }
  line += ' | '
  // Printing the ASCII value of the binary array
  for (const value of buf) {
    line += hexToAscii(value)
  }
  return line
}

export function hexDump (cur: BinaryCursor, opt: { start: number, length: number, lineLength: number } = { start: 0, length: 0, lineLength: 16 }): string {
  // TODO offset based on line length to start printing the hexdump
  let content = ''
  let offset = 0
  while (offset < cur.length()) {
    content += hexDumpLine(cur, offset)
    content += '\n'
    offset += opt.lineLength
  }
  return content
}
