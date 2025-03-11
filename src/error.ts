import Meta from './metadatas.ts'
import { type Cursor } from './cursor.ts'
import { PropertyType } from './decorators/index.ts'
import { type Context, type DecoratorMetadataObject } from './types.ts'

export class EOFError extends Error {
  value: any

  constructor (value?: any) {
    super('EOF Error')
    this.name = this.constructor.name
    this.value = value
    // TODO Do something with the history
    // this.history = history
  }
}

export class NoConditionMatched extends Error {
  constructor () {
    // TODO Pass the field name and the condition ?
    super('Didn\'t found any condition that passed the test. No relation to continue reading')
  }
}

export class ReferringToEmptyClassError extends Error {
  constructor (classname: string) {
    super(`The relation '@Relation(${classname})' can't reference the empty '${classname}' class not containing any '@Relation' or '@Bitfield'.`)
  }
}

export class RelationNotDefinedError extends Error {
  constructor (propertyKey: string | symbol) {
    super(`No relation defined for the property '${propertyKey.toString()}'`)
  }
}

export class RelationAlreadyDefinedError extends Error {
  constructor (propertyType: PropertyType<any>, propertyKey: string) {
    super(`The relation '${JSON.stringify(propertyType)}' already exist for the property '${propertyKey}'`)
  }
}

export class UnknownPropertyType extends Error {
  constructor (field: any) {
    super(`The following was not recognized: ${JSON.stringify(field)}`)
  }
}

export class ValidationTestFailed extends Error {
  constructor (name: string, propertyName: string, propertyValue: unknown, message: string, cursor?: Cursor) {
    const offset = cursor === undefined ? '' : `at address offset 0x${cursor.offset().toString(16)}`
    super(`The '${name}' validation for property '${propertyName}' with value '${String(propertyValue)}' ${offset} failed: ${message}`)
  }
}

export class WrongArgumentReturnType extends Error {
  constructor (classname: string, property: string) {
    super(`The argument retrieval function invoked in the decorator of '${classname}:${property}' must return an array of argument to pass to the child relation.`)
  }
}

export class WrongBitfieldClassImplementation extends Error {
  constructor (property: string) {
    super(`WrongBitfieldClassImplementation: The property '@Bitfield() ${property}' can't be declared alongside a relation '@Relation(...) ${property}'.`)
  }
}

/**
 * `relationExistsOrThrow` Verifiy the existance of a primitive in the metadata
 * or throw an error.
 *
 * @typeParam This The type of the class the decorator is applied to.
 * @typeParam Target The type of the relation
 * @typeParam Value The type of the decorated property.
 *
 * @param {metadata} metadata The Class metadata object.
 * @param {context} context The decorator context object.
 * @returns {void}
 *
 * @throws {@link RelationNotDefinedError} if no relation metadata is found.
 *
 * @category Advanced Use
 */
export function relationExistsOrThrow<This, Value> (metadata: DecoratorMetadataObject, context: Context<This, Value>): void {
  if (Meta.getField(metadata, context.name as keyof This) === undefined) {
    throw new RelationNotDefinedError(context.name)
  }
}
