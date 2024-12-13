/**
 * Module definition of {@link PrePost} property and class decorators.
 *
 * {@link PrePost} type decorators are used to define functions computed before
 * and/or after reading or writing the decorated property or class.
 *
 * ```mermaid
 * flowchart TB
 *  subgraph s1[For each properties]
 *  direction TB
 *  PreOperation[__Pre__ property reading operations] --> Condition
 *  click PreOperation "/binspector/modules/PrePost.html" "Documentation for 'Pre' type decorators"
 *  Condition[__Condition__ get the definitive subtype to read based on current state] --> s2
 *  click Condition "/binspector/modules/Condition.html" "Documentation for 'Condtion' type decorators"
 *  subgraph s2[Reading subtype]
 *  Controller[__Controller__ decides when to stop reading the subtype based on a set of arbitrary conditions] --> TypeReading[Read __Relation__ or __Primitive__]
 *  click Controller "/binspector/modules/Controller.html" "Documentation for 'Controller' type decorators"
 *  click TypeReading "/binspector/modules/Primitive.html" "Documentation for 'Primitive' type decorators"
 *  end
 *  TypeReading --> Controller
 *  s2 --> Transform[__Transform__ the value we read into something else]
 *  click Transform "/binspector/modules/Transformer.html" "Documentation for 'Transformer' type decorators"
 *  Transform --> Validate[__Validate__ the final value]
 *  click Validate "/binspector/modules/Validator.html" "Documentation for 'Validator' type decorators"
 *  Validate --> PostOperation[__Post__ property reading operations]
 *  click PostOperation "/binspector/modules/PrePost.html" "Documentation for 'Post' type decorators"
 *  end
 *  PostOperation -->  A@{ shape: framed-circle, label: "Stop" }
 *  style PreOperation fill:blue,stroke:#f66,stroke-width:2px,color:#fff,stroke-dasharray: 5 5
 *  style PostOperation fill:blue,stroke:#f66,stroke-width:2px,color:#fff,stroke-dasharray: 5 5
 * ```
 *
 * The {@link PrePost} decorators are used to provide tools to manage cursor
 * operations, and injecting custom logic into the parsing process.
 *
 * - **Offset Management**: Save and restore cursor positions during complex
 *   parsing operations with the {@link Offset} and {@link Peek} decorators.
 *
 * - **Endian Handling**: Dynamically set and restore endianness for properties,
 *   classes, or subtypes with the {@link Endian} decorator.
 *
 * - **Debugging and Analysis**: Use the {@link Pre} and {@link Post} decorators
 *   to log cursor positions or values during parsing.
 *
 * - **Dynamic Behavior**: Implement custom functions that allows developper to
 *   not be constrained by the declarative nature of the library.
 *
 * @module PrePost
 */
import { ClassMetaDescriptor, type PropertyMetaDescriptor, StringFormattedRecursiveKeyOf, createClassMetaDescriptor, createPropertyMetaDescriptor, recursiveGet } from './common'
import { relationExistsOrThrow } from '../error'
import { ExecutionScope, type ClassAndPropertyDecoratorType, type ClassAndPropertyDecoratorContext, type DecoratorType, type Context } from '../types'
import { type Cursor, type BinaryCursorEndianness, BinaryCursor } from '../cursor'
import Meta from '../metadatas'
import { Relation } from './primitive'

export const PreFunctionSymbol = Symbol('pre-function')
export const PostFunctionSymbol = Symbol('post-function')
export const PreClassFunctionSymbol = Symbol('pre-class-function')
export const PostClassFunctionSymbol = Symbol('post-class-function')
export type PrePostSymbols = symbol

export type PrePostFunction<This> = (instance: This, cursor: Cursor) => void

/**
 * PrePostOptions.
 */
export interface PrePostOptions {
  /**
   * Ensures that a relation exists before defining the PrePost decorator.
   */
  primitiveCheck: boolean
  /**
   * Removes the decorator from metadata after its function is executed.
   */
  once: boolean
  /**
   * Specifies whether the prepost function should be executed during
   * the read phase, the write phase, or both.
   */
  scope: ExecutionScope
}

export const PrePostOptionsDefault = {
  primitiveCheck: true,
  once: false,
  scope: ExecutionScope.OnBoth,
}

/**
 * PrePost type interface structure definition.
 *
 * @extends {PropertyMetaDescriptor}
 */
export interface PrePost<This> extends PropertyMetaDescriptor<This> {
  /**
   * Options for prepost decorator
   */
  options: PrePostOptions

  /**
   * Function that will be executed before or after the Controller, Validator and Transformer decorator.
   */
  func: PrePostFunction<This>
}

export interface PrePostClass<This> extends ClassMetaDescriptor {
  /**
   * Options for prepost decorator
   */
  options: PrePostOptions

  /**
   * Function to be executed before or after the Controller, Validator, and Transformer decorators.
   */
  func: PrePostFunction<This>
}

/**
 * `prePostFunctionDecoratorFactory` function returns a decorator function
 * that can be applied to properties.
 *
 * This factory enables defining `Pre` or `Post` type decorators for
 * property-level operations, allowing execution of a specified function
 * before or after a property has been processed.
 *
 * @param {string} name The name of the 'pre' or 'post' type decorator.
 * @param {PrePostSymbols} typeSym The symbol indicating whether it's a 'Pre'
 * or 'Post' decorator.
 * @param {PrePostFunction} func The function to be executed.
 * @param {Partial<PrePostOptions>} [opt] Optional configution.
 * @returns {ClassAndPropertyDecoratorType<This>} The property decorator function.
 *
 * @category Advanced Use
 */
function prePostFunctionDecoratorFactory<This> (name: string, typeSym: PrePostSymbols, func: PrePostFunction<This>, opt: Partial<PrePostOptions> = PrePostOptionsDefault): ClassAndPropertyDecoratorType<This> {
  const options = { ...PrePostOptionsDefault, ...opt }

  return function (_: any, context: ClassFieldDecoratorContext<This>) {
    if (options.primitiveCheck) {
      relationExistsOrThrow(context.metadata, context)
    }

    const propertyName = context.name as keyof This
    const prePostFunction: PrePost<This> = {
      ...createPropertyMetaDescriptor(typeSym, name, context.metadata, propertyName),
      options,
      func,
    }

    if (options.once) {
      prePostFunction.func = (instance: This, cursor: Cursor) => {
        func(instance, cursor)
        Meta.removePrePost(context.metadata, typeSym, prePostFunction, propertyName)
      }
    }

    Meta.setPrePost(context.metadata, typeSym, prePostFunction, propertyName)
  }
}

/**
 * `prePostClassFunctionDecoratorFactory` function returns a decorator function
 * that can be applied to classes.
 *
 * This factory enables defining `Pre` or `Post` type decorators for class-level
 * operations, allowing execution of a specified function before or after a
 * class has been processed.
 *
 * @param {string} name The name of the 'pre' or 'post' decorator.
 * @param {PrePostSymbols} typeSym The symbol indicating whether it's a 'Pre'
 * or 'Post' decorator.
 * @param {PrePostFunction} func The function to be executed.
 * @param {Partial<PrePostOptions>} [opt] Optional configution.
 * @returns {ClassAndPropertyDecoratorType<This>} The class decorator function.
 *
 * @category Advanced Use
 */
function prePostClassFunctionDecoratorFactory<This> (name: string, typeSym: PrePostSymbols, func: PrePostFunction<This>, opt: Partial<PrePostOptions> = PrePostOptionsDefault): ClassAndPropertyDecoratorType<This> {
  const options = { ...PrePostOptionsDefault, ...opt }

  return function (_: new() => This, context: ClassDecoratorContext<new (...args: any) => This>) {
    const prePostFunction: PrePostClass<This> = {
      ...createClassMetaDescriptor(typeSym, name, context.metadata, context.name as string),
      options,
      func,
    }

    if (options.once) {
      prePostFunction.func = (instance: This, cursor: Cursor) => {
        func(instance, cursor)
        Meta.removePrePost(context.metadata, typeSym, prePostFunction)
      }
    }

    Meta.setPrePost(context.metadata, typeSym, prePostFunction)
  }
}

/**
 * `prePostClassAndPropertyFunctionDecoratorFactory` function returns a
 * decorator function that can be applied to both classes and properties.
 * It uses the appropriate factory function
 * ({@link prePostClassFunctionDecoratorFactory} or
 * {@link prePostFunctionDecoratorFactory}) depending on whether the target
 * is a class or a property.
 *
 * @param {string} name The name of the 'pre' or 'post' decorator.
 * @param {PrePostSymbols} typeSym The symbol indicating whether it's a 'Pre'
 * or 'Post' decorator.
 * @param {PrePostFunction} func The function to be executed.
 * @param {Partial<PrePostOptions>} [opt] Optional configution.
 * @returns {ClassAndPropertyDecoratorType<This>} The class or property
 * decorator function.
 *
 * @category Advanced Use
 */
function prePostClassAndPropertyFunctionDecoratorFactory<This> (name: string, typeSym: PrePostSymbols, func: PrePostFunction<This>, opt: Partial<PrePostOptions> = PrePostOptionsDefault): ClassAndPropertyDecoratorType<This> {
  return function (_: any, context: ClassAndPropertyDecoratorContext<This>) {
    if (context.kind === 'class') {
      prePostClassFunctionDecoratorFactory(name, typeSym === PreFunctionSymbol ? PreClassFunctionSymbol : PostClassFunctionSymbol, func, opt)(_, context)
    } else {
      prePostFunctionDecoratorFactory(name, typeSym, func, opt)(_, context)
    }
  }
}

/**
 * `preFunctionDecoratorFactory` function helps creates a decorator that saves
 * the metadata of `Pre` type decorator.
 *
 * @typeParam This The type of the class the decorator is applied to.
 *
 * @param {string} name Name of the 'Pre' type decorator.
 * * @param {PrePostFunction} func Function that will be executed before the
 * property or class has been processed, that receive the instance and cursor
 * value as argument.
 * @param {Partial<PrePostOptions>} [opt] Optional configution.
 * @returns {DecoratorType} The class or property decorator function.
 *
 * @category Advanced Use
 */
export function preFunctionDecoratorFactory<This> (name: string, func: PrePostFunction<This>, opt: Partial<PrePostOptions> = PrePostOptionsDefault): ClassAndPropertyDecoratorType<This> {
  return prePostClassAndPropertyFunctionDecoratorFactory(name, PreFunctionSymbol, func, opt)
}

/**
 * `postFunctionDecoratorFactory` function helps creates a decorator that saves
 * the metadata of the `Post` type decorator.
 *
 * @typeParam This The type of the class the decorator is applied to.
 *
 * @param {string} name Name of the 'Post' type decorator.
 * @param {PrePostFunction} func Function that will be executed after the property or class has been fully processed.
 * @param {Partial} opt PrePost options.
 * @returns {DecoratorType} The class or property decorator function.
 *
 * @category Advanced Use
 */
export function postFunctionDecoratorFactory<This> (name: string, func: PrePostFunction<This>, opt: Partial<PrePostOptions> = PrePostOptionsDefault): ClassAndPropertyDecoratorType<This> {
  return prePostClassAndPropertyFunctionDecoratorFactory(name, PostFunctionSymbol, func, opt)
}

/**
 * `@Pre` decorator defines a function computed before reading or
 * writing the value of the decorated property or class .
 *
 * It is typically used for pre-processing tasks such as debugging,
 * to run operation on the Cursor instance at runtime.
 *
 * @example
 *
 * In the following example, the `@Pre` operator is used read the value
 * of the cursor and make a debug log to notify the position where the
 * type definition start to be read.
 *
 * ```typescript
 * @Pre((_, cursor) => { console.log(`${_.constructor.name} : ${cursor.offset()}`) })
 * class Protocol {
 *   @Pre((_, cursor) => { console.log(`${_.constructor.name} : ${cursor.offset()}`) })
 *   @Relation(PrimitiveSymbol.u8)
 *   foo: number
 * }
 * ```
 *
 * @typeParam This The type of the class the decorator is applied to.
 *
 * @param {PrePostFunction} func Function that will be executed before the
 * property or class has been processed, that receive the instance and cursor
 * value as argument.
 * @param {Partial<PrePostOptions>} [opt] Optional configution.
 * @returns {DecoratorType} The class or property decorator function.
 *
 * @category Decorators
 */
export function Pre<This> (func: PrePostFunction<This>, opt?: Partial<PrePostOptions>): ClassAndPropertyDecoratorType<This> {
  return preFunctionDecoratorFactory('pre', func, opt)
}

/**
 * `@Post` decorator defines a function computed after fully reading or
 * writing the value of the decorated property or class .
 *
 * It is typically used for post-processing tasks such as debugging, or
 * to enforce custom constraints that the library cannot handle declaratively.
 *
 * @example
 *
 * In the following example, the `@Post` operator is used to store the value of
 * the property it decorate inside a global variable that will be accessed by other
 * part of the code. Currently, the library does not natively support shared
 * context functionality, this example demonstrates a workaround for achieving
 * similar behavior.
 *
 * ```typescript
 * const GLOBAL_STORAGE = {}
 *
 * // After the 'Record' class has been processed key-value will be stored
 * // in the 'GLOBAL_STORAGE' variable.
 * @Post(_ => { GLOBAL_STORAGE[_.key] = _.value })
 * class Record {
 *   @NullTerminatedString
 *   @Relation(PrimitiveSymbol.char)
 *   key: string
 *
 *   @NullTerminatedString
 *   @Relation(PrimitiveSymbol.char)
 *   value: string
 * }
 *
 * class SubProtocol {
 *   ...
 *   constructor (key: string, value: string) {
 *     ...
 *   }
 * }
 *
 * class Protocol {
 *   @Count(16)
 *   @Relation(Records)
 *   records: Record
 *
 *   // Map 'GLOBAL_STORAGE' to a [key, value] array and pass it to the
 *   // SubProtocol constructor.
 *   @MapTo(_ => Object.entries(GLOBAL_STORAGE))
 *   @Relation(SubProtocol)
 *   map:
 * }
 * ```
 *
 * @typeParam This The type of the class the decorator is applied to.
 *
 * @param {PrePostFunction} func Function that will be executed after the property or class has been fully processed.
 * @param {Partial<PrePostOptions>} [opt] Optional configution.
 * @returns {DecoratorType} The class or property decorator function.
 *
 * @category Decorators
 */
export function Post<This> (func: PrePostFunction<This>, opt?: Partial<PrePostOptions>): ClassAndPropertyDecoratorType<This> {
  return postFunctionDecoratorFactory('post', func, opt)
}

/**
 * `@Offset` decorator define the address where the cursor should move to
 * continue the next reading or writing operation.
 *
 * This is useful when dealing with binary file format with sections of data
 * located at specific address.
 *
 * @example
 *
 * Some binary file format will define arbitrary area where part its definition
 * is stored based on an address referenced somewhere else.
 *
 * In the following example, the `@Offset` decorator moves the cursor to an
 * address defined in the 'header.address' property and then read
 * null-terminated strings until the enf of the file.
 *
 * ```typescript
 * class ProtocolHeader {
 *   @Relation(PrimitiveSymbol.u32)
 *   address: number
 * }
 *
 * class Protocol {
 *   @Relation(ProtocolHeader)
 *   header: ProtocolHeader
 *
 *   @Offset('header.address') // Move the cursor the the address in the header
 *   @Until(EOF) // Keep reading strings until the end of the file
 *   @NullTerminatedString() // Read a null-terminated string
 *   area: string[]
 * }
 * ```
 * @typeParam This The type of the class the decorator is applied to.
 *
 * @param {number | string} offset
 * @param {Partial<PrePostOptions>} [opt] Optional configution.
 * @returns {DecoratorType} The class or property decorator function.
 *
 * @category Decorators
 */
export function Offset<This extends object, Args extends string> (offset: number | StringFormattedRecursiveKeyOf<This, Args> | ((instance: This, cursor: Cursor) => number), opt?: Partial<PrePostOptions>): ClassAndPropertyDecoratorType<This> {
  return preFunctionDecoratorFactory('offset', (targetInstance, cursor) => {
    const offCompute = typeof offset === 'string'
      ? recursiveGet(targetInstance, offset) as number
      : typeof offset === 'number'
        ? offset
        : offset(targetInstance, cursor)
    cursor.move(offCompute)
  }, opt)
}

/**
 * `@Peek` decorator moves the cursor to a specified address to read/write the
 * decorated property, then moves back the cursor to its original position.
 *
 * The `@Peek` decorator shares similar functionality with the {@link Offset}
 * decorator, but with a key difference: `@Peek` will automatically reset the
 * cursor to its original position after reading or writing the decorated
 * class or property.
 *
 * @example
 *
 * A use case where the `@Peek` decorator could be used instead of `@Offset`
 * is if you need to apply some form of processing to the value of the property
 * to know decide on the structure that value follows.
 *
 * In the following example the structure of the bitfield is only known based
 * on the value of the most significant bit. For this I use `@Peek` to check the
 * content of the next value and then I properly read it in the correct form.
 *
 * ```typescript
 * class BitfieldB {
 *   ...
 * }
 *
 * class BitfieldA {
 *   ...
 * }
 *
 * class Protocol {
 *   // Use `@Peek` to check the MSB but restore the cursor position
 *   @Peek()
 *   @Transform(x => x & 0x80)
 *   @Relation(PrimitiveSymbol.u8)
 *   peeked: number
 *
 *   @IfThen(_ => _.peeked > 0, BitfieldA)
 *   @Else(BitfieldB)
 *   bitfield: BitfieldA | BitfieldB
 * }
 * ```
 *
 * You can also use the `@Peek` decorator with a dynamic offset that depends on
 * the class instance and the current cursor position:
 *
 * ```typescript
 * class Protocol {
 *   @Relation(PrimitiveSymbol.u8)
 *   offset: number
 *
 *   @Peek((instance, cursor) => cursor.offset() + instance.offset)
 *   @Relation(PrimitiveSymbol.u8)
 *   peeked: number
 * }
 * ```
 *
 * @remarks
 *
 * If you don’t need to return the cursor to its original position or know
 * the exact position of the next read/write operation, use `@Offset`.
 *
 * @typeParam This The type of the class the decorator is applied to.
 *
 * @param {number | string | ((instance: This, cursor: Cursor) => number)} [offset]
 * The offset to move the cursor to before reading or writing the decorated property. It can be:
 *   - A static number, indicating a fixed offset.
 *   - A string that refer to a property of the current instance.
 *   - A function that computes the offset dynamically based on the current instance and cursor.
 * @param {Partial<PrePostOptions>} [opt] Optional configution.
 * @returns {DecoratorType} The class or property decorator function.
 *
 * @category Decorators
 */
export function Peek<This extends object, Args extends string> (offset?: number | StringFormattedRecursiveKeyOf<This, Args> | ((instance: This, cursor: Cursor) => number), opt?: Partial<PrePostOptions>): ClassAndPropertyDecoratorType<This> {
  return function (_: undefined, context: ClassAndPropertyDecoratorContext<This>) {
    preFunctionDecoratorFactory<This>('pre-peek', (targetInstance, cursor) => {
      const preOff = cursor.offset()
      postFunctionDecoratorFactory<This>('post-peek', (_, cursor) => {
        cursor.move(preOff)
      }, { ...opt, once: true })(_, context)
      const offCompute
        = (offset === null || offset === undefined)
          ? preOff
          : typeof offset === 'number'
            ? offset
            : typeof offset === 'string'
              ? Number(recursiveGet(targetInstance, offset))
              : offset(targetInstance, cursor)
      cursor.move(offCompute)
    }, opt)(_, context)
  }
}

/**
 * `@EnsureSize` decorator force the decorated property to meet a size
 * constraint. If that size is not met the cursor will be moved.
 *
 * @example
 *
 * In the following example the structure of the bitfield is only known based
 * on the value of the most significant bit. For this I use `@Peek` to check the
 * content of the next value and then I properly read it in the correct form.
 *
 * ```typescript
 * @EnsureSize('_size')
 * class Block {
 *   @NullTerminatedString()
 *   @Relation(PrimitiveSymbol.char)
 *   content: string
 *
 *   constructor(public _size: number) {}
 * }
 *
 * class Protocol {
 *   @Relation(PrimitiveSymbol.u16)
 *   block_size: number
 *
 *   @Relation(PrimitiveSymbol.u32)
 *   block_count: number
 *
 *   @Count('block_count')
 *   @Relation(Block, 'block_size')
 *   blocks: Block[]
 * }
 * ```
 *
 * @remarks
 *
 * If the size is known before parsing the file, use the alignment in the
 * controller instead
 *
 * @typeParam This The type of the class the decorator is applied to.
 *
 * @param {number | string | ((instance: This, cursor: Cursor) => number)} [size]
 * The size to move the cursor to before reading or writing the decorated property. It can be:
 *   - A static number, indicating a fixed offset.
 *   - A string that refer to a property of the current instance.
 *   - A function that computes the offset dynamically based on the current instance and cursor.
 * @param {Partial<PrePostOptions>} [opt] Optional configution.
 * @returns {DecoratorType} The class or property decorator function.
 *
 * @category Decorators
 */
export function EnsureSize<This extends object, Args extends string> (size: number | StringFormattedRecursiveKeyOf<This, Args> | ((instance: This, cursor: Cursor) => number), opt?: Partial<PrePostOptions>): ClassAndPropertyDecoratorType<This> {
  return function (_: undefined, context: ClassAndPropertyDecoratorContext<This>) {
    preFunctionDecoratorFactory<This>('pre-ensure', (targetInstance, cursor) => {
      const preRead = cursor.offset()
      const sizeCompute
        = typeof size === 'number'
          ? size
          : typeof size === 'string'
            ? Number(recursiveGet(targetInstance, size))
            : size(targetInstance, cursor)
      postFunctionDecoratorFactory<This>('post-ensure', (_, cursor) => {
        const postRead = cursor.offset()
        if ((postRead - preRead) !== sizeCompute) {
          cursor.move(preRead + sizeCompute)
        }
      }, { ...opt, once: true })(_, context)
    }, opt)(_, context)
  }
}

/**
 * `@Endian` decorator change the endianness of the decorated property or class.
 * It allows you to control how binary data is serialized or deserialized, based
 * endianness that define the byte order of 16 and 32 bits integers.
 *
 * @example
 *
 * **Changing Endianness for individual properties**
 *
 * Use the `@Endian` decorator over a `PrimitiveSymbol` property to change it's endianness.
 *
 * ```typescript
 * class Protocol {
 *   @Endian(BinaryCursorEndianness.LittleEndian)
 *   @Relation(PrimitiveSymbol.u16)
 *   little_endian: number
 *
 *   @Relation(PrimitiveSymbol.u32)
 *   big_endian: number
 * }
 * ```
 *
 * **Changing Endianness for subtypes**
 *
 * By using the `@Endian` decorator over a subtype relation property to change
 * the endianness of the entire sub-type
 *
 * ```typescript
 * class SubProtocol {
 *   @Relation(PrimitiveSymbol.u32)
 *   foo: number
 *
 *   @Relation(PrimitiveSymbol.u32)
 *   bar: number
 * }
 *
 * class Protocol {
 *   @Endian(BinaryCursorEndianness.LittleEndian)
 *   @Relation(SubProtocol)
 *   sub_type: SubProtocol
 * }
 * ```
 *
 * **Set the endianness of an entire type definition**
 *
 * It's also possible to apply `@Endian` decorator on top of a class
 * declaration to change the endianness of all its properties.
 *
 * In the following example, the `Protocol` type definition that
 * include two unsigned 32bits integer: `foo` and `bar`, will use big-endian
 * byte order.
 *
 * ```typescript
 * @Endian(BinaryCursorEndianness.BigEndian)
 * class Protocol {
 *   @Relation(PrimitiveSymbol.u32)
 *   foo: number
 *
 *   @Relation(PrimitiveSymbol.u32)
 *   bar: number
 * }
 * ```
 *
 * **Runtime Conditional Endianness:**
 *
 * If you need to set the endianness dynamically at runtime based on a class
 * property, you can pass a function to the `@Endian` decorator.
 *
 * In the following example, the `@Endian` decorator uses the value of the
 * `_value` property passed as an argument of `Protocol` constructor whether
 * little-endian or big-endian byte order should be applied to the protocol.
 *
 * ```typescript
 * @Endian(_ => _value > 0 ? BinaryCursorEndianness.LittleEndian : BinaryCursorEndianness.BigEndian)
 * class Protocol {
 *   _value: number
 *
 *   @Relation(PrimitiveSymbol.u32)
 *   foo: number
 *
 *   @Relation(PrimitiveSymbol.u32)
 *   bar: number
 *
 *   constructor(value: number) {
 *      this._value = value
 *   }
 * }
 * ```
 *
 * @remarks
 *
 * Because of the current architecture of the library, if multiple `@Endian`
 * that are based on values known at runtime are run in parallel it could
 * potentially mess up the result because they will all populate the 'post'
 * property metadata.
 *
 * @typeParam This The type of the class the decorator is applied to.
 *
 * @param {BinaryCursorEndianness | ((instance: This) => BinaryCursorEndianness)} endianness The endianness to apply, or a function that return the endianness based on the instance value.
 * @param {Partial<PrePostOptions>} [opt] Optional configution.
 * @returns {DecoratorType} The class or property decorator function.
 *
 * @category Decorators
 */
export function Endian<This> (endianness: BinaryCursorEndianness | ((instance: This) => BinaryCursorEndianness), opt?: Partial<PrePostOptions>): ClassAndPropertyDecoratorType<This> {
  return function (_: any, context: ClassAndPropertyDecoratorContext<This>) {
    prePostClassAndPropertyFunctionDecoratorFactory<This> ('preEndian', PreFunctionSymbol, (targetInstance, cursor) => {
      if (cursor instanceof BinaryCursor) {
        const finalEndian = typeof endianness === 'function'
          ? endianness(targetInstance)
          : endianness

        const currentEndian = cursor.getEndian()

        if (currentEndian !== finalEndian) {
          cursor.setEndian(finalEndian)

          prePostClassAndPropertyFunctionDecoratorFactory('postEndian', PostFunctionSymbol, () => {
            cursor.setEndian(currentEndian)
          }, { ...opt, once: true })(_, context)
        }
      }
    }, opt)(_, context)
  }
}

type ValueSetFunction<This, Value> = (instance: This) => Value

/**
 * `@ValueSet` decorator set the value of the decorated property based on
 * a function passed as a parameter.
 * This decorator don't read anything from the binary file and is just used
 * to add more context to a class during the reading.
 *
 * @example
 *
 * In the following example `@ValueSet` is used to fetch the protocol type name
 * based on an id read in by the binary definition.
 * The `protocol_name` will just appear when the object is serialized and will
 * gave the object more context.
 *
 * ```typescript
 * const ID_TO_NAME = {
 *   1: "Record",
 *   ...
 * }
 *
 * class Protocol {
 *   @Relation(PrimitiveSymbol.u8)
 *   protocol_id: number
 *
 *   @ValueSet(_ => ID_TO_NAME[_.protocol_id] || 'UNKNOWN')
 *   protocol_name: string
 * }
 * ```
 *
 * @typeParam This The type of the class the decorator is applied to.
 *
 * @param {ValueSetFunction} setter Function that will store the return value in the decorated property.
 * @param {Partial<PrePostOptions>} [opt] Optional configution.
 * @returns {DecoratorType} The class or property decorator function.
 *
 * @throws {@link Primitive.RelationAlreadyDefinedError} if a relation metadata is found.
 */
export function ValueSet<This extends object, Value extends This[keyof This]> (setter: ValueSetFunction<This, Value>, opt?: Partial<PrePostOptions>): DecoratorType<This, Value> {
  return function (_: any, context: Context<This, Value>) {
    const propertyName = context.name as keyof This
    if (!Meta.isFieldDecorated(context.metadata, propertyName)) {
      // Create an empty relation that wont be read.
      Relation()(_, context)
    }

    postFunctionDecoratorFactory<This> ('value-set', (targetInstance) => {
      targetInstance[propertyName] = setter(targetInstance)
    }, { ...opt, scope: ExecutionScope.OnRead })(_, context)
  }
}

/**
 * usePrePost execute an array of `PrePost` decorator metadata on a target instance.
 *
 * @param {Array} prepost Array of `PrePost` decorator metadatas.
 * @param {T} targetInstance Current state of the object the `PrePost` decorators are defined in, that will be passed to the PrePost decorator functions.
 * @param {Cursor} cursor Cursor state that will be passed to the PrePost decorator functions.
 * @returns {void}
 *
 * @category Advanced Use
 */
export function usePrePost<This> (prepost: Array<PrePost<This>> | Array<PrePostClass<This>>, targetInstance: This, cursor: Cursor, scope = ExecutionScope.OnBoth): void {
  prepost.forEach((x) => {
    if ((x.options.scope & scope) > 0) {
      x.func(targetInstance, cursor)
    }
  })
}
