import { type Cursor } from './cursor'

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

export class SelfReferringFieldError extends Error {
  constructor () {
    super('Self Referring Error')
    // TODO Do something with the history
    // this.history = history
  }
}

export class ReferringToEmptyClassError extends Error {
  constructor (classname: string) {
    super(`The relation '@Relation(${classname})' can't reference the empty '${classname}' class not containing any '@Relation' or '@Bitfield'.`)
  }
}

export class NoConditionMatched extends Error {
  constructor () {
    // TODO Pass the field name and the condition ?
    super('Didn\'t found any condition that passed the test. No relation to continue reading')
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
