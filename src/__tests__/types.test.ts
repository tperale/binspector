import { describe, expect } from '@jest/globals'

describe('Primitive file types', () => {
  it('the enum should hold the different fields', () => {
    enum Type {
      ReadOnly = 5,
      ReadWrite = 7,
    }

    expect(Object.keys(Type)).toStrictEqual(['5', '7', 'ReadOnly', 'ReadWrite'])
  })
})
