import { PrimitiveSymbol, Relation, Count, Enum, IfThen, Else, Choice, Matrix, Offset, Uint8, Uint16, Uint32, Ascii, Endian, BinaryCursorEndianness } from '../../src/index.ts'
import {
  OS22XBITMAPHEADER, BITMAPINFOHEADER, BITMAPV2INFOHEADER, BITMAPV3INFOHEADER, BITMAPV4INFOHEADER, BITMAPV5INFOHEADER,
} from './header.ts'
import { printColour } from './renderer.ts'

enum BitmapHeaderTypes {
  BM = 'BM',
  BA = 'BA',
  CI = 'CI',
  CP = 'CP',
  IC = 'IC',
  PT = 'PT',
}

class RGB {
  @Uint8
  red: number

  @Uint8
  green: number

  @Uint8
  blue: number
}

class RGBQ extends RGB {
  @Uint8
  reserved: number
}

class BitmapFileHeader {
  @Enum(BitmapHeaderTypes)
  @Count(2)
  @Ascii
  type: BitmapHeaderTypes

  /* Size in bytes of the BMP file */
  @Uint32
  size: number

  @Uint16
  reserved_1: number

  @Uint16
  reserved_2: number

  /* Starting address of where the pixel array can be found: offset = 14 + <DIBHEADERSIZE> */
  @Uint32
  offset: number
}

@Endian(BinaryCursorEndianness.LittleEndian)
export class Bitmap {
  @Relation(BitmapFileHeader)
  file_header: BitmapFileHeader

  @Uint32
  bitmap_header_size: number

  @Choice('bitmap_header_size', {
    64: OS22XBITMAPHEADER,
    40: BITMAPINFOHEADER,
    52: BITMAPV2INFOHEADER,
    56: BITMAPV3INFOHEADER,
    108: BITMAPV4INFOHEADER,
    124: BITMAPV5INFOHEADER,
  })
  bitmap_header: OS22XBITMAPHEADER | BITMAPINFOHEADER | BITMAPV2INFOHEADER | BITMAPV3INFOHEADER | BITMAPV4INFOHEADER | BITMAPV5INFOHEADER

  /* Present only in case the DIB header is the BITMAPINFOHEADER
   * and the Compression Method member is set to either BI_BITFIELDS
   * or BI_ALPHABITFIELDS
   */
  /* extra_bit_masks */

  @Count('bitmap_header.palette_length')
  @IfThen((instance: Bitmap) => instance.bitmap_header.bits_per_pixels <= 8, RGBQ)
  @Else()
  color_table: RGBQ[]

  /* The gap size depend on the offset found in the BitmapFileHeader */
  /* Just use the `@Pre` decorator to move the cursor to the correct place */
  @Offset('file_header.offset')
  @Matrix('bitmap_header.width', 'bitmap_header.height', 4)
  @Choice('bitmap_header.bits_per_pixels', {
    8: PrimitiveSymbol.u8,
    24: RGB,
  })
  data: RGB[][] | number[][]

  toString (): string {
    return JSON.stringify({
      file_header: this.file_header,
      bitmap_header: { size: this.bitmap_header_size, ...this.bitmap_header },
    }, null, 2)
  }

  render (): void {
    console.log(this.data.length, this.data.map(x => x.length))
    const lines = this.data.map((x) => {
      const line = x.map((x) => {
        if (this.bitmap_header.bits_per_pixels === 24) {
          return printColour(x as RGB)
        } else if (this.bitmap_header.bits_per_pixels === 8) {
          return printColour(this.color_table[x as number])
        }
        return ''
      })
      return line.join('')
    })
    console.log(lines.reverse().join('\n'))
  }
}
