# 🕵️ binspector, your binary file assistant

A _truly_ declarative library for binary file and protocol definition
written in typescript. Read and write binary files based on class
definition and decorators directly on your webapp.

```typescript
class ProtocolHeader {
  @Match(0x0E)
  @Relation(PrimitiveSymbol.u8)
  magic: number

  @Count(4)
  @Relation(PrimitiveSymbol.char)
  extension: string;

  @Relation(PrimitiveSymbol.u32)
  len: number;

  @Crc
  @Relation(PrimitiveSymbol.u32)
  crc: number;
}

enum RecordTypes {
  RecordStart = 0x01,
  RecordMsg = 0x02,
  RecordEnd = 0x03,
}

class Record {
  @Relation(PrimitiveSymbol.u32)
  id: number

  @Enum(RecordTypes)
  @Relation(PrimitiveSymbol.u8)
  type: RecordTypes

  @Until('\0')
  @Relation(PrimitiveSymbol.char)
  message: string;
}

class Protocol {
  @Relation(ProtocolHeader)
  header: ProtocolHeader

  @Count('header.len')
  @Relation(Record)
  message: Record
}
```

## Features

* It's a class ! Write method that will directly handle the binary
  content from the definition.
* The binary file definition is re-used for typescript type checking.
* Extensible. Binary readers based on DSL are hard to extend.
* Support parsing and serialisation (soon !) of the binary file.
* It works on the browser. You can create binary file decoder and encoder on
  your webapp frontend without depending on other library on your server.
* Support the common operation done on binary files.
  * Endianness
  * Matching magic numbers
  * Bit fields and enum
  * Reference other structure
  * Conditions
* No dependencies (except `reflect-metadata` for now)

## Getting started

### The basic principle

* `@Relation`

* `PrimitiveSymbol`

  * `u8`: Unsigned 8 bit integer
  * `u16`: Unsigned 16 bit integer
  * `u32`: Unsigned 32 bit integer
  * `i8`: Signed 8 bit integer
  * `i16`: Signed 16 bit integer
  * `i32`: Signed 32 bit integer
  * `char`: 8 bit character

* `@Relation`

- Controller decorators

* `@Count`

Used to create array of integer or string.

* `@Match`

### Installation

```
> npm install binspector
```

### Usage example

## The state of decorator in typescript

Right now this library is based on the `--experimentalDecorators` feature of
typescript.
I plan to move to the official Typescript 5 decorator API once the [decorator metadata proposal](https://github.com/tc39/proposal-decorator-metadata)
reach stage 3 and [reach](https://github.com/microsoft/TypeScript/issues/53461) Typescript.

In the future if more reflection capability are added to typescript it will be
added to improve this library.
