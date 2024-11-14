/**
 * Module definition of {@link Controller} decorators.
 *
 * {@link Controller} type decorators are used to modify the parser/writter
 * behavior based on property only present at runtime.
*
 * The {@link Controller} decorators is executed during the reading.
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
 * You can create array based on runtime property (see {@link While}),
 * create array of primitive of fixed length (see {@link Count}) or
 * undefined length that are based on the value being read (see {@link Until}).
 *
 *
 * @module Controller
 */
import { createPropertyMetaDescriptor, type PropertyMetaDescriptor, recursiveGet } from './common'
import { type Cursor } from '../cursor'
import { relationExistOrThrow } from './primitive'
import { EOF, type DecoratorType, type InstantiableObject, type Context } from '../types'
import { EOFError } from '../error'
import Meta from '../metadatas'

export const ControllerSymbol = Symbol('controller')

/**
 * ControllerReader
 */
export type ControllerReader = (arg?: any) => any

/**
 * ControllerOptions.
 */
export interface ControllerOptions {
  /**
   * Verify a relation already exist before the definition of the controller
   */
  primitiveCheck: boolean
  /**
   * Define the target type for the controller to apply transformation.
   */
  targetType: InstantiableObject<unknown> | undefined
  /**
   * Define the memory address alignment. After performing the read the controller will be moved to be a multiple of "alignment". If this value is equal to 0 it won't change the alignment.
   */
  alignment: number
  /**
   * Move the cursor back to its previous position when the controller condition is met.
   */
  peek: boolean
}

export const ControllerOptionsDefault = {
  primitiveCheck: true,
  targetType: undefined,
  alignment: 0,
  peek: false,
}

/**
 * ControllerFunction.
 */
export type ControllerFunction<This> = (targetInstance: This, cursor: Cursor, read: ControllerReader, opt: ControllerOptions) => any
export type OptionlessControllerFunction = (targetInstance: any, cursor: Cursor, read: ControllerReader) => any

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
 * @param {string} name Name of the controller decorator.
 * @param {ControllerFunction} func Function to control the flow of execution of the parser/writter.
 * @returns {DecoratorType} The property decorator function ran at runtime
 *
 * @category Advanced Use
 */
export function controllerDecoratorFactory<This, Value> (name: string, func: ControllerFunction<This>, opt: Partial<ControllerOptions> = ControllerOptionsDefault): DecoratorType<This, Value> {
  // TODO The targetType should be set using reflection if TypeScript ever support that feature.
  const targetType: InstantiableObject<unknown> | undefined = opt.targetType
  const options = {
    ...ControllerOptionsDefault,
    ...opt,
    ...{ targetType },
  }

  return function (_: undefined, context: Context<This, Value>) {
    if (options.primitiveCheck) {
      relationExistOrThrow(context.metadata, context)
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
 * @param {ControllerWhileFunction} cond
 * @returns {any}
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
    // add everithing into a string. If target is an array add everything
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
        const currValue = opt.targetType === String ? result.join('') : result
        throw new EOFError(currValue)
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
    return opt.targetType === String ? result.join('') : result
  }
}

/**
 * mapFunctionFactory.
 *
 * @param {} array
 * @returns {any}
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

    return opt.targetType === String ? result.join('') : result
  }
}

/**
 * While decorator continue the execution flow while the condition passed as a parameter is not met.
 *
 * By default the relation that does not match the condition will be included in the result and the
 * cursor will be set after that relation. This is the default behavior because that's what we expect
 * most of the time.
 *
 * To not include the relation that doesn't match the condition and move back the cursor to the position
 * before it was read use the `peek` option.
 *
 * @remarks
 *
 * Don't use this decorator to compare the current value to EOF. Use {@link Until} instead.
 *
 * @example
 *
 * Use this decorator to make decisions based on the object currently interpreted.
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
 * class BinProtocol {
 *   @While((obj) => obj.type !== 0x00)
 *   @Relation(BinObject)
 *   objs: BinObject[]
 * }
 * ```
 *
 * Use the `peek` option to not include the element that does not match the condition.
 * With this option the cursor will then be set back before the element was read and not
 * included in the resulting array.
 *
 * ```typescript
 * class BinProtocol {
 *   @While((elem) => elem !== 0x00, { peek: true })
 *   @Relation(PrimitiveSymbol.u8)
 *   array: number[]
 *
 *   @Match(0x00)
 *   @Relation(PrimitiveSymbol.u8)
 *   end_elem: number
 * }
 * ```

 * @param {ControllerWhileFunction} func A function that return a boolean and receive three arguments: the currently read relation, the count and a reference the target instance.
 * @returns {DecoratorType} The property decorator function ran at runtime
 *
 * @category Decorators
 */
export function While<This, Value> (func: ControllerWhileFunction<This>, opt?: Partial<ControllerOptions>): DecoratorType<This, Value> {
  // TODO Verify you don't expect to compare something to EOF
  return controllerDecoratorFactory('while', whileFunctionFactory(func), opt)
}

/**
 * `@Until` decorator read variable length array that end by a special character or magic number.
 *
 * The difference between Until and {@link Count} is that this decorator accept to create arrays
 * of undefined length.
 *
 * @example
 *
 * This decorator can be used to read null terminated strings.
 *
 * ```typescript
 * class BinProtocol {
 *   @Until('\0')
 *   @Relation(PrimitiveSymbol.char)
 *   message: string // Null terminated string
 * }
 * ```
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
 * This decorator doesn't accept a function as argument.
 * If you need to use a function to verify an equality based on the currently read value
 * use the {@link While} decorator instead.

 *
 * @param {any} cmp Continue reading/writting the binary file until the argument is reached.
 * @param {ControllerOptions} opt
 * @returns {DecoratorType} The property decorator function ran at runtime
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
 * `@NullTerminatedString` decorator read a string until the '\0' character is met and always interpret a string.
 *
 * @remarks
 *
 * This decorator is similar to `@Until('\0', { targetType: String })` but `@Until` will include the `\0` while
 * this decorator always drops it.
 *
 * @param {Partial} opt
 * @returns {DecoratorType}
 *
 * @category Decorators
 */
export function NullTerminatedString<This, Value> (opt?: Partial<ControllerOptions>): DecoratorType<This, Value> {
  return controllerDecoratorFactory('nullterminatedstring', (
    currStateObject: This,
    cursor: Cursor,
    read: ControllerReader,
    opt: ControllerOptions,
  ) => {
    const stringOpt = {
      ...opt,
      targetType: String,
    }
    const result = whileFunctionFactory((x: number | string | symbol) => x !== '\0')(currStateObject, cursor, read, stringOpt)
    return result.slice(0, -1)
  }, opt)
}

/**
 * `@Count` decorator define a variable length array based on the primitive.
 *
 * @example
 *
 * The decorator also allows to refer to another field already present in the binary definition target instance.
 *
 * ```typescript
 * class BinProtocol {
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
 * @param {number | string} arg The number of time to read the target property or a string refering to a field present on the target instance.
 * @param {ControllerOptions} opt
 * @returns {DecoratorType} The property decorator function ran at runtime
 *
 * @category Decorators
 */
export function Count<This, Value> (arg: number | string, opt?: Partial<ControllerOptions>): DecoratorType<This, Value> {
  /**
   * countFactory
   *
   * @param {any} _
   * @param {number} i
   * @param {object} currStateObject
   * @returns {boolean}
   */
  function countController (
    currStateObject: This,
    cursor: Cursor,
    read: ControllerReader,
    opt: ControllerOptions,
  ): any {
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
 * `@Matrix` decorator create array of arrays based on sizes you pass as arguments.
 *
 * @param {number | string} width
 * @param {number | string} height
 * @param {Partial} opt
 * @returns {DecoratorType}
 *
 * @category Decorators
 */
export function Matrix<This, Value> (width: number | string, height: number | string, opt?: Partial<ControllerOptions>): DecoratorType<This, Value> {
  function matrixController (
    currStateObject: This,
    cursor: Cursor,
    read: ControllerReader,
    opt: ControllerOptions,
  ): any {
    const getArg = (x: number | string): number => typeof x === 'string'
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
 * `@Size` decorator read until the size if met.
 *
 * @param {number | string} size
 * @param {Partial} opt
 * @returns {DecoratorType}
 *
 * @category Decorators
 */
export function Size<This, Value> (size: number | string, opt?: Partial<ControllerOptions>): DecoratorType<This, Value> {
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
 * `@MapTo` decorator map each array value to a child relation constructor.
 *
 * @example
 *
 * ```typescript
 * class SubClass {
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
 * class TestClass {
 *   @MapTo([1, 2])
 *   @Relation(SubClass)
 *   field: number
 * }
 * ```
 *
 * @param {number | string} arr
 * @param {Partial} opt
 * @returns {DecoratorType}
 *
 * @category Decorators
 */
export function MapTo<This, Value> (arr: string | any[] | ((_: This) => any[]), opt?: Partial<ControllerOptions>): DecoratorType<This, Value> {
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
 * useController.
 *
 * @param {Controller} controllers `Controller` decorator metadata.
 * @param {T} targetInstance Current state of the object the `Controller` is defined in, that will be passed to the `Controller` function.
 * @param {ControllerReader} reader Function defining how to read the next chunk of data.
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
