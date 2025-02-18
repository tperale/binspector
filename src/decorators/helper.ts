/**
 * The `Helper` module definition defines different decorator that combines
 * decorators from differents categories.
 *
 * @module Helper
 */
import { Uint8 } from './primitive'
import { Context, DecoratorType, ExecutionScope } from '../types'
import { TransformerExecLevel, transformerDecoratorFactory } from './transformer'
import { ControllerOptions, Until } from './controller'

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
