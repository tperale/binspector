import { NullTerminatedString, Choice, PrimitiveSymbol, Relation, Count, Match, While, Enum, Peek, Offset, Until, Size, EOF } from '../../src'

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

class DTBReservedMap {
  @Relation(PrimitiveSymbol.u64)
  address: number

  @Relation(PrimitiveSymbol.u64)
  size: number
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

  @Count('len', { alignment: 4 })
  @Relation(PrimitiveSymbol.u8)
  name: number[]

  @Peek('_string_off + nameoff')
  @NullTerminatedString()
  @Relation(PrimitiveSymbol.char)
  property: string

  constructor(offset: number) {
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

  constructor(string_memory_offset: number) {
    this._string_off = string_memory_offset
  }
}

function bytesToArray (bytes: number[]): number[][] {
  const result: number[][] = []
  let current: number[] = []
  for (const b of bytes) {
    if (b == 0) {
      if (current.length > 0) {
        result.push(current)
        current = []
      } else {
        return []
      }
    } else {
      current.push(b)
    }
  }

  return result
}

function isString (bytes: number[]) {
  const array = bytesToArray(bytes)

  return array.every(byteStr => byteStr.every((x) => 
    (x >= 0x2c && x <= 0x3B)
    || (x >= 0x40 && x <= 0x7a)
  ))
}

function asObjectDtb (structs: DTBStructBlock[]): object {
  function setObject (o: object, current: string[], key: string, value: any) {
    const currentObj = current.reduce((obj, k) => obj[k], o)

    currentObj[key] = value
  }
  
  const current: string[] = []
  const result = {}
  for (const struct of structs) {
    if (struct.fdttype === DTBStructureBlockToken.FDT_END) {
      return result
    } else if (struct.fdttype === DTBStructureBlockToken.FDT_NOP) {
      continue
    } else if (struct.fdttype === DTBStructureBlockToken.FDT_END_NODE) {
      current.pop()
    } else if (struct.fdttype === DTBStructureBlockToken.FDT_BEGIN_NODE) {
      const node = struct.body as FDTBeginNode
      setObject(result, current, node.name, {})
      current.push(node.name)
    } else if (struct.fdttype === DTBStructureBlockToken.FDT_PROP) {
      const prop = struct.body as FDTProp
      const propKey = prop.property
      const arrayStr = bytesToArray(prop.name) 
      const propValue = arrayStr.length === 0
        ? prop.name
        : isString(prop.name)
          ? arrayStr.length === 1
            ? String.fromCharCode(...arrayStr[0])
            : arrayStr.map(x => String.fromCharCode(...x))
          : prop.name
      setObject(result, current, propKey, propValue)
    }
  }

  return result
}

export class DTB {
  @Relation(DTBHeader)
  header: DTBHeader

  @Offset('header.off_mem_rsvmap')
  @While((rsv) => rsv.address && rsv.size, { peek: true })
  @Relation(DTBReservedMap)
  rsvmap: DTBReservedMap[]

  @Offset('header.off_dt_struct')
  @While((struct) => struct.fdttype !== DTBStructureBlockToken.FDT_END)
  @Relation(DTBStructBlock, 'header.off_dt_strings')
  structs: DTBStructBlock[]

  @Offset('header.off_dt_strings')
  @Until(EOF)
  @NullTerminatedString()
  @Relation(PrimitiveSymbol.char)
  strings: string[]

  asObject (): Object {
    return asObjectDtb(this.structs)[""]
  }
}
