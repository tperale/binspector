import { PrimitiveSymbol, Relation, Count, Enum, IfThen, Else, Choice, Matrix, Offset } from '../../src'
import {
  OS21XBITMAPHEADER, OS22XBITMAPCOREHEADER, OS22XBITMAPHEADER, BITMAPINFOHEADER, BITMAPV2INFOHEADER, BITMAPV3INFOHEADER, BITMAPV4INFOHEADER, BITMAPV5INFOHEADER
} from './header'
import { printColour } from './renderer'
// import {
//   BitmapCompression
// } from './compression'

enum BitmapHeaderTypes {
  BM = 'BM',
  BA = 'BA',
  CI = 'CI',
  CP = 'CP',
  IC = 'IC',
  PT = 'PT',
}

class RGB {
  @Relation(PrimitiveSymbol.u8)
  red: number

  @Relation(PrimitiveSymbol.u8)
  green: number

  @Relation(PrimitiveSymbol.u8)
  blue: number
}

class BitmapFileHeader {
  @Enum(BitmapHeaderTypes)
  @Count(2)
  @Relation(PrimitiveSymbol.char)
  type: string

  /* Size in bytes of the BMP file */
  @Relation(PrimitiveSymbol.u32)
  size: number

  @Relation(PrimitiveSymbol.u16)
  reserved_1: number

  @Relation(PrimitiveSymbol.u16)
  reserved_2: number

  /* Starting address of where the pixel array can be found: offset = 14 + <DIBHEADERSIZE> */
  @Relation(PrimitiveSymbol.u32)
  offset: number
}

export class Bitmap {
  @Relation(BitmapFileHeader)
  file_header: BitmapFileHeader

  @Relation(PrimitiveSymbol.u32)
  bitmap_header_size: number

  @Choice('bitmap_header_size', {
    12: OS21XBITMAPHEADER,
    16: OS22XBITMAPCOREHEADER,
    64: OS22XBITMAPHEADER,
    40: BITMAPINFOHEADER,
    52: BITMAPV2INFOHEADER,
    56: BITMAPV3INFOHEADER,
    108: BITMAPV4INFOHEADER,
    124: BITMAPV5INFOHEADER
  })
  bitmap_header: OS21XBITMAPHEADER | OS22XBITMAPHEADER | OS22XBITMAPCOREHEADER | BITMAPINFOHEADER | BITMAPV2INFOHEADER | BITMAPV3INFOHEADER | BITMAPV4INFOHEADER | BITMAPV5INFOHEADER

  /* Present only in case the DIB header is the BITMAPINFOHEADER
   * and the Compression Method member is set to either BI_BITFIELDS
   * or BI_ALPHABITFIELDS
   */
  /* extra_bit_masks */

  @Count('bitmap_header.palette_length')
  @IfThen((instance: Bitmap) => instance.bitmap_header.bits_per_pixels <= 8, RGB)
  @Else()
  color_table: RGB[]

  /* The gap size depend on the offset found in the BitmapFileHeader */
  /* Just use the `@Pre` decorator to move the cursor to the correct place */

  @Offset('file_header.offset')
  @Matrix('bitmap_header.width', 'bitmap_header.height', { alignment: 4 })
  @Choice('bitmap_header.bits_per_pixels', {
    8: PrimitiveSymbol.u8,
    24: RGB
  })
  data: RGB[][] | number[][]

  toString (): string {
    return JSON.stringify({
      file_header: this.file_header,
      bitmap_header: { size: this.bitmap_header_size, ...this.bitmap_header }
    }, null, 2)
  }

  render (): void {
    console.log(this.data.length, this.data.map(x => x.length))
    const lines = this.data.map(x => {
      const line = x.map(x => {
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
