import { type MetaDescriptor, recursiveGet } from './common'
//  , propertyTargetType
import { relationExistOrThrow } from './primitive'
import { type DecoratorType } from '../types'
import { type Cursor } from '../cursor'
import Meta from '../metadatas'

export const PreFunctionSymbol = Symbol('pre-function')
export const PostFunctionSymbol = Symbol('post-function')

export type PrePostFunction<T> = (instance: T, cursor: Cursor) => any

export interface PrePostOptions {
  primitiveCheck: boolean
}

export const PrePostOptionsDefault = {
  primitiveCheck: true
}

export interface PrePost<T> extends MetaDescriptor<T> {
  options: PrePostOptions
  func: PrePostFunction<T>
}

function prePostFunctionDecoratorFactory (name: string, typeSym: symbol, metaSetter: any, func: PrePostFunction<unknown>, opt: Partial<PrePostOptions> = PrePostOptionsDefault): DecoratorType {
  return function <T>(target: T, propertyKey: keyof T) {
    if (opt.primitiveCheck) {
      relationExistOrThrow(target, propertyKey)
    }
    const options = {
      ...PrePostOptionsDefault,
      ...opt
    }
    const preFunction: PrePost<T> = {
      type: typeSym,
      name,
      target,
      propertyName: propertyKey,
      options,
      func
    }

    metaSetter(target, propertyKey, preFunction)
  }
}

export function preFunctionDecoratorFactory (name: string, func: PrePostFunction<unknown>, opt: Partial<PrePostOptions> = PrePostOptionsDefault): DecoratorType {
  return prePostFunctionDecoratorFactory(name, PreFunctionSymbol, Meta.setPre, func, opt)
}

export function postFunctionDecoratorFactory (name: string, func: PrePostFunction<unknown>, opt: Partial<PrePostOptions> = PrePostOptionsDefault): DecoratorType {
  return prePostFunctionDecoratorFactory(name, PostFunctionSymbol, Meta.setPost, func, opt)
}

export function Pre (func: PrePostFunction<unknown>, opt?: Partial<PrePostOptions>): DecoratorType {
  return preFunctionDecoratorFactory('pre', func, opt)
}

export function Post (func: PrePostFunction<unknown>, opt?: Partial<PrePostOptions>): DecoratorType {
  return postFunctionDecoratorFactory('post', func, opt)
}

export function Offset (offset: number | string, opt?: Partial<PrePostOptions>): DecoratorType {
  return preFunctionDecoratorFactory('offset', (targetInstance, cursor) => {
    cursor.move(typeof offset === 'string' ? recursiveGet(targetInstance, offset) : offset)
  }, opt)
}

export function usePrePost<T> (prepost: Array<PrePost<T>>, targetInstance: T, cursor: Cursor): void {
  prepost.forEach(x => {
    x.func(targetInstance, cursor)
  })
}
