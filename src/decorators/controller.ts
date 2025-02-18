/**
 * Module definition of {@link Controller} property decorators.
 *
 * {@link Controller} decorators modify the behavior of the parser during
 * the reading process. These decorators are applied to properties within
 * a class, enabling dynamic and flexible parsing scenarios of the child
 * {@link Primitive.Relation} based on runtime data and conditions.
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
 *  style Controller fill:blue,stroke:#f66,stroke-width:2px,color:#fff,stroke-dasharray: 5 5
 * ```
 *
 * The {@link Controller} decorators defines various mechanisms to provide
 * control over the data reading process and handling dynamic data that depends
 * on the parsing context.
 *
 * - **Fixed-Length Arrays**: Define arrays with a statically set or
 *   dynamically determined by another property using the {@link Count}
 *   decorator.
 *
 * - **Variable-Length Arrays**: Read arrays until a specific condition or
 *   EOF marker is encountered using the {@link Until} decorator.
 *
 * - **Byte-Sized Arrays**: Read arrays until the size in byte is met
 *   using the {@link Size} decorator.
 *
 * - **Matrix**: Use {@link Matrix} to process two-dimensional arrays
 *   with dynamic dimensions.
 *
 * @module Controller
 */
import { createPropertyMetaDescriptor, type PropertyMetaDescriptor, recursiveGet, StringFormattedRecursiveKeyOf } from './common'
import { type Cursor } from '../cursor'
import { EOF, type DecoratorType, type InstantiableObject, type Context } from '../types'
import { relationExistsOrThrow, EOFError } from '../error'
import Meta from '../metadatas'

export const ControllerSymbol = Symbol('controller')

/**
 * ControllerReader
 */
export type ControllerReader = (arg?: any) => any

/**
 * ControllerOptions.
 *
 * @category Options
 */
export interface ControllerOptions {
  /**
   * Ensures that a relation exists before defining the Controller decorator.
   */
  primitiveCheck: boolean
  /**
   * Define the memory address alignment. After performing the read the controller will be moved to be a multiple of "alignment". If this value is equal to 0 it won't change the alignment.
   */
  alignment: number
  /**
   * Move the cursor back to its previous position when the controller condition is met.
   */
  peek: boolean
}

/**
 * @category Options
 */
export const ControllerOptionsDefault = {
  primitiveCheck: true,
  alignment: 0,
  peek: false,
}

/**
 * ControllerFunction.
 */
export type ControllerFunction<This> = (targetInstance: This, cursor: Cursor, read: ControllerReader, opt: ControllerOptions) => any
export type OptionlessControllerFunction = (targetInstance: any, cursor: Cursor, read: ControllerReader) => any

type NumberOrRecursiveKey<This extends object, Args extends string> = number | StringFormattedRecursiveKeyOf<This, Args>

/**
 * Controller type interface structure definition.
 *
 * @extends {PropertyMetaDescriptor}
 */
export interface Controller<This> extends PropertyMetaDescriptor<This> {
  /**
   * Options for controller decorator
   */
  options: ControllerOptions

  /**
   * Function to control the flow of execution of the binary reader
   */
  controller: OptionlessControllerFunction // TODO property primitive could be passed directly by checking the metadata api when applying the controller function.
}

/**
 * controllerDecoratorFactory.
 *
 * `controllerDecoratorFactory` is a utility function used to create `Controller`
 * type property decorators, used to control the execution flow of a parser in
 * a binary data processing context.
 *
 *
 * @remarks
 *
 * Use this factory function to design custom 'Controller' type decorators
 * tailored to specific data format requirements that are not supported by the
 * library yet.
 *
 * @param {string} name The name of the 'controller' type decorator.
 * @param {ControllerFunction} func Function to control the flow of execution of the parser.
 * @param {Partial<ControllerOptions>} [opt] Optional configuration.
 * @returns {DecoratorType<This, Value>} The property decorator function.
 *
 * @category Advanced Use
 */
export function controllerDecoratorFactory<This, Value> (name: string, func: ControllerFunction<This>, opt: Partial<ControllerOptions> = ControllerOptionsDefault): DecoratorType<This, Value> {
  const options = {
    ...ControllerOptionsDefault,
    ...opt,
  }

  return function (_: undefined, context: Context<This, Value>) {
    if (options.primitiveCheck) {
      relationExistsOrThrow(context.metadata, context)
    }

    const propertyName = context.name as keyof This
    const controller: Controller<This> = {
      ...createPropertyMetaDescriptor(ControllerSymbol, name, context.metadata, propertyName),
      options,
      controller: (curr: This, cursor, read) => func(curr, cursor, read, options),
    }
    Meta.setController(context.metadata, propertyName, controller)
  }
}

/**
 * ControllerWhileFunction.
 */
export type ControllerWhileFunction<This> = (curr: any, count: number, targetInstance: This, offset: number, startOffset: number) => boolean

/**
 * whileFunctionFactory.
 *
 * @param {ControllerWhileFunction} cond A function that defines the condition for continuation.
 * @returns {ControllerFunction<This>} A controller function reader implementing the reading logic.
 *
 * @category Advanced Use
 */
function whileFunctionFactory<This> (cond: ControllerWhileFunction<This>): ControllerFunction<This> {
  return function (
    currStateObject: This,
    cursor: Cursor,
    read: ControllerReader,
    opt: ControllerOptions,
  ): any {
    // TODO To something based on target type. If target is a string
    // add everything into a string. If target is an array add everything
    // into an array
    const result = []
    const startOffset = cursor.offset()
    // TODO possible bug.
    // The condition `func` is not checked before executing the first `read`
    // This can possibly lead to a bug since the condition could be `i < 0`
    // which would never enter the loop.
    // I have to figure out if it's an issue for the condition to receive a null
    // object. It's probably one for the condition that check the inner object property.
    while (true) {
      const beforeReadOffset = cursor.offset()
      let ret
      try {
        ret = read()
      } catch (error) {
        // In the case of chained controller the inner reader would reach EOF first
        // and throw an EOFError but the actual value we want to send to the outer
        // controller is the one built over the inner controller.
        if (error instanceof EOFError) {
          ret = EOF
        } else {
          throw error
        }
      }

      if (ret === EOF) {
        // If you attempt to read a primitive but reached the EOF.
        // EOF might be the only value we don't want to put inside the result array.
        // Other special character like `\0` is discutable.
        throw new EOFError(result)
      }
      result.push(ret)
      if (!cond(ret, result.length, currStateObject, cursor.offset(), startOffset)) {
        if (opt.peek) {
          result.pop()
          cursor.move(beforeReadOffset)
        }
        break
      }
    }
    const endOffset = cursor.offset()
    if (opt.alignment > 0) {
      cursor.forward((opt.alignment - ((endOffset - startOffset) % opt.alignment)) % opt.alignment)
    }
    return result
  }
}

/**
 * mapFunctionFactory.
 *
 * @param {any[]} array An array that will map each element to the child relation constructor.
 * @returns {ControllerFunction<This>} A controller function reader implementing the reading logic.
 *
 * @category Advanced Use
 */
function mapFunctionFactory<This> (array: any[]): ControllerFunction<This> {
  return function (
    _: any,
    cursor: Cursor,
    read: ControllerReader,
    opt: ControllerOptions,
  ): any {
    const startOffset = cursor.offset()

    const result = array.map(read)

    const endOffset = cursor.offset()

    if (opt.alignment > 0) {
      cursor.forward((opt.alignment - ((endOffset - startOffset) % opt.alignment)) % opt.alignment)
    }

    if (opt.peek) {
      cursor.move(startOffset)
    }

    return result
  }
}

/**
 * `@While` decorator continues the execution flow while the condition passed
 * as a parameter is met.
 *
 * By default, if the condition is not met by a value, it will be included in
 * the result, and the cursor will move forward.
 * This is the default behavior because it's the most common use case. However,
 * you can modify this behavior using the `peek` option.
 *
 * @example
 *
 * In the following example, the `@While` decorator is used to reads
 * variable-length array from binary stream until a the condition based on the
 * object currently read is no longer met.
 *
 * ```typescript
 * class BinObject {
 *   @Relation(PrimitiveSymbol.u8)
 *   type: number
 *
 *   @Relation(PrimitiveSymbol.u8)
 *   len: number
 *
 *   @Count('len')
 *   @Relation(PrimitiveSymbol.u8)
 *   blob: number[]
 * }
 *
 * class Protocol {
 *   @While((obj) => obj.type !== 0x00)
 *   @Relation(BinObject)
 *   objs: BinObject[]
 * }
 * ```
 *
 * You can also use the `peek` option to exclude the elements that don't meet
 * the condition and prevent them from being included in the result.
 * With this option the cursor will then be set back before the element was
 * read.
 *
 * ```typescript
 * class Protocol {
 *   @While((elem) => elem !== 0x00, { peek: true })
 *   @Relation(PrimitiveSymbol.u8)
 *   array: number[]
 *
 *   @Match(0x00)
 *   @Relation(PrimitiveSymbol.u8)
 *   end_elem: number
 * }
 * ```
 *
 * @remarks
 *
 * Don't use this decorator to compare the current value to EOF. Use {@link Until} instead.
 *
 * @typeParam This The type of the class the decorator is applied to.
 * @typeParam Value The type of the decorated property.
 *
 * @param {ControllerWhileFunction} func A function that returns a boolean and receives multiple arguments:
 *   - The currently read relation
 *   - The count
 *   - A reference to the target instance
 *   - The current offset
 *   - The offset before that relation
 * @param {Partial<ControllerOptions>} [opt] Optional configuration.
 * @returns {DecoratorType<This, Value>} The property decorator function.
 *
 * @category Decorators
 */
export function While<This, Value> (func: ControllerWhileFunction<This>, opt?: Partial<ControllerOptions>): DecoratorType<This, Value> {
  // TODO Verify you don't expect to compare something to EOF
  return controllerDecoratorFactory('while', whileFunctionFactory(func), opt)
}

/**
 * `@Until` decorator reads variable-length array from binary stream until a
 * specified terminating character or magic number is encountered.
 *
 * The main difference between `@Until` and `@Count` is that `@Until` supports
 * reading data of an undefined length, terminating when a specific character
 * is met. This makes it useful for reading data that ends with a special
 * character or an EOF symbol.
 *
 * @example
 *
 * You can use this decorator to read relation or primitive until the EOF.
 *
 * ```typescript
 * class BinProtocol {
 *   @Until(EOF)
 *   @Relation(PrimitiveSymbol.u8)
 *   array: number[]
 * }
 * ```
 *
 * @remarks
 *
 * This decorator does not accept a function as argument.
 * If you need to use a function to verify an equality based on the currently read value
 * use the {@link While} decorator instead.
 *
 * @typeParam This The type of the class the decorator is applied to.
 * @typeParam Value The type of the decorated property.
 *
 * @param {number | string | EOF} cmp The comparison value that indicates the
 * end of the reading process. This can be a specific character, number, or
 * the `EOF` symbol.
 * @param {Partial<ControllerOptions>} [opt] Optional configuration.
 * @returns {DecoratorType<This, Value>} The property decorator function.
 *
 * @see {@link Count}
 * @see {@link While}
 * @see {@link Controller}
 *
 * @category Decorators
 */
export function Until<This, Value> (cmp: number | string | typeof EOF, opt?: Partial<ControllerOptions>): DecoratorType<This, Value> {
  function untilEofController (): ControllerFunction<This> {
    const wrap = whileFunctionFactory(() => true)
    return function (
      currStateObject: This,
      cursor: Cursor,
      read: ControllerReader,
      opt: ControllerOptions,
    ): any {
      try {
        wrap(currStateObject, cursor, read, opt)
      } catch (error) {
        if (error instanceof EOFError) {
          return error.value
        } else {
          throw error
        }
      }
    }
  }

  if (cmp === EOF) {
    return controllerDecoratorFactory('until', untilEofController(), opt)
  } else {
    return controllerDecoratorFactory('until', whileFunctionFactory((x: number | string | typeof EOF) => x !== cmp), opt)
  }
}

/**
 * `@Count` decorator defines a variable-length array based on a value you pass
 * as argument.
 *
 * This decorator is useful for dynamic parsing of arrays when the length is
 * not fixed but can be derived from another property.
 *
 * @example
 *
 * In the following example, the `@Count` decorator is used to define an array
 * (`vec`) whose length is determined by the value of another property (`len`):
 *
 * ```typescript
 * class Protocol {
 *   @Relation(PrimitiveSymbol.u8)
 *   len: Number
 *
 *   @Count('len')
 *   @Relation(PrimitiveSymbol.u8)
 *   vec: Number
 * }
 * ```
 *
 * @see {@link Until}
 * @see {@link While}
 * @see {@link Controller}
 *
 * @typeParam This The type of the class the decorator is applied to.
 * @typeParam Value The type of the decorated property.
 *
 * @param {number | string} arg The number of time to read the target property
 * or a string referring to a property that specifies the array length.
 * @param {Partial<ControllerOptions>} [opt] Optional configuration.
 * @returns {DecoratorType<This, Value>} The property decorator function.
 *
 * @category Decorators
 */
export function Count<This extends object, Value, Args extends string> (arg: NumberOrRecursiveKey<This, Args>, opt?: Partial<ControllerOptions>): DecoratorType<This, Value> {
  function countController (
    currStateObject: This,
    cursor: Cursor,
    read: ControllerReader,
    opt: ControllerOptions,
  ): any {
    // Determine the count (length) either from a static value or dynamically
    // from another field in the class.
    const count
      = typeof arg === 'string'
        ? recursiveGet(currStateObject, arg)
        : arg

    if (typeof count !== 'number') {
      throw Error('End type should be a number')
    }

    if (count > 0) {
      return whileFunctionFactory((_: This, i: number) => i < count)(currStateObject, cursor, read, opt)
    }

    return []
  }

  return controllerDecoratorFactory('count', countController, opt)
}

/**
 * `@Matrix` decorator creates a two-dimensional array based on the specified
 * width and height arguments.
 *
 * @typeParam This The type of the class the decorator is applied to.
 * @typeParam Value The type of the decorated property.
 *
 * @param {number | string} width
 * @param {number | string} height
 * @param {Partial<ControllerOptions>} [opt] Optional configuration.
 * @returns {DecoratorType<This, Value>} The property decorator function.
 *
 * @category Decorators
 */
export function Matrix<This extends object, Value, Args extends string> (width: NumberOrRecursiveKey<This, Args>, height: NumberOrRecursiveKey<This, Args>, opt?: Partial<ControllerOptions>): DecoratorType<This, Value> {
  function matrixController (
    currStateObject: This,
    cursor: Cursor,
    read: ControllerReader,
    opt: ControllerOptions,
  ): any {
    const getArg = (x: NumberOrRecursiveKey<This, Args>): number => typeof x === 'string'
      ? recursiveGet(currStateObject, x)
      : x
    const finalWidth = getArg(width)
    const finalHeight = getArg(height)

    if (typeof finalWidth !== 'number' || typeof finalHeight !== 'number') {
      throw Error('End type should be a number')
    }

    const lineRead = (): any => whileFunctionFactory((_, i: number) => i < finalWidth)(currStateObject, cursor, read, opt)
    return whileFunctionFactory((_, i: number) => i < finalHeight)(currStateObject, cursor, lineRead, opt)
  }

  return controllerDecoratorFactory('matrix', matrixController, opt)
}

/**
 * `@Size` decorator reads data until the specified size in bytes is met.
 *
 * This decorator is useful when you need to process a fixed-size amount of
 * data, either in bytes or based on another property that dynamically defines
 * the size in bytes to read.
 *
 * Binary format definitions often specify the size of sections in bytes.
 * These sections can have components of dynamic size, making it difficult to
 * deduce the exact number of components.
 *
 * @example
 *
 * In the following example, the `@Size` decorator is used to read
 * a specific number of bytes from a binary data stream into the decorated
 * property.
 *
 * ```typescript
 * class Protocol {
 *   @Size(16)
 *   @Relation(PrimitiveSymbol.u16)
 *   data: number[] // Will contain 8 numbers
 * }
 * ```
 *
 * You can also use a string representing a property path to define the size
 * dynamically.
 *
 * ```typescript
 * class Protocol {
 *   _size: number = 16
 *
 *   @Size('_size')
 *   @Relation(PrimitiveSymbol.u16)
 *   data: number[]
 * }
 * ```
 *
 * @typeParam This The type of the class the decorator is applied to.
 * @typeParam Value The type of the decorated property.
 *
 * @param {number | string} size The fixed size or a property path that defines
 * the size dynamically.
 * @param {Partial<ControllerOptions>} [opt] Optional configuration.
 * @returns {DecoratorType<This, Value>} The property decorator function.
 *
 * @category Decorators
 */
export function Size<This extends object, Value, Args extends string> (size: NumberOrRecursiveKey<This, Args>, opt?: Partial<ControllerOptions>): DecoratorType<This, Value> {
  return controllerDecoratorFactory(
    'size',
    (currStateObject: This, cursor: Cursor, read: ControllerReader, opt: ControllerOptions) => {
      const finalSize: number = typeof size === 'string'
        ? recursiveGet(currStateObject, size)
        : size
      return whileFunctionFactory((_1, _2, _3, offset, startOffset) => (offset - startOffset) < finalSize)(currStateObject, cursor, read, opt)
    },
    opt,
  )
}

/**
 * `@MapTo` decorator map each value of an array to a child relation constructor.
 * This is useful when a property is an array, and you want each item in the array
 * to be processed by a specific relation.
 *
 * @example
 *
 * In the following example, the `@MapTo` decorator passes each element of the
 * array passed as an argument to the child 'Relation' (`SubProtocol`)
 * constructor.
 * The `SubProtocol` then uses this value to set the length of array of number
 * in the `data` property.
 *
 * ```typescript
 * class SubProtocol {
 *   _size: number
 *
 *   @Count('_size')
 *   @Relation(PrimitiveSymbol.u8)
 *   data: number[]
 *
 *   constructor(size: number) {
 *     this._size = size
 *   }
 * }
 *
 * class Protocol {
 *   @MapTo([1, 2])
 *   @Relation(SubProtocol)
 *   field: SubProtocol[]
 * }
 * ```
 *
 * @typeParam This The type of the class the decorator is applied to.
 * @typeParam Value The type of the decorated property.
 *
 * @param {number | string} arr
 * @param {Partial<ControllerOptions>} [opt] Optional configuration.
 * @returns {DecoratorType<This, Value>} The property decorator function.
 *
 * @category Decorators
 */
export function MapTo<This extends object, Value, Args extends string> (arr: StringFormattedRecursiveKeyOf<This, Args> | any[] | ((_: This) => any[]), opt?: Partial<ControllerOptions>): DecoratorType<This, Value> {
  return controllerDecoratorFactory(
    'map',
    (currStateObject: This, cursor: Cursor, read: ControllerReader, opt: ControllerOptions) => {
      const finalArray: number
        = typeof arr === 'string'
          ? recursiveGet(currStateObject, arr)
          : typeof arr === 'function'
            ? arr(currStateObject)
            : arr

      if (!Array.isArray(finalArray)) {
        throw new Error('Wrong map type')
      }
      return mapFunctionFactory(finalArray)(currStateObject, cursor, read, opt)
    },
    opt,
  )
}

/**
 * useController execute an array of `Contoller` decorator metadata on a target
 * instance.
 *
 * @typeParam This The type of the class the controllers belong in.
 *
 * @param {Array<Controller<This>>} controllers Array of `Controller` decorator
 * metadata.
 * @param {This} targetInstance Current state of the object the `Controller` is
 * defined in, that will be passed to the `Controller` function.
 * @param {ControllerReader} reader Function defining how to read the next chunk
 * of data.
 * @returns {any}
 *
 * @category Advanced Use
 */
export function useController<This> (controllers: Array<Controller<This>>, targetInstance: This, cursor: Cursor, reader: ControllerReader): any {
  const chainedControllers = controllers.reduce((x, cont) => {
    if (x === null) {
      return () => cont.controller(targetInstance, cursor, reader)
    }
    return () => cont.controller(targetInstance, cursor, x)
  }, null)

  return chainedControllers !== null ? chainedControllers() : []
}
