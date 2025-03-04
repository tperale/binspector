# 🕵️ binspector, your binary file assistant

A _truly declarative_ TypeScript library to help you create binary file and
protocol definitions.

- 🗣️  __Declarative__ – Define binary structures using __decorators__.
- 🔄 __Read & Write Support__ – Seamlessly __parse & serialize__ binary data.
- ⬆️  __Extensible__ - Write __custom__ decorators.
- 🖋️ __Typed__ – Leverage TypeScript’s type system for validation.
- 🌐 __Works in the Browser__ – Use Binspector for frontend or backend binary processing.
- 📦 __Zero Dependencies__ – No external dependencies.

## 📌 What does it looks like ?

See [examples](https://github.com/tperale/binspector/tree/main/example) for
real files formats.

```typescript
class ProtocolHeader {
  // Ensure the header starts with specific magic number
  @Match(".bin")
  @Count(4)
  @Ascii
  extension: string

  @Uint32
  len: number

  @Uint32
  string_map_offset: number

  @Uint32
  string_map_size: number
}

enum RecordTypes {
  RecordStart = 0x01,
  RecordMsg = 0x02,
  RecordEnd = 0x03,
}

class RecordMessage {
  @Uint32
  size: number

  @Size('size')
  @Utf8
  message: string
}

class Record {
  @Uint32
  id: number

  // Supports TypesSript enums
  @Enum(RecordTypes)
  @Uint8
  type: RecordTypes

  // Dynamically select a subtype based on `type`
  @Choice('type', {
    [RecordTypes.RecordMsg]: RecordMessage,
    [RecordTypes.RecordStart]: undefined,
    [RecordTypes.RecordEnd]: undefined,
  })
  data: RecordMessage;
}

class Protocol {
  // Nested structure with a reference to another class
  @Relation(ProtocolHeader)
  header: ProtocolHeader

  // Use values from previously read properties
  @Count('header.len')
  @Relation(Record)
  records: Record

  // Jump to an arbitrary offset and read data until size is reached
  // to create an array of strings
  @Offset('header.string_map_offset')  
  @Size('header.string_map_size')  
  @NullTerminatedString()
  strings: string[]
}
```

## 🚀 Features

- Declarative Class-Based Approach – Define binary structures as TypeScript classes.
- Leverages TypeScript's Type System – No need to write separate type definitions.
- Fully Extensible – Unlike DSL-based libraries, Binspector is easily extensible to create custom decorators.
- Supports Complex Binary Operations:
  - Endianness
  - Magic numbers and enums validation
  - Conditional parsing
  - Bitfields
  - Nested Structure & recursive references
  - Dynamic offset, variable length properties
  - String encodings (UTF-8, UTF-16, UTF-32, ASCII)
  - Shared context

## 📦 Installation

Install __Binspector__ from [npm](https://www.npmjs.com/package/binspector):

```text
> npm install binspector
```

## 📁 Usage

Here’s a simple example of reading and writing a binary coordinate system.

```typescript
import { Relation, Uint8, Count } from 'binspector'

class Coord {
  @Uint8
  x: number

  @Uint8
  y: number
}

class Protocol {
  @Uint8
  len: number

  @Count('len')
  @Relation(Coord)
  coords: Coord[]
}
```

### 🔍 Reading an ArrayBuffer into Objects

```typescript
import { binread, BinaryReader } from 'binspector'

const buf = new Uint8Array([0x02, 0x01, 0x02, 0x03, 0x04]).buffer

binread(new BinaryReader(buf), Protocol)
// => { len: 2, coords: [{ x: 1, y: 2 }, { x: 3, y: 4 }] }
```

### ✍️  Writing Objects to ArrayBuffer

```typescript
import { binwrite, BinaryWriter } from 'binspector'

const obj = { len: 2, coords: [{ x: 1, y: 2 }, { x: 3, y: 4 }] }

binwrite(new BinaryWriter(), Protocol, obj).buffer()
// => [0x02, 0x01, 0x02, 0x03, 0x04]
```

## 📖 Learn more

- 📚 Documentation: [Getting Started](https://tperale.github.io/binspector/documents/Getting-Started-With-Binspector.html)
- 📂 Examples: [/example](https://github.com/tperale/binspector/tree/main/example)
