/**
 * Module definition of {@link PrePost} decorators.
 *
 * {@link PrePost} type decorators are used to define function computed before
 * and after reading the decorated property relation.
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
 * The {@link PrePost} decorators receive the cursor instance and can execute
 * operation on it. Allowing to move/save the current offset of buffer.
 *
 * {@link PrePost} decorators can also be used to apply custom functions to the
 * reader if the functions provided by this library is not providing the
 * functionality you need for your format definition.
 *
 * @module PrePost
 */
import { ClassMetaDescriptor, type PropertyMetaDescriptor, createClassMetaDescriptor, createPropertyMetaDescriptor, recursiveGet } from './common'
import { relationExistOrThrow } from './primitive'
import { type ClassAndPropertyDecoratorType, type ClassAndPropertyDecoratorContext } from '../types'
import { type Cursor, type BinaryCursorEndianness, BinaryCursor } from '../cursor'
import Meta from '../metadatas'

export const PreFunctionSymbol = Symbol('pre-function')
export const PostFunctionSymbol = Symbol('post-function')
export const PreClassFunctionSymbol = Symbol('pre-class-function')
export const PostClassFunctionSymbol = Symbol('post-class-function')
export type PrePostSymbols = symbol

export type PrePostFunction<This> = (instance: This, cursor: Cursor) => void

// type PrePostMetadataSetter<This> = (metadata: DecoratorMetadataObject, propertyKey: keyof This, pre: PrePost<This>, remove?: boolean) => Array<PrePost<This>>

/**
 * PrePostOptions.
 */
export interface PrePostOptions {
  /**
   * Verify a relation already exist before the definition of the PrePost function
   */
  primitiveCheck: boolean
  /**
   * Remove the Decorator from the metadata once its function has been ran.
   */
  once: boolean
}

export const PrePostOptionsDefault = {
  primitiveCheck: true,
  once: false,
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
   * Function that will be executed before or after the Controller, Validator and Transformer decorator.
   */
  func: PrePostFunction<This>
}

function prePostFunctionDecoratorFactory<This> (name: string, typeSym: PrePostSymbols, func: PrePostFunction<This>, opt: Partial<PrePostOptions> = PrePostOptionsDefault): ClassAndPropertyDecoratorType<This> {
  const options = { ...PrePostOptionsDefault, ...opt }

  return function (_: any, context: ClassFieldDecoratorContext<This>) {
    if (options.primitiveCheck) {
      relationExistOrThrow(context.metadata, context)
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
 * `preFunctionDecoratorFactory` function helps create a decorator that will save the metadata of the `Pre` decorator.
 *
 * @param {string} name Name of the 'pre' decorator.
 * @param {PrePostFunction} func Function that will be executed before the Controller/Validator/Transfromer validators.
 * @param {Partial} opt PrePost options.
 * @returns {DecoratorType} The property decorator function ran at runtime
 *
 * @category Advanced Use
 */
export function preFunctionDecoratorFactory<This> (name: string, func: PrePostFunction<This>, opt: Partial<PrePostOptions> = PrePostOptionsDefault): ClassAndPropertyDecoratorType<This> {
  return prePostClassAndPropertyFunctionDecoratorFactory(name, PreFunctionSymbol, func, opt)
}

/**
 * `postFunctionDecoratorFactory` function helps create a decorator that will save the metadata of the `Post` decorator.
 *
 * @param {string} name Name of the 'post' decorator.
 * @param {PrePostFunction} func Function that will be executed after the Controller/Validator/Transfromer validators.
 * @param {Partial} opt PrePost options.
 * @returns {DecoratorType} The property decorator function ran at runtime
 *
 * @category Advanced Use
 */
export function postFunctionDecoratorFactory<This> (name: string, func: PrePostFunction<This>, opt: Partial<PrePostOptions> = PrePostOptionsDefault): ClassAndPropertyDecoratorType<This> {
  return prePostClassAndPropertyFunctionDecoratorFactory(name, PostFunctionSymbol, func, opt)
}

/**
 * `@Pre` decorator defines a function computed before reading the property value.
 *
 * @param {PrePostFunction} func Function that will be executed before the Controller/Validator/Transfromer validators.
 * @param {Partial} opt PrePost options.
 * @returns {DecoratorType} The property decorator function ran at runtime
 *
 * @category Decorators
 */
export function Pre<This> (func: PrePostFunction<This>, opt?: Partial<PrePostOptions>): ClassAndPropertyDecoratorType<This> {
  return preFunctionDecoratorFactory('pre', func, opt)
}

/**
 * `@Post` decorator defines a function computed after fully reading and transforming the property value.
 *
 * @param {PrePostFunction} func Function that will be executed after the Controller/Validator/Transfromer validators.
 * @param {Partial} opt PrePost options.
 * @returns {DecoratorType} The property decorator function ran at runtime
 *
 * @category Decorators
 */
export function Post<This> (func: PrePostFunction<This>, opt?: Partial<PrePostOptions>): ClassAndPropertyDecoratorType<This> {
  return postFunctionDecoratorFactory('post', func, opt)
}

/**
 * `@Offset` decorator define the place to move the cursor of the buffer to perform the following operation on it.
 *
 * @param {number | string} offset
 * @param {Partial} opt PrePost options.
 * @returns {DecoratorType} The property decorator function ran at runtime
 *
 * @category Decorators
 */
export function Offset<This> (offset: number | string | ((instance: This, cursor: Cursor) => number), opt?: Partial<PrePostOptions>): ClassAndPropertyDecoratorType<This> {
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
 * `@Peek` decorator define the place to move the cursor of the buffer then move it back
 *
 * @param {number | string} offset
 * @param {Partial} opt PrePost options.
 * @returns {DecoratorType} The property decorator function ran at runtime
 *
 * @category Decorators
 */
export function Peek<This> (offset?: number | string | ((instance: This, cursor: Cursor) => number), opt?: Partial<PrePostOptions>): ClassAndPropertyDecoratorType<This> {
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
 * `@Endian`
 *
 * @param {BinaryCursorEndianness} endianness
 * @param {Partial} opt PrePost options.
 * @returns {DecoratorType} The property decorator function ran at runtime
 *
 * @category Decorators
 */
export function Endian<This> (endianness: BinaryCursorEndianness, opt?: Partial<PrePostOptions>): ClassAndPropertyDecoratorType<This> {
  return function (_: any, context: ClassAndPropertyDecoratorContext<This>) {
    prePostClassAndPropertyFunctionDecoratorFactory('preEndian', PreFunctionSymbol, (_2, cursor) => {
      if (cursor instanceof BinaryCursor) {
        const currentEndian = cursor.getEndian()

        if (currentEndian !== endianness) {
          cursor.setEndian(endianness)

          prePostClassAndPropertyFunctionDecoratorFactory('postEndian', PostFunctionSymbol, () => {
            cursor.setEndian(currentEndian)
          }, { ...opt, once: true })(_, context)
        }
      }
    }, opt)(_, context)
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
export function usePrePost<This> (prepost: Array<PrePost<This>> | Array<PrePostClass<This>>, targetInstance: This, cursor: Cursor): void {
  prepost.forEach((x) => {
    x.func(targetInstance, cursor)
  })
}
