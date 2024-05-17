import { NullTerminatedString, Choice, PrimitiveSymbol, Relation, Count, Match, While, Enum, Peek, Offset } from '../../src'

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

  constructor(offset) {
    this._string_off = offset
  }
}

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

function asObjectDtb (result, [struct, ...structs]: DTBStructBlock[]) {
  if (structs.length === 0) {
    return [{}, []]
  } else if (struct.fdttype === DTBStructureBlockToken.FDT_END_NODE) {
    return [result, structs]
  } else if (struct.fdttype === DTBStructureBlockToken.FDT_NOP) {
    return asObjectDtb(result, structs)
  } else if (struct.fdttype === DTBStructureBlockToken.FDT_BEGIN_NODE) {
    const [node, nextStructs] = asObjectDtb({}, structs)
    const [next, nnextStructs] = asObjectDtb({}, nextStructs)
    return [{
      ...result,
      [struct.body.name]: node,
      ...next
    }, nnextStructs]
  } else if (struct.fdttype === DTBStructureBlockToken.FDT_PROP) {
    asObjectDtb({}, structs)
    const [next, nextStructs] = asObjectDtb({}, structs)
    return [{
      ...result,
      [struct.body.property]: struct.body.name,
      ...next
    }, nextStructs]
  }

}

export class DTB {
  @Relation(DTBHeader)
  header: DTBHeader

  @Offset('header.off_dt_struct')
  @While((struct) => struct.fdttype !== DTBStructureBlockToken.FDT_END)
  @Relation(DTBStructBlock, (cur) => [cur.header.off_dt_strings])
  structs: DTBStructBlock[]

  asObject (): Object {
    return asObjectDtb({}, this.structs)[0][""]
  }
}
