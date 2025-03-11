import { Count, Enum, Int32, Match, PrimitiveSymbol, Relation, Select, Size, Uint16, Uint32, Uint8, Utf8, LittleEndian, NullTerminated, BinaryReader, binread, jsonify, binwrite, BinaryWriter } from '../../src/index.ts'

// When calling JSON.stringify on a BigInt an error will be raised by default
// We need to define the serializer for this type.
declare global {
  interface BigInt {
    toJSON(): number
  }
}

BigInt.prototype.toJSON = () => Number(this)

enum BSONType {
  EndOfObject = 0x00,
  NumberDouble = 0x01,
  String = 0x02,
  Object = 0x03,
  Array = 0x04,
  BinData = 0x05,
  Undefined = 0x06,
  ObjectId = 0x07,
  Boolean = 0x08,
  UtcDateTime = 0x09,
  Null = 0x0A,
  RegEx = 0x0B,
  DbPointer = 0x0C,
  JavaScript = 0x0D,
  Symbol = 0x0E,
  NumberInt = 0x10,
  Timestamp = 0x11,
  NumberLong = 0x12,
  NumberDecimal = 0x13,
  MaxKey = 0x7F,
  MinKey = 0xFF,
}

class BsonString {
  @Int32
  size: number

  @Size('size - 1')
  @Utf8
  name: string

  @Match(0)
  @Uint8
  terminator: number

  toJson () {
    return this.name
  }
}

class BsonBinData {
  @Int32
  size: number

  @Uint8
  subtype: number

  @Size('size')
  @Uint8
  data: number[]

  toJson () {
    return this.data
  }
}

class BsonOjbectId {
  @Uint32
  epoch_time: number

  @Count(3)
  @Uint8
  machine_id: number[]

  @Uint16
  process_id: number[]

  @Count(3)
  @Uint8
  counter: number[]
}

class BsonRegEx {
  @Utf8
  @NullTerminated
  pattern: string

  @Utf8
  @NullTerminated
  options: string
}

class BsonDbPointer {
  @Relation(BsonString)
  name: BsonString

  @Relation(BsonOjbectId)
  id: BsonOjbectId
}

class BsonTimestamp {
  @Uint32
  increment: number

  @Uint32
  timestamp: number
}

class Bson128Float {
  @Count(16)
  @Uint8
  data: number[]

  toJson () {
    return this.data
  }
}

/**
 * The mapper use a lazy getter with the Bson type.
 *
 * This is mandatory because if you define it statically
 * `Bson` will be equaled to `undefined` because the mapper
 * is defined before the `Bson` declaration.
 *
 * But at runtime the `Bson` definition will be known.
 */
const BSONTypeMap = {
  [BSONType.EndOfObject]: () => undefined,
  [BSONType.NumberDouble]: () => PrimitiveSymbol.float64,
  [BSONType.String]: () => BsonString,
  [BSONType.Object]: () => Bson,
  [BSONType.Array]: () => Bson,
  [BSONType.BinData]: () => BsonBinData,
  [BSONType.ObjectId]: () => BsonOjbectId,
  [BSONType.Boolean]: () => PrimitiveSymbol.u8,
  [BSONType.UtcDateTime]: () => PrimitiveSymbol.i64,
  [BSONType.Null]: () => undefined,
  [BSONType.RegEx]: () => BsonRegEx,
  [BSONType.DbPointer]: () => BsonDbPointer,
  [BSONType.JavaScript]: () => BsonString,
  [BSONType.Symbol]: () => BsonString,
  [BSONType.NumberInt]: () => PrimitiveSymbol.i32,
  [BSONType.Timestamp]: () => BsonTimestamp,
  [BSONType.NumberLong]: () => PrimitiveSymbol.i64,
  [BSONType.NumberDecimal]: () => Bson128Float,
  [BSONType.MaxKey]: () => undefined,
  [BSONType.MinKey]: () => undefined,
}

export class BsonElement {
  @Enum(BSONType)
  @Uint8
  bson_type: keyof typeof BSONTypeMap

  @Utf8
  @NullTerminated
  name: string

  @Select(_ => BSONTypeMap[_.bson_type]())
  data: any

  toJson () {
    switch (this.bson_type) {
      case BSONType.EndOfObject:
      case BSONType.MaxKey:
      case BSONType.MinKey:
      case BSONType.Null:
        return { [this.name]: undefined }
      case BSONType.NumberDouble:
      case BSONType.Boolean:
      case BSONType.UtcDateTime:
      case BSONType.NumberInt:
      case BSONType.NumberLong:
        return { [this.name]: this.data }
      case BSONType.Array:
        return { [this.name]: Object.values(this.data.toJson()) }
      case BSONType.Object:
      case BSONType.String:
      case BSONType.BinData:
      case BSONType.JavaScript:
      case BSONType.NumberDecimal:
        return { [this.name]: this.data.toJson() }
      case BSONType.ObjectId:
      case BSONType.RegEx:
      case BSONType.DbPointer:
      case BSONType.Symbol:
      case BSONType.Timestamp:
        return { [this.name]: jsonify(this.data) }
    }
  }
}

@LittleEndian
export class Bson {
  @Int32
  size: number

  @Size('size - 5')
  @Relation(BsonElement)
  fields: BsonElement[]

  @Match(0)
  @Uint8
  terminator: number

  toJson () {
    return this.fields.reduce((obj, curr) => ({
      ...obj,
      ...curr.toJson()
    }), {})
  }

  toBuffer () {
    return binwrite(new BinaryWriter(), Bson, this).buffer()
  }

  static from (buf: ArrayBufferLike) {
    return binread(new BinaryReader(buf), Bson)
  }
}
