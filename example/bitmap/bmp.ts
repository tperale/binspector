import { PrimitiveSymbol, Relation, Count, Enum, Choice } from '../../src'
import {
  OS21XBITMAPHEADER, OS22XBITMAPCOREHEADER, OS22XBITMAPHEADER, BITMAPINFOHEADER, BITMAPV2INFOHEADER, BITMAPV3INFOHEADER, BITMAPV4INFOHEADER, BITMAPV5INFOHEADER,
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

  /* If the color depth <= 8 bits */
  /* color_table */

  /* The gap size depend on the offset found in the BitmapFileHeader */
  /* gap */

  @Count(200 * 200)
  @Relation(RGB)
  data: RGB[]

  render (): void {
    const lines = Array.from({ length: this.bitmap_header.height }).map((_, i) => {
      const line = Array.from({ length: this.bitmap_header.width }).map((_, j) => {
        return printColour(this.data[i * this.bitmap_header.width + j])
      })
      return line.join('')
    })
    console.log(lines.join('\n'))
  }
}
