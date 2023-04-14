import { PrimitiveSymbol, Relation, Count, Enum, } from '../../src'
import {
  BitmapCompression 
} from './compression'

export class OS21XBITMAPHEADER {
  @Relation(PrimitiveSymbol.u16)
  width: number

  @Relation(PrimitiveSymbol.u16)
  height: number

  @Relation(PrimitiveSymbol.u16)
  color_plane: number

  // @Match([1, 4, 8, 24])
  @Relation(PrimitiveSymbol.u16)
  bits_per_pixels: number
}

export class OS22XBITMAPCOREHEADER {
  @Relation(PrimitiveSymbol.u32)
  width: number

  @Relation(PrimitiveSymbol.u32)
  height: number

  @Relation(PrimitiveSymbol.u16)
  color_plane: number

  // @Match([1, 4, 8, 24])
  @Relation(PrimitiveSymbol.u16)
  bits_per_pixels: number
}

export class OS22XBITMAPHEADER extends OS22XBITMAPCOREHEADER {
  @Relation(PrimitiveSymbol.u32)
  compression: BitmapCompression

  @Relation(PrimitiveSymbol.u32)
  raw_bitmap_data_size: number

  @Relation(PrimitiveSymbol.u32)
  print_resolution_horizontal: number

  @Relation(PrimitiveSymbol.u32)
  print_resolution_vertical: number

  @Relation(PrimitiveSymbol.u32)
  palette_length: number

  @Relation(PrimitiveSymbol.u32)
  important_colors: number

  @Relation(PrimitiveSymbol.u16)
  units: number

  @Relation(PrimitiveSymbol.u16)
  reserved_1: number

  @Relation(PrimitiveSymbol.u16)
  reserved_2: number

  @Relation(PrimitiveSymbol.u16)
  recording: number

  @Relation(PrimitiveSymbol.u16)
  rendering: number

  @Relation(PrimitiveSymbol.u32)
  size_1: number

  @Relation(PrimitiveSymbol.u32)
  size_2: number

  @Relation(PrimitiveSymbol.u32)
  color_encoding: number

  @Relation(PrimitiveSymbol.u32)
  identifier: number
}

export class BITMAPINFOHEADER extends OS22XBITMAPCOREHEADER {
  @Enum(BitmapCompression)
  @Relation(PrimitiveSymbol.u32)
  compression: BitmapCompression

  @Relation(PrimitiveSymbol.u32)
  raw_bitmap_data_size: number

  @Relation(PrimitiveSymbol.u32)
  print_resolution_horizontal: number

  @Relation(PrimitiveSymbol.u32)
  print_resolution_vertical: number

  @Relation(PrimitiveSymbol.u32)
  palette_length: number

  @Relation(PrimitiveSymbol.u32)
  important_colors: number
}

export class BITMAPV2INFOHEADER extends BITMAPINFOHEADER {
  @Relation(PrimitiveSymbol.u32)
  red_channel_bitmask: number

  @Relation(PrimitiveSymbol.u32)
  green_channel_bitmask: number

  @Relation(PrimitiveSymbol.u32)
  blue_channel_bitmask: number
}

export class BITMAPV3INFOHEADER extends BITMAPV2INFOHEADER {
  @Relation(PrimitiveSymbol.u32)
  alpha_channel_bitmask: number

  @Relation(PrimitiveSymbol.u32)
  windows_color_space: number
}

export class BITMAPV4INFOHEADER extends BITMAPV3INFOHEADER {
  @Count(24)
  @Relation(PrimitiveSymbol.u8)
  color_space_endpoints: number

  @Relation(PrimitiveSymbol.u32)
  red_gamma: number

  @Relation(PrimitiveSymbol.u32)
  green_gamma: number

  @Relation(PrimitiveSymbol.u32)
  blue_gamma: number
}

export class BITMAPV5INFOHEADER extends BITMAPV4INFOHEADER {
}
