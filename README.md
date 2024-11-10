# 🕵️ binspector, your binary file assistant

A _truly_ declarative library for binary file and protocol definition
written in typescript. Read & Write binary files based on class
definition and decorators directly on your webapp.

```typescript
class ProtocolHeader {
  // Validate magic number
  @Match(0x0E)
  @Relation(PrimitiveSymbol.u8)
  magic: number

  // Read the subtype relation multiple time
  @Count(4)
  @Relation(PrimitiveSymbol.char)
  extension: string

  @Relation(PrimitiveSymbol.u32)
  len: number

  @Relation(PrimitiveSymbol.u32)
  string_map_offset: number

  @Relation(PrimitiveSymbol.u32)
  string_map_size: number

  @Relation(PrimitiveSymbol.u32)
  crc: number
}

enum RecordTypes {
  RecordStart = 0x01,
  RecordMsg = 0x02,
  RecordEnd = 0x03,
}

class RecordMessage {
  @Until('\0')
  @Relation(PrimitiveSymbol.char)
  message: string
}

class Record {
  @Relation(PrimitiveSymbol.u32)
  id: number

  // Typescript enums are supported.
  @Enum(RecordTypes)
  @Relation(PrimitiveSymbol.u8)
  type: RecordTypes

  // You can select the subtype that's gonna be {read,written} based on a
  // condition
  @Choice('type', {
    [RecordTypes.RecordMsg]: RecordMessage,
    [RecordTypes.RecordStart]: undefined,
    [RecordTypes.RecordEnd]: undefined,
  })
  data: RecordMessage;
}

class Protocol {
  // Refer to other object as subtype
  @Relation(ProtocolHeader)
  header: ProtocolHeader

  // Refer to properties directly to use dynamic value 
  @Count('header.len')
  @Relation(Record)
  records: Record

  // Jump to an arbitrary address to continue reading the file
  // Here null terminated strings would keep being read until the overall size
  // is reached
  @Offset('header.string_map_offset')  
  @Size('header.string_map_size')  
  @NullTerminatedString()
  @Relation(PrimitiveSymbol.char)
  strings: string[]
}
```

## Features

* It's a class ! Write method that will directly handle the binary
  content from the definition.
* The binary file definition is re-used for typescript type checking.
* Extensible. Binary readers based on DSL are hard to extend.
* Support parsing and serialisation of binary file definition.
* It works on the browser. You can create binary file decoder and encoder on
  your webapp frontend without depending on other library on your server.
* Support the common operation done on binary files.
  * Endianness
  * Matching magic numbers
  * Bit fields and enum
  * Reference other structure
  * Conditions
* No dependencies

## Usage

Imagine the following binary file definition.

```typescript
import { Relation, Count } from 'binspector'

class Coord {
  @Relation(PrimitiveSymbol.u8)
  x: number

  @Relation(PrimitiveSymbol.u8)
  y: number
}

class Protocol {
  @Relation(PrimitiveSymbol.u8)
  len: number

  @Count('len')
  coords: Coord[]
}
```

### Reading bytes buffer into objects

```typescript
import { binread, BinaryReader } from 'binspector'

const buf = new Uint8Array([0x02, 0x01, 0x02, 0x03, 0x04]).buffer

binread(new BinaryHeader(buf), Protocol) // => { len: 2, coords: [{ x: 1, y: 2 }, { x: 3, y: 4 }] }
```

### Writing objects to bytes buffer

```typescript
import { binwrite, BinaryWriter } from 'binspector'

const obj = { len: 2, coords: [{ x: 1, y: 2 }, { x: 3, y: 4 }] }

binwrite(new BinaryWriter(), Protocol, obj).buffer() // => [0x02, 0x01, 0x02, 0x03, 0x04]
```

## Installation

```text
> npm install binspector
```

Generate the documentation with the following command.

```text
> npx typedoc --options typedoc.json
```
