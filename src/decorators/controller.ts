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
import Meta from '../metadatas'

export const ControllerSymbol = Symbol('controller')

/**
 * ControllerReaderFunction.
 */
// TODO Change the type to be correct
export type ControllerReaderFunction = (then?: any) => any

export interface ControllerOptions<T> {
  primitiveCheck: boolean
  targetType: InstantiableObject<T> | undefined
  alignment: number
}

export const ControllerOptionsDefault = {
  primitiveCheck: true,
  targetType: undefined,
  alignment: 0
}

/**
 * ControllerFunction.
 */
export type ControllerFunction<T> = (targetInstance: T, read: ControllerReaderFunction, opt?: ControllerOptions<unknown>) => any

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
      controller: (curr, read) => func(curr, read, options)
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
 */
function whileFunctionFactory<T> (cond: ControllerWhileFunction<T>): any {
  return function (
    currStateObject: T,
    read: ControllerReaderFunction,
    opt: ControllerOptions<unknown>
  ) {
    // TODO To something based on target type. If target is a string
    // add everithing into a string. If target is an array add everything
    // into an array
    const result = []
    // TODO possible bug.
    // The condition `func` is not checked before executing the first `read`
    // This can possibly lead to a bug since the condition could be `i < 0`
    // which would never enter the loop.
    // I have to figure out if it's an issue for the condition to receive a null
    // object. It's probably one for the condition that check the inner object property.
    while (true) {
      const ret = read()
      if (ret === EOF) {
        // If you attempt to read a primitive but reached the EOF.
        // EOF might be the only value we don't want to put inside the result array.
        // Other special character like `\0` is discutable.
        return opt.targetType === String ? result.join('') : result
      }
      result.push(ret)
      if (!cond(ret, result.length, currStateObject)) {
        return opt.targetType === String ? result.join('') : result
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
 * @category Decorators
 */
export function While<T> (func: ControllerWhileFunction<T>, opt?: Partial<ControllerOptions<unknown>>): DecoratorType {
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
  return controllerDecoratorFactory('until', whileFunctionFactory((x: number | string | symbol) => x !== arg), opt)
}

/**
 * @overload
 *
 * @param {number | string} arg The number of time to read the target property or a string refering to a field present on the target instance.
 * @returns {DecoratorType} The property decorator function ran at runtime
 */
/**
 * Count decorator define a variable length array based on the primitive.
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
 * useController.
 *
 * @param {Controller} controller
 * @param {T} target
 * @param {ControllerReaderFunction} reader
 * @returns {any}
 *
 * @category Advanced Use
 */
export function useController<T> (controller: Controller<T>, target: T, reader: ControllerReaderFunction): any {
  return controller.controller(target, reader)
}
