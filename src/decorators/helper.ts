/**
 * The `Helper` module definition defines different decorator that combines
 * decorators from differents categories.
 *
 * @module Helper
 */
import { PropertyType, Relation, RelationParameters, Uint16, Uint32, Uint8 } from './primitive.ts'
import { Context, DecoratorType, ExecutionScope } from '../types.ts'
import { TransformerExecLevel, transformerDecoratorFactory } from './transformer.ts'
import { ControllerOptions, Count, Until } from './controller.ts'
import { NumberOrRecursiveKey } from './common.ts'
import { Padding, SharePropertiesWithRelation } from './prepost.ts'
import Meta from '../metadatas.ts'

/**
 * `@Char` defines the decorated as an unsigned 8 bit integer and transform
 * each of those read integer into a character by applying ascii encoding.
 *
 * @typeParam This The type of the class the decorator is applied to.
 * @typeParam Value The type of the decorated property.
 *
 * @category Decorators
 */
export function Char<This extends object, Value> (_: undefined, context: Context<This, Value>): void {
  Uint8(_, context)

  transformerDecoratorFactory('transform-char-inner-read', x => typeof x === 'number' ? String.fromCharCode(x) : x, { level: TransformerExecLevel.PrimitiveTranformer })(_, context)
  transformerDecoratorFactory('transform-char-inner-write', x => String(x).charCodeAt(0), { level: TransformerExecLevel.PrimitiveTranformer, scope: ExecutionScope.OnWrite })(_, context)
}

/**
 * `@Ascii` defines the decorated as an unsigned 8 bit integer and transform
 * each of those read integer into a character by applying ascii encoding
 * (see {@link Char}).
 * After the controller (if any) has been executed the resulting value will
 * be joined into a string.
 *
 * @remarks
 *
 * This function differ from {@link Char} by joining the resulting value after
 * the controller has been executed into a string.
 * During the write phase the string will be splitted into an array.
 *
 * @typeParam This The type of the class the decorator is applied to.
 * @typeParam Value The type of the decorated property.
 *
 * @category Decorators
 */
export function Ascii<This extends object, Value> (_: undefined, context: Context<This, Value>): void {
  Char(_, context)

  /**
   * This transformer should in theory always be the first to be executed
   * It will receive input that has already been converted to character like
   * the following:
   *   - `'h'`
   *   - `['h', 'e', 'l', 'l', 'o']`
   *   - `[ ['h', 'e', 'l', 'l', 'o'], ['w', 'o', 'l', 'd'] ]` -> deepTransform option required
   * They are not always formated as an array.
   */
  transformerDecoratorFactory('transform-ascii-outer-read', x => Array.isArray(x) ? x.join('') : x, { deepTransform: true, each: false })(_, context)

  /**
   * This transformer should in theory always be the last to be executed
   * It will receive input like the following:
   *   - `'h'`
   *   - `'hello'`
   *   - `[ 'hello', 'world' ]` -> each option is required
   */
  transformerDecoratorFactory('transform-ascii-outer-write', x => x.length > 1 ? x.split('') : x, { deepTransform: true, each: true, scope: ExecutionScope.OnWrite })(_, context)
}

/**
 * `@NullTerminated` decorator is made to be used with the `@Utf{8,16,32}`
 * decorators to read the string until a `0` is encountered.
 * Because decoding an array of utf{8,16,32} character will drop this `0`
 * this decorator make sure to add it again to the array when writing an utf
 * encoded string.
 *
 * @example
 *
 * ```typescript
 * class Protocol {
 *   @Utf8
 *   @NullTerminated // Should be closer to the property than `Utf8`
 *   name: string
 *
 *   @Until(EOF)
 *   @Utf16
 *   @NullTerminated
 *   name: string[] // Create an array of null terminated utf16 strings
 * }
 * ```
 *
 * @remarks
 *
 * You can't use this decorator with `@Ascii` decorator. Use
 * `@NullTerminatedString` instead.
 *
 * @category Decorators
 */
export function NullTerminated<This extends object, Value> (_: undefined, context: Context<This, Value>): void {
  Until(0, { primitiveCheck: false })(_, context)
  transformerDecoratorFactory('transform-null-termination-read', x => x.slice(0, -1), { deepTransform: true, primitiveCheck: false })(_, context)
  transformerDecoratorFactory('transform-null-termination-write', x => [...x, 0], { deepTransform: true, scope: ExecutionScope.OnWrite, primitiveCheck: false })(_, context)
}

/**
 * `@NullTerminatedString` decorator reads a string from a binary stream until
 * the null-terminator (`\0`) character is encountered and exclude that
 * character from the final value.
 *
 * @example
 *
 * In the following example, the `@NullTerminatedString` decorator is used
 * in conjunction of the `@Until` decorator to read Null terminated strings
 * until the end of the file.
 *
 * ```typescript
 * class Protocol {
 *   @Until(EOF)
 *   @NullTerminatedString()
 *   data: string[]
 * }
 * ```
 *
 * @typeParam This The type of the class the decorator is applied to.
 * @typeParam Value The type of the decorated property.
 *
 * @param {Partial<ControllerOptions>} [opt] Optional configuration.
 * @returns {DecoratorType<This, Value>} The property decorator function.
 *
 * @category Decorators
 */
export function NullTerminatedString<This extends object, Value> (opt?: Partial<ControllerOptions>): DecoratorType<This, Value> {
  return function<This extends object, Value> (_: undefined, context: Context<This, Value>): void {
    Ascii(_, context)
    Until('\0', opt)(_, context)
    transformerDecoratorFactory('transform-null-termination-read', x => x.slice(0, -1), { deepTransform: true, each: true })(_, context)
    transformerDecoratorFactory('transform-null-termination-write', x => x + '\0', { deepTransform: true, each: true, scope: ExecutionScope.OnWrite })(_, context)
  }
}

/**
 * `@Utf8` defines the decorated property as an unsigned 8 bit integer encoded
 * as an utf-8 string.
 *
 * @example
 *
 * Here in the following example the `@Until` controller is associated with the
 * the `@Utf8` decorator.
 *
 * ```typescript
 * class Protocol {
 *   @Until(EOF)
 *   @Utf8
 *   foo: string
 * }
 * ```
 *
 * The typical use-case would be to have a generic space of a pre-defined size with a
 * an utf encoded string.
 *
 * ```typescript
 * class Protocol {
 *   @Size(64)
 *   @Utf8
 *   foo: string
 * }
 * ```
 *
 * @remarks
 *
 * This decorator is supposed to be used in conjunction of a controller.
*
 * @typeParam This The type of the class the decorator is applied to.
 * @typeParam Value The type of the decorated property.
 *
 * @category Decorators
 */
export function Utf8<This extends object, Value> (_: undefined, context: Context<This, Value>): void {
  Uint8(_, context)
  transformerDecoratorFactory('transform-utf8-read', x => new TextDecoder('utf-8').decode(new Uint8Array(x).filter(x => x !== 0x00).buffer), { deepTransform: true })(_, context)
  transformerDecoratorFactory('transform-utf8-write', x => Array.from(new TextEncoder().encode(x)), { deepTransform: true, each: true, scope: ExecutionScope.OnWrite })(_, context)
}

/**
 * `@Utf16` defines the decorated property as an unsigned 16 bit integer encoded
 * as an utf-16 string.
 *
 * @example
 *
 * The typical use-case would be to have a generic space of a pre-defined size with a
 * an utf encoded string.
 *
 * ```typescript
 * class Protocol {
 *   @Size(64)
 *   @Utf16
 *   foo: string
 * }
 * ```
 *
 * @remarks
 *
 * This decorator is supposed to be used in conjunction of a controller.
*
 * @typeParam This The type of the class the decorator is applied to.
 * @typeParam Value The type of the decorated property.
 *
 * @category Decorators
 */
export function Utf16<This extends object, Value> (_: undefined, context: Context<This, Value>): void {
  Uint16(_, context)
  transformerDecoratorFactory('transform-utf16-read', x => String.fromCharCode(...x).trim(), { deepTransform: true })(_, context)
  transformerDecoratorFactory('transform-utf16-write', x => x.split('').map((chr: string) => chr.charCodeAt(0)), { deepTransform: true, each: true, scope: ExecutionScope.OnWrite })(_, context)
}

/**
 * `@Utf32` defines the decorated property as an unsigned 32 bit integer encoded
 * as an utf-32 string.
 *
 * @example
 *
 * The typical use-case would be to have a generic space of a pre-defined size with a
 * an utf encoded string.
 *
 * ```typescript
 * class Protocol {
 *   @Size(64)
 *   @Utf32
 *   foo: string
 * }
 * ```
 *
 * @remarks
 *
 * This decorator is supposed to be used in conjunction of a controller.
 *
 * @typeParam This The type of the class the decorator is applied to.
 * @typeParam Value The type of the decorated property.
 *
 * @category Decorators
 */
export function Utf32<This extends object, Value> (_: undefined, context: Context<This, Value>): void {
  Uint32(_, context)
  transformerDecoratorFactory('transform-utf32-read', x => x.map((code: number) => String.fromCodePoint(code)).join(''), { deepTransform: true })(_, context)
  transformerDecoratorFactory('transform-utf32-write', (x) => {
    const codes = [...Array(x.length).keys()].map((i: number) => x.codePointAt(i))

    const result = []
    for (let i = 0; i < codes.length; ++i) {
      result.push(codes[i])
      if (codes[i] > 0xFFFF) {
        ++i
      }
    }

    return result
  }, { deepTransform: true, each: true, scope: ExecutionScope.OnWrite })(_, context)
}

/**
 * `@Flatten` decorator defines a relation and extract a single property from
 * the nested relation.
 * The decorator 'flatten' the structure during the reading phase and
 * reconstruct it during the writing phase.
 *
 * @example
 *
 * In the following example `@Flatten` is used to create array of string while
 * also applying operation to that inner in string in the `ProtocolString`
 * definition.
 * The `ProtocolString` parse null terminated strings but ensure the size of
 * a string block is always of 64 bytes.
 *
 * ```typescript
 * class ProtocolString {
 *   @EnsureSize(64)
 *   @NullTerminatedString()
 *   data: string
 * }
 *
 * class Protocol {
 *   @Until(EOF)
 *   @Flatten(ProtocolString, 'data')
 *   strings: string[]
 * }
 * ```
 *
 * @typeParam This The type of the class the decorator is applied to.
 * @typeParam Relation The relation class type.
 * @typeParam Value The type of the decorated property.
 *
 * @param {new () => Relation} relation The relation type that contains the
 * nested property.
 * @param {keyof Relation} property The property inside the relation that
 * should be extracted when reading and re-encapsulated when writing.
 * @returns {DecoratorType<This, Value>} The property decorator function.
 *
 * @category Decorators
 */
export function Flatten<This extends object, Relation, Value, Args extends string> (relation: new (args?: any) => Relation, property: keyof Relation, args?: RelationParameters<This, Args>): DecoratorType<This, Value> {
  return function (_: any, context: Context<This, Value>) {
    Relation(relation, args)(_, context)
    transformerDecoratorFactory('transform-flatten-read', x => x[property], { each: true, deepTransform: true })(_, context)
    transformerDecoratorFactory('transform-flatten-write', (x) => {
      const rel = new relation()
      rel[property] = x
      return rel
    }, { each: true, scope: ExecutionScope.OnWrite })(_, context)
  }
}

/**
 * `@Matrix` decorator creates a two-dimensional array based on the specified
 * width and height arguments.
 *
 * @typeParam This The type of the class the decorator is applied to.
 * @typeParam Value The type of the decorated property.
 *
 * @param {NumberOrRecursiveKey<This, Args>} width The width of the matrix, which can be a numeric value or a computed key.
 * @param {NumberOrRecursiveKey<This, Args>} height The height of the matrix, determining the number of elements.
 * @param {number} padding Optional padding value applied to each row of the matrix.
 * @returns {DecoratorType<This, Value>} The property decorator function.
 *
 * @category Decorators
 */
export function Matrix<This extends object, Value, Args extends string> (width: NumberOrRecursiveKey<This, Args>, height: NumberOrRecursiveKey<This, Args>, padding = 0): DecoratorType<This, Value> {
  function __createMeta (_1: any, _2: any) {}

  return function (_: any, context: Context<This, Value>) {
    // I need to decorate the class to make sure the metadata are
    // created. The decorator doesn't do anything
    @__createMeta
    class _Inner {
      /**
      * The _Inner class will define something similar
      * to the following that allows to apply padding to each line
      * and makes it easy for the writer to re-write the data.
      *
      * @Padding(padding)
      * @Count(width)
      * @Relation(...)
      * data: number
      */
    }

    const name = context.name as keyof This
    const field = Meta.getField(context.metadata, name)
    const innerMeta = _Inner[Symbol.metadata] as DecoratorMetadataObject
    const _InnerContext = {
      ...context,
      metadata: innerMeta
    }

    // Remove the relation defined for the decorated property
    // and move it to the inner class.
    Meta.setField(_InnerContext.metadata, { ...field, metadata: innerMeta } as PropertyType<_Inner>)
    Meta.removeField(context.metadata, name)

    Meta.getConditions(context.metadata, name).forEach(cond => Meta.setCondition(innerMeta, name, {
      ...cond,
      metadata: innerMeta
    }))

    Padding(padding)(_, _InnerContext)
    Count(width)(_, _InnerContext)

    Flatten(_Inner, _InnerContext.name as keyof _Inner)(_, context)
    Count(height)(_, context)

    SharePropertiesWithRelation()(_, context)
  }
}
