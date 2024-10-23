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
import { type Cursor } from '../cursor'
import { relationExistOrThrow } from './primitive'
import { EOF, type DecoratorType, type InstantiableObject, type Context } from '../types'
import { EOFError } from '../error'
import Meta from '../metadatas'

export const ControllerSymbol = Symbol('controller')

/**
 * ControllerReader
 */
export type ControllerReader = () => any

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
  targetType: InstantiableObject | undefined
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
  peek: false
}

/**
 * ControllerFunction.
 */
export type ControllerFunction = (targetInstance: any, cursor: Cursor, read: ControllerReader, opt: ControllerOptions) => any
export type OptionlessControllerFunction = (targetInstance: any, cursor: Cursor, read: ControllerReader) => any

/**
 * Controller type interface structure definition.
 *
 * @extends {MetaDescriptor}
 */
export interface Controller extends MetaDescriptor {
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
      controller: (curr, cursor, read) => func(curr, cursor, read, options)
    }
    Meta.setController(context.metadata, context.name, controller)
  }
}

/**
 * ControllerWhileFunction.
 */
export type ControllerWhileFunction = (curr: any, count: number, targetInstance: any, offset: number, startOffset: number) => boolean

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
    cursor: Cursor,
    read: ControllerReader,
    opt: ControllerOptions
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
      cursor: Cursor,
      read: ControllerReader,
      opt: ControllerOptions
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
    cursor: Cursor,
    read: ControllerReader,
    opt: ControllerOptions
  ) => {
    const stringOpt = {
      ...opt,
      targetType: String
    }
    const result = whileFunctionFactory((x: number | string | symbol) => x !== '\0')(currStateObject, cursor, read, stringOpt)
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
  function countController (
    currStateObject: any,
    cursor: Cursor,
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
      return whileFunctionFactory((_: any, i: number) => i < count)(currStateObject, cursor, read, opt)
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
export function Matrix (width: number | string, height: number | string, opt?: Partial<ControllerOptions>): DecoratorType {
  function matrixController (
    currStateObject: any,
    cursor: Cursor,
    read: ControllerReader,
    opt: ControllerOptions
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
export function Size (size: number | string, opt?: Partial<ControllerOptions>): DecoratorType {
  return controllerDecoratorFactory(
    'size',
    (currStateObject: any, cursor: Cursor, read: ControllerReader, opt: ControllerOptions) => {
      const finalSize: number = typeof size === 'string'
        ? recursiveGet(currStateObject, size)
        : size
      return whileFunctionFactory((_1, _2, _3, offset, startOffset) => (offset - startOffset) < finalSize)(currStateObject, cursor, read, opt)
    },
    opt
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
export function useController (controllers: Controller[], targetInstance: any, cursor: Cursor, reader: ControllerReader): any {
  const chainedControllers = controllers.reduce((x, cont) => {
    if (x === null) {
      return () => cont.controller(targetInstance, cursor, reader)
    }
    return () => cont.controller(targetInstance, cursor, x)
  }, null)

  return chainedControllers !== null ? chainedControllers() : []
}
