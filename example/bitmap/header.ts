import { Count, Enum, Match, Uint8, Uint16, Uint32 } from '../../src'
import { BitmapCompression } from './compression'

export class OS21XBITMAPHEADER {
  @Uint16
  width: number

  @Uint16
  height: number

  @Uint16
  color_plane: number

  @Match([1, 4, 8, 24])
  @Uint16
  bits_per_pixels: number
}

export class OS22XBITMAPCOREHEADER {
  @Uint32
  width: number

  @Uint32
  height: number

  @Uint16
  color_plane: number

  @Match([1, 4, 8, 24])
  @Uint16
  bits_per_pixels: number
}

export class OS22XBITMAPHEADER extends OS22XBITMAPCOREHEADER {
  @Uint32
  compression: BitmapCompression

  @Uint32
  raw_bitmap_data_size: number

  @Uint32
  print_resolution_horizontal: number

  @Uint32
  print_resolution_vertical: number

  @Uint32
  palette_length: number

  @Uint32
  important_colors: number

  @Uint16
  units: number

  @Uint16
  reserved_1: number

  @Uint16
  reserved_2: number

  @Uint16
  recording: number

  @Uint16
  rendering: number

  @Uint32
  size_1: number

  @Uint32
  size_2: number

  @Uint32
  color_encoding: number

  @Uint32
  identifier: number
}

export class BITMAPINFOHEADER extends OS22XBITMAPCOREHEADER {
  @Enum(BitmapCompression)
  @Uint32
  compression: BitmapCompression

  @Uint32
  raw_bitmap_data_size: number

  @Uint32
  print_resolution_horizontal: number

  @Uint32
  print_resolution_vertical: number

  @Uint32
  palette_length: number

  @Uint32
  important_colors: number
}

export class BITMAPV2INFOHEADER extends BITMAPINFOHEADER {
  @Uint32
  red_channel_bitmask: number

  @Uint32
  green_channel_bitmask: number

  @Uint32
  blue_channel_bitmask: number
}

export class BITMAPV3INFOHEADER extends BITMAPV2INFOHEADER {
  @Uint32
  alpha_channel_bitmask: number

  @Uint32
  windows_color_space: number
}

export class BITMAPV4INFOHEADER extends BITMAPV3INFOHEADER {
  @Count(24)
  @Uint8
  color_space_endpoints: number

  @Uint32
  red_gamma: number

  @Uint32
  green_gamma: number

  @Uint32
  blue_gamma: number
}

export class BITMAPV5INFOHEADER extends BITMAPV4INFOHEADER {
}
