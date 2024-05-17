import { EOF, NullTerminatedString, Choice, PrimitiveSymbol, Relation, Count, Match, Validate, While, Enum, IfThen, Peek, Offset, Until } from '../../src'

enum DTBStructureBlockToken {
  FDT_BEGIN_NODE = 0x1,
  FDT_END_NODE = 0x2,
  FDT_PROP = 0x3,
  FDT_NOP= 0x4,
  FDT_END = 0x9,
}

class DTBHeader {
  @Match(0xd00dfeed)
  @Relation(PrimitiveSymbol.u32)
  magic: number

  @Relation(PrimitiveSymbol.u32)
  size: number

  @Relation(PrimitiveSymbol.u32)
  off_dt_struct: number

  @Relation(PrimitiveSymbol.u32)
  off_dt_strings: number

  @Relation(PrimitiveSymbol.u32)
  off_mem_rsvmap: number

  @Relation(PrimitiveSymbol.u32)
  version: number

  @Relation(PrimitiveSymbol.u32)
  last_comp_version: number

  @Relation(PrimitiveSymbol.u32)
  boot_cpuid_phys: number

  @Relation(PrimitiveSymbol.u32)
  size_dt_strings: number

  @Relation(PrimitiveSymbol.u32)
  size_dt_struct: number
}

class FDTBeginNode {
  @NullTerminatedString({ alignment: 4 })
  @Relation(PrimitiveSymbol.char)
  name: string
}

class FDTProp {
  _string_off: number

  @Relation(PrimitiveSymbol.u32)
  len: number

  @Relation(PrimitiveSymbol.u32)
  nameoff: number

  @Count('len', { targetType: String, alignment: 4 })
  @Relation(PrimitiveSymbol.char)
  name: string

  @Peek((curr) => curr._string_off + curr.nameoff)
  @NullTerminatedString()
  @Relation(PrimitiveSymbol.char)
  property: string

  // @Peek('nameoff')
  // @Until('\0', { targetType: String, alignment: 4 })
  constructor(offset) {
    this._string_off = offset
  }
}

// class DTBMemoryBlock {
// }

class DTBStructBlock {
  _string_off: number

  @Enum(DTBStructureBlockToken)
  @Relation(PrimitiveSymbol.u32)
  fdttype: DTBStructureBlockToken

  @Choice('fdttype', {
    1: FDTBeginNode,
    2: undefined,
    3: [FDTProp, '_string_off'],
    4: undefined,
    9: undefined
  })
  body: FDTBeginNode | FDTProp | undefined

  constructor(string_memory_offset) {
    this._string_off = string_memory_offset
  }
}

export class DTB {
  @Relation(DTBHeader)
  header: DTBHeader

  // @Offset('header.off_mom_rsvmap')
  // @Relation(DTBMemoryBlock)
  // memory_block: DTBMemoryBlock

  @Offset('header.off_dt_struct')
  @While((struct) => struct.fdttype !== DTBStructureBlockToken.FDT_END)
  @Relation(DTBStructBlock, (cur) => [cur.header.off_dt_strings])
  structs: DTBStructBlock[]

  // @Offset('header.off_dt_strings')
  // @Until(EOF)
  // @Until('\0', { targetType: String })
  // @Relation(PrimitiveSymbol.char)
  // strings: String
}

