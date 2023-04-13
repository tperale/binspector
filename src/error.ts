export class EOFError extends Error {
  constructor () {
    super('EOF Error')
    this.name = this.constructor.name
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
  constructor (name: string, propertyName: string, propertyValue: unknown, message: string) {
    super(`The '${name}' validation for property '${propertyName}' with value '${String(propertyValue)}' failed: ${message}`)
  }
}
