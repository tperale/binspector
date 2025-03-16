import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Bson } from './bson.ts'

test('Testing BSON "helloworld.bson" read/write equality', () => {
  const filename = path.join(path.dirname(fileURLToPath(import.meta.url)), 'helloworld.bson')
  expect(filename).fileReadWriteEquality(Bson)
})

test('Testing BSON "nested.bson" read/write equality', () => {
  const filename = path.join(path.dirname(fileURLToPath(import.meta.url)), 'nested.bson')
  expect(filename).fileReadWriteEquality(Bson)
})

test('Testing Object Serialization', () => {
  const obj = {
    foo: undefined,
    bar: {
      first: [1, 2, 3],
      second: 'hello'
    }
  }

  const bson = Bson.fromObject(obj)
  expect(bson.fields.length).toStrictEqual(2)
  expect(bson.fields[0].name).toStrictEqual('foo')
  expect(bson.fields[1].name).toStrictEqual('bar')
  expect(bson.fields[0].data).toStrictEqual(undefined)
  expect(bson.fields[1].data instanceof Bson).toStrictEqual(true)
  expect(bson.fields[1].data.fields[0].name).toStrictEqual('first')
  expect(bson.fields[1].data.fields[1].name).toStrictEqual('second')
  expect(bson.fields[1].data.fields[0].data instanceof Bson).toStrictEqual(true)
  expect(bson.fields[1].data.fields[0].data.fields.length).toStrictEqual(3)
  expect(bson.fields[1].data.fields[1].data.name).toStrictEqual('hello')

  expect(bson.toJson()).toMatchObject(obj)
})
