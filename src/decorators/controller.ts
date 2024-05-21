/**
 * Module definition of {@link Controller} decorators.
 *
 * {@link Controller} type decorators define decorators used to modify the
 * parser/writter behavior based on property only present at runtime,
 * create array based on runtime property (see {@link While})
 * or to create array of primitive of fixed length (see {@link Count}) or
 * undefined length (see {@link Until}).
 *
 * @module Controller
 */
import { type MetaDescriptor, recursiveGet } from './common'
import { relationExistOrThrow } from './primitive'
import { EOF, type DecoratorType, type InstantiableObject, type Context } from '../types'
import { EOFError } from '../error'
import Meta from '../metadatas'

export const ControllerSymbol = Symbol('controller')

/**
 * ControllerReader
 */
export abstract class ControllerReader {
  _reader: () => any

  abstract offset (): number
  abstract move (address: number): number

  read (): any {
    return this._reader()
  }

  forward (x: number): number {
    return this.move(this.offset() + x)
  }

  constructor (reader: () => any) {
    this._reader = reader
  }
}

/**
 * ControllerOptions.
 */
export interface ControllerOptions {
  /**
   * @type {boolean} Verify a relation already exist before the definition of the controller
   */
  primitiveCheck: boolean
  /**
   * @type {InstantiableObject | undefined} Define the target type for the controller to apply transformation.
   */
  targetType: InstantiableObject | undefined
  /**
   * @type {number} Define the memory address alignment. After performing the read the controller will be moved to be a multiple of "alignment". If this value is equal to 0 it won't change the alignment.
   */
  alignment: number
  /**
   * @type {boolean} Move the cursor back to its previous position when the controller condition is met.
   */
  peek: boolean
}

export const ControllerOptionsDefault = {
  primitiveCheck: true,
  targetType: undefined,
  alignment: 0,
  peek: false
}

/**
 * ControllerFunction.
 */
export type ControllerFunction = (targetInstance: any, read: ControllerReader, opt: ControllerOptions) => any
export type OptionlessControllerFunction = (targetInstance: any, read: ControllerReader) => any

/**
 * Controller type interface structure definition.
 *
 * @extends {MetaDescriptor}
 */
export interface Controller extends MetaDescriptor {
  /**
   * @type {ControllerOptions<unknown>} Options for controller decorator
   */
  options: ControllerOptions

  /**
   * @type {ControllerFunction} Function to control the flow of execution of the binary reader
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
export function controllerDecoratorFactory (name: string, func: ControllerFunction, opt: Partial<ControllerOptions> = ControllerOptionsDefault): DecoratorType {
  // TODO The targetType should be set using reflection if TypeScript ever support that feature.
  const targetType: InstantiableObject | undefined = opt.targetType
  const options = {
    ...ControllerOptionsDefault,
    ...opt,
    ...{ targetType }
  }

  return function (_: any, context: Context) {
    if (options.primitiveCheck) {
      relationExistOrThrow(context.metadata, context)
    }

    const controller: Controller = {
      type: ControllerSymbol,
      name,
      metadata: context.metadata,
      propertyName: context.name,
      options,
      controller: (curr, read) => func(curr, read, options)
    }
    Meta.setController(context.metadata, context.name, controller)
  }
}

/**
 * ControllerWhileFunction.
 */
export type ControllerWhileFunction = (curr: any, count: number, targetInstance: any) => boolean

/**
 * whileFunctionFactory.
 *
 * @param {ControllerWhileFunction} cond
 * @returns {any}
 *
 * @category Advanced Use
 */
function whileFunctionFactory (cond: ControllerWhileFunction): ControllerFunction {
  return function (
    currStateObject: any,
    reader: ControllerReader,
    opt: ControllerOptions
  ): any {
    // TODO To something based on target type. If target is a string
    // add everithing into a string. If target is an array add everything
    // into an array
    const result = []
    const startOffset = reader.offset()
    // TODO possible bug.
    // The condition `func` is not checked before executing the first `read`
    // This can possibly lead to a bug since the condition could be `i < 0`
    // which would never enter the loop.
    // I have to figure out if it's an issue for the condition to receive a null
    // object. It's probably one for the condition that check the inner object property.
    while (true) {
      const beforeReadOffset = reader.offset()
      const ret = reader.read()
      // TODO If we reach EOF there is no way to notify the program the condition was not met.
      //   - One option could be to throw the value. The only case we want to compare to EOF
      //     is `@Until(EOF)` which I could move to another decorator `@EOF` that catch that value.
      if (ret === EOF) {
        // If you attempt to read a primitive but reached the EOF.
        // EOF might be the only value we don't want to put inside the result array.
        // Other special character like `\0` is discutable.
        const currValue = opt.targetType === String ? result.join('') : result
        throw new EOFError(currValue)
      }
      result.push(ret)
      if (!cond(ret, result.length, currStateObject)) {
        if (opt.peek) {
          result.pop()
          reader.move(beforeReadOffset)
        }
        break
      }
    }
    const endOffset = reader.offset()
    if (opt.alignment > 0) {
      reader.forward((opt.alignment - ((endOffset - startOffset) % opt.alignment)) % opt.alignment)
    }
    return opt.targetType === String ? result.join('') : result
  }
}

/**
 * While decorator continue the execution flow while the condition passed as a parameter is not met.
 *
 * @remark
 *
 * By default the relation that does not match the condition will be included in the result and the
 * cursor will be set after that relation. This is the default behavior because that's what we expect
 * most of the time.
 * To not include the relation that doesn't match the condition and move back the cursor to the position
 * before it was read use the `peek` option.
 *
 * @remark
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
export function While (func: ControllerWhileFunction, opt?: Partial<ControllerOptions>): DecoratorType {
  // TODO Verify you don't expect to compare something to EOF
  return controllerDecoratorFactory('while', whileFunctionFactory(func), opt)
}

/**
 * @overload
 *
 * @param {any} arg Continue reading/writting the binary file until the argument is reached.
 * @returns {DecoratorType} The property decorator function ran at runtime
 */
/**
 * `@Until` decorator read variable length array that end by a special character or magic number.
 *
 * @example
 *
 * ```typescript
 * class BinProtocol {
 *   @Until('\0')
 *   @Relation(PrimitiveSymbol.char)
 *   message: string // Null terminated string
 * }
 * ```
 *
 * @remark
 *
 * The difference between Until and {@link Count} is that this decorator accept to create arrays
 * of undefined length.
 *
 * @remark
 *
 * This decorator doesn't accept a function as argument.
 * If you need to use a function to verify an equality based on the currently read value
 * use the {@link While} decorator instead.
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
 * @param {any} arg Continue reading/writting the binary file until the argument is reached.
 * @param {ControllerOptions} opt
 * @returns {DecoratorType} The property decorator function ran at runtime
 *
 * @see {@link Count}
 * @see {@link While}
 * @see {@link Controller}
 *
 * @category Decorators
 */
export function Until (arg: any, opt?: Partial<ControllerOptions>): DecoratorType {
  function untilEofController (): ControllerFunction {
    const wrap = whileFunctionFactory(() => true)
    return function (
      currStateObject: any,
      read: ControllerReader,
      opt: ControllerOptions
    ): any {
      try {
        wrap(currStateObject, read, opt)
      } catch (error) {
        if (error instanceof EOFError) {
          return error.value
        } else {
          throw error
        }
      }
    }
  }

  if (arg === EOF) {
    return controllerDecoratorFactory('until', untilEofController(), opt)
  } else {
    return controllerDecoratorFactory('until', whileFunctionFactory((x: number | string | symbol) => x !== arg), opt)
  }
}

/**
 * `@NullTerminatedString` decorator read a string until the '\0' character is met and always interpret a string.
 *
 * @remark
 *
 * This decorator is similar to `@Until('\0', { targetType: String })` but `@Until` will include the `\0` while
 * this decorator always drops it.
 *
 * @param {Partial} opt
 * @returns {DecoratorType}
 *
 * @category Decorators
 */
export function NullTerminatedString (opt?: Partial<ControllerOptions>): DecoratorType {
 return controllerDecoratorFactory('nullterminatedstring', (
      currStateObject: any,
      read: ControllerReader,
      opt: ControllerOptions
    ) => {
      const stringOpt = {
        ...opt,
        targetType: String
      }
      const result = whileFunctionFactory((x: number | string | symbol) => x !== '\0')(currStateObject, read, stringOpt)
      return result.slice(0, -1)
    }, opt)
}

/**
 * @overload
 *
 * @param {number | string} arg The number of time to read the target property or a string refering to a field present on the target instance.
 * @returns {DecoratorType} The property decorator function ran at runtime
 */
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
export function Count (arg: number | string, opt?: Partial<ControllerOptions>): DecoratorType {
  /**
   * countFactory
   *
   * @param {any} _
   * @param {number} i
   * @param {object} currStateObject
   * @returns {boolean}
   */
  function countFactory (
    currStateObject: any,
    read: ControllerReader,
    opt: ControllerOptions
  ): any {
    const count =
      typeof arg === 'string'
        ? recursiveGet(currStateObject, arg)
        : arg

    if (typeof count !== 'number') {
      throw Error('End type should be a number')
    }

    if (count > 0) {
      return whileFunctionFactory((_: any, i: number) => i < count)(currStateObject, read, opt)
    }

    return []
  }

  return controllerDecoratorFactory('count', countFactory, opt)
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
export function Matrix (width: number | string, height: number | string, opt?: Partial<ControllerOptions>): DecoratorType {
  /**
   * countCheck.
   *
   * @param {number | string} arg
   */
  function countCheck (arg: number | string) {
    return (_: any, i: number, currStateObject: object): boolean => {
      // TODO this is not optimal since you will execute the recursiveGet for each iteration
      const count =
        typeof arg === 'string'
          ? recursiveGet(currStateObject, arg)
          : arg

      return i < count
    }
  }

  class MatrixReader extends ControllerReader {
    _controller: ControllerReader

    offset (): number {
      return this._controller.offset()
    }

    move (address: number): number {
      return this._controller.move(address)
    }

    constructor (reader: () => any, controller: ControllerReader) {
      super(reader)
      this._controller = controller
    }
  }

  function matrixController (currStateObject: any, read: ControllerReader, opt: ControllerOptions): any {
    const lineRead = (): any => whileFunctionFactory(countCheck(width))(currStateObject, read, opt)

    return whileFunctionFactory(countCheck(height))(currStateObject, new MatrixReader(lineRead, read), opt)
  }

  return controllerDecoratorFactory('matrix', matrixController, opt)
}

/**
 * useController.
 *
 * @param {Controller} controller `Controller` decorator metadata.
 * @param {T} targetInstance Current state of the object the `Controller` is defined in, that will be passed to the `Controller` function.
 * @param {ControllerReader} reader Function defining how to read the next chunk of data.
 * @returns {any}
 *
 * @category Advanced Use
 */
export function useController (controller: Controller, targetInstance: any, reader: ControllerReader): any {
  return controller.controller(targetInstance, reader)
}
