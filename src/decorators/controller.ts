/**
 * Module definition of {@link Controller} decorators.
 *
 * {@link Controller} type decorators define decorators used to modify the
 * parser/writter behaviour based on property only present at runtime,
 * create array based on runtime property (see {@link While})
 * or to create array of primitive of fixed length (see {@link Count}) or
 * undefined length (see {@link Until}).
 *
 * @module Controller
 */
import { type MetaDescriptor, recursiveGet, propertyTargetType } from './common'
import { relationExistOrThrow } from './primitive'
import { EOF, type DecoratorType, type InstantiableObject } from '../types'
import { type Cursor } from '../cursor'
import { EOFError } from '../error'
import Meta from '../metadatas'

export const ControllerSymbol = Symbol('controller')

/**
 * ControllerReaderFunction.
 */
// TODO Change the type to be correct
export type ControllerReaderFunction = (then?: any) => any

/**
 * ControllerOptions.
 */
export interface ControllerOptions<T> {
  /**
   * @type {boolean} Verify a relation already exist before the definition of the controller
   */
  primitiveCheck: boolean
  /**
   * @type {InstantiableObject<T> | undefined} Define the target type for the controller to apply transformation.
   */
  targetType: InstantiableObject<T> | undefined
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
export type ControllerFunction<T> = (targetInstance: T, read: ControllerReaderFunction, cursor?: Cursor, opt?: ControllerOptions<unknown>) => any

/**
 * Controller.
 *
 * @extends {MetaDescriptor<T>}
 */
export interface Controller<T> extends MetaDescriptor<T> {
  options: ControllerOptions<unknown>

  /**
   * @type {ControllerFunction<T>} Function to control the flow of execution of the parser/writter
   */
  controller: ControllerFunction<T> // TODO property primitive could be passed directly by checking the metadata api when applying the controller function.
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
export function controllerDecoratorFactory (name: string, func: ControllerFunction<unknown>, opt: Partial<ControllerOptions<unknown>> = ControllerOptionsDefault): DecoratorType {
  return function <T>(target: T, propertyKey: keyof T) {
    if (opt.primitiveCheck) {
      relationExistOrThrow(target, propertyKey)
    }
    // TODO ControllerFunction shoud accept 2 or 3 arguments the optionnal one being accepting the target type or not.
    // TODO This target type will also be useful to create more complex relationship.
    const targetType: InstantiableObject<unknown> = opt.targetType === undefined ? propertyTargetType(target, propertyKey) as InstantiableObject<unknown> : opt.targetType
    const options = {
      ...ControllerOptionsDefault,
      ...opt,
      ...{ targetType }
    }
    const controller: Controller<T> = {
      type: ControllerSymbol,
      name,
      target,
      propertyName: propertyKey,
      options,
      controller: (curr, read, cursor) => func(curr, read, cursor, options)
    }

    Meta.setController(target, propertyKey, controller)
  }
}

/**
 * ControllerWhileFunction.
 */
export type ControllerWhileFunction<T> = (curr: any, count?: number, targetInstance?: T) => boolean
/**
 * whileFunctionFactory.
 *
 * @param {ControllerWhileFunction} cond
 * @returns {any}
 *
 * @category Advanced Use
 */
function whileFunctionFactory<T> (cond: ControllerWhileFunction<T>): any {
  return function (
    currStateObject: T,
    read: ControllerReaderFunction,
    cursor: Cursor,
    opt: ControllerOptions<unknown>
  ): any {
    // TODO To something based on target type. If target is a string
    // add everithing into a string. If target is an array add everything
    // into an array
    const result = []
    const startOffset = cursor !== undefined ? cursor.offset() : 0
    // TODO possible bug.
    // The condition `func` is not checked before executing the first `read`
    // This can possibly lead to a bug since the condition could be `i < 0`
    // which would never enter the loop.
    // I have to figure out if it's an issue for the condition to receive a null
    // object. It's probably one for the condition that check the inner object property.
    while (true) {
      const beforeReadOffset = cursor !== undefined ? cursor.offset() : 0
      const ret = read()
      // TODO If we reach EOF there is no way to notify the program the condition was not met.
      //   - One option could be to throw the value. The only case we want to compare to EOF
      //     is `@Until(EOF)` which I could move to another decorator `@EOF` that catch that value.
      if (ret === EOF) {
        // If you attempt to read a primitive but reached the EOF.
        // EOF might be the only value we don't want to put inside the result array.
        // Other special character like `\0` is discutable.
        const currValue = opt.targetType === String ? result.join('') : result
        console.log('EOFF ', currValue)
        throw new EOFError(currValue)
      }
      result.push(ret)
      if (!cond(ret, result.length, currStateObject)) {
        if (cursor !== undefined && opt.peek) {
          result.pop()
          cursor.move(beforeReadOffset)
        }
        break
      }
    }
    const endOffset = cursor !== undefined ? cursor.offset() : 0
    if (opt.alignment > 0 && cursor !== undefined) {
      cursor.forward((opt.alignment - ((endOffset - startOffset) % opt.alignment)) % opt.alignment)
    }
    return opt.targetType === String ? result.join('') : result
  }
}

function untilEofController (): any {
  const wrap = whileFunctionFactory(() => true)
  return function (
    currStateObject: any,
    read: ControllerReaderFunction,
    cursor: Cursor,
    opt: ControllerOptions<unknown>
  ): any {
    try {
      wrap(currStateObject, read, cursor, opt)
    } catch (error) {
      if (error instanceof EOFError) {
        return error.value
      } else {
        throw error
      }
    }
  }
}

/**
 * While decorator continue the execution flow while the condition passed as a parameter is not met.
 *
 * @param {ControllerIfFunction} func A function that receive the target instance as a parameter and return a boolean
 * @returns {DecoratorType} The property decorator function ran at runtime
 *
 * @remark
 *
 * Don't use this decorator to compare the current value to EOF. Use {@link Until} instead.
 *
 * @category Decorators
 */
export function While<T> (func: ControllerWhileFunction<T>, opt?: Partial<ControllerOptions<unknown>>): DecoratorType {
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
 * This function also accept function as argument and will read until the condition is met.
 * If you need to use a function to verify an equality based on another field the {@link While}
 * decorator is better suited.
 *
 * @remark
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
export function Until (arg: any, opt?: Partial<ControllerOptions<unknown>>): DecoratorType {
  if (arg === EOF) {
    return controllerDecoratorFactory('until', untilEofController(), opt)
  } else {
    return controllerDecoratorFactory('until', whileFunctionFactory((x: number | string | symbol) => x !== arg), opt)
  }
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
 * {
 *   len: u16,
 *   @Count('len')
 *   vec: u8,
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
export function Count (arg: number | string, opt?: Partial<ControllerOptions<unknown>>): DecoratorType {
  /**
   * countCheck.
   *
   * @param {any} _
   * @param {number} i
   * @param {object} currStateObject
   * @returns {boolean}
   */
  function countCheck (_: any, i: number, currStateObject: object): boolean {
    // TODO this is not optimal since you will execute the recursiveGet for each iteration
    const count =
      typeof arg === 'string'
        ? recursiveGet(currStateObject, arg)
        : arg

    return i < count
  }

  return controllerDecoratorFactory('count', whileFunctionFactory(countCheck), opt)
}

/**
 * `@Matrix` decorator create array of arrays based on sizes you pass as arguments.
 *
 * @param {number | string} width
 * @param {number | string} height
 * @param {Partial} opt
 * @returns {DecoratorType}
 */
export function Matrix (width: number | string, height: number | string, opt?: Partial<ControllerOptions<unknown>>): DecoratorType {
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

  function matrixController<T> (currStateObject: T, read: ControllerReaderFunction, cursor: Cursor, opt: ControllerOptions<unknown>): any {
    const lineRead = (): any => whileFunctionFactory(countCheck(width))(currStateObject, read, cursor, opt)

    return whileFunctionFactory(countCheck(height))(currStateObject, lineRead, cursor, opt)
  }

  return controllerDecoratorFactory('matrix', matrixController, opt)
}

/**
 * useController.
 *
 * @param {Controller} controller
 * @param {T} target
 * @param {ControllerReaderFunction} reader
 * @returns {any}
 *
 * @category Advanced Use
 */
export function useController<T> (controller: Controller<T>, target: T, reader: ControllerReaderFunction, ...args: any[]): any {
  return controller.controller(target, reader, ...args)
}
