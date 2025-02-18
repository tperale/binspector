import { NullTerminatedString, Choice, PrimitiveSymbol, Relation, Count, Match, While, Enum, Peek, Offset, Until, EOF, Uint8, Uint32, Uint64 } from '../../src'

enum DTBStructureBlockToken {
  FDT_BEGIN_NODE = 0x1,
  FDT_END_NODE = 0x2,
  FDT_PROP = 0x3,
  FDT_NOP = 0x4,
  FDT_END = 0x9,
}

class DTBHeader {
  @Match(0xd00dfeed)
  @Uint32
  magic: number

  @Uint32
  size: number

  @Uint32
  off_dt_struct: number

  @Uint32
  off_dt_strings: number

  @Uint32
  off_mem_rsvmap: number

  @Uint32
  version: number

  @Uint32
  last_comp_version: number

  @Uint32
  boot_cpuid_phys: number

  @Uint32
  size_dt_strings: number

  @Uint32
  size_dt_struct: number
}

class DTBReservedMap {
  @Uint64
  address: number

  @Uint64
  size: number
}

class FDTBeginNode {
  @NullTerminatedString({ alignment: 4 })
  @Relation(PrimitiveSymbol.char)
  name: string
}

class FDTProp {
  _string_off: number

  @Uint32
  len: number

  @Uint32
  nameoff: number

  @Count('len', { alignment: 4 })
  @Uint8
  name: number[]

  @Peek('_string_off + nameoff')
  @NullTerminatedString()
  @Relation(PrimitiveSymbol.char)
  property: string

  constructor (offset: number) {
    this._string_off = offset
  }
}

class DTBStructBlock {
  _string_off: number

  @Enum(DTBStructureBlockToken)
  @Uint32
  fdttype: DTBStructureBlockToken

  @Choice('fdttype', {
    [DTBStructureBlockToken.FDT_BEGIN_NODE]: FDTBeginNode,
    [DTBStructureBlockToken.FDT_END_NODE]: undefined,
    [DTBStructureBlockToken.FDT_PROP]: [FDTProp, '_string_off'],
    [DTBStructureBlockToken.FDT_NOP]: undefined,
    [DTBStructureBlockToken.FDT_END]: undefined,
  })
  body: FDTBeginNode | FDTProp | undefined

  constructor (string_memory_offset: number) {
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

  return array.every(byteStr => byteStr.every(x =>
    (x >= 0x30 && x <= 0x39) // 0-9
    || (x >= 0x41 && x <= 0x5A) // A-Z
    || (x >= 0x61 && x <= 0x7A) // a-z
    || (x >= 0x2B && x <= 0x2E) // + , - .
    || (x == 0x5F), // _
  ))
}

function asObjectDtb (structs: DTBStructBlock[]): object {
  function setObject (o: Record<string, any>, current: string[], key: string, value: any) {
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
  @While(rsv => rsv.address && rsv.size, { peek: true })
  @Relation(DTBReservedMap)
  rsvmap: DTBReservedMap[]

  @Offset('header.off_dt_struct')
  @While(struct => struct.fdttype !== DTBStructureBlockToken.FDT_END)
  @Relation(DTBStructBlock, 'header.off_dt_strings')
  structs: DTBStructBlock[]

  @Offset('header.off_dt_strings')
  @Until(EOF)
  @NullTerminatedString()
  @Relation(PrimitiveSymbol.char)
  strings: string[]

  asObject (): Record<string, any> {
    return Reflect.get(asObjectDtb(this.structs), '')
  }
}
