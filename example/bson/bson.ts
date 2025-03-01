import { BinaryCursorEndianness, Endian, Count, Enum, Int32, Match, NullTerminatedString, PrimitiveSymbol, Relation, Select, Size, Uint16, Uint32, Uint8, Until, Utf8 } from '../../src'

enum BSONType {
  EndOfObject = 0x00,
  NumberDouble = 0x01,
  String = 0x02,
  Document = 0x03,
  Array = 0x04, // The document for an array is a normal BSON document with integer values for the keys, starting with 0 and continuing sequentially.
  BinData = 0x05, // This is the most commonly used binary subtype and should be the 'default' for drivers and tools.
  Undefined = 0x06,
  ObjectId = 0x07,
  Boolean = 0x08,
  UtcDateTime = 0x09,
  JSTNull = 0x0A,
  RegEx = 0x0B,
  DbPointer = 0x0C,
  JavaScript = 0x0D,
  NumberInt = 0x10,
  Timestamp = 0x11,
  NumberLong = 0x12,
  NumberDecimal = 0x13,
  MaxKey = 0x7F, // Special type which compares higher than all other possible BSON element values.
  MinKey = -1 // Special type which compares lower than all other possible BSON element values.
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
}

class BsonBinData {
  @Int32
  size: number

  @Uint8
  subtype: number

  @Size('size')
  @Uint8
  data: number[]
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
  @Until(0)
  @Utf8
  pattern: string

  @Until(0)
  @Utf8
  options: string
}

class BsonDbPointer {
  @Relation(BsonString)
  name: BsonString

  @Relation(BsonOjbectId)
  id: BsonOjbectId
}

class BsonCodeWithScope {
  @Int32
  id: number

  @Relation(BsonString)
  source: BsonString

  @Select(() => Bson)
  scope: Bson
}

class BsonTimestamp {
  @Uint32
  increment: number

  @Uint32
  timestamp: number
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
  [BSONType.NumberDouble]: () => PrimitiveSymbol.float64,
  [BSONType.String]: () => BsonString,
  [BSONType.Document]: () => Bson,
  [BSONType.Array]: () => Bson,
  [BSONType.BinData]: () => BsonBinData,
  [BSONType.ObjectId]: () => BsonOjbectId,
  [BSONType.Boolean]: () => PrimitiveSymbol.u8,
  [BSONType.UtcDateTime]: () => PrimitiveSymbol.i64,
  [BSONType.RegEx]: () => BsonRegEx,
  [BSONType.DbPointer]: () => BsonDbPointer,
  [BSONType.JavaScript]: () => BsonString,
  // [BSONType.Symbol]: () => BsonString,
  // [BSONType.CodeWithScope]: () => BsonCodeWithScope,
  [BSONType.NumberInt]: () => PrimitiveSymbol.i32,
  [BSONType.Timestamp]: () => BsonTimestamp,
  [BSONType.NumberLong]: () => PrimitiveSymbol.i64,
  // TODO [BSONType.NumberDecimal]
}

export class BsonElement {
  @Enum(BSONType)
  @Uint8
  bson_type: keyof typeof BSONTypeMap

  // @Until(0)
  @NullTerminatedString()
  name: string

  @Select(_ => (BSONTypeMap[_.bson_type]()))
  data: any
}

@Endian(BinaryCursorEndianness.LittleEndian)
export class Bson {
  @Int32
  size: number

  @Size('size - 5')
  @Relation(BsonElement)
  fields: BsonElement

  @Match(0)
  @Uint8
  terminator: number

  toJson () {
  }
}
